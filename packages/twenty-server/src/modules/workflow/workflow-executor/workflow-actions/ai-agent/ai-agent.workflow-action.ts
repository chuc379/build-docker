import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';

import { type ModelMessage } from 'ai';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { type Browser, type BrowserContext, chromium } from 'playwright';
import { resolveInput } from 'twenty-shared/utils';

import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/interfaces/workflow-action.interface';

import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { type CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UsageOperationType } from 'src/engine/core-modules/usage/enums/usage-operation-type.enum';
import { AgentAsyncExecutorService } from 'src/engine/metadata-modules/ai/ai-agent-execution/services/agent-async-executor.service';
import { type AgentExecutionResult } from 'src/engine/metadata-modules/ai/ai-agent-execution/types/agent-execution-result.type';
import { WORKFLOW_BASE_SYSTEM_PROMPT } from 'src/engine/metadata-modules/ai/ai-agent/constants/workflow-base-system-prompt.const';
import { AgentEntity } from 'src/engine/metadata-modules/ai/ai-agent/entities/agent.entity';
import { InjectWorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/inject-workspace-scoped-repository.decorator';
import { WorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/workspace-scoped-repository';
import {
  WorkflowStepExecutorException,
  WorkflowStepExecutorExceptionCode,
} from 'src/modules/workflow/workflow-executor/exceptions/workflow-step-executor.exception';
import { WorkflowExecutionContextService } from 'src/modules/workflow/workflow-executor/services/workflow-execution-context.service';
import { type WorkflowActionInput } from 'src/modules/workflow/workflow-executor/types/workflow-action-input';
import { type WorkflowActionOutput } from 'src/modules/workflow/workflow-executor/types/workflow-action-output.type';
import { findStepOrThrow } from 'src/modules/workflow/workflow-executor/utils/find-step-or-throw.util';
import { buildAiAgentStepLog } from 'src/modules/workflow/workflow-executor/workflow-actions/ai-agent/utils/build-ai-agent-step-log.util';
import { WorkflowRunStepLogWorkspaceService } from 'src/modules/workflow/workflow-runner/workflow-run/workflow-run-step-log.workspace-service';

import { isWorkflowAiAgentAction } from './guards/is-workflow-ai-agent-action.guard';

@Injectable()
export class AiAgentWorkflowAction implements WorkflowAction, OnModuleDestroy {
  private readonly logger = new Logger(AiAgentWorkflowAction.name);

  private static readonly CV_DOWNLOAD_LOCK_KEY_PREFIX = 'tinasoft:cv-download';
  private static readonly CV_DOWNLOAD_LOCK_TTL_MS = 60 * 1000;
  private static readonly CV_DOWNLOAD_NAVIGATION_TIMEOUT_MS = 45_000;
  private static readonly CV_DOWNLOAD_BUDGET_MS = 25_000;
  private static readonly CV_DOWNLOAD_RUN_CACHE_LIMIT = 100;
  private static readonly MAX_CONCURRENT_CV_DOWNLOADS = 2;

  // One browser for the whole process: launching chromium costs ~1s and ~150MB,
  // so it is started lazily at most once and reused across steps and runs.
  private browserPromise: Promise<Browser> | null = null;

  // Guarantees a single headless-browser session per workflow run, even if
  // several steps of the same run reference the same file.
  private readonly cvDownloadByRun = new Map<
    string,
    Promise<Uint8Array | null>
  >();

  private readonly cvDownloadWaiters: Array<() => void> = [];
  private activeCvDownloads = 0;

  constructor(
    private readonly aiAgentExecutionService: AgentAsyncExecutorService,
    private readonly workflowExecutionContextService: WorkflowExecutionContextService,
    private readonly workflowRunStepLogService: WorkflowRunStepLogWorkspaceService,
    @InjectWorkspaceScopedRepository(AgentEntity)
    private readonly agentRepository: WorkspaceScopedRepository<AgentEntity>,
    @InjectCacheStorage(CacheStorageNamespace.EngineLock)
    private readonly lockStorage: CacheStorageService,
    private readonly twentyConfigService: TwentyConfigService,
  ) {}

  async onModuleDestroy(): Promise<void> {
    const browserPromise = this.browserPromise;

    this.browserPromise = null;
    this.cvDownloadByRun.clear();

    if (!browserPromise) {
      return;
    }

    try {
      const browser = await browserPromise;

      await browser.close();
    } catch (error) {
      this.logger.warn(
        `Failed to close headless browser: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async execute({
    currentStepId,
    steps,
    context,
    runInfo,
  }: WorkflowActionInput): Promise<WorkflowActionOutput> {
    const step = findStepOrThrow({
      stepId: currentStepId,
      steps,
    });

    if (!isWorkflowAiAgentAction(step)) {
      throw new WorkflowStepExecutorException(
        'Step is not an AI Agent action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_TYPE,
      );
    }

    const { agentId, prompt, fileUrl } = step.settings.input;
    const workspaceId = runInfo.workspaceId;

    let agent: AgentEntity | null = null;

    if (agentId) {
      agent = await this.agentRepository.findOne(workspaceId, {
        where: { id: agentId },
      });
    }

    if (agentId && !agent) {
      throw new WorkflowStepExecutorException(
        `Agent with id ${agentId} not found`,
        WorkflowStepExecutorExceptionCode.INVALID_STEP_INPUT,
      );
    }

    const executionContext =
      await this.workflowExecutionContextService.getExecutionContext(runInfo);

    const userWorkspaceId =
      executionContext.authContext.type === 'user'
        ? executionContext.authContext.userWorkspaceId
        : null;

    const startedAtMs = Date.now();

    const resolvedPrompt = resolveInput(prompt, context) as string;
    const resolvedFileUrl = resolveInput(fileUrl, context) as string;
    const messageContent: ModelMessage['content'] = [
      { type: 'text', text: resolvedPrompt },
    ];

    if (resolvedFileUrl?.startsWith('http')) {
      const mediaType = await this.resolveWorkflowFileMediaType({
        url: resolvedFileUrl,
        workflowRunId: runInfo.workflowRunId,
        workspaceId,
      });

      if (mediaType) {
        messageContent.push({
          type: 'file',
          data: mediaType.data,
          mediaType: mediaType.mediaType,
        });
      }
    }

    const executionResult = await this.aiAgentExecutionService.executeAgent({
      agent,
      messages: [{ role: 'user', content: messageContent }],
      baseSystemPrompt: WORKFLOW_BASE_SYSTEM_PROMPT,
      actorContext: executionContext.isActingOnBehalfOfUser
        ? executionContext.initiator
        : undefined,
      authContext: executionContext.authContext,
      workspaceId,
      userWorkspaceId,
      operationType: UsageOperationType.AI_WORKFLOW_TOKEN,
    });

    const durationMs = Date.now() - startedAtMs;

    await this.persistStepLog({
      workflowRunId: runInfo.workflowRunId,
      workspaceId,
      stepId: currentStepId,
      executionResult,
      durationMs,
    });

    if (executionResult.hasNoMoreAvailableCredits) {
      return {
        error: 'AI agent stopped: no more available credits.',
      };
    }

    return {
      result: executionResult.result,
    };
  }

  private isHeadlessBrowserEnabled(workspaceId: string): boolean {
    const allowlist =
      this.twentyConfigService.get(
        'CV_HEADLESS_BROWSER_WORKSPACE_ID_ALLOWLIST',
      ) ?? [];

    return Array.isArray(allowlist)
      ? allowlist.map((entry) => entry.trim()).includes(workspaceId)
      : false;
  }

  private async resolveWorkflowFileMediaType({
    url,
    workflowRunId,
    workspaceId,
  }: {
    url: string;
    workflowRunId: string;
    workspaceId: string;
  }): Promise<{ data: Uint8Array; mediaType: string } | null> {
    const cached = this.cvDownloadByRun.get(workflowRunId);

    if (cached) {
      return this.toAttachableFile({ url, fileData: await cached });
    }

    if (this.isHeadlessBrowserEnabled(workspaceId)) {
      return this.toAttachableFile({
        url,
        fileData: await this.runHeadlessBrowserDownloadOncePerRun({
          url,
          workflowRunId,
        }),
      });
    }

    try {
      const response = await fetch(url, { redirect: 'follow' });

      if (!response.ok) {
        this.logger.warn(
          `Could not attach workflow AI file: HTTP ${response.status} ${response.statusText}`,
        );

        return null;
      }

      const rawMediaType =
        response.headers.get('content-type')?.split(';')[0] ?? '';

      return this.toAttachableFile({
        url,
        mediaType: rawMediaType,
        fileData: new Uint8Array(await response.arrayBuffer()),
      });
    } catch (error) {
      this.logger.warn(
        `Could not attach workflow AI file: ${error instanceof Error ? error.message : String(error)}`,
      );

      return null;
    }
  }

  private toAttachableFile({
    url,
    mediaType,
    fileData,
  }: {
    url: string;
    mediaType?: string;
    fileData: Uint8Array | null;
  }): { data: Uint8Array; mediaType: string } | null {
    if (!fileData) {
      return null;
    }

    const inferredMediaType = this.inferMediaTypeFromUrlOrBytes({
      url,
      mediaType,
      fileData,
    });

    if (!inferredMediaType) {
      return null;
    }

    return { data: fileData, mediaType: inferredMediaType };
  }

  // Non-blocking: the headless download is started once and raced against a
  // budget. On timeout the step continues with the text prompt only, while the
  // browser keeps working in the background and its result is reused by any
  // later step of the same run.
  private async runHeadlessBrowserDownloadOncePerRun({
    url,
    workflowRunId,
  }: {
    url: string;
    workflowRunId: string;
  }): Promise<Uint8Array | null> {
    const downloadPromise = this.downloadCvWithHeadlessBrowser(url);

    this.rememberCvDownload(workflowRunId, downloadPromise);

    let timeout: ReturnType<typeof setTimeout> | undefined;

    const budgetExpired = new Promise<undefined>((resolve) => {
      timeout = setTimeout(
        () => resolve(undefined),
        AiAgentWorkflowAction.CV_DOWNLOAD_BUDGET_MS,
      );
    });

    try {
      const downloaded = await Promise.race([downloadPromise, budgetExpired]);

      return downloaded ?? null;
    } catch (error) {
      this.logger.warn(
        `Could not attach workflow AI file: ${error instanceof Error ? error.message : String(error)}`,
      );

      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private rememberCvDownload(
    workflowRunId: string,
    downloadPromise: Promise<Uint8Array | null>,
  ): void {
    if (
      this.cvDownloadByRun.size >=
      AiAgentWorkflowAction.CV_DOWNLOAD_RUN_CACHE_LIMIT
    ) {
      const oldestRunId = this.cvDownloadByRun.keys().next().value;

      if (oldestRunId !== undefined) {
        this.cvDownloadByRun.delete(oldestRunId);
      }
    }

    this.cvDownloadByRun.set(workflowRunId, downloadPromise);

    void downloadPromise
      .catch(() => undefined)
      .finally(() => {
        this.scheduleRunCacheCleanup(workflowRunId);
      });
  }

  private scheduleRunCacheCleanup(workflowRunId: string): void {
    const timer = setTimeout(() => {
      this.cvDownloadByRun.delete(workflowRunId);
    }, AiAgentWorkflowAction.CV_DOWNLOAD_BUDGET_MS * 2);

    timer.unref?.();
  }

  private async downloadCvWithHeadlessBrowser(
    url: string,
  ): Promise<Uint8Array | null> {
    const releaseDistributedLock = await this.acquireCvDownloadLock(url);

    await this.acquireCvDownloadSlot();

    let browserContext: BrowserContext | undefined;

    try {
      const browser = await this.getBrowser();

      browserContext = await browser.newContext({ acceptDownloads: true });

      const response = await this.downloadFileFromPage({ browserContext, url });

      if (!response.ok) {
        throw new Error(
          `download returned HTTP ${response.status} ${response.statusText}`,
        );
      }

      return new Uint8Array(await response.arrayBuffer());
    } finally {
      await browserContext?.close().catch(() => undefined);
      this.releaseCvDownloadSlot();
      await releaseDistributedLock();
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browserPromise) {
      const pendingBrowser = await this.browserPromise;

      if (pendingBrowser.isConnected()) {
        return pendingBrowser;
      }

      this.browserPromise = null;
    }

    this.logger.log('Launching headless browser for protected file download');

    this.browserPromise = chromium
      .launch({
        headless: true,
        executablePath: this.resolveChromiumExecutablePath(),
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      })
      .catch((error: unknown) => {
        this.browserPromise = null;

        throw error;
      });

    return this.browserPromise;
  }

  private resolveChromiumExecutablePath(): string | undefined {
    if (process.env.CHROMIUM_PATH) {
      return process.env.CHROMIUM_PATH;
    }

    try {
      return chromium.executablePath();
    } catch {
      return undefined;
    }
  }

  private async downloadFileFromPage({
    browserContext,
    url,
  }: {
    browserContext: BrowserContext;
    url: string;
  }): Promise<Response> {
    const page = await browserContext.newPage();
    const downloadPromise = page
      .waitForEvent('download', {
        timeout: AiAgentWorkflowAction.CV_DOWNLOAD_NAVIGATION_TIMEOUT_MS,
      })
      .catch(() => null);

    try {
      const navigationResponse = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: AiAgentWorkflowAction.CV_DOWNLOAD_NAVIGATION_TIMEOUT_MS,
      });

      const navigationContentType =
        navigationResponse?.headers()['content-type']?.split(';')[0] ?? '';

      if (navigationContentType === 'application/pdf' && navigationResponse) {
        return this.toPdfResponse(
          new Uint8Array(await navigationResponse.body()),
        );
      }

      const download = await downloadPromise;

      if (!download) {
        throw new Error(
          `No download was triggered for ${url} (served "${navigationContentType || 'unknown'}"). The host likely returned an anti-bot challenge page instead of the file.`,
        );
      }

      const downloadPath = await download.path();

      if (!downloadPath) {
        throw new Error('TopCV download did not produce a file');
      }

      return this.toPdfResponse(new Uint8Array(await readFile(downloadPath)));
    } finally {
      await page.close().catch(() => undefined);
    }
  }

  private toPdfResponse(fileData: Uint8Array): Response {
    // Copied into a fresh ArrayBuffer-backed view: the buffers coming from
    // Buffer and from playwright are ArrayBufferLike, which BodyInit rejects.
    const body = new Uint8Array(fileData.byteLength);

    body.set(fileData);

    return new Response(body, {
      status: 200,
      headers: { 'content-type': 'application/pdf' },
    });
  }

  // One-time token URLs must not be consumed twice, so the lock is keyed per
  // URL. Redis is optional: without it the download simply runs unguarded.
  private async acquireCvDownloadLock(
    url: string,
  ): Promise<() => Promise<void>> {
    const lockKey = `${AiAgentWorkflowAction.CV_DOWNLOAD_LOCK_KEY_PREFIX}:${createHash('sha256').update(url).digest('hex').slice(0, 32)}`;

    let acquired = false;

    while (!acquired) {
      try {
        acquired = await this.lockStorage.acquireLock(
          lockKey,
          AiAgentWorkflowAction.CV_DOWNLOAD_LOCK_TTL_MS,
        );
      } catch {
        return async () => undefined;
      }

      if (!acquired) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return async () => {
      await this.lockStorage.releaseLock(lockKey).catch(() => undefined);
    };
  }

  private async acquireCvDownloadSlot(): Promise<void> {
    if (
      this.activeCvDownloads >=
      AiAgentWorkflowAction.MAX_CONCURRENT_CV_DOWNLOADS
    ) {
      await new Promise<void>((resolve) => {
        this.cvDownloadWaiters.push(resolve);
      });
    }

    this.activeCvDownloads += 1;
  }

  private releaseCvDownloadSlot(): void {
    this.activeCvDownloads = Math.max(0, this.activeCvDownloads - 1);

    this.cvDownloadWaiters.shift()?.();
  }

  private inferMediaTypeFromUrlOrBytes({
    url,
    mediaType,
    fileData,
  }: {
    url: string;
    mediaType?: string;
    fileData: Uint8Array;
  }): string | null {
    if (mediaType && mediaType !== 'application/octet-stream') {
      return mediaType;
    }

    try {
      const pathname = new URL(url).pathname.toLowerCase();
      const extension = pathname.split('.').pop();

      if (extension === 'pdf') {
        return 'application/pdf';
      }

      if (
        ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(extension ?? '')
      ) {
        return `image/${extension === 'jpg' ? 'jpeg' : extension}`;
      }
    } catch {
      // ignore invalid URL; fall through to signature detection
    }

    if (
      fileData.length >= 4 &&
      fileData[0] === 0x25 &&
      fileData[1] === 0x50 &&
      fileData[2] === 0x44 &&
      fileData[3] === 0x46
    ) {
      return 'application/pdf';
    }

    if (
      fileData.length >= 8 &&
      fileData[0] === 0x89 &&
      fileData[1] === 0x50 &&
      fileData[2] === 0x4e &&
      fileData[3] === 0x47
    ) {
      return 'image/png';
    }

    if (fileData.length >= 2 && fileData[0] === 0xff && fileData[1] === 0xd8) {
      return 'image/jpeg';
    }

    return mediaType || null;
  }

  private async persistStepLog({
    workflowRunId,
    workspaceId,
    stepId,
    executionResult,
    durationMs,
  }: {
    workflowRunId: string;
    workspaceId: string;
    stepId: string;
    executionResult: AgentExecutionResult;
    durationMs: number;
  }): Promise<void> {
    const stepLog = buildAiAgentStepLog({ executionResult, durationMs });

    if (!stepLog) {
      return;
    }

    try {
      await this.workflowRunStepLogService.setStepLog({
        workflowRunId,
        workspaceId,
        stepId,
        stepLog,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to persist step log for workflowRun=${workflowRunId} step=${stepId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
