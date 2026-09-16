import { v5 as uuidv5 } from 'uuid';

export const JOB_DESCRIPTION_WORKFLOW_NAMESPACE =
  'b2c3d4e5-f6a7-48b9-8c1d-e2f3a405b6c7';

export const JOB_DESCRIPTION_AGENT_UNIVERSAL_IDENTIFIER = uuidv5(
  'generateJobDescriptionAgent',
  JOB_DESCRIPTION_WORKFLOW_NAMESPACE,
);

export const getJobDescriptionAgentId = (workspaceId: string) =>
  uuidv5(
    `generateJobDescriptionAgent:${workspaceId}`,
    JOB_DESCRIPTION_WORKFLOW_NAMESPACE,
  );
