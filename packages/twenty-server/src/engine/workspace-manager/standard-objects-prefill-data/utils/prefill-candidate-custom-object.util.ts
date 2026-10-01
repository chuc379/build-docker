import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { type FieldMetadataService } from 'src/engine/metadata-modules/field-metadata/services/field-metadata.service';
import { type ObjectMetadataService } from 'src/engine/metadata-modules/object-metadata/object-metadata.service';

const CANDIDATE_OBJECT_NAME_SINGULAR = 'candidate';

interface CandidateFieldDefinition {
  type: FieldMetadataType;
  name: string;
  label: string;
  settings?: { maxNumberOfValues?: number };
}

const CANDIDATE_OBJECT_FIELDS: CandidateFieldDefinition[] = [
  {
    type: FieldMetadataType.TEXT,
    name: 'email',
    label: 'Email',
  },
  {
    type: FieldMetadataType.TEXT,
    name: 'fullname',
    label: 'Full Name',
  },
  {
    type: FieldMetadataType.TEXT,
    name: 'jobtitle',
    label: 'Job Title',
  },
  {
    type: FieldMetadataType.TEXT,
    name: 'status',
    label: 'Status',
  },
  {
    type: FieldMetadataType.TEXT,
    name: 'cvtext',
    label: 'CV Text',
  },
  {
    type: FieldMetadataType.FILES,
    name: 'cvfile',
    label: 'CV File',
    settings: { maxNumberOfValues: 1 },
  },
  {
    type: FieldMetadataType.TEXT,
    name: 'jobid',
    label: 'TopCV Job ID',
  },
  {
    type: FieldMetadataType.TEXT,
    name: 'applyat',
    label: 'Apply Time',
  },
  {
    type: FieldMetadataType.TEXT,
    name: 'pmemail',
    label: 'PM Email',
  },
  {
    type: FieldMetadataType.TEXT,
    name: 'aievaluation',
    label: 'AI Evaluation',
  },
  {
    type: FieldMetadataType.NUMBER,
    name: 'matchingscore',
    label: 'Matching Score (%)',
  },
];

export const prefillCandidateCustomObject = async ({
  workspaceId,
  objectMetadataService,
  fieldMetadataService,
}: {
  workspaceId: string;
  objectMetadataService: ObjectMetadataService;
  fieldMetadataService: FieldMetadataService;
}): Promise<void> => {
  const existingObject = await objectMetadataService.findOneWithinWorkspace(
    workspaceId,
    {
      where: { nameSingular: CANDIDATE_OBJECT_NAME_SINGULAR },
    },
  );

  const candidateObject = isDefined(existingObject)
    ? existingObject
    : await objectMetadataService.createOneObject({
        createObjectInput: {
          nameSingular: CANDIDATE_OBJECT_NAME_SINGULAR,
          namePlural: 'candidates',
          labelSingular: 'Candidate',
          labelPlural: 'Candidates',
          description:
            'A job candidate evaluated during CV intake and AHP matching',
          icon: 'IconUserCheck',
        },
        workspaceId,
      });

  const existingFields = await fieldMetadataService.findManyWithinWorkspace({
    workspaceId,
    objectMetadataId: candidateObject.id,
    limit: 1000,
  });

  const existingFieldsByName = new Map(
    existingFields.map((field) => [field.name, field]),
  );

  // A previous release shipped `cvfile` as TEXT and held the intake link there.
  // That link expires within minutes, so the stored value is worthless and the
  // field has to become a real FILES field: drop it and let the create below
  // rebuild it with the right type. Only this field is reconciled, the other
  // ones stay untouched so a customization is never overwritten.
  const reconciledFieldNames = new Set(['cvfile']);

  for (const { name, type } of CANDIDATE_OBJECT_FIELDS) {
    const existingField = existingFieldsByName.get(name);

    if (
      !reconciledFieldNames.has(name) ||
      !isDefined(existingField) ||
      existingField.type === type
    ) {
      continue;
    }

    await fieldMetadataService.deleteOneField({
      deleteOneFieldInput: { id: existingField.id },
      workspaceId,
    });

    existingFieldsByName.delete(name);
  }

  const missingFieldInputs = CANDIDATE_OBJECT_FIELDS.filter(
    ({ name }) => !existingFieldsByName.has(name),
  ).map(({ type, name, label, settings }) => ({
    objectMetadataId: candidateObject.id,
    type,
    name,
    label,
    settings,
  }));

  if (missingFieldInputs.length === 0) {
    return;
  }

  await fieldMetadataService.createManyFields({
    createFieldInputs: missingFieldInputs,
    workspaceId,
  });
};
