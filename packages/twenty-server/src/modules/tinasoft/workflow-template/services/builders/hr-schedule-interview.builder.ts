import { Injectable } from '@nestjs/common';
import { type I18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { v4 as uuidv4 } from 'uuid';

import { FieldMetadataType } from 'twenty-shared/types';
import { WorkflowActionType } from 'twenty-shared/workflow';

import { WorkflowTemplateDTO } from 'src/modules/tinasoft/workflow-template/api/dtos/workflow-template.dto';
import { IWorkflowTemplateBuilder } from 'src/modules/tinasoft/workflow-template/services/builders/workflow-template.builder.interface';
import {
  type WorkflowTemplateBuildContext,
  type WorkflowTemplateDefinition,
} from 'src/modules/tinasoft/workflow-template/types/workflow-template.type';
import { ERROR_HANDLING_OPTIONS } from 'src/modules/tinasoft/workflow-template/utils/workflow-template-builder-helpers.util';
import { getStringWorkflowTemplateSetting } from 'src/modules/tinasoft/workflow-template/utils/workflow-template-settings.util';
import { WorkflowTriggerType } from 'src/modules/workflow/workflow-trigger/types/workflow-trigger.type';

@Injectable()
export class HrScheduleInterviewWorkflowTemplateBuilder
  implements IWorkflowTemplateBuilder
{
  readonly id = 'hr-schedule-interview' as const;

  getDTO(_workspaceDisplayName: string, i18n?: I18n): WorkflowTemplateDTO {
    return {
      id: this.id,
      name: 'Lên lịch phỏng vấn & tạo link Google Meet',
      description:
        'HR nhập thông tin buổi phỏng vấn (ứng viên, email, vị trí, người phỏng vấn, khung giờ), hệ thống tạo sự kiện Google Calendar kèm link Google Meet, lưu hồ sơ phỏng vấn và gửi thư mời cho ứng viên cùng PM/HR.',
      shortDescription:
        'Xếp lịch phỏng vấn thủ công, tự động sinh link Google Meet và email thư mời.',
      purpose:
        'Rút gọn quy trình sắp xếp phỏng vấn: không còn nhập tay link Meet, mọi cuộc phỏng vấn được lưu lại trên CRM với link và trạng thái theo dõi rõ ràng.',
      category: 'Tuyển dụng & HR',
      icon: 'IconCalendarEvent',
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
  }: WorkflowTemplateBuildContext): WorkflowTemplateDefinition {
    const formStepId = uuidv4();
    const calendarEventStepId = uuidv4();
    const createRecordStepId = uuidv4();
    const sendEmailStepId = uuidv4();

    const pmEmail = getStringWorkflowTemplateSetting({
      settings,
      key: 'pmEmail',
    });

    const emailBody = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
  <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 24px; border-radius: 10px; text-align: center; color: #ffffff; margin-bottom: 20px;">
    <h2 style="margin: 0 0 6px 0; font-size: 22px;">TINASOFT RECRUITMENT ATS</h2>
    <p style="margin: 0; font-size: 14px;">Thư mời tham gia phỏng vấn trực tuyến</p>
  </div>
  <div style="background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
    <h3>👤 {{${formStepId}.candidateName}}</h3>
    <p>Vị trí ứng tuyển: <strong style="color: #2563eb;">{{${formStepId}.jobTitle}}</strong></p>
    <p>📅 Thời gian: <strong>{{${formStepId}.dateTime}}</strong> → {{${formStepId}.endTime}}</p>
    <p>👥 Người phỏng vấn: {{${formStepId}.interviewer}}</p>
    <p style="margin-top: 16px;"><a href={{${calendarEventStepId}.conferenceLink}} style="background-color: #25D366; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">🎥 Tham gia qua Google Meet</a></p>
    <p style="font-size: 12px; color: #64748b; margin-top: 8px;">Liên kết Meet: {{${calendarEventStepId}.conferenceLink}}</p>
  </div>
  <div style="background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
    <p style="margin: 0; font-size: 13px; color: #475569;">📝 Ghi chú: {{${formStepId}.notes}}</p>
  </div>
</div>`;

    return {
      workflowName: 'HR: Lên lịch phỏng vấn & tạo link Google Meet',
      trigger: {
        name: 'Khởi chạy thủ công',
        type: WorkflowTriggerType.MANUAL,
        settings: {
          outputSchema: {},
          icon: 'IconCalendarEvent',
          availability: { type: 'GLOBAL', locations: undefined },
        },
        position: { x: 0, y: 0 },
        nextStepIds: [formStepId],
      },
      steps: [
        {
          id: formStepId,
          name: 'Biểu mẫu lên lịch phỏng vấn',
          type: WorkflowActionType.FORM,
          valid: true,
          position: { x: 0, y: 150 },
          settings: {
            input: [
              {
                id: uuidv4(),
                name: 'candidateName',
                type: FieldMetadataType.TEXT,
                label: 'Tên ứng viên',
                placeholder: 'Nguyen Van A',
              },
              {
                id: uuidv4(),
                name: 'candidateEmail',
                type: FieldMetadataType.TEXT,
                label: 'Email ứng viên',
                placeholder: 'candidate@example.vn',
              },
              {
                id: uuidv4(),
                name: 'jobTitle',
                type: FieldMetadataType.TEXT,
                label: 'Vị trí phỏng vấn',
                placeholder: 'NodeJS Developer',
              },
              {
                id: uuidv4(),
                name: 'interviewer',
                type: FieldMetadataType.TEXT,
                label: 'Người phỏng vấn',
                placeholder: 'Tên người phỏng vấn (kèm email nếu cần)',
              },
              {
                id: uuidv4(),
                name: 'dateTime',
                type: FieldMetadataType.TEXT,
                label: 'Thời gian bắt đầu (ISO)',
                placeholder: '2026-09-20T10:00:00+07:00',
              },
              {
                id: uuidv4(),
                name: 'endTime',
                type: FieldMetadataType.TEXT,
                label: 'Thời gian kết thúc (ISO)',
                placeholder: '2026-09-20T11:00:00+07:00',
              },
              {
                id: uuidv4(),
                name: 'notes',
                type: FieldMetadataType.TEXT,
                label: 'Ghi chú phỏng vấn',
                settings: {
                  minRows: 4,
                  maxRows: 8,
                },
              },
            ],
            outputSchema: {
              candidateName: {
                type: FieldMetadataType.TEXT,
                label: 'Tên ứng viên',
                isLeaf: true,
                value: 'Nguyen Van A',
              },
              candidateEmail: {
                type: FieldMetadataType.TEXT,
                label: 'Email ứng viên',
                isLeaf: true,
                value: 'candidate@example.vn',
              },
              jobTitle: {
                type: FieldMetadataType.TEXT,
                label: 'Vị trí phỏng vấn',
                isLeaf: true,
                value: 'NodeJS Developer',
              },
              interviewer: {
                type: FieldMetadataType.TEXT,
                label: 'Người phỏng vấn',
                isLeaf: true,
                value: 'HR Interviewer',
              },
              dateTime: {
                type: FieldMetadataType.TEXT,
                label: 'Thời gian bắt đầu (ISO)',
                isLeaf: true,
                value: '2026-09-20T10:00:00+07:00',
              },
              endTime: {
                type: FieldMetadataType.TEXT,
                label: 'Thời gian kết thúc (ISO)',
                isLeaf: true,
                value: '2026-09-20T11:00:00+07:00',
              },
              notes: {
                type: FieldMetadataType.TEXT,
                label: 'Ghi chú phỏng vấn',
                isLeaf: true,
                value: 'Phỏng vấn vòng 1',
              },
            },
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [calendarEventStepId],
        },
        {
          id: calendarEventStepId,
          name: 'Tạo sự kiện Google Calendar & Google Meet',
          type: WorkflowActionType.CREATE_CALENDAR_EVENT,
          valid: true,
          position: { x: 0, y: 300 },
          settings: {
            input: {
              connectedAccountId: '',
              title: `Phỏng vấn {{${formStepId}.candidateName}} - {{${formStepId}.jobTitle}}`,
              description: `Phỏng vấn {{${formStepId}.jobTitle}}. Người phỏng vấn: {{${formStepId}.interviewer}}. Ghi chú: {{${formStepId}.notes}}`,
              startsAt: `{{${formStepId}.dateTime}}`,
              endsAt: `{{${formStepId}.endTime}}`,
              isFullDay: false,
              timeZone: 'Asia/Ho_Chi_Minh',
              attendees: `{{${formStepId}.candidateEmail}}`,
              sendInvitations: true,
              addConferencing: true,
            },
            outputSchema: {
              iCalUid: {
                type: FieldMetadataType.TEXT,
                label: 'iCal UID',
                isLeaf: true,
                value: '',
              },
              externalEventId: {
                type: FieldMetadataType.TEXT,
                label: 'Google Event ID',
                isLeaf: true,
                value: '',
              },
              title: {
                type: FieldMetadataType.TEXT,
                label: 'Title',
                isLeaf: true,
                value: 'Interview event',
              },
              startsAt: {
                type: FieldMetadataType.TEXT,
                label: 'Starts At',
                isLeaf: true,
                value: '2026-09-20T10:00:00Z',
              },
              endsAt: {
                type: FieldMetadataType.TEXT,
                label: 'Ends At',
                isLeaf: true,
                value: '2026-09-20T11:00:00Z',
              },
              conferenceLink: {
                type: FieldMetadataType.TEXT,
                label: 'Google Meet Link',
                isLeaf: true,
                value: 'https://meet.google.com/xxx-xxxx-xxx',
              },
              attendeeCount: {
                type: FieldMetadataType.NUMBER,
                label: 'Attendee Count',
                isLeaf: true,
                value: 1,
              },
              connectedAccountId: {
                type: FieldMetadataType.TEXT,
                label: 'Connected Account ID',
                isLeaf: true,
                value: '',
              },
            },
            errorHandlingOptions: ERROR_HANDLING_OPTIONS,
          },
          nextStepIds: [createRecordStepId],
        },
        {
          id: createRecordStepId,
          name: 'Lưu phiên phỏng vấn trên CRM',
          type: WorkflowActionType.CREATE_RECORD,
          valid: true,
          position: { x: 0, y: 450 },
          settings: {
            input: {
              objectName: 'interview',
              objectRecord: {
                name: `Phỏng vấn {{${formStepId}.candidateName}} - {{${formStepId}.jobTitle}}`,
                candidateName: `{{${formStepId}.candidateName}}`,
                candidateEmail: `{{${formStepId}.candidateEmail}}`,
                jobTitle: `{{${formStepId}.jobTitle}}`,
                interviewer: `{{${formStepId}.interviewer}}`,
                dateTime: `{{${calendarEventStepId}.startsAt}}`,
                meetingLink: `{{${calendarEventStepId}.conferenceLink}}`,
                status: 'SCHEDULED',
                notes: `{{${formStepId}.notes}}`,
              },
            },
            outputSchema: {
              id: {
                type: FieldMetadataType.TEXT,
                label: 'Interview ID',
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
          name: 'Gửi Email thư mời phỏng vấn',
          type: WorkflowActionType.SEND_EMAIL,
          valid: true,
          position: { x: 0, y: 600 },
          settings: {
            input: {
              connectedAccountId: '',
              recipients: {
                to: `{{${formStepId}.candidateEmail}}`,
                cc: pmEmail,
                bcc: '',
              },
              subject: `Thư mời phỏng vấn: {{${formStepId}.candidateName}} - {{${formStepId}.jobTitle}}`,
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