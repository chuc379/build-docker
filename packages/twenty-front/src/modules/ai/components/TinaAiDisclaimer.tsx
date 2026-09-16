import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledDisclaimer = styled.p`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xxs};
  font-weight: ${themeCssVariables.font.weight.regular};
  line-height: 1.3;
  margin: 0;
  padding-block: ${themeCssVariables.spacing[1]};
  padding-inline: ${themeCssVariables.spacing[2]};
  text-align: center;
  width: 100%;
`;

export const TinaAiDisclaimer = () => {
  const { t } = useLingui();

  return (
    <StyledDisclaimer>
      {t`Tina AI chỉ là trí tuệ nhân tạo, có thể mắc sai sót`}
    </StyledDisclaimer>
  );
};
