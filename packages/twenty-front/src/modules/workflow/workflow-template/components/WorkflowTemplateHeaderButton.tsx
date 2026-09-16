import { useLingui } from '@lingui/react/macro';
import { IconArrowLeft, IconPlus } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';

type WorkflowTemplateHeaderButtonProps = {
  isTemplateMode: boolean;
  onClick: () => void;
};

export const WorkflowTemplateHeaderButton = ({
  isTemplateMode,
  onClick,
}: WorkflowTemplateHeaderButtonProps) => {
  const { t } = useLingui();

  return (
    <Button
      Icon={isTemplateMode ? IconArrowLeft : IconPlus}
      accent="default"
      title={isTemplateMode ? t`Back to workflows` : t`New workflow`}
      variant="secondary"
      onClick={onClick}
    />
  );
};
