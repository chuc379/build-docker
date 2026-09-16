import { WorkflowTemplatePreview } from '@/workflow/workflow-template/components/WorkflowTemplatePreview';
import { type WorkflowTemplate } from '@/workflow/workflow-template/types/WorkflowTemplate';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { IconAdjustments, IconSparkles, useIcons } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const TEMPLATE_ACCENTS = ['blue', 'purple', 'turquoise', 'green'] as const;

const ACCENT_COLORS = {
  blue: {
    background: themeCssVariables.color.blue7,
    foreground: themeCssVariables.color.blue,
  },
  purple: {
    background: themeCssVariables.color.purple7,
    foreground: themeCssVariables.color.purple,
  },
  turquoise: {
    background: themeCssVariables.color.turquoise7,
    foreground: themeCssVariables.color.turquoise,
  },
  green: {
    background: themeCssVariables.color.green7,
    foreground: themeCssVariables.color.green,
  },
};

const StyledCard = styled.article`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  box-shadow: ${themeCssVariables.boxShadow.light};
  display: flex;
  flex-direction: column;
  min-height: 354px;
  padding: ${themeCssVariables.spacing[3]};
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;

  &:hover {
    border-color: ${themeCssVariables.border.color.medium};
    box-shadow: ${themeCssVariables.boxShadow.strong};
    transform: translateY(-2px);
  }
`;

const StyledPreviewContainer = styled.div`
  position: relative;
`;

const StyledIcon = styled.div<{ $accent: keyof typeof ACCENT_COLORS }>`
  align-items: center;
  background: ${({ $accent }) => ACCENT_COLORS[$accent].background};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${({ $accent }) => ACCENT_COLORS[$accent].foreground};
  display: flex;
  height: 40px;
  justify-content: center;
  left: ${themeCssVariables.spacing[2]};
  position: absolute;
  top: ${themeCssVariables.spacing[2]};
  width: 40px;
  z-index: 1;
`;

const StyledContent = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: ${themeCssVariables.spacing[3]} 0;
`;

const StyledTitle = styled.h3`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  line-height: 1.35;
  margin: 0;
`;

const StyledDescription = styled.p`
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: ${themeCssVariables.font.color.secondary};
  display: -webkit-box;
  font-size: ${themeCssVariables.font.size.md};
  line-height: 1.45;
  margin: ${themeCssVariables.spacing[1]} 0 0;
  overflow: hidden;
  text-wrap: pretty;
`;

const StyledMeta = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[3]};
  margin-top: auto;
  padding-top: ${themeCssVariables.spacing[3]};
`;

const StyledMetaItem = styled.span`
  align-items: center;
  display: inline-flex;
  gap: ${themeCssVariables.spacing[1]};
  text-transform: capitalize;
`;

type WorkflowTemplateCardProps = {
  template: WorkflowTemplate;
  templateIndex: number;
  onSelect: (template: WorkflowTemplate) => void;
};

export const WorkflowTemplateCard = ({
  template,
  templateIndex,
  onSelect,
}: WorkflowTemplateCardProps) => {
  const { t } = useLingui();
  const { getIcon } = useIcons();
  const TemplateIcon = getIcon(template.icon) ?? IconSparkles;
  const accent = TEMPLATE_ACCENTS[templateIndex % TEMPLATE_ACCENTS.length];

  return (
    <StyledCard>
      <StyledPreviewContainer>
        <StyledIcon $accent={accent}>
          <TemplateIcon size={22} />
        </StyledIcon>
        <WorkflowTemplatePreview />
      </StyledPreviewContainer>
      <StyledContent>
        <StyledTitle>{template.name}</StyledTitle>
        <StyledDescription>{template.shortDescription}</StyledDescription>
        <StyledMeta>
          <StyledMetaItem>
            <IconSparkles size={14} />
            {template.category.replaceAll('-', ' ')}
          </StyledMetaItem>
          <StyledMetaItem>
            <IconAdjustments size={14} />
            {template.requiredSettings.length === 0
              ? t`Ready to use`
              : t`${template.requiredSettings.length} setup fields`}
          </StyledMetaItem>
        </StyledMeta>
      </StyledContent>
      <Button
        title={t`Use this template`}
        variant="secondary"
        accent="blue"
        justify="center"
        fullWidth
        onClick={() => onSelect(template)}
      />
    </StyledCard>
  );
};
