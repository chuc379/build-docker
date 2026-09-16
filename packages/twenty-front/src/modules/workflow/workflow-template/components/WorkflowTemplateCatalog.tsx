import { useMemo, useState } from 'react';

import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { WorkflowTemplateLibrary } from '@/workflow/workflow-template/components/WorkflowTemplateLibrary';
import { WorkflowTemplatePreview } from '@/workflow/workflow-template/components/WorkflowTemplatePreview';
import { useCreateWorkflowFromTemplate } from '@/workflow/workflow-template/hooks/useCreateWorkflowFromTemplate';
import { useWorkflowTemplates } from '@/workflow/workflow-template/hooks/useWorkflowTemplates';
import { type WorkflowTemplate } from '@/workflow/workflow-template/types/WorkflowTemplate';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { AppPath, CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { buildWorkflowTemplateSettingsZodSchema } from 'twenty-shared/workflow';
import {
  IconArrowLeft,
  IconLayoutGrid,
  IconSparkles,
  useIcons,
} from 'twenty-ui/icon';
import { Button, IconButton } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { useNavigateApp } from '~/hooks/useNavigateApp';
import { getErrorMessageFromApolloError } from '~/utils/get-error-message-from-apollo-error.util';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';

const StyledCatalog = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  width: 100%;
`;

const StyledCatalogHeader = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  min-height: 48px;
  padding: 0 ${themeCssVariables.spacing[4]};
`;

const StyledCatalogHeaderIcon = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
`;

const StyledCatalogTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: 0;
`;

const StyledCatalogCount = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.md};
`;

const StyledConfiguration = styled.main`
  align-items: flex-start;
  display: grid;
  flex: 1;
  gap: ${themeCssVariables.spacing[6]};
  grid-template-columns: minmax(280px, 440px) minmax(320px, 520px);
  justify-content: center;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[8]} ${themeCssVariables.spacing[4]};

  @media (max-width: 860px) {
    grid-template-columns: minmax(0, 560px);
    padding-top: ${themeCssVariables.spacing[4]};
  }
`;

const StyledConfigurationPreview = styled.section`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  box-shadow: ${themeCssVariables.boxShadow.light};
  padding: ${themeCssVariables.spacing[4]};
  position: sticky;
  top: 0;

  @media (max-width: 860px) {
    position: static;
  }
`;

const StyledTemplateIdentity = styled.div`
  align-items: flex-start;
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  margin-top: ${themeCssVariables.spacing[4]};
`;

const StyledTemplateIcon = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.transparent.blue};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.color.blue};
  display: flex;
  height: 40px;
  justify-content: center;
  min-width: 40px;
`;

const StyledTemplateName = styled.h3`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xl};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  line-height: 1.3;
  margin: 0;
`;

const StyledTemplateDescription = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  line-height: 1.5;
  margin: ${themeCssVariables.spacing[1]} 0 0;
  text-wrap: pretty;
`;

const StyledForm = styled.section`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  box-shadow: ${themeCssVariables.boxShadow.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  padding: ${themeCssVariables.spacing[5]};
`;

const StyledFormHeading = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledFormTitle = styled.h3`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

const StyledFormDescription = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  line-height: 1.45;
  margin: 0;
`;

const StyledReadyState = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.transparent.blue};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
  padding-top: ${themeCssVariables.spacing[2]};
`;

export const WorkflowTemplateCatalog = () => {
  const { t } = useLingui();
  const navigate = useNavigateApp();
  const { getIcon } = useIcons();
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();
  const { workflowTemplates, loading, error } = useWorkflowTemplates();
  const { createWorkflowFromTemplate } = useCreateWorkflowFromTemplate();
  const [isCreating, setIsCreating] = useState(false);
  const [filteredCount, setFilteredCount] = useState(0);
  const [selectedTemplate, setSelectedTemplate] =
    useState<WorkflowTemplate | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});

  const handleSelectTemplate = (workflowTemplate: WorkflowTemplate) => {
    setSelectedTemplate(workflowTemplate);
    setSettings(
      Object.fromEntries(
        workflowTemplate.requiredSettings.map((requiredSetting) => [
          requiredSetting.key,
          requiredSetting.defaultValue ?? '',
        ]),
      ),
    );
  };

  const settingsValidationErrors = useMemo(() => {
    if (!isDefined(selectedTemplate)) {
      return {};
    }

    const errors: Record<string, string> = {};

    for (const requiredSetting of selectedTemplate.requiredSettings) {
      const value = settings[requiredSetting.key] ?? '';

      if (value.trim() === '') {
        errors[requiredSetting.key] = t`This field is required`;
        continue;
      }

      const result = buildWorkflowTemplateSettingsZodSchema([
        requiredSetting,
      ]).safeParse({ [requiredSetting.key]: value });

      if (!result.success) {
        errors[requiredSetting.key] =
          requiredSetting.type === 'email'
            ? t`Must be a valid email address`
            : t`Must be a valid number`;
      }
    }

    return errors;
  }, [selectedTemplate, settings, t]);

  const handleCreateWorkflow = async () => {
    if (!isDefined(selectedTemplate) || isCreating) {
      return;
    }

    setIsCreating(true);

    try {
      const workflowVersion = await createWorkflowFromTemplate({
        templateId: selectedTemplate.id,
        settings,
      });
      const workflowId = workflowVersion?.workflowId;

      if (!isDefined(workflowId)) {
        throw new Error('Workflow template creation returned no workflow ID');
      }

      enqueueSuccessSnackBar({ message: t`Workflow draft created` });
      navigate(AppPath.RecordShowPage, {
        objectNameSingular: CoreObjectNameSingular.Workflow,
        objectRecordId: workflowId,
      });
    } catch (error) {
      enqueueErrorSnackBar({
        message: getErrorMessageFromApolloError(error),
      });
    } finally {
      setIsCreating(false);
    }
  };

  const hasInvalidRequiredSettings =
    Object.keys(settingsValidationErrors).length > 0;
  const SelectedTemplateIcon = isDefined(selectedTemplate)
    ? (getIcon(selectedTemplate.icon) ?? IconSparkles)
    : IconSparkles;

  return (
    <StyledCatalog>
      <StyledCatalogHeader>
        {isDefined(selectedTemplate) ? (
          <IconButton
            Icon={IconArrowLeft}
            ariaLabel={t`Back to templates`}
            onClick={() => setSelectedTemplate(null)}
          />
        ) : (
          <StyledCatalogHeaderIcon>
            <IconLayoutGrid size={18} />
          </StyledCatalogHeaderIcon>
        )}
        <StyledCatalogTitle>
          {isDefined(selectedTemplate)
            ? t`Configure template`
            : t`Workflow templates`}
        </StyledCatalogTitle>
        {!isDefined(selectedTemplate) && (
          <StyledCatalogCount>{filteredCount}</StyledCatalogCount>
        )}
      </StyledCatalogHeader>
      {!isDefined(selectedTemplate) ? (
        <WorkflowTemplateLibrary
          templates={workflowTemplates}
          loading={loading}
          errorMessage={error?.message}
          onSelect={handleSelectTemplate}
          onFilteredCountChange={setFilteredCount}
        />
      ) : (
        <StyledConfiguration>
          <StyledConfigurationPreview>
            <WorkflowTemplatePreview />
            <StyledTemplateIdentity>
              <StyledTemplateIcon>
                <SelectedTemplateIcon size={22} />
              </StyledTemplateIcon>
              <div>
                <StyledTemplateName>{selectedTemplate.name}</StyledTemplateName>
                <StyledTemplateDescription>
                  {selectedTemplate.shortDescription}
                </StyledTemplateDescription>
                <StyledTemplateDescription>
                  {selectedTemplate.purpose}
                </StyledTemplateDescription>
              </div>
            </StyledTemplateIdentity>
          </StyledConfigurationPreview>
          <StyledForm>
            <StyledFormHeading>
              <StyledFormTitle>{t`Template setup`}</StyledFormTitle>
              <StyledFormDescription>
                {t`The workflow will be created as a draft. You can review every trigger and action before publishing.`}
              </StyledFormDescription>
            </StyledFormHeading>
            {selectedTemplate.requiredSettings.length === 0 ? (
              <StyledReadyState>
                <IconSparkles size={18} />
                {t`This template is ready to create without additional setup.`}
              </StyledReadyState>
            ) : (
              selectedTemplate.requiredSettings.map((requiredSetting) => (
                <SettingsTextInput
                  key={requiredSetting.key}
                  instanceId={`workflow-template-${selectedTemplate.id}-${requiredSetting.key}`}
                  label={requiredSetting.label}
                  value={settings[requiredSetting.key] ?? ''}
                  onChange={(value) =>
                    setSettings((currentSettings) => ({
                      ...currentSettings,
                      [requiredSetting.key]: value,
                    }))
                  }
                  error={settingsValidationErrors[requiredSetting.key]}
                  fullWidth
                />
              ))
            )}
            <StyledActions>
              <Button
                title={t`Back`}
                variant="secondary"
                onClick={() => setSelectedTemplate(null)}
              />
              <Button
                title={t`Create draft`}
                variant="primary"
                accent="blue"
                onClick={handleCreateWorkflow}
                disabled={hasInvalidRequiredSettings || isCreating}
                isLoading={isCreating}
              />
            </StyledActions>
          </StyledForm>
        </StyledConfiguration>
      )}
    </StyledCatalog>
  );
};
