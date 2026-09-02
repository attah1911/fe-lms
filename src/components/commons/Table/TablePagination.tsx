import React from "react";
import { Button } from "@nextui-org/react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

interface TablePaginationProps {
  total: number;
  totalPages: number;
  current: number;
  /** rows per page — only used for the "Showing X to Y" range */
  pageSize?: number;
  onPageChange: (page: number) => void;
  /** extra classes for the outer bar (the dashboards add `mt-4`) */
  className?: string;
}

/**
 * The "Showing X to Y of Z results" bar with first/last/neighbour page buttons.
 * Was copy-pasted into DataTable, both dashboards and the two admin data pages.
 */
const TablePagination: React.FC<TablePaginationProps> = ({
  total,
  totalPages,
  current,
  pageSize = 50,
  onPageChange,
  className = "",
}) => (
  <div
    className={`bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 ${className}`}
  >
    <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <p className="text-sm text-gray-700 text-center sm:text-left">
        {total > 0 ? (
          <>
            Showing{" "}
            <span className="font-medium">{(current - 1) * pageSize + 1}</span>{" "}
            to{" "}
            <span className="font-medium">{Math.min(current * pageSize, total)}</span>{" "}
            of <span className="font-medium">{total}</span> results
          </>
        ) : (
          "No results found"
        )}
      </p>

      <nav className="flex items-center justify-center sm:justify-end gap-1">
        <Button
          isIconOnly
          size="sm"
          variant="flat"
          onPress={() => onPageChange(current - 1)}
          isDisabled={current <= 1}
          className={`min-w-8 h-8 ${current <= 1 ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <FiChevronLeft className="h-4 w-4" />
        </Button>

        {totalPages > 0 &&
          [...Array(totalPages)].map((_, index) => {
            const pageNum = index + 1;
            const isFirst = pageNum === 1;
            const isLast = pageNum === totalPages;
            const isCurrent = pageNum === current;
            const isNearCurrent = Math.abs(pageNum - current) <= 1;

            if (isFirst || isLast || isCurrent || isNearCurrent) {
              return (
                <Button
                  key={pageNum}
                  size="sm"
                  variant={isCurrent ? "solid" : "flat"}
                  onPress={() => onPageChange(pageNum)}
                  className={`min-w-8 h-8 ${isCurrent ? "bg-primary text-white" : ""}`}
                >
                  {pageNum}
                </Button>
              );
            }

            // a single gap marker on each side of the current page
            if (
              (index === 1 && current > 3) ||
              (index === totalPages - 2 && current < totalPages - 2)
            ) {
              return (
                <span key={`ellipsis-${index}`} className="px-2">
                  ...
                </span>
              );
            }

            return null;
          })}

        <Button
          isIconOnly
          size="sm"
          variant="flat"
          onPress={() => onPageChange(current + 1)}
          isDisabled={current >= totalPages}
          className={`min-w-8 h-8 ${
            current >= totalPages ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <FiChevronRight className="h-4 w-4" />
        </Button>
      </nav>
    </div>
  </div>
);

export default TablePagination;
