import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { type FieldMetadataService } from 'src/engine/metadata-modules/field-metadata/services/field-metadata.service';
import { type ObjectMetadataService } from 'src/engine/metadata-modules/object-metadata/object-metadata.service';

const INTERVIEW_OBJECT_NAME_SINGULAR = 'interview';

interface InterviewFieldDefinition {
  type: FieldMetadataType;
  name: string;
  label: string;
  settings?: { maxNumberOfValues?: number };
}

const INTERVIEW_FIELDS: InterviewFieldDefinition[] = [
  {
    type: FieldMetadataType.TEXT,
    name: 'candidateName',
    label: 'Candidate Name',
  },
  {
    type: FieldMetadataType.TEXT,
    name: 'candidateEmail',
    label: 'Candidate Email',
  },
  {
    type: FieldMetadataType.TEXT,
    name: 'jobTitle',
    label: 'Job Title',
  },
  {
    type: FieldMetadataType.TEXT,
    name: 'interviewer',
    label: 'Interviewer',
  },
  {
    type: FieldMetadataType.DATE_TIME,
    name: 'dateTime',
    label: 'Interview Time',
  },
  {
    type: FieldMetadataType.TEXT,
    name: 'meetingLink',
    label: 'Google Meet Link',
  },
  {
    type: FieldMetadataType.TEXT,
    name: 'status',
    label: 'Status',
  },
  {
    type: FieldMetadataType.TEXT,
    name: 'notes',
    label: 'Notes',
  },
  {
    type: FieldMetadataType.TEXT,
    name: 'cc',
    label: 'CC',
  },
  {
    type: FieldMetadataType.TEXT,
    name: 'bcc',
    label: 'BCC',
  },
  {
    type: FieldMetadataType.FILES,
    name: 'signature',
    label: 'Signature',
    settings: { maxNumberOfValues: 1 },
  },
];

export const prefillInterviewCustomObject = async ({
  workspaceId,
  objectMetadataService,
  fieldMetadataService,
}: {
  workspaceId: string;
  objectMetadataService: ObjectMetadataService;
  fieldMetadataService: FieldMetadataService;
}): Promise<void> => {
  let objectMetadata = await objectMetadataService.findOneWithinWorkspace(
    workspaceId,
    { where: { nameSingular: INTERVIEW_OBJECT_NAME_SINGULAR } },
  );

  if (!isDefined(objectMetadata)) {
    objectMetadata = await objectMetadataService.createOneObject({
      createObjectInput: {
        nameSingular: INTERVIEW_OBJECT_NAME_SINGULAR,
        namePlural: 'interviews',
        labelSingular: 'Interview',
        labelPlural: 'Interviews',
        description:
          'A scheduled job interview with a generated Google Meet link',
        icon: 'IconCalendarEvent',
      },
      workspaceId,
    });
  }

  // Kiểm tra tồn tại song song để tối ưu tốc độ xử lý
  const fieldChecks = await Promise.all(
    INTERVIEW_FIELDS.map(async (field) => {
      const existingField = await fieldMetadataService.findOneWithinWorkspace(
        workspaceId,
        {
          where: { objectMetadataId: objectMetadata.id, name: field.name },
        },
      );

      if (!isDefined(existingField)) {
        return {
          objectMetadataId: objectMetadata.id,
          type: field.type,
          name: field.name,
          label: field.label,
          settings: field.settings,
        };
      }
      return null;
    }),
  );

  const missingFields = fieldChecks.filter(
    (field): field is NonNullable<typeof field> => isDefined(field),
  );

  if (missingFields.length > 0) {
    await fieldMetadataService.createManyFields({
      createFieldInputs: missingFields,
      workspaceId,
    });
  }
};
