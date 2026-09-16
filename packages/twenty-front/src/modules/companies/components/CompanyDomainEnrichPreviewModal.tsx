import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useEffect, useMemo, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { Checkbox } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { H1Title, H1TitleFontColor } from 'twenty-ui/typography';

import { COMPANY_DOMAIN_ENRICH_PREVIEW_MODAL_ID } from '@/companies/constants/CompanyDomainEnrichPreviewModalId';
import {
  type CompanyEnrichmentFieldName,
  type CompanyEnrichmentSuggestedFields,
} from '@/companies/types/CompanyEnrichmentSuggestions';
import {
  formatCompanyEnrichmentFieldPreview,
  getDefaultSelectedCompanyEnrichmentFields,
} from '@/companies/utils/companyEnrichmentApply';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { StyledCenteredButton } from '@/ui/layout/modal/components/ConfirmationModal';
import { ModalStatefulWrapper } from '@/ui/layout/modal/components/ModalStatefulWrapper';
import { useModal } from '@/ui/layout/modal/hooks/useModal';

const FIELD_LABELS: Record<CompanyEnrichmentFieldName, string> = {
  name: 'Name',
  address: 'Address',
  linkedinLink: 'LinkedIn',
  annualRevenue: 'Annual Revenue',
};

const StyledSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  margin-bottom: ${themeCssVariables.spacing[4]};
`;

const StyledRow = styled.label`
  align-items: flex-start;
  cursor: pointer;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledFieldContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledFieldLabel = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledFieldValue = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  overflow-wrap: anywhere;
`;

const StyledButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

type CompanyDomainEnrichPreviewModalProps = {
  suggestedFields: CompanyEnrichmentSuggestedFields;
  record: ObjectRecord | null | undefined;
  onApply: (selectedFields: CompanyEnrichmentFieldName[]) => void;
  isApplying?: boolean;
};

export const CompanyDomainEnrichPreviewModal = ({
  suggestedFields,
  record,
  onApply,
  isApplying = false,
}: CompanyDomainEnrichPreviewModalProps) => {
  const { t } = useLingui();
  const { closeModal } = useModal();

  const availableFields = useMemo(() => {
    return (
      Object.keys(suggestedFields) as CompanyEnrichmentFieldName[]
    ).filter((fieldName) => isDefined(suggestedFields[fieldName]));
  }, [suggestedFields]);

  const [selectedFields, setSelectedFields] = useState<
    CompanyEnrichmentFieldName[]
  >(() =>
    getDefaultSelectedCompanyEnrichmentFields({
      suggestedFields,
      record,
    }),
  );

  useEffect(() => {
    setSelectedFields(
      getDefaultSelectedCompanyEnrichmentFields({
        suggestedFields,
        record,
      }),
    );
  }, [suggestedFields, record]);

  const handleToggle = (fieldName: CompanyEnrichmentFieldName) => {
    setSelectedFields((previous) =>
      previous.includes(fieldName)
        ? previous.filter((selected) => selected !== fieldName)
        : [...previous, fieldName],
    );
  };

  const handleClose = () => {
    closeModal(COMPANY_DOMAIN_ENRICH_PREVIEW_MODAL_ID);
  };

  const handleApply = () => {
    onApply(selectedFields);
  };

  return (
    <ModalStatefulWrapper
      modalInstanceId={COMPANY_DOMAIN_ENRICH_PREVIEW_MODAL_ID}
      onClose={handleClose}
      isClosable={true}
      size={'medium' as const}
      padding={'medium' as const}
    >
      <H1Title
        title={t`Apply AI suggestions`}
        fontColor={H1TitleFontColor.Primary}
      />
      <StyledSection>
        {availableFields.map((fieldName) => (
          <StyledRow key={fieldName}>
            <Checkbox
              checked={selectedFields.includes(fieldName)}
              onCheckedChange={() => handleToggle(fieldName)}
              aria-label={FIELD_LABELS[fieldName]}
            />
            <StyledFieldContent>
              <StyledFieldLabel>{FIELD_LABELS[fieldName]}</StyledFieldLabel>
              <StyledFieldValue>
                {formatCompanyEnrichmentFieldPreview({
                  fieldName,
                  suggestedFields,
                })}
              </StyledFieldValue>
            </StyledFieldContent>
          </StyledRow>
        ))}
      </StyledSection>
      <StyledButtons>
        <StyledCenteredButton
          onClick={handleApply}
          variant="primary"
          title={t`Apply`}
          fullWidth
          disabled={selectedFields.length === 0 || isApplying}
        />
        <StyledCenteredButton
          onClick={handleClose}
          variant="secondary"
          title={t`Cancel`}
          fullWidth
          disabled={isApplying}
        />
      </StyledButtons>
    </ModalStatefulWrapper>
  );
};
