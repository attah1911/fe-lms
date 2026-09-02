import React from 'react';
import { Button } from "@nextui-org/react";
import { FiEdit } from "react-icons/fi";
import { RiDeleteBin6Line } from "react-icons/ri";
import TablePagination from "./TablePagination";

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
  /** rows per page — drives the "Showing X to Y" range */
  pageSize?: number;
}

const DataTable: React.FC<DataTableProps> = ({
  columns,
  data,
  pagination,
  onPageChange,
  onEdit,
  onDelete,
  isLoading,
  showActions = true,
  pageSize = 50
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

      {data.length > 0 && (
        <TablePagination
          total={pagination.total}
          totalPages={pagination.totalPages}
          current={pagination.current}
          pageSize={pageSize}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
};

export default DataTable;
