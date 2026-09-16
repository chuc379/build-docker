import { styled } from '@linaria/react';
import { IconArrowLeft } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type MobileNavigationBackButtonProps = {
  ariaLabel: string;
  onClick: () => void;
};

const StyledButton = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  display: flex;
  flex: 0 0 auto;
  height: 40px;
  justify-content: center;
  margin: 0;
  padding: 0;
  width: 40px;
`;

export const MobileNavigationBackButton = ({
  ariaLabel,
  onClick,
}: MobileNavigationBackButtonProps) => (
  <StyledButton aria-label={ariaLabel} onClick={onClick} type="button">
    <IconArrowLeft aria-hidden size={20} stroke={1.5} />
  </StyledButton>
);
