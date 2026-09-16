import { useNumberFormat } from '@/localization/hooks/useNumberFormat';
import { useApolloAdminClient } from '@/settings/admin-panel/apollo/hooks/useApolloAdminClient';
import { SettingsAdminServerAdmins } from '@/settings/admin-panel/components/SettingsAdminServerAdmins';
import { SettingsAdminVersionContainer } from '@/settings/admin-panel/components/SettingsAdminVersionContainer';
import { SettingsSectionSkeletonLoader } from '@/settings/components/SettingsSectionSkeletonLoader';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { Table } from '@/ui/layout/table/components/Table';
import { TableBody } from '@/ui/layout/table/components/TableBody';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useQuery } from '@apollo/client/react';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { useContext, useEffect, useState } from 'react';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { useDebounce } from 'use-debounce';

import { currentUserState } from '@/auth/states/currentUserState';
import { Avatar } from 'twenty-ui/data-display';
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsRight,
} from 'twenty-ui/icon';
import { IconButton } from 'twenty-ui/input';
import { Section } from 'twenty-ui/layout';
import { OverflowingTextWithTooltip } from 'twenty-ui/surfaces';
import { ThemeContext, themeCssVariables } from 'twenty-ui/theme-constants';
import { H2Title } from 'twenty-ui/typography';
import {
  AdminPanelRecentUsersDocument,
  AdminPanelTopWorkspacesDocument,
} from '~/generated-admin/graphql';
import { getAbsoluteImageUrl } from '~/utils/image/getAbsoluteImageUrl';

const StyledEmptyState = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  padding: ${themeCssVariables.spacing[4]} 0;
`;

const StyledSearchInputContainer = styled.div`
  padding-bottom: ${themeCssVariables.spacing[2]};
`;

const StyledPaginationContainer = styled.div`
  align-items: center;
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
  justify-content: flex-end;
  padding-top: ${themeCssVariables.spacing[2]};
`;

const StyledPaginationEllipsis = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  text-align: center;
  width: 24px;
`;

const StyledPaginationButton = styled(IconButton)`
  border-radius: 50%;
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledIconChevronsLeft = styled(IconChevronsRight)`
  transform: rotate(180deg);
`;

const RECENT_USERS_GRID_TEMPLATE_COLUMNS = '1fr 2fr 1fr 36px';
const TOP_WORKSPACES_GRID_TEMPLATE_COLUMNS = '2fr 1fr 36px';
const ADMIN_TABLE_PAGE_SIZE = 10;

const getPaginationItems = (currentPage: number, totalPages: number) => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 2) {
    return [1, 2, 3, 'ellipsis', totalPages] as const;
  }

  if (currentPage >= totalPages - 1) {
    return [1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages] as const;
  }

  return [
    1,
    'ellipsis-start',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    'ellipsis-end',
    totalPages,
  ] as const;
};

type SettingsAdminPaginationProps = {
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
};

const SettingsAdminPagination = ({
  currentPage,
  totalPages,
  onChange,
}: SettingsAdminPaginationProps) => {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <StyledPaginationContainer>
      <StyledPaginationButton
        Icon={StyledIconChevronsLeft}
        variant="tertiary"
        size="small"
        ariaLabel={t`First page`}
        disabled={currentPage === 1}
        onClick={() => onChange(1)}
      />
      <StyledPaginationButton
        Icon={IconChevronLeft}
        variant="tertiary"
        size="small"
        ariaLabel={t`Previous page`}
        disabled={currentPage === 1}
        onClick={() => onChange(Math.max(1, currentPage - 1))}
      />
      {getPaginationItems(currentPage, totalPages).map((item) =>
        typeof item === 'number' ? (
          <StyledPaginationButton
            key={item}
            variant={item === currentPage ? 'primary' : 'tertiary'}
            size="small"
            ariaLabel={t`Page ${item}`}
            onClick={() => onChange(item)}
          >
            {item}
          </StyledPaginationButton>
        ) : (
          <StyledPaginationEllipsis key={item}>
            &hellip;
          </StyledPaginationEllipsis>
        ),
      )}
      <StyledPaginationButton
        Icon={IconChevronRight}
        variant="tertiary"
        size="small"
        ariaLabel={t`Next page`}
        disabled={currentPage === totalPages}
        onClick={() => onChange(Math.min(totalPages, currentPage + 1))}
      />
      <StyledPaginationButton
        Icon={IconChevronsRight}
        variant="tertiary"
        size="small"
        ariaLabel={t`Last page`}
        disabled={currentPage === totalPages}
        onClick={() => onChange(totalPages)}
      />
    </StyledPaginationContainer>
  );
};

export const SettingsAdminGeneral = () => {
  const { theme } = useContext(ThemeContext);
  const { formatNumber } = useNumberFormat();
  const apolloAdminClient = useApolloAdminClient();
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [debouncedUserSearchTerm] = useDebounce(userSearchTerm, 300);
  const [recentUsersPage, setRecentUsersPage] = useState(1);

  const [workspaceSearchTerm, setWorkspaceSearchTerm] = useState('');
  const [debouncedWorkspaceSearchTerm] = useDebounce(workspaceSearchTerm, 300);
  const [topWorkspacesPage, setTopWorkspacesPage] = useState(1);

  const currentUser = useAtomStateValue(currentUserState);
  const canAccessFullAdminPanel = currentUser?.canAccessFullAdminPanel;
  const canImpersonate = currentUser?.canImpersonate;

  const { data: recentUsersData, loading: isLoadingUsers } = useQuery(
    AdminPanelRecentUsersDocument,
    {
      client: apolloAdminClient,
      variables: {
        searchTerm: debouncedUserSearchTerm,
        page: recentUsersPage,
        pageSize: ADMIN_TABLE_PAGE_SIZE,
      },
      skip: !canImpersonate && !canAccessFullAdminPanel,
    },
  );

  const { data: topWorkspacesData, loading: isLoadingWorkspaces } = useQuery(
    AdminPanelTopWorkspacesDocument,
    {
      client: apolloAdminClient,
      variables: {
        searchTerm: debouncedWorkspaceSearchTerm,
        page: topWorkspacesPage,
        pageSize: ADMIN_TABLE_PAGE_SIZE,
      },
      skip: !canImpersonate,
    },
  );

  const recentUsers = recentUsersData?.adminPanelRecentUsers.items ?? [];
  const recentUsersCount =
    recentUsersData?.adminPanelRecentUsers.totalCount ?? recentUsers.length;
  const recentUsersTotalPages =
    recentUsersData?.adminPanelRecentUsers.totalPages ??
    Math.ceil(recentUsersCount / ADMIN_TABLE_PAGE_SIZE);
  const topWorkspaces = topWorkspacesData?.adminPanelTopWorkspaces.items ?? [];
  const topWorkspacesCount =
    topWorkspacesData?.adminPanelTopWorkspaces.totalCount ??
    topWorkspaces.length;
  const topWorkspacesTotalPages =
    topWorkspacesData?.adminPanelTopWorkspaces.totalPages ??
    Math.ceil(topWorkspacesCount / ADMIN_TABLE_PAGE_SIZE);

  useEffect(() => {
    setRecentUsersPage(1);
  }, [debouncedUserSearchTerm]);

  useEffect(() => {
    if (recentUsersTotalPages > 0 && recentUsersPage > recentUsersTotalPages) {
      setRecentUsersPage(recentUsersTotalPages);
    }
  }, [recentUsersPage, recentUsersTotalPages]);

  useEffect(() => {
    setTopWorkspacesPage(1);
  }, [debouncedWorkspaceSearchTerm]);

  useEffect(() => {
    if (
      topWorkspacesTotalPages > 0 &&
      topWorkspacesPage > topWorkspacesTotalPages
    ) {
      setTopWorkspacesPage(topWorkspacesTotalPages);
    }
  }, [topWorkspacesPage, topWorkspacesTotalPages]);

  return (
    <>
      {canAccessFullAdminPanel && (
        <>
          <Section>
            <H2Title
              title={t`About`}
              description={t`Version of the application`}
            />
            <SettingsAdminVersionContainer />
          </Section>
          <SettingsAdminServerAdmins />
        </>
      )}

      {(canImpersonate || canAccessFullAdminPanel) && (
        <Section>
          <H2Title
            title={t`Recent Users`}
            // description={
            //   canManageFeatureFlags
            //     ? t`Last 10 users created. Click to manage feature flags or impersonate.`
            //     : t`Last 10 users created. Click to impersonate.`
            // }
          />
          <StyledSearchInputContainer>
            <SettingsTextInput
              instanceId="admin-panel-user-search"
              value={userSearchTerm}
              onChange={setUserSearchTerm}
              placeholder={t`Search by name, email, or user ID...`}
              fullWidth
            />
          </StyledSearchInputContainer>
          {isLoadingUsers ? (
            <SettingsSectionSkeletonLoader />
          ) : recentUsers.length === 0 ? (
            <StyledEmptyState>
              {t`No users found matching your search criteria.`}
            </StyledEmptyState>
          ) : (
            <Table>
              <TableRow
                gridTemplateColumns={RECENT_USERS_GRID_TEMPLATE_COLUMNS}
              >
                <TableHeader>{t`Name`}</TableHeader>
                <TableHeader>{t`Email`}</TableHeader>
                <TableHeader>{t`Workspace`}</TableHeader>
                <TableHeader />
              </TableRow>
              <TableBody>
                {recentUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    gridTemplateColumns={RECENT_USERS_GRID_TEMPLATE_COLUMNS}
                    to={getSettingsPath(SettingsPath.AdminPanelUserDetail, {
                      userId: user.id,
                    })}
                  >
                    <TableCell
                      color={themeCssVariables.font.color.primary}
                      gap={themeCssVariables.spacing[2]}
                      overflow="hidden"
                    >
                      <Avatar
                        avatarUrl={getAbsoluteImageUrl(user.avatarUrl)}
                        placeholder={
                          `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
                          user.email
                        }
                        placeholderColorSeed={user.id}
                        size="md"
                        type="rounded"
                      />
                      <OverflowingTextWithTooltip
                        text={
                          `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
                          '\u2014'
                        }
                      />
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell
                      gap={themeCssVariables.spacing[2]}
                      overflow="hidden"
                    >
                      {user.workspaceId ? (
                        <>
                          <Avatar
                            avatarUrl={getAbsoluteImageUrl(user.workspaceLogo)}
                            placeholder={user.workspaceName || ''}
                            placeholderColorSeed={user.workspaceId}
                            size="sm"
                          />
                          <OverflowingTextWithTooltip
                            text={user.workspaceName || '\u2014'}
                          />
                        </>
                      ) : (
                        '\u2014'
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <IconChevronRight
                        size={theme.icon.size.md}
                        stroke={theme.icon.stroke.sm}
                        color={theme.font.color.tertiary}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <SettingsAdminPagination
                currentPage={recentUsersPage}
                totalPages={recentUsersTotalPages}
                onChange={setRecentUsersPage}
              />
            </Table>
          )}
        </Section>
      )}

      {canImpersonate && (
        <Section>
          <H2Title
            title={t`Top Workspaces`}
            // description={t`Top 10 workspaces by number of users`}
          />
          <StyledSearchInputContainer>
            <SettingsTextInput
              instanceId="admin-panel-workspace-search"
              value={workspaceSearchTerm}
              onChange={setWorkspaceSearchTerm}
              placeholder={t`Search by workspace name, subdomain, or ID...`}
              fullWidth
            />
          </StyledSearchInputContainer>
          {isLoadingWorkspaces ? (
            <SettingsSectionSkeletonLoader />
          ) : topWorkspaces.length === 0 ? (
            <StyledEmptyState>
              {t`No workspaces found matching your search criteria.`}
            </StyledEmptyState>
          ) : (
            <Table>
              <TableRow
                gridTemplateColumns={TOP_WORKSPACES_GRID_TEMPLATE_COLUMNS}
              >
                <TableHeader>{t`Workspace`}</TableHeader>
                <TableHeader align="right">{t`Users`}</TableHeader>
                <TableHeader />
              </TableRow>
              <TableBody>
                {topWorkspaces.map((workspace) => (
                  <TableRow
                    key={workspace.id}
                    gridTemplateColumns={TOP_WORKSPACES_GRID_TEMPLATE_COLUMNS}
                    to={getSettingsPath(
                      SettingsPath.AdminPanelWorkspaceDetail,
                      { workspaceId: workspace.id },
                    )}
                  >
                    <TableCell
                      color={themeCssVariables.font.color.primary}
                      gap={themeCssVariables.spacing[2]}
                      overflow="hidden"
                    >
                      <Avatar
                        avatarUrl={getAbsoluteImageUrl(workspace.logoUrl)}
                        placeholder={workspace.name || ''}
                        placeholderColorSeed={workspace.id}
                        size="md"
                      />
                      <OverflowingTextWithTooltip
                        text={workspace.name || '\u2014'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {formatNumber(workspace.totalUsers)}
                    </TableCell>
                    <TableCell align="center">
                      <IconChevronRight
                        size={theme.icon.size.md}
                        stroke={theme.icon.stroke.sm}
                        color={theme.font.color.tertiary}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <SettingsAdminPagination
                currentPage={topWorkspacesPage}
                totalPages={topWorkspacesTotalPages}
                onChange={setTopWorkspacesPage}
              />
            </Table>
          )}
        </Section>
      )}
    </>
  );
};
