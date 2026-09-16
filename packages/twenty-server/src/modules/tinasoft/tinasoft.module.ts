import { Module } from '@nestjs/common';

import { TinasoftWorkflowTemplateModule } from 'src/modules/tinasoft/workflow-template/tinasoft-workflow-template.module';

@Module({
  imports: [TinasoftWorkflowTemplateModule],
  exports: [TinasoftWorkflowTemplateModule],
})
export class TinasoftModule {}
