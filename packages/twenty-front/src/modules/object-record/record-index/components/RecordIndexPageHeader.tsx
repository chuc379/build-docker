import { RecordIndexCommandMenu } from '@/command-menu-item/components/RecordIndexCommandMenu';
import { MAIN_CONTEXT_STORE_INSTANCE_ID } from '@/context-store/constants/MainContextStoreInstanceId';
import { contextStoreCurrentViewIdComponentState } from '@/context-store/states/contextStoreCurrentViewIdComponentState';
import { contextStoreNumberOfSelectedRecordsComponentState } from '@/context-store/states/contextStoreNumberOfSelectedRecordsComponentState';
import { isLayoutCustomizationModeEnabledState } from '@/layout-customization/states/isLayoutCustomizationModeEnabledState';
import { useNumberFormat } from '@/localization/hooks/useNumberFormat';
import { useOpenMainNavigationDrawer } from '@/navigation/hooks/useOpenMainNavigationDrawer';
import { useFilteredObjectMetadataItems } from '@/object-metadata/hooks/useFilteredObjectMetadataItems';
import { RecordIndexPageHeaderIcon } from '@/object-record/record-index/components/RecordIndexPageHeaderIcon';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { SidePanelToggleButton } from '@/side-panel/components/SidePanelToggleButton';
import { PageCardHeader } from '@/ui/layout/page/components/PageCardHeader';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledTitleWithSelectedRecords = styled.div`
  display: flex;
  flex-direction: row;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledTitle = styled.div`
  color: ${themeCssVariables.font.color.primary};
  padding-right: ${themeCssVariables.spacing['0.5']};
`;

const StyledSelectedRecordsCount = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  padding-left: ${themeCssVariables.spacing['0.5']};
`;

type RecordIndexPageHeaderProps = {
  customActionButton?: React.ReactNode;
  suppressSelectedRecordsCount?: boolean;
};

export const RecordIndexPageHeader = ({
  customActionButton,
  suppressSelectedRecordsCount = false,
}: RecordIndexPageHeaderProps) => {
  const { findObjectMetadataItemByNamePlural } =
    useFilteredObjectMetadataItems();

  const contextStoreNumberOfSelectedRecords = useAtomComponentStateValue(
    contextStoreNumberOfSelectedRecordsComponentState,
  );

  const { formatNumber } = useNumberFormat();

  const { objectNamePlural } = useRecordIndexContextOrThrow();
  const isWorkflowIndex = objectNamePlural === 'workflows';
  const objectMetadataItem =
    findObjectMetadataItemByNamePlural(objectNamePlural);
  const { openMainNavigationDrawer } = useOpenMainNavigationDrawer();

  const label = objectMetadataItem?.labelPlural ?? objectNamePlural;

  const pageHeaderTitle =
    !suppressSelectedRecordsCount && contextStoreNumberOfSelectedRecords > 0 ? (
      <StyledTitleWithSelectedRecords>
        <StyledTitle>{label}</StyledTitle>
        <>{'->'}</>
        <StyledSelectedRecordsCount>
          {t`${formatNumber(contextStoreNumberOfSelectedRecords)} selected`}
        </StyledSelectedRecordsCount>
      </StyledTitleWithSelectedRecords>
    ) : (
      label
    );

  const contextStoreCurrentViewId = useAtomComponentStateValue(
    contextStoreCurrentViewIdComponentState,
    MAIN_CONTEXT_STORE_INSTANCE_ID,
  );
  const isLayoutCustomizationModeEnabled = useAtomStateValue(
    isLayoutCustomizationModeEnabledState,
  );

  return (
    <PageCardHeader
      icon={
        <RecordIndexPageHeaderIcon objectMetadataItem={objectMetadataItem} />
      }
      title={pageHeaderTitle}
      mobileNavigationTitle={label}
      mobileNavigationAriaLabel={`Back to ${objectMetadataItem?.labelPlural}`}
      onMobileNavigationBackButtonClick={openMainNavigationDrawer}
      actionButton={
        isDefined(contextStoreCurrentViewId) ? (
          <>
            {!isWorkflowIndex && <RecordIndexCommandMenu />}
            {customActionButton}
            {!isLayoutCustomizationModeEnabled && <SidePanelToggleButton />}
          </>
        ) : undefined
      }
    />
  );
};
