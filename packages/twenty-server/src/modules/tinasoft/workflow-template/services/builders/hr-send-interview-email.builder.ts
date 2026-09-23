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

    const emailBody = `<div style="margin:0;background:#f4f7fb;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #dbe3ef;border-radius:12px;overflow:hidden;">
    <div style="background:#2457c5;padding:28px 24px;color:#ffffff;">
      <div style="font-size:12px;letter-spacing:1px;font-weight:bold;">TINASOFT RECRUITMENT ATS</div>
      <div style="margin-top:8px;font-size:24px;line-height:1.25;font-weight:bold;">Xác nhận lịch phỏng vấn</div>
    </div>
    <div style="padding:28px 24px 20px;">
      <p style="margin:0 0 20px;font-size:16px;line-height:1.6;">Xin chào <strong>{{trigger.payload.candidateName}}</strong>,</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:15px;line-height:1.6;">
        <tr><td style="width:145px;padding:8px 0;color:#64748b;">Vị trí ứng tuyển</td><td style="padding:8px 0;font-weight:bold;color:#2457c5;">{{trigger.payload.jobTitle}}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Thời gian</td><td style="padding:8px 0;font-weight:bold;">{{${signatureStepId}.formattedDate}}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Người phỏng vấn</td><td style="padding:8px 0;">{{trigger.payload.interviewer}}</td></tr>
      </table>
      <div style="margin-top:22px;text-align:center;"><a href="{{trigger.payload.meetingLink}}" style="display:inline-block;background:#2457c5;color:#ffffff;text-decoration:none;border-radius:6px;padding:12px 22px;font-size:14px;font-weight:bold;">Tham gia phỏng vấn</a></div>
      <p style="margin:12px 0 0;text-align:center;font-size:12px;line-height:1.5;color:#64748b;word-break:break-all;">{{trigger.payload.meetingLink}}</p>
    </div>
    <div style="margin:0 24px;border-top:1px solid #e5e7eb;"></div>
    <div style="padding:20px 24px 28px;">{{${signatureStepId}.signatureHtml}}</div>
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
              connectedAccountId: '',
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
