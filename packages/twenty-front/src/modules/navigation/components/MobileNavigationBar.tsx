import { useSwitchToNewAiChat } from '@/ai/hooks/useSwitchToNewAiChat';
import { MAIN_CONTEXT_STORE_INSTANCE_ID } from '@/context-store/constants/MainContextStoreInstanceId';
import { contextStoreCurrentObjectMetadataItemIdComponentState } from '@/context-store/states/contextStoreCurrentObjectMetadataItemIdComponentState';
import { useIsSettingsPage } from '@/navigation/hooks/useIsSettingsPage';
import { currentMobileNavigationDrawerState } from '@/navigation/states/currentMobileNavigationDrawerState';
import { useFilteredObjectMetadataItems } from '@/object-metadata/hooks/useFilteredObjectMetadataItems';
import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { useOpenRecordsSearchPageInSidePanel } from '@/side-panel/hooks/useOpenRecordsSearchPageInSidePanel';
import { useSidePanelMenu } from '@/side-panel/hooks/useSidePanelMenu';
import { isSidePanelOpenedState } from '@/side-panel/states/isSidePanelOpenedState';
import { isNavigationDrawerExpandedState } from '@/ui/navigation/states/isNavigationDrawerExpanded';
import { navigationMemorizedUrlState } from '@/ui/navigation/states/navigationMemorizedUrlState';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useSetAtomComponentState';
import { styled } from '@linaria/react';
import { IconMenu, IconSearch } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { PermissionFlagType } from '~/generated-metadata/graphql';

const StyledNavigation = styled.nav`
  align-items: center;
  background: ${themeCssVariables.background.primary};
  display: flex;
  flex: 0 0 auto;
  gap: 10px;
  justify-content: center;
  padding: 0 16px calc(15px + env(safe-area-inset-bottom, 0px));
  z-index: 1001;
`;

const StyledOptionsPill = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: 999px;
  box-shadow: ${themeCssVariables.boxShadow.light};
  box-sizing: border-box;
  corner-shape: initial;
  display: flex;
  height: 52px;
  padding: 4px;
`;

const StyledOption = styled.button`
  align-items: center;
  border-radius: 999px;
  color: ${themeCssVariables.font.color.light};
  corner-shape: initial;
  display: flex;
  flex: 0 0 74px;
  flex-direction: column;
  font-size: 12px;
  gap: 2px;
  height: 44px;
  padding: 4px 12px;

  &[data-active='true'] {
    background: ${themeCssVariables.color.blue3};
    color: ${themeCssVariables.color.blue11};
  }
`;

const StyledAiButton = styled.button`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: 50%;
  box-shadow: ${themeCssVariables.boxShadow.light};
  corner-shape: initial;
  padding: 4px;
`;

const StyledAiButtonInner = styled.span`
  align-items: center;
  background: ${themeCssVariables.color.blue2};
  border-radius: 50%;
  corner-shape: initial;
  display: flex;
  flex: 0 0 42px;
  height: 42px;
  justify-content: center;
  width: 42px;

  img {
    display: block;
    height: 29px;
    width: 29px;
  }
`;

export const MobileNavigationBar = () => {
  const isSidePanelOpened = useAtomStateValue(isSidePanelOpenedState);
  const navigationMemorizedUrl = useAtomStateValue(navigationMemorizedUrlState);
  const { closeSidePanelMenu } = useSidePanelMenu();
  const { openRecordsSearchPage } = useOpenRecordsSearchPageInSidePanel();
  const isSettingsPage = useIsSettingsPage();
  const [isNavigationDrawerExpanded, setIsNavigationDrawerExpanded] =
    useAtomState(isNavigationDrawerExpandedState);
  const [currentMobileNavigationDrawer, setCurrentMobileNavigationDrawer] =
    useAtomState(currentMobileNavigationDrawerState);
  const { switchToNewChat } = useSwitchToNewAiChat();
  const { alphaSortedActiveNonSystemObjectMetadataItems } =
    useFilteredObjectMetadataItems();
  const hasAiPermission = useHasPermissionFlag(PermissionFlagType.AI);

  const setContextStoreCurrentObjectMetadataItemId = useSetAtomComponentState(
    contextStoreCurrentObjectMetadataItemIdComponentState,
    MAIN_CONTEXT_STORE_INSTANCE_ID,
  );

  const activeItemName = isNavigationDrawerExpanded
    ? currentMobileNavigationDrawer
    : isSidePanelOpened
      ? 'search'
      : 'main';

  const handleMenuClick = () => {
    closeSidePanelMenu();
    setIsNavigationDrawerExpanded(
      (previousIsOpen) => activeItemName !== 'main' || !previousIsOpen,
    );
    setCurrentMobileNavigationDrawer('main');

    if (isSettingsPage) {
      navigate(
        navigationMemorizedUrl !== '/'
          ? navigationMemorizedUrl
          : defaultHomePagePath,
      );
    }
  };

  const handleSearchClick = () => {
    setIsNavigationDrawerExpanded(false);
    closeSidePanelMenu();

    if (isSettingsPage) {
      const firstObjectMetadataItem =
        alphaSortedActiveNonSystemObjectMetadataItems[0];
      if (firstObjectMetadataItem !== undefined) {
        setContextStoreCurrentObjectMetadataItemId(firstObjectMetadataItem.id);
      }
    }

    openRecordsSearchPage();
  };

  const handleAiChatClick = () => {
    setIsNavigationDrawerExpanded(false);
    closeSidePanelMenu();
    switchToNewChat();
  };

  return (
    <StyledNavigation aria-label={t`Mobile navigation`}>
      <StyledOptionsPill>
        <StyledOption
          aria-label={t`Menu`}
          aria-pressed={activeItemName === 'main'}
          data-active={activeItemName === 'main'}
          onClick={handleMenuClick}
          type="button"
        >
          <IconMenu size={22} />
          <span>{t`Menu`}</span>
        </StyledOption>

        <StyledOption
          aria-label={t`Search`}
          data-active={activeItemName === 'search'}
          onClick={handleSearchClick}
          type="button"
        >
          <IconSearch size={22} stroke={1.6} />
          <span>{t`Search`}</span>
        </StyledOption>
      </StyledOptionsPill>

      {hasAiPermission && (
        <StyledAiButton
          aria-label={t`New AI chat`}
          onClick={handleAiChatClick}
          type="button"
        >
          <StyledAiButtonInner>
            <img
              alt=""
              aria-hidden="true"
              src="/images/icons/logo_ask_ai_crm.png"
            />
          </StyledAiButtonInner>
        </StyledAiButton>
      )}
    </StyledNavigation>
  );
};
