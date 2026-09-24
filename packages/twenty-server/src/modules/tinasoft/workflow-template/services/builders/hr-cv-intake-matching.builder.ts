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
import { getCvIntakeEvaluationAgentId } from 'src/modules/tinasoft/workflow-template/utils/workflow-template-agent.util';
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
        'Tự động tiếp nhận CV từ Webhook (TopCV, biểu mẫu tuyển dụng), trích xuất thông tin ứng viên, chấm điểm độ phù hợp theo mô hình AHP bằng AI và gửi email báo cáo chi tiết cho PM/HR.',
      shortDescription:
        'Tự động nhận hồ sơ ứng viên, chấm điểm AHP đa tiêu chí bằng AI và báo cáo kết quả.',
      purpose:
        'Tối ưu hóa quy trình tuyển dụng, rút ngắn 80% thời gian lọc hồ sơ và đánh giá ứng viên khách quan theo ma trận kỹ năng, kinh nghiệm, học vấn bằng AI.',
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
    const mapperStepId = uuidv4();
    const aiEvaluationStepId = uuidv4();
    const calculateAhpStepId = uuidv4();
    const createCandidateStepId = uuidv4();
    const sendEmailStepId = uuidv4();

    const pmEmail = getStringWorkflowTemplateSetting({
      settings,
      key: 'pmEmail',
    });

    const { ahpMatching, calculateAhp } =
      getWorkflowTemplateLogicFunctionIds(workspaceId);

    const aiAgentId = getCvIntakeEvaluationAgentId(workspaceId);

    const emailBody = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 650px; margin: 0 auto; background-color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
  <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 24px; border-radius: 10px; text-align: center; color: #ffffff; margin-bottom: 20px;">
    <h2 style="margin: 0 0 6px 0; font-size: 22px;">TINASOFT RECRUITMENT ATS</h2>
    <p style="margin: 0; font-size: 14px;">Báo cáo Phân tích & Đánh giá Độ phù hợp Ứng viên (AHP AI Engine)</p>
  </div>
  <div style="background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
    <h3>👤 {{${mapperStepId}.mappedFullName}}</h3>
    <p>Vị trí ứng tuyển: <strong style="color: #2563eb;">{{${mapperStepId}.mappedJobTitle}}</strong> | Nguồn: {{${mapperStepId}.source}}</p>
    <p>📧 Email: {{${mapperStepId}.mappedEmail}} | 📱 SĐT: {{${mapperStepId}.mappedPhone}}</p>
    <p>🎯 Điểm phù hợp: <strong style="color: #059669; font-size: 16px;">{{${calculateAhpStepId}.matchingScore}}%</strong> ({{${calculateAhpStepId}.recommendation}})</p>
    <p>📄 Tải CV: <a href="{{${mapperStepId}.cvDownloadUrl}}" target="_blank" style="color: #2563eb;">{{${mapperStepId}.cvDownloadUrl}}</a></p>
    {{${mapperStepId}.cvFetchNote}}<br/>
  </div>
  <div style="background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
    <h4>📊 CHI TIẾT BÀI ĐÁNH GIÁ THEO MÔ HÌNH AHP:</h4>
    <pre style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px dashed #cbd5e1; font-family: inherit; font-size: 13.5px; white-space: pre-wrap;">{{${calculateAhpStepId}.aiEvaluation}}</pre>
  </div>
  <div style="text-align: center; margin: 24px 0;">
    <a href="${workspaceUrl}/objects/candidates" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">👉 Xem Hồ sơ trên CRM</a>
  </div>
</div>`;

    return {
      workflowName: 'Sàng lọc hồ sơ ứng viên & Chấm điểm AHP (AI)',
      trigger: {
        name: 'Nhận hồ sơ ứng tuyển từ Webhook (TopCV / Form)',
        type: WorkflowTriggerType.WEBHOOK,
        settings: {
          httpMethod: 'POST',
          expectedBody: {
            job_id: '123456',
            job_title: 'Nhân viên kinh doanh',
            apply_at: '2026-09-24 09:34:19',
            candidate_name: 'Nguyễn Văn A',
            candidate_email: 'candidate.test@example.com',
            candidate_phone: '0901234567',
            download_url:
              'https://tuyendung-api.topcv.vn/api/v1/cv-management/onetime-download?token=<token>',
          },
          outputSchema: {
            job_id: {
              type: FieldMetadataType.TEXT,
              label: 'TopCV Job ID',
              isLeaf: true,
              value: '123456',
            },
            job_title: {
              type: FieldMetadataType.TEXT,
              label: 'Job Title',
              isLeaf: true,
              value: 'Nhân viên kinh doanh',
            },
            apply_at: {
              type: FieldMetadataType.TEXT,
              label: 'Apply Time',
              isLeaf: true,
              value: '2026-09-24 09:34:19',
            },
            candidate_name: {
              type: FieldMetadataType.TEXT,
              label: 'Candidate Name',
              isLeaf: true,
              value: 'Nguyễn Văn A',
            },
            candidate_email: {
              type: FieldMetadataType.TEXT,
              label: 'Candidate Email',
              isLeaf: true,
              value: 'candidate@example.com',
            },
            candidate_phone: {
              type: FieldMetadataType.TEXT,
              label: 'Candidate Phone',
              isLeaf: true,
              value: '0901234567',
            },
            download_url: {
              type: FieldMetadataType.TEXT,
              label: 'CV Download URL',
              isLeaf: true,
              value: 'https://.../onetime-download?token=...',
            },
          },
          authentication: null,
        },
        position: { x: 0, y: 0 },
        nextStepIds: [mapperStepId],
      },
      steps: [
        {
          id: mapperStepId,
          name: 'Universal Mapper & Tải CV Từ Webhook',
          type: WorkflowActionType.CODE,
          valid: true,
          position: { x: 0, y: 150 },
          settings: {
            input: {
              logicFunctionId: ahpMatching,
              logicFunctionInput: {
                trigger: {
                  body: {
                    job_id: '{{trigger.job_id}}',
                    job_title: '{{trigger.job_title}}',
                    apply_at: '{{trigger.apply_at}}',
                    candidate_name: '{{trigger.candidate_name}}',
                    candidate_email: '{{trigger.candidate_email}}',
                    candidate_phone: '{{trigger.candidate_phone}}',
                    download_url: '{{trigger.download_url}}',
                  },
                },
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
              jobId: {
                type: FieldMetadataType.TEXT,
                label: 'TopCV Job ID',
                isLeaf: true,
                value: '123456',
              },
              applyAt: {
                type: FieldMetadataType.TEXT,
                label: 'Apply Time',
                isLeaf: true,
                value: '2026-09-24 09:34:19',
              },
              cvDownloadUrl: {
                type: FieldMetadataType.TEXT,
                label: 'CV Download URL',
                isLeaf: true,
                value: 'https://.../onetime-download?token=...',
              },
              cvFetchNote: {
                type: FieldMetadataType.TEXT,
                label: 'CV Fetch Note',
                isLeaf: true,
                value: '',
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
              mappedCvText: {
                type: FieldMetadataType.TEXT,
                label: 'CV Text',
                isLeaf: true,
                value: 'CV content',
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
                value: 'Nhân viên kinh doanh',
              },
            },
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [aiEvaluationStepId],
        },
        {
          id: aiEvaluationStepId,
          name: 'AI Chấm điểm AHP CV Ứng viên',
          type: WorkflowActionType.AI_AGENT,
          valid: true,
          position: { x: 0, y: 300 },
          settings: {
            input: {
              agentId: aiAgentId,
              prompt: `You are an expert recruiter specializing in AHP candidate screening. Evaluate the candidate's CV against the target job and return a structured JSON verdict.

Target job: {{${mapperStepId}.mappedJobTitle}}
Job ID: {{${mapperStepId}.jobId}}
Apply time: {{${mapperStepId}.applyAt}}
Intake source: {{${mapperStepId}.source}}
Candidate name: {{${mapperStepId}.mappedFullName}}
Candidate email: {{${mapperStepId}.mappedEmail}}
Candidate phone: {{${mapperStepId}.mappedPhone}}

=== CANDIDATE CV TEXT ===
{{${mapperStepId}.mappedCvText}}

Return only the four raw integer scores requested by the JSON schema. Do not calculate the final score, write an explanation, or add extra fields.`,
            },
            outputSchema: {
              skillsScore: {
                type: FieldMetadataType.NUMBER,
                label: 'Skills Score',
                isLeaf: true,
                value: 85,
              },
              expScore: {
                type: FieldMetadataType.NUMBER,
                label: 'Experience Score',
                isLeaf: true,
                value: 90,
              },
              eduScore: {
                type: FieldMetadataType.NUMBER,
                label: 'Education Score',
                isLeaf: true,
                value: 80,
              },
              generalScore: {
                type: FieldMetadataType.NUMBER,
                label: 'Language & Soft Skills Score',
                isLeaf: true,
                value: 85,
              },
            },
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [calculateAhpStepId],
        },
        {
          id: calculateAhpStepId,
          name: 'Tính điểm AHP và kết luận',
          type: WorkflowActionType.CODE,
          valid: true,
          position: { x: 0, y: 450 },
          settings: {
            input: {
              logicFunctionId: calculateAhp,
              logicFunctionInput: {
                skillsScore: `{{${aiEvaluationStepId}.skillsScore}}`,
                expScore: `{{${aiEvaluationStepId}.expScore}}`,
                eduScore: `{{${aiEvaluationStepId}.eduScore}}`,
                generalScore: `{{${aiEvaluationStepId}.generalScore}}`,
              },
            },
            outputSchema: {
              matchingScore: {
                type: FieldMetadataType.NUMBER,
                label: 'Matching Score (%)',
                isLeaf: true,
                value: 87,
              },
              recommendation: {
                type: FieldMetadataType.TEXT,
                label: 'Recommendation',
                isLeaf: true,
                value: 'PHÙ HỢP (Khuyến nghị phỏng vấn)',
              },
              aiEvaluation: {
                type: FieldMetadataType.TEXT,
                label: 'AHP Calculation',
                isLeaf: true,
                value: 'AHP weighted score',
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
          position: { x: 0, y: 600 },
          settings: {
            input: {
              objectName: 'candidate',
              objectRecord: {
                name: `{{${mapperStepId}.mappedFullName}}`,
                email: `{{${mapperStepId}.mappedEmail}}`,
                cvtext: `{{${mapperStepId}.mappedCvText}}`,
                cvdownloadurl: `{{${mapperStepId}.cvDownloadUrl}}`,
                jobid: `{{${mapperStepId}.jobId}}`,
                applyat: `{{${mapperStepId}.applyAt}}`,
                status: 'SCREENING',
                pmemail: `{{${mapperStepId}.pmEmail}}`,
                fullname: `{{${mapperStepId}.mappedFullName}}`,
                jobtitle: `{{${mapperStepId}.mappedJobTitle}}`,
                aievaluation: `{{${calculateAhpStepId}.aiEvaluation}}`,
                matchingscore: `{{${calculateAhpStepId}.matchingScore}}`,
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
          position: { x: 0, y: 750 },
          settings: {
            input: {
              connectedAccountId: '',
              recipients: {
                to: pmEmail,
                cc: '',
                bcc: '',
              },
              subject: `[{{${mapperStepId}.source}} Matching: {{${calculateAhpStepId}.matchingScore}}%] Ứng viên {{${mapperStepId}.mappedFullName}} - Vị trí {{${mapperStepId}.mappedJobTitle}}`,
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
