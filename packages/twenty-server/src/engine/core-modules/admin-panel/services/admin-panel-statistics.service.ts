import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { isNonEmptyString } from '@sniptt/guards';
import {
  Brackets,
  ILike,
  IsNull,
  Repository,
  type SelectQueryBuilder,
} from 'typeorm';

import { type AdminPanelRecentUserDTO } from 'src/engine/core-modules/admin-panel/dtos/admin-panel-recent-user.dto';
import { type AdminPanelRecentUsersPageDTO } from 'src/engine/core-modules/admin-panel/dtos/admin-panel-recent-users-page.dto';
import { type AdminPanelTopWorkspacesPageDTO } from 'src/engine/core-modules/admin-panel/dtos/admin-panel-top-workspaces-page.dto';
import { type AdminPanelTopWorkspaceDTO } from 'src/engine/core-modules/admin-panel/dtos/admin-panel-top-workspace.dto';
import { FileUrlService } from 'src/engine/core-modules/file/file-url/file-url.service';
import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { UserService } from 'src/engine/core-modules/user/services/user.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

const RECENT_USERS_LIMIT = 10;
const TOP_WORKSPACES_LIMIT = 10;

@Injectable()
export class AdminPanelStatisticsService {
  constructor(
    private readonly fileUrlService: FileUrlService,
    private readonly userService: UserService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
  ) {}

  async getRecentUsers(
    searchTerm?: string,
    page = 1,
    pageSize = RECENT_USERS_LIMIT,
  ): Promise<AdminPanelRecentUsersPageDTO> {
    const queryBuilder = this.createRecentUsersQueryBuilder(searchTerm)
      .leftJoinAndSelect(
        'user.userWorkspaces',
        'userWorkspace',
        '"userWorkspace"."deletedAt" IS NULL',
      )
      .leftJoinAndSelect(
        'userWorkspace.workspace',
        'workspace',
        '"workspace"."deletedAt" IS NULL',
      )
      .orderBy('user.createdAt', 'DESC')
      .addOrderBy('userWorkspace.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [users, totalCount] = await Promise.all([
      queryBuilder.getMany(),
      this.getRecentUsersCount(searchTerm),
    ]);

    const signedAvatarUrlByUserId =
      await this.buildSignedAvatarUrlByUserId(users);

    const items: AdminPanelRecentUserDTO[] = await Promise.all(
      users.map(async (user) => {
        const displayWorkspace = user.userWorkspaces[0]?.workspace;

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName ?? undefined,
          lastName: user.lastName ?? undefined,
          createdAt: user.createdAt,
          avatarUrl: signedAvatarUrlByUserId.get(user.id) ?? null,
          workspaceName: displayWorkspace?.displayName ?? null,
          workspaceId: displayWorkspace?.id ?? null,
          workspaceLogo: displayWorkspace
            ? await this.fileUrlService.signWorkspaceLogoUrl(displayWorkspace)
            : null,
        };
      }),
    );

    return {
      items,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  }

  private async getRecentUsersCount(searchTerm?: string): Promise<number> {
    return this.createRecentUsersQueryBuilder(searchTerm).getCount();
  }

  private createRecentUsersQueryBuilder(
    searchTerm?: string,
  ): SelectQueryBuilder<UserEntity> {
    const trimmedSearch = searchTerm?.trim();

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where({ deletedAt: IsNull() });

    if (trimmedSearch && trimmedSearch.length > 0) {
      const like = `%${trimmedSearch}%`;

      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where({ email: ILike(like) })
            .orWhere(
              `CONCAT("user"."firstName", ' ', "user"."lastName") ILIKE :like`,
              { like },
            )
            .orWhere('"user"."id"::text ILIKE :like', { like });
        }),
      );
    }

    return queryBuilder;
  }

  async getTopWorkspaces(
    searchTerm?: string,
    page = 1,
    pageSize = TOP_WORKSPACES_LIMIT,
  ): Promise<AdminPanelTopWorkspacesPageDTO> {
    const queryBuilder = this.createTopWorkspacesQueryBuilder(searchTerm)
      .leftJoin(
        'workspace.workspaceUsers',
        'userWorkspace',
        '"userWorkspace"."deletedAt" IS NULL',
      )
      .select('workspace.id', 'id')
      .addSelect('workspace.displayName', 'name')
      .addSelect('workspace.subdomain', 'subdomain')
      .addSelect('workspace.logoFileId', 'logoFileId')
      .addSelect('COUNT("userWorkspace"."id")::int', 'totalUsers')
      .groupBy('workspace.id')
      .orderBy('"totalUsers"', 'DESC')
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    const [rows, totalCount] = await Promise.all([
      queryBuilder.getRawMany<{
        id: string;
        name: string | null;
        subdomain: string | null;
        logoFileId: string | null;
        totalUsers: number;
      }>(),
      this.getTopWorkspacesCount(searchTerm),
    ]);

    const items: AdminPanelTopWorkspaceDTO[] = await Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        logoUrl: await this.fileUrlService.signWorkspaceLogoUrl({
          id: row.id,
          logoFileId: row.logoFileId,
        }),
        name: row.name ?? '',
        subdomain: row.subdomain ?? '',
        totalUsers: row.totalUsers,
      })),
    );

    return {
      items,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  }

  private async getTopWorkspacesCount(searchTerm?: string): Promise<number> {
    return this.createTopWorkspacesQueryBuilder(searchTerm).getCount();
  }

  private createTopWorkspacesQueryBuilder(
    searchTerm?: string,
  ): SelectQueryBuilder<WorkspaceEntity> {
    const trimmedSearch = searchTerm?.trim();

    const queryBuilder = this.workspaceRepository
      .createQueryBuilder('workspace')
      .where({ deletedAt: IsNull() });

    if (trimmedSearch && trimmedSearch.length > 0) {
      const like = `%${trimmedSearch}%`;

      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('"workspace"."displayName" ILIKE :like', { like })
            .orWhere('"workspace"."subdomain" ILIKE :like', { like })
            .orWhere('"workspace"."id"::text ILIKE :like', { like });
        }),
      );
    }

    return queryBuilder;
  }

  private async buildSignedAvatarUrlByUserId(
    users: UserEntity[],
  ): Promise<Map<string, string | null>> {
    const signedAvatarUrlByUserId = new Map<string, string | null>();
    const contextsByWorkspaceId = new Map<
      string,
      {
        workspace: WorkspaceEntity;
        fallbackAvatarUrlsByUserId: Map<string, string | null>;
      }
    >();

    for (const user of users) {
      signedAvatarUrlByUserId.set(user.id, null);

      for (const userWorkspace of user.userWorkspaces) {
        const workspace = userWorkspace.workspace;

        if (!workspace) {
          continue;
        }

        const entry = contextsByWorkspaceId.get(workspace.id) ?? {
          workspace,
          fallbackAvatarUrlsByUserId: new Map(),
        };

        entry.fallbackAvatarUrlsByUserId.set(
          user.id,
          userWorkspace.defaultAvatarUrl ?? null,
        );
        contextsByWorkspaceId.set(workspace.id, entry);
      }
    }

    await Promise.all(
      Array.from(contextsByWorkspaceId.values()).map(
        async ({ workspace, fallbackAvatarUrlsByUserId }) => {
          const perWorkspaceSigned =
            await this.userService.loadSignedAvatarUrlsByUserId({
              workspace,
              fallbackAvatarUrlsByUserId,
            });

          for (const [userId, signedUrl] of perWorkspaceSigned.entries()) {
            const existing = signedAvatarUrlByUserId.get(userId);

            if (!isNonEmptyString(existing) && isNonEmptyString(signedUrl)) {
              signedAvatarUrlByUserId.set(userId, signedUrl);
            }
          }
        },
      ),
    );

    return signedAvatarUrlByUserId;
  }
}
