import { TextInput } from '@/ui/input/components/TextInput';
import { CreateBlankWorkflowCard } from '@/workflow/workflow-template/components/CreateBlankWorkflowCard';
import { WorkflowTemplateCard } from '@/workflow/workflow-template/components/WorkflowTemplateCard';
import { type WorkflowTemplate } from '@/workflow/workflow-template/types/WorkflowTemplate';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useDeferredValue, useEffect, useState } from 'react';
import { IconLayoutGrid, IconSearch } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledLibrary = styled.section`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
`;

const StyledToolbar = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};

  @media (max-width: 900px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

const StyledSearch = styled.div`
  flex: 1;
  min-width: 220px;
`;

const StyledCategories = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  overflow-x: auto;
  padding-bottom: 1px;
`;

const StyledCategoryButton = styled.button<{ $isActive: boolean }>`
  background: ${({ $isActive }) =>
    $isActive
      ? themeCssVariables.background.transparent.blue
      : themeCssVariables.background.transparent.lighter};
  border: 0;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${({ $isActive }) =>
    $isActive
      ? themeCssVariables.color.blue
      : themeCssVariables.font.color.secondary};
  cursor: pointer;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
  text-transform: capitalize;
  transition:
    background 140ms ease,
    color 140ms ease;
  white-space: nowrap;

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 1px;
  }
`;

const StyledGridScroller = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledGrid = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 0 auto;
  max-width: 1480px;

  @media (max-width: 1320px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr);
    padding-bottom: ${themeCssVariables.spacing[4]};
  }
`;

const StyledMessage = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: center;
  min-height: 240px;
  padding: ${themeCssVariables.spacing[6]};
  text-align: center;
`;

const StyledMessageTitle = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
`;

const StyledSkeleton = styled.div`
  animation: workflow-template-pulse 1.4s ease-in-out infinite;
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  height: 354px;

  @keyframes workflow-template-pulse {
    0%,
    100% {
      opacity: 0.55;
    }
    50% {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

type WorkflowTemplateLibraryProps = {
  templates: WorkflowTemplate[];
  loading: boolean;
  errorMessage?: string;
  onSelect: (template: WorkflowTemplate) => void;
  onFilteredCountChange?: (count: number) => void;
};

export const WorkflowTemplateLibrary = ({
  templates,
  loading,
  errorMessage,
  onSelect,
  onFilteredCountChange,
}: WorkflowTemplateLibraryProps) => {
  const { t } = useLingui();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const deferredSearchTerm = useDeferredValue(searchTerm.trim().toLowerCase());
  const categories = [
    'all',
    ...new Set(templates.map(({ category }) => category)),
  ];
  const filteredTemplates = templates.filter((template) => {
    const matchesCategory =
      selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch =
      deferredSearchTerm === '' ||
      `${template.name} ${template.shortDescription} ${template.purpose} ${template.category}`
        .toLowerCase()
        .includes(deferredSearchTerm);

    return matchesCategory && matchesSearch;
  });

  useEffect(() => {
    onFilteredCountChange?.(filteredTemplates.length);
  }, [filteredTemplates.length, onFilteredCountChange]);

  return (
    <StyledLibrary>
      <StyledToolbar>
        <StyledSearch>
          <TextInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={t`Search workflow templates`}
            LeftIcon={IconSearch}
            fullWidth
          />
        </StyledSearch>
        <StyledCategories aria-label={t`Workflow template categories`}>
          {categories.map((category) => (
            <StyledCategoryButton
              key={category}
              $isActive={selectedCategory === category}
              onClick={() => setSelectedCategory(category)}
              type="button"
            >
              {category === 'all' ? t`All` : category.replaceAll('-', ' ')}
            </StyledCategoryButton>
          ))}
        </StyledCategories>
      </StyledToolbar>
      {loading ? (
        <StyledGridScroller>
          <StyledGrid aria-label={t`Loading workflow templates`}>
            {Array.from({ length: 8 }, (_, index) => (
              <StyledSkeleton key={index} />
            ))}
          </StyledGrid>
        </StyledGridScroller>
      ) : errorMessage ? (
        <StyledMessage role="alert">
          <IconLayoutGrid size={24} />
          <StyledMessageTitle>{t`Templates are unavailable`}</StyledMessageTitle>
          {errorMessage}
        </StyledMessage>
      ) : filteredTemplates.length === 0 ? (
        <StyledMessage>
          <IconSearch size={24} />
          <StyledMessageTitle>{t`No matching templates`}</StyledMessageTitle>
          {t`Try another search term or category.`}
        </StyledMessage>
      ) : (
        <StyledGridScroller>
          <StyledGrid>
            <CreateBlankWorkflowCard />
            {filteredTemplates.map((template, templateIndex) => (
              <WorkflowTemplateCard
                key={template.id}
                template={template}
                templateIndex={templateIndex}
                onSelect={onSelect}
              />
            ))}
          </StyledGrid>
        </StyledGridScroller>
      )}
    </StyledLibrary>
  );
};
