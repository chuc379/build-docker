import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { type FieldMetadataService } from 'src/engine/metadata-modules/field-metadata/services/field-metadata.service';
import { type ObjectMetadataService } from 'src/engine/metadata-modules/object-metadata/object-metadata.service';

const JOB_OBJECT_NAME_SINGULAR = 'jobPosting';

export const prefillJobCustomObject = async ({
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
      where: { nameSingular: JOB_OBJECT_NAME_SINGULAR },
    });

  if (isDefined(existingObject)) {
    return;
  }

  const createdObject = await objectMetadataService.createOneObject({
    createObjectInput: {
      nameSingular: JOB_OBJECT_NAME_SINGULAR,
      namePlural: 'jobPostings',
      labelSingular: 'Job Posting',
      labelPlural: 'Job Postings',
      description: 'A job posting with a generated job description',
      icon: 'IconBriefcase',
    },
    workspaceId,
  });

  await fieldMetadataService.createManyFields({
    createFieldInputs: [
      {
        objectMetadataId: createdObject.id,
        type: FieldMetadataType.TEXT,
        name: 'jobTitle',
        label: 'Job Title',
      },
      {
        objectMetadataId: createdObject.id,
        type: FieldMetadataType.TEXT,
        name: 'department',
        label: 'Department',
      },
      {
        objectMetadataId: createdObject.id,
        type: FieldMetadataType.TEXT,
        name: 'experienceLevel',
        label: 'Experience Level',
      },
      {
        objectMetadataId: createdObject.id,
        type: FieldMetadataType.TEXT,
        name: 'requirements',
        label: 'Requirements',
      },
      {
        objectMetadataId: createdObject.id,
        type: FieldMetadataType.TEXT,
        name: 'skillsAndCertifications',
        label: 'Skills & Certifications',
      },
      {
        objectMetadataId: createdObject.id,
        type: FieldMetadataType.TEXT,
        name: 'jobDescription',
        label: 'Job Description',
      },
    ],
    workspaceId,
  });
};