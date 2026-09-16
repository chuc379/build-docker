import { Field, Int, ObjectType } from '@nestjs/graphql';

import { AdminPanelTopWorkspaceDTO } from 'src/engine/core-modules/admin-panel/dtos/admin-panel-top-workspace.dto';

@ObjectType('AdminPanelTopWorkspacesPage')
export class AdminPanelTopWorkspacesPageDTO {
  @Field(() => [AdminPanelTopWorkspaceDTO])
  items!: AdminPanelTopWorkspaceDTO[];

  @Field(() => Int)
  totalCount!: number;

  @Field(() => Int)
  currentPage!: number;

  @Field(() => Int)
  totalPages!: number;
}
