import { type I18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
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
import { getStringWorkflowTemplateSetting } from 'src/modules/tinasoft/workflow-template/utils/workflow-template-settings.util';
import { WorkflowTriggerType } from 'src/modules/workflow/workflow-trigger/types/workflow-trigger.type';

@Injectable()
export class HrCvIntakeMatchingWorkflowTemplateBuilder
  implements IWorkflowTemplateBuilder
{
  readonly id = 'hr-cv-intake-matching' as const;

  getDTO(_workspaceDisplayName: string, i18n?: I18n): WorkflowTemplateDTO {
    return {
      id: this.id,
      name: 'Tự động sàng lọc CV & Chấm điểm AHP',
      description:
        'Tự động tiếp nhận CV từ Webhook (TopCV, biểu mẫu tuyển dụng), trích xuất thông tin ứng viên, chấm điểm độ phù hợp theo mô hình AHP và gửi email báo cáo chi tiết cho PM/HR.',
      shortDescription:
        'Tự động nhận hồ sơ ứng viên, chấm điểm AHP đa tiêu chí và báo cáo kết quả.',
      purpose:
        'Tối ưu hóa quy trình tuyển dụng, rút ngắn 80% thời gian lọc hồ sơ và đánh giá ứng viên khách quan theo ma trận kỹ năng, kinh nghiệm, học vấn.',
      category: 'Tuyển dụng & HR',
      icon: 'IconUserCheck',
      requiredSettings: [
        {
          key: 'pmEmail',
          type: 'email',
          label:
            i18n?._(msg`PM / HR notification email`) ??
            'Email PM / Người nhận thông báo',
          defaultValue: 'tuyendung@tinasoft.vn',
        },
      ],
    };
  }

  build({
    settings,
    workspaceId,
    workspaceUrl,
  }: WorkflowTemplateBuildContext): WorkflowTemplateDefinition {
    const ahpStepId = uuidv4();
    const createCandidateStepId = uuidv4();
    const sendEmailStepId = uuidv4();

    const pmEmail = getStringWorkflowTemplateSetting({
      settings,
      key: 'pmEmail',
    });

    const { ahpMatching } = getWorkflowTemplateLogicFunctionIds(workspaceId);

    const emailBody = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 650px; margin: 0 auto; background-color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
  <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 24px; border-radius: 10px; text-align: center; color: #ffffff; margin-bottom: 20px;">
    <h2 style="margin: 0 0 6px 0; font-size: 22px;">TINASOFT RECRUITMENT ATS</h2>
    <p style="margin: 0; font-size: 14px;">Báo cáo Phân tích & Đánh giá Độ phù hợp Ứng viên (AHP Engine)</p>
  </div>
  <div style="background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
    <h3>👤 {{${ahpStepId}.mappedFullName}}</h3>
    <p>Vị trí ứng tuyển: <strong style="color: #2563eb;">{{${ahpStepId}.mappedJobTitle}}</strong> | Nguồn: {{${ahpStepId}.source}}</p>
    <p>📧 Email: {{${ahpStepId}.mappedEmail}} | 📱 SĐT: {{${ahpStepId}.mappedPhone}}</p>
    <p>🎯 Điểm phù hợp: <strong style="color: #059669; font-size: 16px;">{{${ahpStepId}.matchingScore}}%</strong> ({{${ahpStepId}.recommendation}})</p>
  </div>
  <div style="background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
    <h4>📊 CHI TIẾT BÀI ĐÁNH GIÁ THEO MÔ HÌNH AHP:</h4>
    <pre style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px dashed #cbd5e1; font-family: inherit; font-size: 13.5px; white-space: pre-wrap;">{{${ahpStepId}.aiEvaluation}}</pre>
  </div>
  <div style="text-align: center; margin: 24px 0;">
    <a href="${workspaceUrl}/objects/candidates" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">👉 Xem Hồ sơ trên CRM</a>
  </div>
</div>`;

    return {
      workflowName: 'Sàng lọc hồ sơ ứng viên & Chấm điểm AHP',
      trigger: {
        name: 'Nhận hồ sơ ứng tuyển từ Webhook (TopCV / Form)',
        type: WorkflowTriggerType.WEBHOOK,
        settings: {
          httpMethod: 'POST',
          expectedBody: {},
          outputSchema: {},
          authentication: null,
        },
        position: { x: 0, y: 0 },
        nextStepIds: [ahpStepId],
      },
      steps: [
        {
          id: ahpStepId,
          name: 'Universal Mapper & Chấm AHP Đa Nguồn',
          type: WorkflowActionType.CODE,
          valid: true,
          position: { x: 0, y: 150 },
          settings: {
            input: {
              logicFunctionId: ahpMatching,
              logicFunctionInput: {
                trigger: '{{trigger}}',
              },
            },
            outputSchema: {
              source: {
                type: FieldMetadataType.TEXT,
                label: 'Intake Source',
                isLeaf: true,
                value: 'TopCV',
              },
              pmEmail: {
                type: FieldMetadataType.TEXT,
                label: 'PM Email',
                isLeaf: true,
                value: 'tuyendung@tinasoft.vn',
              },
              mappedEmail: {
                type: FieldMetadataType.TEXT,
                label: 'Candidate Email',
                isLeaf: true,
                value: 'candidate@example.com',
              },
              mappedPhone: {
                type: FieldMetadataType.TEXT,
                label: 'Candidate Phone',
                isLeaf: true,
                value: '0901234567',
              },
              aiEvaluation: {
                type: FieldMetadataType.TEXT,
                label: 'AI Evaluation Summary',
                isLeaf: true,
                value: 'Strong match',
              },
              mappedCvText: {
                type: FieldMetadataType.TEXT,
                label: 'CV Text',
                isLeaf: true,
                value: 'CV content',
              },
              matchingScore: {
                type: FieldMetadataType.NUMBER,
                label: 'Matching Score (%)',
                isLeaf: true,
                value: 87,
              },
              mappedFullName: {
                type: FieldMetadataType.TEXT,
                label: 'Candidate Name',
                isLeaf: true,
                value: 'Nguyen Van A',
              },
              mappedJobTitle: {
                type: FieldMetadataType.TEXT,
                label: 'Job Title',
                isLeaf: true,
                value: 'Software Engineer',
              },
              recommendation: {
                type: FieldMetadataType.TEXT,
                label: 'Recommendation',
                isLeaf: true,
                value: 'Interview',
              },
            },
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [createCandidateStepId],
        },
        {
          id: createCandidateStepId,
          name: 'Tự động tạo Candidate trên CRM',
          type: WorkflowActionType.CREATE_RECORD,
          valid: true,
          position: { x: 0, y: 300 },
          settings: {
            input: {
              objectName: 'candidate',
              objectRecord: {
                name: `{{${ahpStepId}.mappedFullName}}`,
                email: `{{${ahpStepId}.mappedEmail}}`,
                cvtext: `{{${ahpStepId}.mappedCvText}}`,
                status: 'SCREENING',
                pmemail: `{{${ahpStepId}.pmEmail}}`,
                fullname: `{{${ahpStepId}.mappedFullName}}`,
                jobtitle: `{{${ahpStepId}.mappedJobTitle}}`,
                aievaluation: `{{${ahpStepId}.aiEvaluation}}`,
                matchingscore: `{{${ahpStepId}.matchingScore}}`,
              },
            },
            outputSchema: {
              id: {
                type: FieldMetadataType.TEXT,
                label: 'Candidate ID',
                isLeaf: true,
                value: '',
              },
            },
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [sendEmailStepId],
        },
        {
          id: sendEmailStepId,
          name: 'Gửi Email Kết quả cho PM',
          type: WorkflowActionType.SEND_EMAIL,
          valid: true,
          position: { x: 0, y: 450 },
          settings: {
            input: {
              connectedAccountId: '',
              recipients: {
                to: pmEmail,
                cc: '',
                bcc: '',
              },
              subject: `[{{${ahpStepId}.source}} Matching: {{${ahpStepId}.matchingScore}}%] Ứng viên {{${ahpStepId}.mappedFullName}} - Vị trí {{${ahpStepId}.mappedJobTitle}}`,
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
