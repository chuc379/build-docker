import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { type FieldMetadataService } from 'src/engine/metadata-modules/field-metadata/services/field-metadata.service';
import { type ObjectMetadataService } from 'src/engine/metadata-modules/object-metadata/object-metadata.service';

const CANDIDATE_OBJECT_NAME_SINGULAR = 'candidate';

export const prefillCandidateCustomObject = async ({
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
      where: { nameSingular: CANDIDATE_OBJECT_NAME_SINGULAR },
    });

  if (isDefined(existingObject)) {
    return;
  }

  const createdObject = await objectMetadataService.createOneObject({
    createObjectInput: {
      nameSingular: CANDIDATE_OBJECT_NAME_SINGULAR,
      namePlural: 'candidates',
      labelSingular: 'Candidate',
      labelPlural: 'Candidates',
      description: 'A job candidate evaluated during CV intake and AHP matching',
      icon: 'IconUserCheck',
    },
    workspaceId,
  });

  await fieldMetadataService.createManyFields({
    createFieldInputs: [
      {
        objectMetadataId: createdObject.id,
        type: FieldMetadataType.TEXT,
        name: 'email',
        label: 'Email',
      },
      {
        objectMetadataId: createdObject.id,
        type: FieldMetadataType.TEXT,
        name: 'fullname',
        label: 'Full Name',
      },
      {
        objectMetadataId: createdObject.id,
        type: FieldMetadataType.TEXT,
        name: 'jobtitle',
        label: 'Job Title',
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
        name: 'cvtext',
        label: 'CV Text',
      },
      {
        objectMetadataId: createdObject.id,
        type: FieldMetadataType.TEXT,
        name: 'pmemail',
        label: 'PM Email',
      },
      {
        objectMetadataId: createdObject.id,
        type: FieldMetadataType.TEXT,
        name: 'aievaluation',
        label: 'AI Evaluation',
      },
      {
        objectMetadataId: createdObject.id,
        type: FieldMetadataType.NUMBER,
        name: 'matchingscore',
        label: 'Matching Score (%)',
      },
    ],
    workspaceId,
  });
};