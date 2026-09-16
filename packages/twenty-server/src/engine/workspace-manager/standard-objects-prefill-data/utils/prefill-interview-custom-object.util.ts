import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { type FieldMetadataService } from 'src/engine/metadata-modules/field-metadata/services/field-metadata.service';
import { type ObjectMetadataService } from 'src/engine/metadata-modules/object-metadata/object-metadata.service';

const INTERVIEW_OBJECT_NAME_SINGULAR = 'interview';

export const prefillInterviewCustomObject = async ({
  workspaceId,
  objectMetadataService,
  fieldMetadataService,
}: {
  workspaceId: string;
  objectMetadataService: ObjectMetadataService;
  fieldMetadataService: FieldMetadataService;
}): Promise<void> => {
  const existingObject =
    await objectMetadataService.findOneWithinWorkspace(workspaceId, {
      where: { nameSingular: INTERVIEW_OBJECT_NAME_SINGULAR },
    });

  if (isDefined(existingObject)) {
    return;
  }

  const createdObject = await objectMetadataService.createOneObject({
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

  await fieldMetadataService.createManyFields({
    createFieldInputs: [
      {
        objectMetadataId: createdObject.id,
        type: FieldMetadataType.TEXT,
        name: 'candidateName',
        label: 'Candidate Name',
      },
      {
        objectMetadataId: createdObject.id,
        type: FieldMetadataType.TEXT,
        name: 'candidateEmail',
        label: 'Candidate Email',
      },
      {
        objectMetadataId: createdObject.id,
        type: FieldMetadataType.TEXT,
        name: 'jobTitle',
        label: 'Job Title',
      },
      {
        objectMetadataId: createdObject.id,
        type: FieldMetadataType.TEXT,
        name: 'interviewer',
        label: 'Interviewer',
      },
      {
        objectMetadataId: createdObject.id,
        type: FieldMetadataType.DATE_TIME,
        name: 'dateTime',
        label: 'Interview Time',
      },
      {
        objectMetadataId: createdObject.id,
        type: FieldMetadataType.TEXT,
        name: 'meetingLink',
        label: 'Google Meet Link',
      },
      {
        objectMetadataId: createdObject.id,
        type: FieldMetadataType.TEXT,
        name: 'status',
        label: 'Status',
      },
      {
        objectMetadataId: createdObject.id,
        type: FieldMetadataType.TEXT,
        name: 'notes',
        label: 'Notes',
      },
    ],
    workspaceId,
  });
};