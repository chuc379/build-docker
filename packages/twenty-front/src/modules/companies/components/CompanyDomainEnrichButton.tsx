import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { useContext, useEffect, useState } from 'react';
import { IconLoader, IconSparkles } from 'twenty-ui/icon';
import { FloatingIconButton } from 'twenty-ui/input';
import { AnimatedContainer } from 'twenty-ui/layout';

import { useEnrichCompanyFromDomain } from '@/companies/hooks/useEnrichCompanyFromDomain';
import {
  buildCompanyEnrichmentUpdateInput,
  getDefaultSelectedCompanyEnrichmentFields,
  isCompanyEnrichmentFieldEmpty,
} from '@/companies/utils/companyEnrichmentApply';
import { getCompanyNameFromDomainUrl } from '@/companies/utils/getCompanyNameFromDomainUrl';
import { useUpdateOneRecord } from '@/object-record/hooks/useUpdateOneRecord';
import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { recordStoreFamilyState } from '@/object-record/record-store/states/recordStoreFamilyState';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';

const StyledButtonContainer = styled.div`
  align-items: center;
  display: flex;
`;

type CompanyDomainEnrichButtonProps = {
  isHovered: boolean;
};

export const CompanyDomainEnrichButton = ({
  isHovered,
}: CompanyDomainEnrichButtonProps) => {
  const { t } = useLingui();
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar, enqueueInfoSnackBar } =
    useSnackBar();
  const { enrichCompanyFromDomain } = useEnrichCompanyFromDomain();
  const { updateOneRecord } = useUpdateOneRecord();

  const {
    recordId,
    fieldDefinition,
    isRecordFieldReadOnly: isReadOnly,
  } = useContext(FieldContext);

  const recordStore = useAtomFamilyStateValue(recordStoreFamilyState, recordId);
  const domainName = recordStore?.domainName as
    | { primaryLinkUrl?: string | null }
    | string
    | null
    | undefined;

  const domainUrl =
    typeof domainName === 'string'
      ? domainName
      : (domainName?.primaryLinkUrl ?? null);

  const [isRequestInFlight, setIsRequestInFlight] = useState(false);
  const [lastAutoNamedDomain, setLastAutoNamedDomain] = useState<string | null>(
    null,
  );

  const objectNameSingular =
    fieldDefinition.metadata.objectMetadataNameSingular;
  const fieldName = fieldDefinition.metadata.fieldName;

  const isCompanyDomainField =
    objectNameSingular === 'company' &&
    fieldName === 'domainName' &&
    !isReadOnly;

  const canShow =
    isCompanyDomainField &&
    isNonEmptyString(domainUrl) &&
    (isHovered || isRequestInFlight);

  useEffect(() => {
    if (!isCompanyDomainField || !isNonEmptyString(domainUrl)) {
      return;
    }

    if (lastAutoNamedDomain === domainUrl) {
      return;
    }

    if (
      !isCompanyEnrichmentFieldEmpty({
        fieldName: 'name',
        record: recordStore,
      })
    ) {
      setLastAutoNamedDomain(domainUrl);

      return;
    }

    const derivedName = getCompanyNameFromDomainUrl(domainUrl);

    if (!isNonEmptyString(derivedName)) {
      return;
    }

    setLastAutoNamedDomain(domainUrl);

    void updateOneRecord({
      objectNameSingular: 'company',
      idToUpdate: recordId,
      updateOneRecordInput: { name: derivedName },
    });
  }, [
    domainUrl,
    isCompanyDomainField,
    recordStore,
    recordId,
    updateOneRecord,
    lastAutoNamedDomain,
  ]);

  if (!canShow) {
    return null;
  }

  const handleClick = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isNonEmptyString(domainUrl) || isRequestInFlight) {
      return;
    }

    setIsRequestInFlight(true);
    enqueueInfoSnackBar({
      message: t`Looking up company info from domain…`,
    });

    try {
      const enrichmentResult = await enrichCompanyFromDomain({
        domain: domainUrl,
        companyId: recordId,
      });

      if (
        enrichmentResult === null ||
        enrichmentResult.suggestedFields === null ||
        enrichmentResult.suggestedFields === undefined
      ) {
        return;
      }

      const selectedFields = getDefaultSelectedCompanyEnrichmentFields({
        suggestedFields: enrichmentResult.suggestedFields,
        record: recordStore,
      });

      if (selectedFields.length === 0) {
        enqueueInfoSnackBar({
          message: t`No empty fields to fill from this domain.`,
        });

        return;
      }

      const updateOneRecordInput = buildCompanyEnrichmentUpdateInput({
        suggestedFields: enrichmentResult.suggestedFields,
        selectedFields,
      });

      await updateOneRecord({
        objectNameSingular: 'company',
        idToUpdate: recordId,
        updateOneRecordInput,
      });

      enqueueSuccessSnackBar({
        message: t`Filled: ${selectedFields.join(', ')}`,
      });
    } catch {
      enqueueErrorSnackBar({
        message: t`Couldn't apply company enrichment suggestions.`,
      });
    } finally {
      setIsRequestInFlight(false);
    }
  };

  return (
    <AnimatedContainer>
      <StyledButtonContainer
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <FloatingIconButton
          size="small"
          Icon={isRequestInFlight ? IconLoader : IconSparkles}
          ariaLabel={t`Suggest fields with AI`}
          disabled={isRequestInFlight}
          onClick={handleClick}
        />
      </StyledButtonContainer>
    </AnimatedContainer>
  );
};
