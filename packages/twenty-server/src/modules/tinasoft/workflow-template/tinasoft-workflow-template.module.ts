import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WorkspaceDomainsModule } from 'src/engine/core-modules/domain/workspace-domains/workspace-domains.module';
import { RecordPositionModule } from 'src/engine/core-modules/record-position/record-position.module';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { FieldMetadataModule } from 'src/engine/metadata-modules/field-metadata/field-metadata.module';
import { WorkspaceManyOrAllFlatEntityMapsCacheModule } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.module';
import { ObjectMetadataModule } from 'src/engine/metadata-modules/object-metadata/object-metadata.module';
import { PermissionsModule } from 'src/engine/metadata-modules/permissions/permissions.module';
import { StandardObjectsPrefillModule } from 'src/engine/workspace-manager/standard-objects-prefill-data/standard-objects-prefill.module';
import { WorkflowTemplateResolver } from 'src/modules/tinasoft/workflow-template/api/workflow-template.resolver';
import { type IWorkflowTemplateBuilder } from 'src/modules/tinasoft/workflow-template/services/builders/workflow-template.builder.interface';
import {
  WORKFLOW_TEMPLATE_BUILDER,
  WORKFLOW_TEMPLATE_BUILDERS,
} from 'src/modules/tinasoft/workflow-template/services/builders/workflow-template-builder.constants';
import { WorkflowTemplateFactory } from 'src/modules/tinasoft/workflow-template/services/workflow-template.factory';
import { WorkflowTemplateWorkspaceService } from 'src/modules/tinasoft/workflow-template/services/workflow-template.workspace-service';
import { WorkflowSchemaModule } from 'src/modules/workflow/workflow-builder/workflow-schema/workflow-schema.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkspaceEntity]),
    WorkspaceDomainsModule,
    RecordPositionModule,
    PermissionsModule,
    StandardObjectsPrefillModule,
    ObjectMetadataModule,
    FieldMetadataModule,
    WorkspaceManyOrAllFlatEntityMapsCacheModule,
    WorkflowSchemaModule,
  ],
  providers: [
    WorkflowTemplateResolver,
    WorkflowTemplateWorkspaceService,
    WorkflowTemplateFactory,
    ...WORKFLOW_TEMPLATE_BUILDERS,
    {
      provide: WORKFLOW_TEMPLATE_BUILDER,
      useFactory: (...builders: IWorkflowTemplateBuilder[]) => builders,
      inject: [...WORKFLOW_TEMPLATE_BUILDERS],
    },
  ],
})
export class TinasoftWorkflowTemplateModule {}
