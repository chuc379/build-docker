import { FormFieldInputContainer } from '@/ui/input/components/FormFieldInputContainer';
import { FormTextFieldInput } from '@/object-record/record-field/ui/form-types/components/FormTextFieldInput';
import { InputLabel } from 'twenty-ui/input';
import { type WorkflowFormActionField } from '@/workflow/workflow-steps/workflow-actions/form-action/types/WorkflowFormActionField';
import { getDefaultFormFieldSettings } from '@/workflow/workflow-steps/workflow-actions/form-action/utils/getDefaultFormFieldSettings';
import { t } from '@lingui/core/macro';
import { styled } from '@linaria/react';
import camelCase from 'lodash.camelcase';
import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type WorkflowFormFieldSettingsTextProps = {
  field: WorkflowFormActionField;
  onChange: (updatedField: WorkflowFormActionField) => void;
};

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledTopRowContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledRowsContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: ${themeCssVariables.spacing[2]};
`;

const parseRowCount = (value: string): number | undefined => {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : undefined;
};

export const WorkflowFormFieldSettingsText = ({
  field,
  onChange,
}: WorkflowFormFieldSettingsTextProps) => {
  const updateRowSetting = (rowsKey: 'minRows' | 'maxRows', value: string) => {
    const rowCount = parseRowCount(value);

    onChange({
      ...field,
      settings: {
        ...field.settings,
        [rowsKey]: isDefined(rowCount) ? rowCount : undefined,
      },
    });
  };

  return (
    <StyledContainer>
      <StyledTopRowContainer>
        <FormFieldInputContainer>
          <InputLabel>{t`Label`}</InputLabel>
          <FormTextFieldInput
            onChange={(newLabel: string) => {
              onChange({
                ...field,
                label: newLabel,
                name: camelCase(newLabel),
              });
            }}
            defaultValue={field.label}
            placeholder={
              getDefaultFormFieldSettings(FieldMetadataType.TEXT).label
            }
          />
        </FormFieldInputContainer>
        <FormFieldInputContainer>
          <InputLabel>{t`Placeholder`}</InputLabel>
          <FormTextFieldInput
            onChange={(newPlaceholder: string) => {
              onChange({
                ...field,
                placeholder: newPlaceholder,
              });
            }}
            defaultValue={field.placeholder}
            placeholder={
              getDefaultFormFieldSettings(FieldMetadataType.TEXT).placeholder
            }
          />
        </FormFieldInputContainer>
      </StyledTopRowContainer>
      <StyledRowsContainer>
        <FormFieldInputContainer>
          <InputLabel>{t`Min rows`}</InputLabel>
          <FormTextFieldInput
            onChange={(newMinRows: string) => {
              updateRowSetting('minRows', newMinRows);
            }}
            defaultValue={field.settings?.minRows?.toString() ?? ''}
            placeholder={field.settings?.minRows?.toString() ?? '1'}
          />
        </FormFieldInputContainer>
        <FormFieldInputContainer>
          <InputLabel>{t`Max rows`}</InputLabel>
          <FormTextFieldInput
            onChange={(newMaxRows: string) => {
              updateRowSetting('maxRows', newMaxRows);
            }}
            defaultValue={field.settings?.maxRows?.toString() ?? ''}
            placeholder={field.settings?.maxRows?.toString() ?? '5'}
          />
        </FormFieldInputContainer>
      </StyledRowsContainer>
    </StyledContainer>
  );
};