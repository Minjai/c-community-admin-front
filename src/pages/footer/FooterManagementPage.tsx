// src/pages/footer/FooterManagementPage.tsx
import React, { useState, useEffect, useMemo, ReactNode, useCallback } from "react";
import axios from "@/api/axios";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import ActionButton from "@/components/ActionButton";
import Alert from "@/components/Alert";
import { formatDate } from "@/utils/dateUtils";
import FooterFormModal from "./FooterFormModal";
import type { Footer } from "./types";
import LoadingOverlay from "@/components/LoadingOverlay";

// Define column type based on DataTable.tsx
interface FooterColumnDef {
  header: string | ReactNode;
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
  // allFooters 상태 제거
  // const [allFooters, setAllFooters] = useState<Footer[]>([]); // 제거
  const [footers, setFooters] = useState<Footer[]>([]); // 현재 페이지 데이터 유지
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [footerToEdit, setFooterToEdit] = useState<Footer | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // 페이지네이션 상태 유지
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);

  // fetchFooters (서버 측 페이지네이션으로 복원)
  const fetchFooters = useCallback(async (page: number = 1, limit: number = 10) => {
    setLoading(true);
    setError(null);
    try {
      // API 엔드포인트에 페이지네이션 파라미터 추가
      const response = await axios.get(`/footer/all?page=${page}&limit=${limit}`);
      console.log("푸터 응답:", response.data);

      // API 응답 구조 { data: [], pagination: {} } 처리 복원
      if (response.data && response.data.data && response.data.pagination) {
        const fetchedFooters = response.data.data || [];
        const pagination = response.data.pagination;

        setFooters(fetchedFooters);
        setTotalItems(pagination.totalItems || 0);
        setTotalPages(pagination.totalPages || 0);
        setCurrentPage(pagination.currentPage || page);
        setPageSize(pagination.pageSize || limit);
        setSelectedIds(new Set()); // 페이지 변경 시 선택 초기화
      } else {
        console.error("푸터 불러오기 실패: 응답 형식이 예상과 다릅니다", response.data);
        setFooters([]);
        setTotalItems(0);
        setTotalPages(0);
        setCurrentPage(1);
        setSelectedIds(new Set());
      }
    } catch (err) {
      console.error("Error fetching footers:", err);
      setError("푸터 목록을 불러오는데 실패했습니다.");
      setFooters([]);
      setTotalItems(0);
      setTotalPages(0);
      setCurrentPage(1);
      setSelectedIds(new Set());
    } finally {
      setLoading(false);
    }
  }, []); // 의존성 배열 비움 (페이지 변경 시 fetch는 handlePageChange에서)

  // useEffect 수정: currentPage, pageSize 변경 시 fetchFooters 호출
  useEffect(() => {
    fetchFooters(currentPage, pageSize);
  }, [currentPage, pageSize]); // fetchFooters는 useCallback으로 감싸져 있으므로 넣지 않음

  // 페이지 변경 핸들러 수정: fetchFooters 호출
  const handlePageChange = (page: number) => {
    if (page >= 1 && page !== currentPage) {
      // totalPages 검사 제거 (API가 처리)
      setCurrentPage(page); // 상태 변경 -> useEffect 트리거
    }
  };

  // isAllSelectedOnPage 계산 (동일)
  const isAllSelectedOnPage =
    footers.length > 0 &&
    selectedIds.size === footers.length &&
    footers.every((f) => selectedIds.has(f.id));

  function handleSelect(id: number) {
    setSelectedIds((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  }

  function handleSelectAll() {
    if (isAllSelectedOnPage) {
      setSelectedIds(new Set());
    } else {
      const currentPageIds = new Set(footers.map((f) => f.id));
      setSelectedIds(currentPageIds);
    }
  }

  function handleCreateClick() {
    setFooterToEdit(null);
    setShowFormModal(true);
  }

  function handleEditClick(footer: Footer) {
    setFooterToEdit(footer);
    setShowFormModal(true);
  }

  // handleDeleteClick 수정 (페이지 조정 및 fetchFooters 호출)
  async function handleDeleteClick(id: number) {
    const footerToDelete = footers.find((f) => f.id === id);
    if (
      !footerToDelete ||
      !confirm(`정말로 이 푸터 항목을 삭제하시겠습니까?\n\n제목: ${footerToDelete.title}`)
    ) {
      return;
    }

    setSaving(true);
    setAlertMessage(null);
    try {
      await axios.delete(`/footer/${id}`);
      setAlertMessage({ type: "success", message: "푸터 항목이 삭제되었습니다." });
      setSelectedIds((prev) => {
        const newSelected = new Set(prev);
        newSelected.delete(id);
        return newSelected;
      });

      // 페이지 조정 로직 (서버 측 기준)
      const newTotalItems = totalItems - 1;
      const newTotalPages = Math.ceil(newTotalItems / pageSize);
      if (footers.length === 1 && currentPage > 1 && currentPage > newTotalPages) {
        // 마지막 항목 삭제 후 이전 페이지로 이동
        setCurrentPage(currentPage - 1); // 상태 변경 -> useEffect 트리거
      } else {
        // 현재 페이지 또는 최대 페이지로 새로고침
        fetchFooters(Math.min(currentPage, newTotalPages || 1), pageSize);
      }
    } catch (err) {
      console.error("Error deleting footer:", err);
      setAlertMessage({ type: "error", message: "푸터 항목 삭제 중 오류가 발생했습니다." });
    } finally {
      setSaving(false);
    }
  }

  // handleDeleteSelectedClick 수정 (페이지 조정 및 fetchFooters 호출)
  async function handleDeleteSelectedClick() {
    if (
      selectedIds.size === 0 ||
      !confirm(
        `선택된 ${selectedIds.size}개의 푸터 항목을 정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
      )
    ) {
      return;
    }

    setSaving(true);
    setAlertMessage(null);
    const idsToDelete = Array.from(selectedIds);

    try {
      let successCount = 0;
      let errorCount = 0;
      for (const id of idsToDelete) {
        try {
          await axios.delete(`/footer/${id}`);
          successCount++;
        } catch (err) {
          errorCount++;
        }
      }
      setAlertMessage({
        type: errorCount === 0 ? "success" : "error",
        message:
          errorCount === 0
            ? `${successCount}개의 푸터 항목이 삭제되었습니다.`
            : `${successCount}개 삭제 성공, ${errorCount}개 삭제 실패.`,
      });
      setSelectedIds(new Set());
      // 삭제 후 목록 새로고침
      fetchFooters(currentPage, pageSize);
    } catch (err) {
      console.error("Error deleting selected footers:", err);
      setAlertMessage({ type: "error", message: "선택된 푸터 항목 삭제 중 오류가 발생했습니다." });
    } finally {
      setSaving(false);
    }
  }

  const columns: FooterColumnDef[] = useMemo(
    () => [
      {
        header: (
          <input
            type="checkbox"
            className="form-checkbox h-4 w-4 text-blue-600"
            onChange={handleSelectAll}
            checked={isAllSelectedOnPage}
            ref={(input) => {
              if (input) {
                input.indeterminate = selectedIds.size > 0 && selectedIds.size < footers.length;
              }
            }}
            disabled={loading || footers.length === 0}
          />
        ),
        accessor: "id",
        cell: (_: any, row: Footer) => (
          <input
            type="checkbox"
            checked={selectedIds.has(row.id)}
            onChange={() => handleSelect(row.id)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        ),
        className: "w-px px-4",
      },
      { header: "ID", accessor: "id" },
      {
        header: "제목",
        accessor: "title",
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
        accessor: "content",
        cell: (value: string) => (
          <div className="truncate max-w-xs" title={createPreview(value, 500)}>
            {createPreview(value, 50)}
          </div>
        ),
      },
      {
        header: "공개 여부",
        accessor: "isPublic",
        cell: (value: number) => (
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              value === 1 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {value === 1 ? "공개" : "비공개"}
          </span>
        ),
        className: "text-center",
      },
      { header: "생성일", accessor: "createdAt", cell: (v: string) => formatDate(v) },
      {
        header: "관리",
        accessor: "id",
        cell: (id: number, row: Footer) => (
          <div className="flex space-x-1 justify-center">
            <ActionButton
              label="수정"
              action="edit"
              size="sm"
              onClick={() => handleEditClick(row)}
              disabled={saving}
            />
            <ActionButton
              label="삭제"
              action="delete"
              size="sm"
              onClick={() => handleDeleteClick(id)}
              disabled={saving}
            />
          </div>
        ),
        className: "text-center",
      },
    ],
    [footers, selectedIds, loading, saving, isAllSelectedOnPage]
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">하단 푸터 관리</h1>
        <div className="flex space-x-2">
          <Button
            variant="danger"
            onClick={handleDeleteSelectedClick}
            disabled={selectedIds.size === 0 || loading || saving}
          >
            {`선택 삭제 (${selectedIds.size})`}
          </Button>
          <Button variant="primary" onClick={handleCreateClick} disabled={loading || saving}>
            새 항목 추가
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

      <LoadingOverlay isLoading={loading || saving} />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          columns={columns}
          data={footers}
          loading={loading}
          emptyMessage="등록된 푸터 항목이 없습니다."
          pagination={{
            currentPage: currentPage,
            pageSize: pageSize,
            totalItems: totalItems, // 서버에서 받은 totalItems
            onPageChange: handlePageChange,
            // totalPages는 DataTable 내부에서 계산하므로 전달 X (선택적)
          }}
        />
      </div>

      {showFormModal && (
        <FooterFormModal
          isOpen={showFormModal}
          onClose={() => setShowFormModal(false)}
          footerToEdit={footerToEdit}
          onSuccess={() => {
            setShowFormModal(false);
            fetchFooters(currentPage, pageSize); // 현재 페이지 새로고침
            setAlertMessage({
              type: "success",
              message: footerToEdit ? "푸터가 수정되었습니다." : "푸터가 추가되었습니다.",
            });
          }}
        />
      )}
    </div>
  );
}

export default FooterManagementPage;
