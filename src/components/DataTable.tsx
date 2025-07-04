import React, { ReactNode } from "react";

export interface TableProps<T> {
  columns: {
    header: string | ReactNode;
    accessor: keyof T | "id";
    className?: string;
    cell?: (value: unknown, row: T, index: number) => ReactNode;
  }[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  pagination?: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (page: number) => void;
  };
  rowClassName?: (row: T, index: number) => string;
  selectedIds?: number[];
  onSelectIds?: (ids: number[]) => void;
  onOrderChange?: (draggedId: number, targetId: number) => void;
}

const DataTable = <T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = "데이터가 없습니다.",
  pagination,
  rowClassName,
  selectedIds = [],
  onSelectIds,
  onOrderChange,
}: TableProps<T>) => {
  // 페이지네이션 계산
  const totalPages = pagination ? Math.ceil(pagination.totalItems / pagination.pageSize) : 1;

  // 페이지 번호 배열 생성
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const currentPage = pagination?.currentPage || 1;
      let startPage = Math.max(currentPage - Math.floor(maxVisiblePages / 2), 1);
      let endPage = startPage + maxVisiblePages - 1;

      if (endPage > totalPages) {
        endPage = totalPages;
        startPage = Math.max(endPage - maxVisiblePages + 1, 1);
      }

      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) pages.push("...");
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  // 셀 값 가져오기
  const getCellValue = (row: T, accessor: keyof T | "id") => {
    if (accessor === "id") {
      return row.id;
    }
    return row[accessor];
  };

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, id: number) => {
    e.dataTransfer.setData("text/plain", String(id));
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, targetId: number) => {
    e.preventDefault();
    const draggedId = Number(e.dataTransfer.getData("text/plain"));
    if (draggedId !== targetId && onOrderChange) {
      onOrderChange(draggedId, targetId);
    }
  };

  // 체크박스 핸들러
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSelectIds) {
      onSelectIds(e.target.checked ? data.map((row) => row.id) : []);
    }
  };

  const handleSelectRow = (e: React.ChangeEvent<HTMLInputElement>, id: number) => {
    if (onSelectIds) {
      onSelectIds(
        e.target.checked
          ? [...selectedIds, id]
          : selectedIds.filter((selectedId) => selectedId !== id)
      );
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {onSelectIds && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={
                    (Array.isArray(data) ? data.length : 0) > 0 &&
                    selectedIds.length === (Array.isArray(data) ? data.length : 0)
                  }
                  onChange={handleSelectAll}
                />
              </th>
            )}
            {columns.map((column, index) => (
              <th
                key={index}
                scope="col"
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  column.className || ""
                }`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          {loading ? (
            <tr>
              <td
                colSpan={columns.length + (onSelectIds ? 1 : 0)}
                className="px-6 py-4 text-center"
              >
                <div className="flex justify-center items-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                  <span className="ml-2">로딩 중...</span>
                </div>
              </td>
            </tr>
          ) : (Array.isArray(data) ? data.length : 0) === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (onSelectIds ? 1 : 0)}
                className="px-6 py-4 text-center text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            (Array.isArray(data) ? data : []).map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={`${rowClassName ? rowClassName(row, rowIndex) : "hover:bg-gray-50"}`}
                draggable={!!onOrderChange}
                onDragStart={(e) => handleDragStart(e, row.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, row.id)}
              >
                {onSelectIds && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={selectedIds.includes(row.id)}
                      onChange={(e) => handleSelectRow(e, row.id)}
                    />
                  </td>
                )}
                {columns.map((column, colIndex) => (
                  <td
                    key={colIndex}
                    className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${
                      column.className || ""
                    }`}
                  >
                    {column.cell
                      ? column.cell(getCellValue(row, column.accessor), row, rowIndex)
                      : getCellValue(row, column.accessor)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {pagination && totalPages > 1 && (
        <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
          {/* REMOVE Small screen pagination block */}
          {/* <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className={`...`}
            >
              이전
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === totalPages}
              className={`...`}
            >
              다음
            </button>
          </div> */}

          {/* Always show larger screen pagination block - remove 'hidden' class */}
          <div className="sm:flex-1 sm:flex sm:items-center sm:justify-between w-full">
            <div>
              <p className="text-sm text-gray-700">
                전체 <span className="font-medium">{pagination.totalItems}</span> 개 중{" "}
                <span className="font-medium">
                  {(pagination.currentPage - 1) * pagination.pageSize + 1}
                </span>{" "}
                -{" "}
                <span className="font-medium">
                  {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)}
                </span>{" "}
                표시
              </p>
            </div>
            <div>
              <nav
                className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                aria-label="Pagination"
              >
                <button
                  onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                    pagination.currentPage === 1
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <span className="sr-only">이전</span>
                  <svg
                    className="h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                {getPageNumbers().map((page, index) => (
                  <button
                    key={index}
                    onClick={() => typeof page === "number" && pagination.onPageChange(page)}
                    disabled={typeof page !== "number"}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                      page === pagination.currentPage
                        ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                        : "text-gray-500 hover:bg-gray-50"
                    } ${typeof page !== "number" ? "cursor-default" : ""}`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === totalPages}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                    pagination.currentPage === totalPages
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <span className="sr-only">다음</span>
                  <svg
                    className="h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
