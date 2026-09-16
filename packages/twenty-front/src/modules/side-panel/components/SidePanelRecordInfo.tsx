import { allowRequestsToTwentyIconsState } from '@/client-config/states/allowRequestsToTwentyIcons';
import { useLabelIdentifierFieldMetadataItem } from '@/object-metadata/hooks/useLabelIdentifierFieldMetadataItem';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { useIsRecordFieldReadOnly } from '@/object-record/read-only/hooks/useIsRecordFieldReadOnly';
import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { useRecordShowContainerActions } from '@/object-record/record-show/hooks/useRecordShowContainerActions';
import { useRecordShowPage } from '@/object-record/record-show/hooks/useRecordShowPage';
import { recordStoreIdentifierFamilySelector } from '@/object-record/record-store/states/selectors/recordStoreIdentifierFamilySelector';
import { RecordTitleCell } from '@/object-record/record-title-cell/components/RecordTitleCell';
import { RecordTitleCellContainerType } from '@/object-record/record-title-cell/types/RecordTitleCellContainerType';
import { viewableRecordIdComponentState } from '@/side-panel/pages/record-page/states/viewableRecordIdComponentState';
import { viewableRecordNameSingularComponentState } from '@/side-panel/pages/record-page/states/viewableRecordNameSingularComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { styled } from '@linaria/react';
import { AppPath } from 'twenty-shared/types';
import { getAppPath } from 'twenty-shared/utils';
import { Avatar } from 'twenty-ui/data-display';
import { UndecoratedLink } from 'twenty-ui/navigation';
import { FieldMetadataType } from '~/generated-metadata/graphql';

import { getAbsoluteImageUrl } from '~/utils/image/getAbsoluteImageUrl';
import { SidePanelPageInfoLayout } from './SidePanelPageInfoLayout';

const StyledClickableTitle = styled.div`
  cursor: pointer;

  a {
    color: inherit;
    text-decoration: none;
  }
`;

export const SidePanelRecordInfo = ({
  sidePanelPageInstanceId,
}: {
  sidePanelPageInstanceId: string;
}) => {
  const viewableRecordNameSingular = useAtomComponentStateValue(
    viewableRecordNameSingularComponentState,
    sidePanelPageInstanceId,
  );
  const allowRequestsToTwentyIcons = useAtomStateValue(
    allowRequestsToTwentyIconsState,
  );

  const viewableRecordId = useAtomComponentStateValue(
    viewableRecordIdComponentState,
    sidePanelPageInstanceId,
  );

  const { objectNameSingular, objectRecordId } = useRecordShowPage(
    viewableRecordNameSingular!,
    viewableRecordId!,
  );

  const recordIdentifier = useAtomFamilySelectorValue(
    recordStoreIdentifierFamilySelector,
    {
      recordId: objectRecordId,
      allowRequestsToTwentyIcons,
    },
  );

  const { objectMetadataItem } = useObjectMetadataItem({
    objectNameSingular,
  });

  const { labelIdentifierFieldMetadataItem } =
    useLabelIdentifierFieldMetadataItem({
      objectNameSingular,
    });

  const isTitleReadOnly = useIsRecordFieldReadOnly({
    recordId: objectRecordId,
    fieldMetadataId: labelIdentifierFieldMetadataItem?.id ?? '',
    objectMetadataId: objectMetadataItem.id,
  });

  const { useUpdateOneObjectRecordMutation } = useRecordShowContainerActions({
    objectNameSingular,
  });

  const recordShowPagePath = getAppPath(AppPath.RecordShowPage, {
    objectNameSingular,
    objectRecordId,
  });

  const fieldDefinition = {
    type: labelIdentifierFieldMetadataItem?.type ?? FieldMetadataType.TEXT,
    iconName: '',
    fieldMetadataId: labelIdentifierFieldMetadataItem?.id ?? '',
    label: labelIdentifierFieldMetadataItem?.label ?? '',
    metadata: {
      fieldName: labelIdentifierFieldMetadataItem?.name ?? '',
      objectMetadataNameSingular: objectNameSingular,
    },
    defaultValue: labelIdentifierFieldMetadataItem?.defaultValue,
  };

  const titleContent = (
    <FieldContext.Provider
      value={{
        recordId: objectRecordId,
        isLabelIdentifier: false,
        fieldDefinition,
        useUpdateRecord: useUpdateOneObjectRecordMutation,
        isCentered: false,
        isDisplayModeFixHeight: true,
        isRecordFieldReadOnly: isTitleReadOnly,
      }}
    >
      <RecordTitleCell
        sizeVariant="sm"
        containerType={RecordTitleCellContainerType.PageHeader}
      />
    </FieldContext.Provider>
  );

  return (
    <SidePanelPageInfoLayout
      icon={
        recordIdentifier ? (
          <Avatar
            avatarUrl={getAbsoluteImageUrl(recordIdentifier.avatarUrl)}
            placeholder={recordIdentifier.name}
            placeholderColorSeed={objectRecordId}
            size="md"
            type={recordIdentifier.avatarType}
          />
        ) : undefined
      }
      title={
        isTitleReadOnly ? (
          <StyledClickableTitle>
            <UndecoratedLink to={recordShowPagePath}>
              {titleContent}
            </UndecoratedLink>
          </StyledClickableTitle>
        ) : (
          titleContent
        )
      }
    />
  );
};
