import { useHasMultipleAuthMethods } from '@/auth/sign-in-up/hooks/useHasMultipleAuthMethods';
import { useSignInWithMicrosoft } from '@/auth/sign-in-up/hooks/useSignInWithMicrosoft';
import { lastAuthenticatedMethodState } from '@/auth/states/lastAuthenticatedMethodState';
import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';
import { AuthenticatedMethod } from '@/auth/types/AuthenticatedMethod.enum';
import { type SocialSSOSignInUpActionType } from '@/auth/types/socialSSOSignInUp.type';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useContext } from 'react';
import { IconMicrosoft } from 'twenty-ui/icon';
import { MainButton } from 'twenty-ui/input';
import { HorizontalSeparator } from 'twenty-ui/layout';
import { MOBILE_VIEWPORT, ThemeContext } from 'twenty-ui/theme-constants';
import { LastUsedPill } from './LastUsedPill';
import { StyledSSOButtonContainer } from './SignInUpSSOButtonStyles';

const StyledMicrosoftButton = styled(MainButton)`
  @media (max-width: ${MOBILE_VIEWPORT}px) {
    & {
      font-size: 16px;
      font-weight: 500;
      max-height: none;
    }

    svg {
      height: 24px;
      width: 24px;
    }
  }
`;

export const SignInUpWithMicrosoft = ({
  action,
  isGlobalScope,
}: {
  action: SocialSSOSignInUpActionType;
  isGlobalScope?: boolean;
}) => {
  const { theme } = useContext(ThemeContext);
  const { t } = useLingui();

  const signInUpStep = useAtomStateValue(signInUpStepState);
  const [lastAuthenticatedMethod, setLastAuthenticatedMethod] = useAtomState(
    lastAuthenticatedMethodState,
  );
  const { signInWithMicrosoft } = useSignInWithMicrosoft();
  const hasMultipleAuthMethods = useHasMultipleAuthMethods();

  const handleClick = () => {
    setLastAuthenticatedMethod(AuthenticatedMethod.MICROSOFT);
    signInWithMicrosoft({ action });
  };

  const isLastUsed = lastAuthenticatedMethod === AuthenticatedMethod.MICROSOFT;

  return (
    <>
      <StyledSSOButtonContainer>
        <StyledMicrosoftButton
          Icon={() => <IconMicrosoft size={theme.icon.size.md} />}
          title={t`Continue with Microsoft`}
          onClick={handleClick}
          variant={signInUpStep === SignInUpStep.Init ? undefined : 'secondary'}
          fullWidth
        />
        {isLastUsed && (isGlobalScope || hasMultipleAuthMethods) && (
          <LastUsedPill />
        )}
      </StyledSSOButtonContainer>
      <HorizontalSeparator visible={false} />
    </>
  );
};
