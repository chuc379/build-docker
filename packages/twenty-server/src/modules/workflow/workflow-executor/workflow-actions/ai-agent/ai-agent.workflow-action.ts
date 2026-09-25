import { Injectable, Logger } from '@nestjs/common';

import { type ModelMessage } from 'ai';
import { resolveInput } from 'twenty-shared/utils';

import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/interfaces/workflow-action.interface';

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
export class AiAgentWorkflowAction implements WorkflowAction {
  private readonly logger = new Logger(AiAgentWorkflowAction.name);

  constructor(
    private readonly aiAgentExecutionService: AgentAsyncExecutorService,
    private readonly workflowExecutionContextService: WorkflowExecutionContextService,
    private readonly workflowRunStepLogService: WorkflowRunStepLogWorkspaceService,
    @InjectWorkspaceScopedRepository(AgentEntity)
    private readonly agentRepository: WorkspaceScopedRepository<AgentEntity>,
  ) {}

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
      try {
        const response = await fetch(resolvedFileUrl);

        if (response.ok) {
          const rawMediaType =
            response.headers.get('content-type')?.split(';')[0] ?? '';
          const fileData = new Uint8Array(await response.arrayBuffer());

          const inferredMediaType = this.inferMediaTypeFromUrlOrBytes({
            url: resolvedFileUrl,
            mediaType: rawMediaType,
            fileData,
          });

          if (inferredMediaType) {
            messageContent.push({
              type: 'file',
              data: fileData,
              mediaType: inferredMediaType,
            });
          }
        }
      } catch (error) {
        this.logger.warn(
          `Could not attach workflow AI file: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const executionResult = await this.aiAgentExecutionService.executeAgent({
      agent,
      messages: [
        { role: 'user', content: messageContent },
      ],
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

      if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(extension ?? '')) {
        return `image/${extension === 'jpg' ? 'jpeg' : extension}`;
      }
    } catch {
      // ignore invalid URL; fall through to signature detection
    }

    if (fileData.length >= 4 && fileData[0] === 0x25 && fileData[1] === 0x50 && fileData[2] === 0x44 && fileData[3] === 0x46) {
      return 'application/pdf';
    }

    if (fileData.length >= 8 && fileData[0] === 0x89 && fileData[1] === 0x50 && fileData[2] === 0x4e && fileData[3] === 0x47) {
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
