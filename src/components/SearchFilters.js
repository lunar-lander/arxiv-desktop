import React, { useState } from 'react';
import styled from 'styled-components';
import { Filter, Calendar, Tag, User as UserIcon, ChevronDown, ChevronUp } from 'lucide-react';

const FiltersContainer = styled.div`
  background: white;
  border: 1px solid #e0e6ed;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
`;

const FiltersHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  cursor: pointer;
`;

const FiltersTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #2c3e50;
`;

const FiltersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FilterLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #5a6c7d;
  font-weight: 500;
`;

const FilterInput = styled.input`
  padding: 0.5rem 0.75rem;
  border: 1px solid #e0e6ed;
  border-radius: 6px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: #3498db;
  }
`;

const FilterSelect = styled.select`
  padding: 0.5rem 0.75rem;
  border: 1px solid #e0e6ed;
  border-radius: 6px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
  background: white;

  &:focus {
    border-color: #3498db;
  }
`;

const CategoryTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const CategoryTag = styled.button`
  padding: 0.25rem 0.75rem;
  border: 1px solid ${props => props.selected ? '#3498db' : '#e0e6ed'};
  background: ${props => props.selected ? '#3498db' : 'white'};
  color: ${props => props.selected ? 'white' : '#5a6c7d'};
  border-radius: 20px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #3498db;
  }
`;

const ClearButton = styled.button`
  background: none;
  border: none;
  color: #7f8c8d;
  cursor: pointer;
  font-size: 0.9rem;
  text-decoration: underline;

  &:hover {
    color: #2c3e50;
  }
`;

const CATEGORIES = {
  arxiv: [
    'cs.AI', 'cs.LG', 'cs.CV', 'cs.CL', 'cs.NE', 'cs.RO', 'cs.CR', 'cs.DB',
    'math.NA', 'stat.ML', 'physics.bio-ph', 'q-bio.QM', 'eess.IV', 'econ.EM'
  ],
  biorxiv: [
    'Bioinformatics', 'Cell Biology', 'Developmental Biology', 'Genetics',
    'Immunology', 'Microbiology', 'Molecular Biology', 'Neuroscience',
    'Plant Biology', 'Systems Biology', 'Biochemistry', 'Biophysics'
  ]
};

function SearchFilters({ filters, onFiltersChange, source }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleCategoryToggle = (category) => {
    const currentCategories = filters.categories || [];
    const newCategories = currentCategories.includes(category)
      ? currentCategories.filter(c => c !== category)
      : [...currentCategories, category];
    
    handleFilterChange('categories', newCategories);
  };

  const clearFilters = () => {
    onFiltersChange({
      author: '',
      title: '',
      dateFrom: '',
      dateTo: '',
      categories: [],
      sortBy: 'relevance'
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    Array.isArray(value) ? value.length > 0 : Boolean(value)
  );

  return (
    <FiltersContainer>
      <FiltersHeader onClick={() => setIsExpanded(!isExpanded)}>
        <FiltersTitle>
          <Filter size={18} />
          Advanced Search Filters
          {hasActiveFilters && <span style={{ color: '#3498db' }}>({Object.keys(filters).filter(k => filters[k] && filters[k].length > 0).length} active)</span>}
        </FiltersTitle>
        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </FiltersHeader>

      {isExpanded && (
        <>
          <FiltersGrid>
            <FilterGroup>
              <FilterLabel>
                <UserIcon size={16} />
                Author
              </FilterLabel>
              <FilterInput
                type="text"
                placeholder="Author name..."
                value={filters.author || ''}
                onChange={(e) => handleFilterChange('author', e.target.value)}
              />
            </FilterGroup>

            <FilterGroup>
              <FilterLabel>
                <Tag size={16} />
                Title contains
              </FilterLabel>
              <FilterInput
                type="text"
                placeholder="Keywords in title..."
                value={filters.title || ''}
                onChange={(e) => handleFilterChange('title', e.target.value)}
              />
            </FilterGroup>

            <FilterGroup>
              <FilterLabel>
                <Calendar size={16} />
                Date from
              </FilterLabel>
              <FilterInput
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </FilterGroup>

            <FilterGroup>
              <FilterLabel>
                <Calendar size={16} />
                Date to
              </FilterLabel>
              <FilterInput
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </FilterGroup>

            <FilterGroup>
              <FilterLabel>Sort by</FilterLabel>
              <FilterSelect
                value={filters.sortBy || 'relevance'}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              >
                <option value="relevance">Relevance</option>
                <option value="submittedDate">Submission Date</option>
                <option value="lastUpdatedDate">Last Updated</option>
              </FilterSelect>
            </FilterGroup>

            <FilterGroup>
              <FilterLabel>Max results</FilterLabel>
              <FilterSelect
                value={filters.maxResults || 20}
                onChange={(e) => handleFilterChange('maxResults', parseInt(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </FilterSelect>
            </FilterGroup>
          </FiltersGrid>

          <FilterGroup style={{ marginTop: '1rem' }}>
            <FilterLabel>
              <Tag size={16} />
              Categories
            </FilterLabel>
            <CategoryTags>
              {CATEGORIES[source]?.map((category) => (
                <CategoryTag
                  key={category}
                  selected={filters.categories?.includes(category)}
                  onClick={() => handleCategoryToggle(category)}
                >
                  {category}
                </CategoryTag>
              ))}
            </CategoryTags>
          </FilterGroup>

          {hasActiveFilters && (
            <div style={{ marginTop: '1rem', textAlign: 'right' }}>
              <ClearButton onClick={clearFilters}>
                Clear all filters
              </ClearButton>
            </div>
          )}
        </>
      )}
    </FiltersContainer>
  );
}

export default SearchFilters;