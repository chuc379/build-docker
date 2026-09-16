import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { useFindManyRecordsQuery } from '@/object-record/hooks/useFindManyRecordsQuery';
import { useMutation } from '@apollo/client/react';
import {
  CreateWorkflowFromTemplateDocument,
  type CreateWorkflowFromTemplateInput,
  type CreateWorkflowFromTemplateMutation,
  type CreateWorkflowFromTemplateMutationVariables,
} from '~/generated/graphql';

export const useCreateWorkflowFromTemplate = () => {
  const apolloCoreClient = useApolloCoreClient();

  const [mutate] = useMutation<
    CreateWorkflowFromTemplateMutation,
    CreateWorkflowFromTemplateMutationVariables
  >(CreateWorkflowFromTemplateDocument, {
    client: apolloCoreClient,
  });

  const { findManyRecordsQuery: findManyWorkflowsQuery } =
    useFindManyRecordsQuery({
      objectNameSingular: CoreObjectNameSingular.Workflow,
      recordGqlFields: {
        id: true,
        name: true,
        statuses: true,
        lastPublishedVersionId: true,
        versions: true,
      },
    });

  const createWorkflowFromTemplate = async (
    input: CreateWorkflowFromTemplateInput,
  ) => {
    const result = await mutate({
      variables: { input },
      awaitRefetchQueries: true,
      refetchQueries: [
        {
          query: findManyWorkflowsQuery,
          variables: {},
        },
      ],
    });

    return result.data?.createWorkflowFromTemplate;
  };

  return { createWorkflowFromTemplate };
};
