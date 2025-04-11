// src/pages/footer/FooterManagementPage.tsx
import React, { useState, useEffect, useMemo } from "react";
import axios from "@/api/axios";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import ActionButton from "@/components/ActionButton";
import Alert from "@/components/Alert";
import { formatDate } from "@/utils/dateUtils";
import FooterFormModal from "./FooterFormModal";
import type { Footer } from "./types";

// Define a simpler column type based on existing DataTable usage
interface SimpleColumnDef {
  header: string;
  accessor: keyof Footer | "select" | "actions"; // Use keyof Footer or specific strings for non-data columns
  cell?: (value: any, row: Footer, index: number) => React.ReactNode; // Optional cell renderer
  size?: number; // Optional size prop if DataTable supports it
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

  async function fetchFooters() {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<{ data: Footer[] }>("/footer/all");
      setFooters(response.data?.data || response.data || []);
    } catch (err) {
      console.error("Error fetching footers:", err);
      setError("푸터 목록을 불러오는데 실패했습니다.");
      setFooters([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFooters();
  }, []);

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

  // Define columns based on SimpleColumnDef and banner page examples
  const columns: SimpleColumnDef[] = [
    {
      header: "선택",
      accessor: "select",
      cell: (_, row) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={(e) => handleSelect(row.id, e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      ),
      size: 50, // Keep size if your DataTable uses it
    },
    {
      header: "제목",
      accessor: "title",
      size: 200,
    },
    {
      header: "내용",
      accessor: "content",
      cell: (value) => (
        <div className="truncate max-w-xs">{value as string}</div> // Truncate long content
      ),
      size: 400,
    },
    {
      header: "공개 여부",
      accessor: "isPublic",
      cell: (value) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            value === 1 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {value === 1 ? "공개" : "비공개"}
        </span>
      ),
      size: 100,
    },
    {
      header: "관리",
      accessor: "actions",
      cell: (_, row) => (
        <div className="flex space-x-1">
          <ActionButton
            action="edit"
            onClick={() => handleEditClick(row)}
            disabled={deleting}
            size="sm"
          />
          <ActionButton
            action="delete"
            onClick={() => handleDeleteClick(row.id)}
            disabled={deleting}
            size="sm"
          />
        </div>
      ),
      size: 100,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">하단 푸터 관리</h1>
        <div className="flex items-center space-x-2">
          {/* Re-add Select All Checkbox */}
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
          {/* Re-add Delete Selected Button, disable if nothing selected */}
          <Button
            variant="danger"
            onClick={handleDeleteSelectedClick}
            disabled={deleting || selectedIds.size === 0} // Disable if deleting or no items selected
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

      <DataTable
        columns={columns}
        data={footers}
        loading={loading || deleting}
        emptyMessage="등록된 푸터 항목이 없습니다."
      />

      <FooterFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSuccess={() => {
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
