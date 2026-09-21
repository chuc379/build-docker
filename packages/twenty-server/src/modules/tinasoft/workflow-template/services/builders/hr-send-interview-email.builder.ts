import { Injectable } from '@nestjs/common';
import { type I18n } from '@lingui/core';
import { v4 as uuidv4 } from 'uuid';

import { FieldMetadataType } from 'twenty-shared/types';
import { WorkflowActionType } from 'twenty-shared/workflow';

import { getWorkflowTemplateLogicFunctionIds } from 'src/modules/tinasoft/workflow-template/catalog/workflow-template-logic-functions.constant';
import { WorkflowTemplateDTO } from 'src/modules/tinasoft/workflow-template/api/dtos/workflow-template.dto';
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
        'Chọn một hồ sơ phỏng vấn đã có sẵn, hệ thống lấy thông tin ứng viên (email, CC, BCC) và ảnh chữ ký trên trường signature rồi nhúng khối ký duyệt vào cuối nội dung thư và gửi email xác nhận.',
      shortDescription:
        'Gửi email xác nhận phỏng vấn với ảnh chữ ký ký duyệt được nhúng vào cuối thư.',
      purpose:
        'Tách bước gửi email xác nhận ra khỏi bước lên lịch: HR chọn hồ sơ phỏng vấn và hệ thống tự động soạn thư với CC/BCC cùng khối ký duyệt (ảnh chữ ký nhúng trong HTML).',
      category: 'Tuyển dụng & HR',
      icon: 'IconMail',
      requiredSettings: [],
    };
  }

  build({
    settings: _settings,
    workspaceId,
  }: WorkflowTemplateBuildContext): WorkflowTemplateDefinition {
    const formStepId = uuidv4();
    const findStepId = uuidv4();
    const signatureStepId = uuidv4();
    const sendEmailStepId = uuidv4();
    const { interviewSignature } = getWorkflowTemplateLogicFunctionIds(
      workspaceId,
    );

    const emailBody = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
  <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 24px; border-radius: 10px; text-align: center; color: #ffffff; margin-bottom: 20px;">
    <h2 style="margin: 0 0 6px 0; font-size: 22px;">TINASOFT RECRUITMENT ATS</h2>
    <p style="margin: 0; font-size: 14px;">Xác nhận lịch phỏng vấn</p>
  </div>
  <div style="background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
    <h3>👤 {{${findStepId}.first.candidateName}}</h3>
    <p>Vị trí ứng tuyển: <strong style="color: #2563eb;">{{${findStepId}.first.jobTitle}}</strong></p>
    <p>📅 Thời gian: <strong>{{${findStepId}.first.dateTime}}</strong></p>
    <p>🧭 Múi giờ: {{${findStepId}.first.timeZone}}</p>
    <p>👥 Người phỏng vấn: {{${findStepId}.first.interviewer}}</p>
    <p>🔗 Link phỏng vấn: <a href="{{${findStepId}.first.meetingLink}}">{{${findStepId}.first.meetingLink}}</a></p>
  </div>
  <div style="background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
    <p style="margin: 0; font-size: 13px; color: #475569;">📝 Ghi chú: {{${findStepId}.first.notes}}</p>
  </div>
  <div style="background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 16px;">
    {{${signatureStepId}.signatureHtml}}
  </div>
</div>`;

    return {
      workflowName: 'HR: Gửi email ký xác nhận phỏng vấn',
      trigger: {
        name: 'Khởi chạy thủ công',
        type: WorkflowTriggerType.MANUAL,
        settings: {
          outputSchema: {},
          icon: 'IconMail',
          availability: { type: 'GLOBAL', locations: undefined },
        },
        position: { x: 0, y: 0 },
        nextStepIds: [formStepId],
      },
      steps: [
        {
          id: formStepId,
          name: 'Chọn hồ sơ phỏng vấn',
          type: WorkflowActionType.FORM,
          valid: true,
          position: { x: 0, y: 150 },
          settings: {
            input: [
              {
                id: uuidv4(),
                name: 'interview',
                type: 'RECORD',
                label: 'Hồ sơ phỏng vấn',
                settings: { objectName: 'interview' },
              },
            ],
            outputSchema: {
              interview: {
                type: 'RECORD',
                label: 'Hồ sơ phỏng vấn',
                isLeaf: true,
                value: {
                  id: `{{${formStepId}.interview.id}}`,
                },
              },
            },
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [findStepId],
        },
        {
          id: findStepId,
          name: 'Lấy thông tin hồ sơ phỏng vấn',
          type: WorkflowActionType.FIND_RECORDS,
          valid: true,
          position: { x: 0, y: 300 },
          settings: {
            input: {
              objectName: 'interview',
              limit: 1,
              filter: {
                recordFilters: [
                  {
                    fieldMetadataId: 'id',
                    type: 'UUID',
                    value: `{{${formStepId}.interview.id}}`,
                    operand: 'IS',
                  },
                ],
              },
            },
            outputSchema: {
              first: {
                type: 'RECORD',
                fieldName: 'first',
                isLeaf: false,
                value: {
                  id: `{{${findStepId}.first.id}}`,
                  candidateName: `{{${findStepId}.first.candidateName}}`,
                  candidateEmail: `{{${findStepId}.first.candidateEmail}}`,
                  jobTitle: `{{${findStepId}.first.jobTitle}}`,
                  interviewer: `{{${findStepId}.first.interviewer}}`,
                  dateTime: `{{${findStepId}.first.dateTime}}`,
                  timeZone: `{{${findStepId}.first.timeZone}}`,
                  meetingLink: `{{${findStepId}.first.meetingLink}}`,
                  notes: `{{${findStepId}.first.notes}}`,
                  cc: `{{${findStepId}.first.cc}}`,
                  bcc: `{{${findStepId}.first.bcc}}`,
                  signature: `{{${findStepId}.first.signature}}`,
                },
              },
            },
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [signatureStepId],
        },
        {
          id: signatureStepId,
          name: 'Ký duyệt: nhúng ảnh chữ ký vào thư',
          type: WorkflowActionType.CODE,
          valid: true,
          position: { x: 0, y: 450 },
          settings: {
            input: {
              logicFunctionId: interviewSignature,
              logicFunctionInput: {
                signature: `{{${findStepId}.first.signature}}`,
                signerName: `{{${findStepId}.first.interviewer}}`,
                dateTime: `{{${findStepId}.first.dateTime}}`,
              },
            },
            outputSchema: {
              signatureHtml: {
                type: FieldMetadataType.TEXT,
                label: 'Khối ký duyệt (HTML)',
                isLeaf: true,
                value:
                  '<div style="margin-top: 20px;">Ký duyệt xác nhận phỏng vấn</div>',
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
          position: { x: 0, y: 600 },
          settings: {
            input: {
              connectedAccountId: '',
              recipients: {
                to: `{{${findStepId}.first.candidateEmail}}`,
                cc: `{{${findStepId}.first.cc}}`,
                bcc: `{{${findStepId}.first.bcc}}`,
              },
              subject: `Xác nhận lịch phỏng vấn - {{${findStepId}.first.jobTitle}}`,
              body: emailBody,
            },
            outputSchema: {
              result: {
                type: 'RECORD',
                fieldName: 'result',
                isLeaf: true,
              },
            },
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
        },
      ],
    };
  }
}