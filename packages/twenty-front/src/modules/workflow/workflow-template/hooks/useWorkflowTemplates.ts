import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { useQuery } from '@apollo/client/react';
import {
  GetWorkflowTemplatesDocument,
  type GetWorkflowTemplatesQuery,
  type GetWorkflowTemplatesQueryVariables,
} from '~/generated/graphql';

export const useWorkflowTemplates = () => {
  const apolloCoreClient = useApolloCoreClient();

  const { data, loading, error, refetch } = useQuery<
    GetWorkflowTemplatesQuery,
    GetWorkflowTemplatesQueryVariables
  >(GetWorkflowTemplatesDocument, {
    client: apolloCoreClient,
  });

  return {
    workflowTemplates: data?.workflowTemplates ?? [],
    loading,
    error,
    refetch,
  };
};
