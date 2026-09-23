import { type I18n } from '@lingui/core';
import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { FieldMetadataType } from 'twenty-shared/types';
import { WorkflowActionType } from 'twenty-shared/workflow';

import { WorkflowTemplateDTO } from 'src/modules/tinasoft/workflow-template/api/dtos/workflow-template.dto';
import { getWorkflowTemplateLogicFunctionIds } from 'src/modules/tinasoft/workflow-template/catalog/workflow-template-logic-functions.constant';
import { IWorkflowTemplateBuilder } from 'src/modules/tinasoft/workflow-template/services/builders/workflow-template.builder.interface';
import {
  type WorkflowTemplateBuildContext,
  type WorkflowTemplateDefinition,
} from 'src/modules/tinasoft/workflow-template/types/workflow-template.type';
import { ERROR_HANDLING_OPTIONS } from 'src/modules/tinasoft/workflow-template/utils/workflow-template-builder-helpers.util';
import { WorkflowTriggerType } from 'src/modules/workflow/workflow-trigger/types/workflow-trigger.type';

@Injectable()
export class HrSendInterviewEmailWorkflowTemplateBuilder
  implements IWorkflowTemplateBuilder
{
  readonly id = 'hr-send-interview-email' as const;

  getDTO(_workspaceDisplayName: string, _i18n?: I18n): WorkflowTemplateDTO {
    return {
      id: this.id,
      name: 'Gửi email ký xác nhận phỏng vấn',
      description:
        'Chọn một hồ sơ phỏng vấn trên trigger SINGLE, hệ thống lấy thông tin ứng viên (email, CC, BCC) và ảnh chữ ký rồi nhúng khối ký duyệt vào cuối nội dung thư để gửi email xác nhận.',
      shortDescription:
        'Gửi email xác nhận phỏng vấn với ảnh chữ ký ký duyệt được nhúng vào cuối thư.',
      purpose:
        'Tách bước gửi email xác nhận ra khỏi bước lên lịch: HR chọn hồ sơ phỏng vấn ngay ở trigger SINGLE và hệ thống tự động soạn thư với CC/BCC cùng khối ký duyệt.',
      category: 'Tuyển dụng & HR',
      icon: 'IconMail',
      requiredSettings: [],
    };
  }

  build({
    settings: _settings,
    workspaceId,
  }: WorkflowTemplateBuildContext): WorkflowTemplateDefinition {
    const signatureStepId = uuidv4();
    const sendEmailStepId = uuidv4();
    const { interviewSignature } = getWorkflowTemplateLogicFunctionIds(workspaceId);

    const emailBody = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
  <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 24px; border-radius: 10px; text-align: center; color: #ffffff; margin-bottom: 20px;">
    <h2 style="margin: 0 0 6px 0; font-size: 22px;">TINASOFT RECRUITMENT ATS</h2>
    <p style="margin: 0; font-size: 14px;">Xác nhận lịch phỏng vấn</p>
  </div>
  <div style="background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
    <h3>👤 {{trigger.payload.candidateName}}</h3>
    <p>Vị trí ứng tuyển: <strong style="color: #2563eb;">{{trigger.payload.jobTitle}}</strong></p>
    <p>📅 Thời gian: <strong>{{trigger.payload.dateTime}}</strong></p>
    <p>👥 Người phỏng vấn: {{trigger.payload.interviewer}}</p>
    <p>🔗 Link phỏng vấn: <a href="{{trigger.payload.meetingLink}}">{{trigger.payload.meetingLink}}</a></p>
  </div>
  <div style="background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 16px;">
    {{${signatureStepId}.signatureHtml}}
  </div>
</div>`;

    return {
      workflowName: 'HR: Gửi email ký xác nhận phỏng vấn',
      trigger: {
        name: 'Khởi chạy từ hồ sơ phỏng vấn',
        type: WorkflowTriggerType.MANUAL,
        settings: {
          outputSchema: {
            payload: {
              type: 'object',
              label: 'Record',
              value: {
                id: {
                  type: FieldMetadataType.TEXT,
                  label: 'ID hồ sơ',
                  value: '00000000-0000-0000-0000-000000000000',
                  isLeaf: true,
                },
                candidateName: {
                  type: FieldMetadataType.TEXT,
                  label: 'Tên ứng viên',
                  value: 'Nguyễn Văn A',
                  isLeaf: true,
                },
                candidateEmail: {
                  type: FieldMetadataType.TEXT,
                  label: 'Email ứng viên',
                  value: 'candidate@example.com',
                  isLeaf: true,
                },
                cc: {
                  type: FieldMetadataType.TEXT,
                  label: 'CC',
                  value: '',
                  isLeaf: true,
                },
                bcc: {
                  type: FieldMetadataType.TEXT,
                  label: 'BCC',
                  value: '',
                  isLeaf: true,
                },
                jobTitle: {
                  type: FieldMetadataType.TEXT,
                  label: 'Vị trí ứng tuyển',
                  value: 'Software Engineer',
                  isLeaf: true,
                },
                interviewer: {
                  type: FieldMetadataType.TEXT,
                  label: 'Người phỏng vấn',
                  value: 'HR Manager',
                  isLeaf: true,
                },
                dateTime: {
                  type: FieldMetadataType.DATE_TIME,
                  label: 'Ngày giờ phỏng vấn',
                  value: '2026-01-01T09:00:00Z',
                  isLeaf: true,
                },
                meetingLink: {
                  type: FieldMetadataType.TEXT,
                  label: 'Link phỏng vấn',
                  value: 'https://meet.google.com/abc-defg-hij',
                  isLeaf: true,
                },
                signature: {
                  type: FieldMetadataType.FILES,
                  label: 'Chữ ký (File ảnh)',
                  value: [],
                  isLeaf: true,
                },
              },
              isLeaf: false,
            },
            metadata: {
              type: 'object',
              label: 'Metadata',
              value: {
                workspaceMemberId: {
                  type: FieldMetadataType.TEXT,
                  label: 'Workspace Member',
                  value: '00000000-0000-0000-0000-000000000000',
                  isLeaf: true,
                },
              },
              isLeaf: false,
            },
          },
          icon: 'IconMail',
          availability: {
            type: 'SINGLE_RECORD',
            objectNameSingular: 'interview',
          },
        },
        position: { x: 0, y: 0 },
        nextStepIds: [signatureStepId],
      },
      steps: [
        {
          id: signatureStepId,
          name: 'Ký duyệt: nhúng ảnh chữ ký vào thư',
          type: WorkflowActionType.CODE,
          valid: true,
          position: { x: 0, y: 150 },
          settings: {
            input: {
              logicFunctionId: interviewSignature,
              logicFunctionInput: {
                signature: '{{trigger.payload.signature}}',
                signerName: '{{trigger.payload.interviewer}}',
                dateTime: '{{trigger.payload.dateTime}}',
              },
            },
            outputSchema: {
              signatureHtml: {
                type: FieldMetadataType.TEXT,
                label: 'Khối ký duyệt (HTML)',
                isLeaf: true,
                value: '<div style="margin-top: 20px;">Ký duyệt xác nhận phỏng vấn</div>',
              },
              hasSignature: {
                type: FieldMetadataType.BOOLEAN,
                label: 'Có chữ ký',
                isLeaf: true,
                value: true,
              },
            },
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [sendEmailStepId],
        },
        {
          id: sendEmailStepId,
          name: 'Gửi email ký duyệt xác nhận phỏng vấn',
          type: WorkflowActionType.SEND_EMAIL,
          valid: true,
          position: { x: 0, y: 300 },
          settings: {
            input: {
              connectedAccountId: '{{trigger.metadata.workspaceMemberId}}',
              recipients: {
                to: '{{trigger.payload.candidateEmail}}',
                cc: '{{trigger.payload.cc}}',
                bcc: '{{trigger.payload.bcc}}',
              },
              subject: 'Xác nhận lịch phỏng vấn - {{trigger.payload.jobTitle}}',
              body: emailBody,
              files: [],
              inReplyTo: '',
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
