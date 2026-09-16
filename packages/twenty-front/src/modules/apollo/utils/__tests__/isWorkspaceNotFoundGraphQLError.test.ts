import { isWorkspaceNotFoundGraphQLError } from '@/apollo/utils/isWorkspaceNotFoundGraphQLError';

describe('isWorkspaceNotFoundGraphQLError', () => {
  it('should return true for WORKSPACE_NOT_FOUND subCode', () => {
    expect(
      isWorkspaceNotFoundGraphQLError({
        message: 'Workspace not found.',
        extensions: {
          code: 'NOT_FOUND',
          subCode: 'WORKSPACE_NOT_FOUND',
        },
      }),
    ).toBe(true);
  });

  it('should return true for USER_WORKSPACE_NOT_FOUND subCode', () => {
    expect(
      isWorkspaceNotFoundGraphQLError({
        message: 'User workspace not found.',
        extensions: {
          code: 'UNAUTHENTICATED',
          subCode: 'USER_WORKSPACE_NOT_FOUND',
        },
      }),
    ).toBe(true);
  });

  it('should return false when subCode is missing', () => {
    expect(
      isWorkspaceNotFoundGraphQLError({
        message: 'Not found',
        extensions: {
          code: 'NOT_FOUND',
        },
      }),
    ).toBe(false);
  });

  it('should return false for unrelated subCode', () => {
    expect(
      isWorkspaceNotFoundGraphQLError({
        message: 'User not found.',
        extensions: {
          code: 'UNAUTHENTICATED',
          subCode: 'USER_NOT_FOUND',
        },
      }),
    ).toBe(false);
  });
});
