import { MobileNavigationBackButton } from '@/navigation/components/MobileNavigationBackButton';
import { getObjectMetadataIdentifierFields } from '@/object-metadata/utils/getObjectMetadataIdentifierFields';
import { ObjectRecordShowPageBreadcrumb } from '@/object-record/record-show/components/ObjectRecordShowPageBreadcrumb';
import { useRecordShowPagePagination } from '@/object-record/record-show/hooks/useRecordShowPagePagination';
import { SIDE_PANEL_TOP_BAR_HEIGHT } from '@/side-panel/constants/SidePanelTopBarHeight';
import { PageCardHeader } from '@/ui/layout/page/components/PageCardHeader';
import { useIsMobile } from '@/ui/utilities/responsive/hooks/useIsMobile';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledMobileRecordShowHeader = styled.div`
  align-items: center;
  background-color: ${themeCssVariables.background.secondary};
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  box-sizing: border-box;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  min-height: ${SIDE_PANEL_TOP_BAR_HEIGHT}px;
  min-width: 0;
  padding: 0 ${themeCssVariables.spacing[3]};
  width: 100%;
`;

const StyledMobileRecordShowBreadcrumb = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
`;

export const RecordShowPageHeader = ({
  objectNameSingular,
  objectRecordId,
  children,
}: {
  objectNameSingular: string;
  objectRecordId: string;
  children?: React.ReactNode;
}) => {
  const { navigateToIndexView, objectMetadataItem } =
    useRecordShowPagePagination(objectNameSingular, objectRecordId);
  const isMobile = useIsMobile();

  const { labelIdentifierFieldMetadataItem } =
    getObjectMetadataIdentifierFields({ objectMetadataItem });

  if (isMobile) {
    return (
      <StyledMobileRecordShowHeader>
        <MobileNavigationBackButton
          ariaLabel={t`Back to ${objectMetadataItem.labelPlural}`}
          onClick={navigateToIndexView}
        />
        <StyledMobileRecordShowBreadcrumb>
          <ObjectRecordShowPageBreadcrumb
            objectNameSingular={objectNameSingular}
            objectRecordId={objectRecordId}
            objectLabel={objectMetadataItem.labelPlural}
            labelIdentifierFieldMetadataItem={labelIdentifierFieldMetadataItem}
            variant="mobile"
          />
        </StyledMobileRecordShowBreadcrumb>
      </StyledMobileRecordShowHeader>
    );
  }

  return (
    <PageCardHeader
      breadcrumb={
        <ObjectRecordShowPageBreadcrumb
          objectNameSingular={objectNameSingular}
          objectRecordId={objectRecordId}
          objectLabel={objectMetadataItem.labelPlural}
          labelIdentifierFieldMetadataItem={labelIdentifierFieldMetadataItem}
        />
      }
      actionButton={children}
    />
  );
};
