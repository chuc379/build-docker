import { WorkflowActionType } from 'twenty-shared/workflow';

import { FindRecordsService } from 'src/engine/core-modules/record-crud/services/find-records.service';
import { WorkflowCommonWorkspaceService } from 'src/modules/workflow/common/workspace-services/workflow-common.workspace-service';
import { FindRecordsWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/record-crud/find-records.workflow-action';
import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';
import { WorkflowExecutionContextService } from 'src/modules/workflow/workflow-executor/services/workflow-execution-context.service';

describe('FindRecordsWorkflowAction', () => {
  const workspaceId = 'workspace-id';
  const stepId = 'find-records-step-id';

  const findRecordsService = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<FindRecordsService>;
  const workflowExecutionContextService = {
    getExecutionContext: jest.fn(),
  } as unknown as jest.Mocked<WorkflowExecutionContextService>;
  const workflowCommonWorkspaceService = {
    getObjectMetadataInfo: jest.fn(),
  } as unknown as jest.Mocked<WorkflowCommonWorkspaceService>;

  const service = new FindRecordsWorkflowAction(
    findRecordsService,
    workflowExecutionContextService,
    workflowCommonWorkspaceService,
  );

  const createFindRecordsStep = ({
    maxRecords,
  }: {
    maxRecords: number;
  }): WorkflowAction =>
    ({
      id: stepId,
      name: 'Find opportunities',
      type: WorkflowActionType.FIND_RECORDS,
      valid: true,
      settings: {
        input: {
          objectName: 'opportunity',
          limit: 2,
          pagination: { fetchAll: true, pageSize: 2, maxRecords },
        },
        outputSchema: {},
        errorHandlingOptions: {
          retryOnFailure: { value: false },
          continueOnFailure: { value: false },
        },
      },
    }) as WorkflowAction;

  beforeEach(() => {
    jest.clearAllMocks();
    workflowExecutionContextService.getExecutionContext.mockResolvedValue({
      authContext: {},
      rolePermissionConfig: undefined,
    } as never);
    workflowCommonWorkspaceService.getObjectMetadataInfo.mockResolvedValue({
      flatFieldMetadataMaps: { byUniversalIdentifier: {} },
    } as never);
  });

  it('should retrieve all pages when pagination is enabled', async () => {
    findRecordsService.execute
      .mockResolvedValueOnce({
        success: true,
        result: { records: [{ id: '1' }, { id: '2' }], count: 3 },
      } as never)
      .mockResolvedValueOnce({
        success: true,
        result: { records: [{ id: '3' }], count: 3 },
      } as never);

    const output = await service.execute({
      currentStepId: stepId,
      steps: [createFindRecordsStep({ maxRecords: 10 })],
      context: {},
      runInfo: { workspaceId },
    } as never);

    expect(findRecordsService.execute).toHaveBeenCalledTimes(2);
    expect(findRecordsService.execute).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ limit: 2, offset: 0 }),
    );
    expect(findRecordsService.execute).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ limit: 2, offset: 2 }),
    );
    expect(output).toEqual({
      result: {
        first: { id: '1' },
        all: [{ id: '1' }, { id: '2' }, { id: '3' }],
        totalCount: 3,
      },
    });
  });

  it('should fail rather than returning a partial result above maxRecords', async () => {
    findRecordsService.execute.mockResolvedValueOnce({
      success: true,
      result: { records: [{ id: '1' }, { id: '2' }], count: 3 },
    } as never);

    const output = await service.execute({
      currentStepId: stepId,
      steps: [createFindRecordsStep({ maxRecords: 2 })],
      context: {},
      runInfo: { workspaceId },
    } as never);

    expect(output).toEqual({
      error:
        'Find records matched 3 records, exceeding the configured maximum of 2',
    });
  });
});
