import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledPreview = styled.div`
  background-color: ${themeCssVariables.background.secondary};
  background-image: radial-gradient(
    ${themeCssVariables.border.color.light} 0.7px,
    transparent 0.7px
  );
  background-size: 12px 12px;
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  height: 142px;
  overflow: hidden;
  position: relative;
`;

const StyledFlow = styled.div`
  height: 112px;
  left: 50%;
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 216px;
`;

const StyledNode = styled.div<{
  $left: number;
  $top: number;
  $width?: number;
}>`
  align-items: center;
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-shadow: ${themeCssVariables.boxShadow.light};
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-size: 8px;
  height: 24px;
  justify-content: center;
  left: ${({ $left }) => `${$left}px`};
  position: absolute;
  top: ${({ $top }) => `${$top}px`};
  width: ${({ $width = 76 }) => `${$width}px`};
`;

const StyledLine = styled.div<{
  $height?: number;
  $left: number;
  $top: number;
  $width?: number;
}>`
  background: ${themeCssVariables.border.color.medium};
  height: ${({ $height = 1 }) => `${$height}px`};
  left: ${({ $left }) => `${$left}px`};
  position: absolute;
  top: ${({ $top }) => `${$top}px`};
  width: ${({ $width = 1 }) => `${$width}px`};
`;

export const WorkflowTemplatePreview = () => {
  const { t } = useLingui();

  return (
    <StyledPreview aria-hidden="true">
      <StyledFlow>
        <StyledNode $left={70} $top={0}>
          {t`Trigger`}
        </StyledNode>
        <StyledLine $height={14} $left={108} $top={25} />
        <StyledNode $left={70} $top={39}>
          {t`Check condition`}
        </StyledNode>
        <StyledLine $height={13} $left={108} $top={64} />
        <StyledLine $left={39} $top={77} $width={139} />
        <StyledLine $height={10} $left={39} $top={77} />
        <StyledLine $height={10} $left={177} $top={77} />
        <StyledNode $left={0} $top={87} $width={78}>
          {t`Run action`}
        </StyledNode>
        <StyledNode $left={138} $top={87} $width={78}>
          {t`Send email`}
        </StyledNode>
      </StyledFlow>
    </StyledPreview>
  );
};
