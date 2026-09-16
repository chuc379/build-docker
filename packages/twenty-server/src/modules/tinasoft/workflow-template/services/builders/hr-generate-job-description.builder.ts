import { Injectable } from '@nestjs/common';
import { type I18n } from '@lingui/core';
import { v4 as uuidv4 } from 'uuid';

import { FieldMetadataType } from 'twenty-shared/types';
import { WorkflowActionType } from 'twenty-shared/workflow';

import { WorkflowTemplateDTO } from 'src/modules/tinasoft/workflow-template/api/dtos/workflow-template.dto';
import { IWorkflowTemplateBuilder } from 'src/modules/tinasoft/workflow-template/services/builders/workflow-template.builder.interface';
import {
  type WorkflowTemplateBuildContext,
  type WorkflowTemplateDefinition,
} from 'src/modules/tinasoft/workflow-template/types/workflow-template.type';
import { getJobDescriptionAgentId } from 'src/modules/tinasoft/workflow-template/utils/workflow-template-agent.util';
import { ERROR_HANDLING_OPTIONS } from 'src/modules/tinasoft/workflow-template/utils/workflow-template-builder-helpers.util';
import { WorkflowTriggerType } from 'src/modules/workflow/workflow-trigger/types/workflow-trigger.type';

@Injectable()
export class HrGenerateJobDescriptionWorkflowTemplateBuilder
  implements IWorkflowTemplateBuilder
{
  readonly id = 'hr-generate-job-description' as const;

  getDTO(_workspaceDisplayName: string, _i18n?: I18n): WorkflowTemplateDTO {
    return {
      id: this.id,
      name: 'AI Tạo bản mô tả công việc (JD)',
      description:
        'Sinh bản mô tả công việc (Job Description) chuyên nghiệp và chuẩn cấu trúc bằng AI dựa trên thông tin yêu cầu tuyển dụng được nhập vào biểu mẫu.',
      shortDescription:
        'Tạo bản mô tả công việc (JD) chuyên nghiệp bằng Trí tuệ nhân tạo (AI).',
      purpose:
        'Giúp nhà tuyển dụng và HR nhanh chóng tạo bản mô tả công việc chuẩn chỉnh, đầy đủ trách nhiệm, yêu cầu kỹ năng và quyền lợi.',
      category: 'Tuyển dụng & HR',
      icon: 'IconBriefcase',
      requiredSettings: [],
    };
  }

  build({
    workspaceId,
  }: WorkflowTemplateBuildContext): WorkflowTemplateDefinition {
    const formStepId = uuidv4();
    const aiAgentStepId = uuidv4();
    const createRecordStepId = uuidv4();
    const agentId = getJobDescriptionAgentId(workspaceId);

    return {
      workflowName: 'HR: AI Tạo bản mô tả công việc (JD)',
      trigger: {
        name: 'Khởi chạy thủ công',
        type: WorkflowTriggerType.MANUAL,
        settings: {
          outputSchema: {},
          icon: 'IconBriefcase',
          availability: { type: 'GLOBAL', locations: undefined },
        },
        position: { x: 0, y: 0 },
        nextStepIds: [formStepId],
      },
      steps: [
        {
          id: formStepId,
          name: 'Biểu mẫu thông tin tuyển dụng',
          type: WorkflowActionType.FORM,
          valid: true,
          position: { x: 0, y: 150 },
          settings: {
            input: [
              {
                id: uuidv4(),
                name: 'jobInfo',
                type: 'TEXT',
                label: 'Thông tin vị trí tuyển dụng',
                placeholder:
                  'Ví dụ: Lập trình viên NodeJS, 2+ năm kinh nghiệm NestJS/PostgreSQL, lương 20-30M...',
                settings: {
                  minRows: 8,
                  maxRows: 15,
                },
              },
            ],
            outputSchema: {
              jobInfo: {
                type: FieldMetadataType.TEXT,
                label: 'Thông tin vị trí tuyển dụng',
                value: 'Thông tin mô tả',
                isLeaf: true,
              },
            },
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [aiAgentStepId],
        },
        {
          id: aiAgentStepId,
          name: 'AI Sinh bản mô tả công việc (JD)',
          type: WorkflowActionType.AI_AGENT,
          valid: true,
          position: { x: 0, y: 300 },
          settings: {
            input: {
              agentId,
              prompt: `You are an expert HR specialist and recruiter. Based on the following job information, generate a clear job title and a comprehensive, professional job description.\n\nJob Information from user:\n{{${formStepId}.jobInfo}}\n\nExtract or infer a concise job title (e.g. "Software Engineer", "Marketing Manager") and create a well-structured job description.`,
            },
            outputSchema: {
              jobTitle: {
                type: FieldMetadataType.TEXT,
                label: 'Job Title',
                isLeaf: true,
                value: 'Software Engineer',
              },
              jobDescription: {
                type: FieldMetadataType.TEXT,
                label: 'Generated Job Description',
                isLeaf: true,
                value: 'Professional job description',
              },
            },
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [createRecordStepId],
        },
        {
          id: createRecordStepId,
          name: 'Tạo bản ghi Vị trí tuyển dụng',
          type: WorkflowActionType.CREATE_RECORD,
          valid: true,
          position: { x: 0, y: 450 },
          settings: {
            input: {
              objectName: 'jobPosting',
              objectRecord: {
                name: `{{${aiAgentStepId}.jobTitle}}`,
                jobTitle: `{{${aiAgentStepId}.jobTitle}}`,
                jobDescription: `{{${aiAgentStepId}.jobDescription}}`,
              },
            },
            outputSchema: {},
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [],
        },
      ],
    };
  }
}
