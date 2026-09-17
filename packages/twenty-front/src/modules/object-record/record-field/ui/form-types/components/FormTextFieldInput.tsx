import { t } from '@lingui/core/macro';
import { FormFieldInputContainer } from '@/ui/input/components/FormFieldInputContainer';
import { FormFieldInputInnerContainer } from '@/object-record/record-field/ui/form-types/components/FormFieldInputInnerContainer';
import { FormFieldInputRowContainer } from '@/object-record/record-field/ui/form-types/components/FormFieldInputRowContainer';
import { TextVariableEditor } from '@/object-record/record-field/ui/form-types/components/TextVariableEditor';
import { useTextVariableEditor } from '@/object-record/record-field/ui/form-types/hooks/useTextVariableEditor';
import { type VariablePickerComponent } from '@/object-record/record-field/ui/form-types/types/VariablePickerComponent';
import { Field } from 'twenty-ui/input';
import { parseEditorContent } from '@/workflow/workflow-variables/utils/parseEditorContent';
import { useId } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { LINE_HEIGHT } from '@/object-record/record-field/ui/form-types/components/FormFieldInputRowContainer';

type FormTextFieldInputProps = {
  label?: string;
  error?: string;
  hint?: string;
  defaultValue: string | undefined | null;
  onChange: (value: string) => void;
  onBlur?: () => void;
  multiline?: boolean;
  minRows?: number;
  maxRows?: number;
  readonly?: boolean;
  placeholder?: string;
  VariablePicker?: VariablePickerComponent;
};

export const FormTextFieldInput = ({
  label,
  error,
  hint,
  defaultValue,
  placeholder,
  onChange,
  onBlur,
  multiline,
  minRows,
  maxRows,
  readonly,
  VariablePicker,
}: FormTextFieldInputProps) => {
  const instanceId = useId();

  // When row bounds are provided, the input renders as a bounded multiline
  // text area whose height follows the configured number of lines. Without
  // them, the legacy single-line behavior is kept unchanged.
  const isMultiline = multiline || isDefined(minRows) || isDefined(maxRows);
  const minHeight = isDefined(minRows) ? minRows * LINE_HEIGHT : undefined;
  const maxHeight = isDefined(maxRows) ? maxRows * LINE_HEIGHT : undefined;

  const editor = useTextVariableEditor({
    placeholder: placeholder ?? t`Enter text`,
    multiline: isMultiline,
    readonly,
    defaultValue,
    onUpdate: (editor) => {
      const jsonContent = editor.getJSON();
      const parsedContent = parseEditorContent(jsonContent);

      onChange(parsedContent);
    },
  });

  const handleVariableTagInsert = (variableName: string) => {
    if (!isDefined(editor)) {
      throw new Error(
        'Expected the editor to be defined when a variable is selected',
      );
    }

    editor.commands.insertVariableTag(variableName);
  };

  if (!isDefined(editor)) {
    return null;
  }

  return (
    <FormFieldInputContainer>
      {label ? <Field.Label>{label}</Field.Label> : null}

      <FormFieldInputRowContainer
        multiline={isMultiline}
        minHeight={minHeight}
        maxHeight={maxHeight}
      >
        <FormFieldInputInnerContainer
          formFieldInputInstanceId={instanceId}
          hasRightElement={isDefined(VariablePicker) && !readonly}
          multiline={isMultiline}
          onBlur={onBlur}
        >
          <TextVariableEditor
            editor={editor}
            multiline={isMultiline}
            readonly={readonly}
          />
        </FormFieldInputInnerContainer>

        {VariablePicker && !readonly ? (
          <VariablePicker
            instanceId={instanceId}
            multiline={isMultiline}
            onVariableSelect={handleVariableTagInsert}
          />
        ) : null}
      </FormFieldInputRowContainer>
      {hint && <Field.Description>{hint}</Field.Description>}
      {error && <Field.Error match>{error}</Field.Error>}
    </FormFieldInputContainer>
  );
};
