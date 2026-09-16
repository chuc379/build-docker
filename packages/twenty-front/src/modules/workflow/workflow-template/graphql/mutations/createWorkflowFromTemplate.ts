import { gql } from '@apollo/client';

export const CREATE_WORKFLOW_FROM_TEMPLATE = gql`
  mutation CreateWorkflowFromTemplate(
    $input: CreateWorkflowFromTemplateInput!
  ) {
    createWorkflowFromTemplate(input: $input) {
      id
      name
      status
      trigger
      steps
      createdAt
      updatedAt
      workflowId
    }
  }
`;
