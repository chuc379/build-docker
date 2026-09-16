import { Logo } from '@/auth/components/Logo';
import { Title } from '@/auth/components/Title';
import { FooterNote } from '@/auth/sign-in-up/components/FooterNote';
import { WorkspaceSelectionFooter } from '@/auth/sign-in-up/components/WorkspaceSelectionFooter';
import { SignInUpStep } from '@/auth/states/signInUpStepState';
import { styled } from '@linaria/react';
import { type JSX } from 'react';
import { AppPath } from 'twenty-shared/types';
import { AnimatedEaseIn } from 'twenty-ui/layout';
import { ModalContent } from 'twenty-ui/surfaces';
import { MOBILE_VIEWPORT, themeCssVariables } from 'twenty-ui/theme-constants';
import { type PublicWorkspaceData } from '~/generated-metadata/graphql';

const StyledTitleContainer = styled.div`
  line-height: 1.2;
  margin-top: ${themeCssVariables.spacing[10]};
`;

const StyledFormContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  margin-bottom: ${themeCssVariables.spacing[6]};
  margin-top: ${themeCssVariables.spacing[6]};
  min-width: 0;
  width: 100%;

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    margin-top: 0;
  }
`;

const StyledMobileAuthContent = styled.div`
  align-items: center;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: ${themeCssVariables.spacing[10]};
  width: 100%;

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    min-height: 100dvh;
  }
`;

const StyledFooterContainer = styled.div`
  display: contents;

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    display: block;
    margin-top: auto;
  }
`;

type SignInUpStandardContentProps = {
  workspacePublicData: PublicWorkspaceData | null;
  signInUpForm: JSX.Element | null;
  signInUpStep: SignInUpStep;
  title: string;
  onClickOnLogo: () => void;
};

export const SignInUpStandardContent = ({
  workspacePublicData,
  signInUpForm,
  signInUpStep,
  title,
  onClickOnLogo,
}: SignInUpStandardContentProps) => {
  return (
    <ModalContent isVerticallyCentered isHorizontallyCentered noPadding>
      <StyledMobileAuthContent>
        <AnimatedEaseIn>
          <Logo
            secondaryLogo={workspacePublicData?.logo}
            placeholder={workspacePublicData?.displayName}
            onClick={onClickOnLogo}
            to={AppPath.SignInUp}
          />
        </AnimatedEaseIn>
        <StyledTitleContainer>
          <Title animate color={themeCssVariables.grayScale.gray12}>
            {title}
          </Title>
        </StyledTitleContainer>
        <StyledFormContainer>{signInUpForm}</StyledFormContainer>
        {signInUpStep === SignInUpStep.WorkspaceSelection && (
          <WorkspaceSelectionFooter />
        )}
        <StyledFooterContainer>
          {![
            SignInUpStep.Password,
            SignInUpStep.TwoFactorAuthenticationProvision,
            SignInUpStep.TwoFactorAuthenticationVerification,
            SignInUpStep.WorkspaceSelection,
            SignInUpStep.WorkspaceCreation,
          ].includes(signInUpStep) && (
            <FooterNote secondaryAgreement="dataProcessingAgreement" />
          )}
        </StyledFooterContainer>
      </StyledMobileAuthContent>
    </ModalContent>
  );
};
