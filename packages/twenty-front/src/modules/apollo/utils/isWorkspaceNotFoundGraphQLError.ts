import { type GraphQLFormattedError } from 'graphql';

const WORKSPACE_NOT_FOUND_SUB_CODES = [
  'WORKSPACE_NOT_FOUND',
  'USER_WORKSPACE_NOT_FOUND',
] as const;

export const isWorkspaceNotFoundGraphQLError = (
  graphQLError: GraphQLFormattedError,
): boolean => {
  const subCode = graphQLError.extensions?.subCode;

  return (
    typeof subCode === 'string' &&
    (WORKSPACE_NOT_FOUND_SUB_CODES as readonly string[]).includes(subCode)
  );
};
