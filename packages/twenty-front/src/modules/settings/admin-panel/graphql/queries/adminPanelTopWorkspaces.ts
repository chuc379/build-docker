import { gql } from '@apollo/client';

export const ADMIN_PANEL_TOP_WORKSPACES = gql`
  query AdminPanelTopWorkspaces(
    $searchTerm: String
    $page: Int!
    $pageSize: Int!
  ) {
    adminPanelTopWorkspaces(
      searchTerm: $searchTerm
      page: $page
      pageSize: $pageSize
    ) {
      items {
        id
        logoUrl
        name
        totalUsers
        subdomain
      }
      totalCount
      currentPage
      totalPages
    }
  }
`;
