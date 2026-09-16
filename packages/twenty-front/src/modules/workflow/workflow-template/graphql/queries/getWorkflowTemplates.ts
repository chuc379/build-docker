import { gql } from '@apollo/client';

export const GET_WORKFLOW_TEMPLATES = gql`
  query GetWorkflowTemplates {
    workflowTemplates {
      id
      name
      description
      shortDescription
      purpose
      category
      icon
      requiredSettings {
        key
        type
        label
        defaultValue
      }
    }
  }
`;
