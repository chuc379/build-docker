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

export const CV_INTAKE_WORKFLOW_NAMESPACE =
  '6f2e8d1a-4b3c-4f5e-9a8b-1c2d3e4f5a6b';

export const CV_INTAKE_EVALUATION_AGENT_UNIVERSAL_IDENTIFIER = uuidv5(
  'cvIntakeEvaluationAgent',
  CV_INTAKE_WORKFLOW_NAMESPACE,
);

export const getCvIntakeEvaluationAgentId = (workspaceId: string) =>
  uuidv5(
    `cvIntakeEvaluationAgent:${workspaceId}`,
    CV_INTAKE_WORKFLOW_NAMESPACE,
  );
