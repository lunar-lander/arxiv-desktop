import { useState } from "react";
import {
  Filter,
  Calendar,
  Tag,
  User as UserIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import styles from "./SearchFilters.module.css";

const CATEGORIES = {
  arxiv: [
    "cs.AI",
    "cs.LG",
    "cs.CV",
    "cs.CL",
    "cs.NE",
    "cs.RO",
    "cs.CR",
    "cs.DB",
    "math.NA",
    "stat.ML",
    "physics.bio-ph",
    "q-bio.QM",
    "eess.IV",
    "econ.EM",
  ],
  biorxiv: [
    "Bioinformatics",
    "Cell Biology",
    "Developmental Biology",
    "Genetics",
    "Immunology",
    "Microbiology",
    "Molecular Biology",
    "Neuroscience",
    "Plant Biology",
    "Systems Biology",
    "Biochemistry",
    "Biophysics",
  ],
};

function SearchFilters({ filters, onFiltersChange, source }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleCategoryToggle = (category) => {
    const currentCategories = filters.categories || [];
    const newCategories = currentCategories.includes(category)
      ? currentCategories.filter((c) => c !== category)
      : [...currentCategories, category];

    handleFilterChange("categories", newCategories);
  };

  const clearFilters = () => {
    onFiltersChange({
      author: "",
      title: "",
      dateFrom: "",
      dateTo: "",
      categories: [],
      sortBy: "relevance",
    });
  };

  const hasActiveFilters = Object.values(filters).some((value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value)
  );

  return (
    <div className={styles.filtersContainer}>
      <div
        className={styles.filtersHeader}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={styles.filtersTitle}>
          <Filter size={18} />
          Advanced Search Filters
          {hasActiveFilters && (
            <span className={styles.activeCount}>
              (
              {
                Object.keys(filters).filter(
                  (k) => filters[k] && filters[k].length > 0
                ).length
              }{" "}
              active)
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </div>

      {isExpanded && (
        <>
          <div className={styles.filtersGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>
                <UserIcon size={16} />
                Author
              </label>
              <input
                className={styles.filterInput}
                type="text"
                placeholder="Author name..."
                value={filters.author || ""}
                onChange={(e) => handleFilterChange("author", e.target.value)}
              />
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>
                <Tag size={16} />
                Title contains
              </label>
              <input
                className={styles.filterInput}
                type="text"
                placeholder="Keywords in title..."
                value={filters.title || ""}
                onChange={(e) => handleFilterChange("title", e.target.value)}
              />
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>
                <Calendar size={16} />
                Date from
              </label>
              <input
                className={styles.filterInput}
                type="date"
                value={filters.dateFrom || ""}
                onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
              />
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>
                <Calendar size={16} />
                Date to
              </label>
              <input
                className={styles.filterInput}
                type="date"
                value={filters.dateTo || ""}
                onChange={(e) => handleFilterChange("dateTo", e.target.value)}
              />
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Sort by</label>
              <select
                className={styles.filterSelect}
                value={filters.sortBy || "relevance"}
                onChange={(e) => handleFilterChange("sortBy", e.target.value)}
              >
                <option value="relevance">Relevance</option>
                <option value="submittedDate">Submission Date</option>
                <option value="lastUpdatedDate">Last Updated</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Max results</label>
              <select
                className={styles.filterSelect}
                value={filters.maxResults || 20}
                onChange={(e) =>
                  handleFilterChange("maxResults", parseInt(e.target.value))
                }
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className={`${styles.filterGroup} ${styles.categoriesSection}`}>
            <label className={styles.filterLabel}>
              <Tag size={16} />
              Categories
            </label>
            <div className={styles.categoryTags}>
              {CATEGORIES[source]?.map((category) => (
                <button
                  key={category}
                  className={`${styles.categoryTag} ${
                    filters.categories?.includes(category)
                      ? styles.selected
                      : ""
                  }`}
                  onClick={() => handleCategoryToggle(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {hasActiveFilters && (
            <div className={styles.clearButtonContainer}>
              <button className={styles.clearButton} onClick={clearFilters}>
                Clear all filters
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SearchFilters;
