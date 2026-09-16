import { RecordIndexContextProvider } from '@/object-record/record-index/contexts/RecordIndexContext';

import { getCommandMenuIdFromRecordIndexId } from '@/command-menu-item/utils/getCommandMenuIdFromRecordIndexId';
import { CommandMenuComponentInstanceContext } from '@/command-menu/states/contexts/CommandMenuComponentInstanceContext';
import { getObjectPermissionsForObject } from '@/object-metadata/utils/getObjectPermissionsForObject';
import { RecordIndexViewBar } from '@/object-record/record-index/components/RecordIndexViewBar';
import { RecordComponentInstanceContextsWrapper } from '@/object-record/components/RecordComponentInstanceContextsWrapper';
import { useObjectPermissions } from '@/object-record/hooks/useObjectPermissions';
import { lastShowPageRecordIdState } from '@/object-record/record-field/ui/states/lastShowPageRecordId';
import { RecordIndexContainer } from '@/object-record/record-index/components/RecordIndexContainer';
import { RecordIndexContainerContextStoreNumberOfSelectedRecordsEffect } from '@/object-record/record-index/components/RecordIndexContainerContextStoreNumberOfSelectedRecordsEffect';
import { RecordIndexEmptyStateNotShared } from '@/object-record/record-index/components/RecordIndexEmptyStateNotShared';
import { RecordIndexLoadBaseOnContextStoreEffect } from '@/object-record/record-index/components/RecordIndexLoadBaseOnContextStoreEffect';
import { RecordIndexPageHeader } from '@/object-record/record-index/components/RecordIndexPageHeader';
import { RecordIndexViewFieldsSSESyncEffect } from '@/object-record/record-index/components/RecordIndexViewFieldsSSESyncEffect';
import { useHandleIndexIdentifierClick } from '@/object-record/record-index/hooks/useHandleIndexIdentifierClick';
import { useRecordIndexFieldMetadataDerivedStates } from '@/object-record/record-index/hooks/useRecordIndexFieldMetadataDerivedStates';
import { useRecordIndexIdFromCurrentContextStore } from '@/object-record/record-index/hooks/useRecordIndexIdFromCurrentContextStore';
import { RECORD_INDEX_DRAG_SELECT_BOUNDARY_CLASS } from '@/ui/utilities/drag-select/constants/RecordIndecDragSelectBoundaryClass';
import { PageCardLayout } from '@/ui/layout/page/components/PageCardLayout';
import { PageTitle } from '@/ui/utilities/page-title/components/PageTitle';
import { ViewComponentInstanceContext } from '@/views/states/contexts/ViewComponentInstanceContext';
import { WorkflowTemplateCatalog } from '@/workflow/workflow-template/components/WorkflowTemplateCatalog';
import { WorkflowTemplateHeaderButton } from '@/workflow/workflow-template/components/WorkflowTemplateHeaderButton';
import { styled } from '@linaria/react';
import { useStore } from 'jotai';
import { useCallback, useEffect, useState } from 'react';

const StyledIndexContainer = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  width: 100%;
`;

export const RecordIndexContainerGater = () => {
  const store = useStore();

  const { recordIndexId, objectMetadataItem } =
    useRecordIndexIdFromCurrentContextStore();

  const handleIndexRecordsLoaded = useCallback(() => {
    // TODO: find a better way to reset this state ?
    store.set(lastShowPageRecordIdState.atom, null);
  }, [store]);

  const { indexIdentifierUrl } = useHandleIndexIdentifierClick({
    objectMetadataItem,
  });

  const { objectPermissionsByObjectMetadataId } = useObjectPermissions();
  const objectPermissions = getObjectPermissionsForObject(
    objectPermissionsByObjectMetadataId,
    objectMetadataItem.id,
  );

  const hasObjectReadPermissions = objectPermissions.canReadObjectRecords;
  const isWorkflowIndex = objectMetadataItem.namePlural === 'workflows';
  const [isWorkflowTemplateMode, setIsWorkflowTemplateMode] = useState(false);

  // Automatically reset template mode whenever user navigates to a different object (sidebar tab change)
  useEffect(() => {
    setIsWorkflowTemplateMode(false);
  }, [objectMetadataItem.namePlural]);

  const {
    fieldDefinitionByFieldMetadataItemId,
    fieldMetadataItemByFieldMetadataItemId,
    labelIdentifierFieldMetadataItem,
    recordFieldByFieldMetadataItemId,
  } = useRecordIndexFieldMetadataDerivedStates(
    objectMetadataItem,
    recordIndexId,
  );

  return (
    <>
      <RecordIndexContextProvider
        value={{
          objectPermissionsByObjectMetadataId,
          recordIndexId,
          viewBarInstanceId: recordIndexId,
          objectNamePlural: objectMetadataItem.namePlural,
          objectNameSingular: objectMetadataItem.nameSingular,
          objectMetadataItem,
          onIndexRecordsLoaded: handleIndexRecordsLoaded,
          indexIdentifierUrl,
          recordFieldByFieldMetadataItemId,
          labelIdentifierFieldMetadataItem,
          fieldMetadataItemByFieldMetadataItemId,
          fieldDefinitionByFieldMetadataItemId,
        }}
      >
        <ViewComponentInstanceContext.Provider
          value={{ instanceId: recordIndexId }}
        >
          <RecordComponentInstanceContextsWrapper
            componentInstanceId={recordIndexId}
          >
            <CommandMenuComponentInstanceContext.Provider
              value={{
                instanceId: getCommandMenuIdFromRecordIndexId(recordIndexId),
              }}
            >
              <PageTitle title={objectMetadataItem.labelPlural} />
              <PageCardLayout
                header={
                  <RecordIndexPageHeader
                    suppressSelectedRecordsCount={isWorkflowTemplateMode}
                    customActionButton={
                      isWorkflowIndex ? (
                        <WorkflowTemplateHeaderButton
                          isTemplateMode={isWorkflowTemplateMode}
                          onClick={() =>
                            setIsWorkflowTemplateMode(
                              (currentTemplateMode) => !currentTemplateMode,
                            )
                          }
                        />
                      ) : undefined
                    }
                  />
                }
                secondaryBar={
                  hasObjectReadPermissions &&
                  !isWorkflowTemplateMode && <RecordIndexViewBar />
                }
              >
                <StyledIndexContainer
                  className={RECORD_INDEX_DRAG_SELECT_BOUNDARY_CLASS}
                >
                  {hasObjectReadPermissions && isWorkflowTemplateMode ? (
                    <WorkflowTemplateCatalog />
                  ) : hasObjectReadPermissions ? (
                    <>
                      <RecordIndexContainerContextStoreNumberOfSelectedRecordsEffect />
                      <RecordIndexContainer />
                    </>
                  ) : (
                    <RecordIndexEmptyStateNotShared />
                  )}
                </StyledIndexContainer>
              </PageCardLayout>
            </CommandMenuComponentInstanceContext.Provider>
          </RecordComponentInstanceContextsWrapper>
          <RecordIndexLoadBaseOnContextStoreEffect />
          <RecordIndexViewFieldsSSESyncEffect />
        </ViewComponentInstanceContext.Provider>
      </RecordIndexContextProvider>
    </>
  );
};
