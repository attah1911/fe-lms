import React from 'react';
import { Button } from "@nextui-org/react";
import { FiEdit, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { RiDeleteBin6Line } from "react-icons/ri";

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface PaginationData {
  total: number;
  totalPages: number;
  current: number;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  pagination: PaginationData;
  onPageChange: (page: number) => void;
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  isLoading?: boolean;
  showActions?: boolean;
}

const DataTable: React.FC<DataTableProps> = ({
  columns,
  data,
  pagination,
  onPageChange,
  onEdit,
  onDelete,
  isLoading,
  showActions = true
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
              {showActions && (onEdit || onDelete) && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
                {showActions && (onEdit || onDelete) && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <div className="flex gap-2">
                      {onEdit && (
                        <Button
                          isIconOnly
                          color="primary"
                          variant="solid"
                          onPress={() => onEdit(row)}
                          size="sm"
                        >
                          <FiEdit className="text-white text-lg" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          isIconOnly
                          color="danger"
                          variant="solid"
                          onPress={() => onDelete(row)}
                          size="sm"
                        >
                          <RiDeleteBin6Line className="text-white text-lg" />
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.length > 0 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex flex-col sm:flex-row items-center justify-between">
            <div className="mb-4 sm:mb-0">
              <p className="text-sm text-gray-700 text-center sm:text-left">
                {pagination.total > 0 ? (
                  <>
                    Showing{" "}
                    <span className="font-medium">
                      {(pagination.current - 1) * 50 + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium">
                      {Math.min(pagination.current * 50, pagination.total)}
                    </span>{" "}
                    of <span className="font-medium">{pagination.total}</span>{" "}
                    results
                  </>
                ) : (
                  "No results found"
                )}
              </p>
            </div>
            <div>
              <nav className="flex items-center justify-center sm:justify-end gap-1">
                <Button
                  isIconOnly
                  size="sm"
                  variant="flat"
                  onPress={() => onPageChange(pagination.current - 1)}
                  isDisabled={pagination.current <= 1}
                  className={`min-w-8 h-8 ${
                    pagination.current <= 1 ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <FiChevronLeft className="h-4 w-4" />
                </Button>
                
                {pagination.totalPages > 0 && [...Array(pagination.totalPages)].map((_, index) => {
                  const pageNum = index + 1;
                  const isFirst = pageNum === 1;
                  const isLast = pageNum === pagination.totalPages;
                  const isCurrent = pageNum === pagination.current;
                  const isNearCurrent = Math.abs(pageNum - pagination.current) <= 1;
                  
                  if (isFirst || isLast || isCurrent || isNearCurrent) {
                    return (
                      <Button
                        key={pageNum}
                        size="sm"
                        variant={isCurrent ? "solid" : "flat"}
                        onPress={() => onPageChange(pageNum)}
                        className={`min-w-8 h-8 ${
                          isCurrent ? "bg-primary text-white" : ""
                        }`}
                      >
                        {pageNum}
                      </Button>
                    );
                  } else if (
                    (index === 1 && pagination.current > 3) ||
                    (index === pagination.totalPages - 2 && pagination.current < pagination.totalPages - 2)
                  ) {
                    return <span key={`ellipsis-${index}`} className="px-2">...</span>;
                  }
                  return null;
                })}

                <Button
                  isIconOnly
                  size="sm"
                  variant="flat"
                  onPress={() => onPageChange(pagination.current + 1)}
                  isDisabled={pagination.current >= pagination.totalPages}
                  className={`min-w-8 h-8 ${
                    pagination.current >= pagination.totalPages
                      ? "opacity-50 cursor-not-allowed" 
                      : ""
                  }`}
                >
                  <FiChevronRight className="h-4 w-4" />
                </Button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
