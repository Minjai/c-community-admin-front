// src/pages/footer/FooterManagementPage.tsx
import React, { useState, useEffect, useMemo, ReactNode } from "react";
import axios from "@/api/axios";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import ActionButton from "@/components/ActionButton";
import Alert from "@/components/Alert";
import { formatDate } from "@/utils/dateUtils";
import FooterFormModal from "./FooterFormModal";
import type { Footer } from "./types";

// Define column type based on DataTable.tsx
interface FooterColumnDef {
  header: string;
  accessor: keyof Footer | ((item: Footer) => ReactNode);
  cell?: (value: any, row: Footer, index?: number) => React.ReactNode;
  className?: string; // Match DataTable prop
  // size?: number; // Removed size as it's not in DataTable props
}

// Helper function to strip HTML tags and truncate text
function createPreview(htmlContent: string, maxLength: number = 50): string {
  if (!htmlContent) return "";
  // Create a temporary element to parse HTML
  const tempElement = document.createElement("div");
  tempElement.innerHTML = htmlContent;
  // Get text content, removing extra whitespace
  const text = (tempElement.textContent || tempElement.innerText || "").trim();
  // Truncate if necessary
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}

function FooterManagementPage() {
  const [footers, setFooters] = useState<Footer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [footerToEdit, setFooterToEdit] = useState<Footer | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // 페이지네이션 상태 추가
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0); // 초기값 0
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);

  async function fetchFooters(page: number = 1, limit: number = 10) {
    // page, limit 파라미터 추가
    setLoading(true);
    setError(null);
    try {
      // 전체 데이터 요청 (API가 페이지네이션 지원 안 함 가정)
      const response = await axios.get<{ data: Footer[] }>("/footer/all");
      const allFooters = response.data?.data || response.data || [];

      // 클라이언트 측 페이지네이션 로직 추가
      const total = allFooters.length;
      const pages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedData = allFooters.slice(startIndex, endIndex);

      setFooters(paginatedData);
      setTotalItems(total);
      setTotalPages(pages);
      setCurrentPage(page);
      setPageSize(limit);
      // 페이지 변경 시 선택 상태 초기화 (필요에 따라 조정)
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Error fetching footers:", err);
      setError("푸터 목록을 불러오는데 실패했습니다.");
      setFooters([]);
      setTotalItems(0);
      setTotalPages(0);
      setCurrentPage(1);
      setPageSize(limit);
      setSelectedIds(new Set());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFooters(); // 첫 페이지 로드
  }, []);

  // 페이지 변경 핸들러 추가
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      fetchFooters(page, pageSize);
    }
  };

  const isAllSelected = footers.length > 0 && selectedIds.size === footers.length;

  function handleSelect(id: number, isSelected: boolean) {
    setSelectedIds((prev) => {
      const newSelected = new Set(prev);
      if (isSelected) {
        newSelected.add(id);
      } else {
        newSelected.delete(id);
      }
      return newSelected;
    });
  }

  function handleSelectAll(isSelected: boolean) {
    setSelectedIds((prev) => {
      const newSelected = new Set(prev);
      if (isSelected) {
        footers.forEach((footer) => newSelected.add(footer.id));
      } else {
        newSelected.clear();
      }
      return newSelected;
    });
  }

  function handleCreateClick() {
    setFooterToEdit(null);
    setShowFormModal(true);
  }

  function handleEditClick(footer: Footer) {
    setFooterToEdit(footer);
    setShowFormModal(true);
  }

  async function handleDeleteClick(id: number) {
    const footerToDelete = footers.find((f) => f.id === id);
    if (
      !footerToDelete ||
      !confirm(`정말로 이 푸터 항목을 삭제하시겠습니까?\n\n제목: ${footerToDelete.title}`)
    ) {
      return;
    }

    setDeleting(true);
    setAlertMessage(null);
    try {
      await axios.delete(`/footer/${id}`);
      setAlertMessage({ type: "success", message: "푸터 항목이 삭제되었습니다." });
      setSelectedIds((prev) => {
        const newSelected = new Set(prev);
        newSelected.delete(id);
        return newSelected;
      });
      fetchFooters();
    } catch (err) {
      console.error("Error deleting footer:", err);
      setAlertMessage({ type: "error", message: "푸터 항목 삭제 중 오류가 발생했습니다." });
    } finally {
      setDeleting(false);
    }
  }

  // Re-add handleDeleteSelectedClick function
  async function handleDeleteSelectedClick() {
    if (
      selectedIds.size === 0 ||
      !confirm(
        `선택된 ${selectedIds.size}개의 푸터 항목을 정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
      )
    ) {
      return;
    }

    setDeleting(true);
    setAlertMessage(null);
    const idsToDelete = Array.from(selectedIds);

    try {
      // Assume bulk delete expects { ids: [...] } in the body
      await axios.delete(`/footer`, { data: { ids: idsToDelete } });
      setAlertMessage({
        type: "success",
        message: `${idsToDelete.length}개의 푸터 항목이 삭제되었습니다.`,
      });
      setSelectedIds(new Set());
      fetchFooters();
    } catch (err) {
      console.error("Error deleting selected footers:", err);
      setAlertMessage({ type: "error", message: "선택된 푸터 항목 삭제 중 오류가 발생했습니다." });
    } finally {
      setDeleting(false);
    }
  }

  // Define columns matching DataTable.tsx props
  const columns: FooterColumnDef[] = [
    {
      header: "선택",
      accessor: (item: Footer) => item.id, // Use a function accessor
      cell: (_: any, row: Footer) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={(e) => handleSelect(row.id, e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      ),
    },
    {
      header: "제목",
      accessor: "title", // Use keyof Footer
      cell: (value: string, row: Footer) => (
        <span
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer block max-w-xs truncate"
          onClick={() => handleEditClick(row)}
          title={value}
        >
          {value}
        </span>
      ),
    },
    {
      header: "내용",
      accessor: "content", // Use keyof Footer
      cell: (
        value: string // Add type for value
      ) => (
        <div className="truncate max-w-xs" title={createPreview(value, 500)}>
          {createPreview(value, 50)}
        </div>
      ),
    },
    {
      header: "공개 여부",
      accessor: "isPublic", // Use keyof Footer
      cell: (
        value: number // Add type for value
      ) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            value === 1 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {value === 1 ? "공개" : "비공개"}
        </span>
      ),
    },
    {
      header: "관리",
      accessor: (item: Footer) => item.id, // Keep function accessor
      cell: (_: any, row: Footer) => (
        // Apply the banner button style
        <div className="flex space-x-1">
          <ActionButton
            label="수정" // Use label prop
            action="edit"
            size="sm" // Use sm size
            onClick={() => handleEditClick(row)}
            disabled={deleting}
          />
          <ActionButton
            label="삭제" // Use label prop
            action="delete"
            size="sm" // Use sm size
            onClick={() => handleDeleteClick(row.id)}
            disabled={deleting}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">하단 푸터 관리</h1>
        <div className="flex items-center space-x-2">
          <div className="flex items-center pr-4">
            <input
              type="checkbox"
              id="select-all-footers"
              checked={isAllSelected}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="select-all-footers" className="ml-2 text-sm text-gray-700">
              전체 선택
            </label>
          </div>
          <Button
            variant="danger"
            onClick={handleDeleteSelectedClick}
            disabled={deleting || selectedIds.size === 0}
          >
            {deleting ? "삭제 중..." : `선택 항목 삭제 (${selectedIds.size})`}
          </Button>
          <Button variant="primary" onClick={handleCreateClick}>
            푸터 생성
          </Button>
        </div>
      </div>

      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
          className="mb-4"
        />
      )}

      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />
      )}

      {/* Footer Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <DataTable
          columns={columns}
          data={footers}
          loading={loading} // Pass loading state
          emptyMessage="등록된 푸터 항목이 없습니다."
          pagination={{
            currentPage: currentPage,
            pageSize: pageSize,
            totalItems: totalItems,
            onPageChange: handlePageChange,
          }}
        />
      </div>

      <FooterFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSuccess={() => {
          setShowFormModal(false);
          fetchFooters();
          setAlertMessage({
            type: "success",
            message: footerToEdit ? "푸터 정보가 수정되었습니다." : "푸터 정보가 생성되었습니다.",
          });
          setTimeout(() => setAlertMessage(null), 3000);
        }}
        footerToEdit={footerToEdit}
      />
    </div>
  );
}

export default FooterManagementPage;
