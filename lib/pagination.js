// lib/pagination.js

/**
 * Paginate an array of items
 * @param {Array} items - Array to paginate
 * @param {number} currentPage - Current page (1-indexed)
 * @param {number} itemsPerPage - Items per page
 * @returns {Object} - { items, totalPages, currentPage, totalItems }
 */
export const paginate = (items, currentPage = 1, itemsPerPage = 6) => {
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Validate page number
  const validPage = Math.max(1, Math.min(currentPage, totalPages || 1));

  const startIndex = (validPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  return {
    items: items.slice(startIndex, endIndex),
    totalPages: totalPages || 1,
    currentPage: validPage,
    totalItems,
    hasNextPage: validPage < totalPages,
    hasPreviousPage: validPage > 1,
  };
};

/**
 * Generate page numbers for pagination display
 * @param {number} currentPage
 * @param {number} totalPages
 * @param {number} maxButtons - Max buttons to show (default 5)
 * @returns {Array} - Array of page numbers
 */
export const getPageNumbers = (currentPage, totalPages, maxButtons = 5) => {
  if (totalPages <= maxButtons) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const halfWindow = Math.floor(maxButtons / 2);
  let start = currentPage - halfWindow;
  let end = currentPage + halfWindow;

  if (start < 1) {
    end += 1 - start;
    start = 1;
  }

  if (end > totalPages) {
    start -= end - totalPages;
    end = totalPages;
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};
