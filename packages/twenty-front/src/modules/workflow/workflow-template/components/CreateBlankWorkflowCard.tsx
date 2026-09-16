import { useState } from 'react';

import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { AppPath, CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { IconLoader, IconPlus } from 'twenty-ui/icon';
import { AnimatedCircleLoading } from 'twenty-ui/layout';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { useNavigateApp } from '~/hooks/useNavigateApp';

const StyledCard = styled.article`
  align-items: center;
  background: ${themeCssVariables.background.primary};
  border: 2px dashed ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  box-shadow: ${themeCssVariables.boxShadow.light};
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 354px;
  padding: ${themeCssVariables.spacing[4]};
  text-align: center;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    transform 160ms ease;

  &:hover {
    background-color: ${themeCssVariables.background.secondary};
    border-color: ${themeCssVariables.color.blue};
    transform: translateY(-2px);
  }
`;

const StyledPlusCircle = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.transparent.blue};
  border-radius: 50%;
  color: ${themeCssVariables.color.blue};
  display: flex;
  height: 56px;
  justify-content: center;
  margin-bottom: ${themeCssVariables.spacing[3]};
  width: 56px;
`;

const StyledTitle = styled.h3`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  line-height: 1.35;
  margin: 0;
`;

const StyledDescription = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.45;
  margin: ${themeCssVariables.spacing[2]} 0 0;
`;

export const CreateBlankWorkflowCard = () => {
  const { t } = useLingui();
  const navigate = useNavigateApp();
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();
  const [isCreating, setIsCreating] = useState(false);

  const { createOneRecord } = useCreateOneRecord({
    objectNameSingular: CoreObjectNameSingular.Workflow,
  });

  const handleCreateBlankWorkflow = async () => {
    if (isCreating) {
      return;
    }

    setIsCreating(true);

    try {
      const newWorkflow = await createOneRecord({
        name: 'New Workflow',
        statuses: ['DRAFT'],
      });

      if (isDefined(newWorkflow?.id)) {
        enqueueSuccessSnackBar({ message: t`Blank workflow created` });
        navigate(AppPath.RecordShowPage, {
          objectNameSingular: CoreObjectNameSingular.Workflow,
          objectRecordId: newWorkflow.id,
        });
      }
    } catch {
      enqueueErrorSnackBar({ message: t`Failed to create blank workflow` });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <StyledCard onClick={handleCreateBlankWorkflow} role="button" tabIndex={0}>
      {isCreating ? (
        <AnimatedCircleLoading>
          <IconLoader size={28} />
        </AnimatedCircleLoading>
      ) : (
        <>
          <StyledPlusCircle>
            <IconPlus size={28} />
          </StyledPlusCircle>
          <StyledTitle>{t`Create blank workflow`}</StyledTitle>
          <StyledDescription>
            {t`Start from scratch with an empty workflow canvas.`}
          </StyledDescription>
        </>
      )}
    </StyledCard>
  );
};
