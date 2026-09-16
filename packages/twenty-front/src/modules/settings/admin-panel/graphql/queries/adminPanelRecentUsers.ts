import { gql } from '@apollo/client';

export const ADMIN_PANEL_RECENT_USERS = gql`
  query AdminPanelRecentUsers(
    $searchTerm: String
    $page: Int!
    $pageSize: Int!
  ) {
    adminPanelRecentUsers(
      searchTerm: $searchTerm
      page: $page
      pageSize: $pageSize
    ) {
      items {
        id
        email
        firstName
        lastName
        avatarUrl
        createdAt
        workspaceName
        workspaceId
        workspaceLogo
      }
      totalCount
      currentPage
      totalPages
    }
  }
`;
