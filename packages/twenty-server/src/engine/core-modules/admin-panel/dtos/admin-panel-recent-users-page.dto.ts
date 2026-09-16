import { Field, Int, ObjectType } from '@nestjs/graphql';

import { AdminPanelRecentUserDTO } from 'src/engine/core-modules/admin-panel/dtos/admin-panel-recent-user.dto';

@ObjectType('AdminPanelRecentUsersPage')
export class AdminPanelRecentUsersPageDTO {
  @Field(() => [AdminPanelRecentUserDTO])
  items!: AdminPanelRecentUserDTO[];

  @Field(() => Int)
  totalCount!: number;

  @Field(() => Int)
  currentPage!: number;

  @Field(() => Int)
  totalPages!: number;
}
