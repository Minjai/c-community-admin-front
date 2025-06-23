import React, { useState, useEffect, ReactNode, useCallback } from "react";
import axios from "@/api/axios";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import ActionButton from "@/components/ActionButton";
import Alert from "@/components/Alert";
import { formatDate } from "@/utils/dateUtils";
import LoadingOverlay from "@/components/LoadingOverlay";

interface HomeContent {
  id: number;
  title: string;
  createdAt: string;
  isPublic: boolean;
}

interface HomeColumnDef {
  header: string | ReactNode;
  accessor: keyof HomeContent | ((item: HomeContent) => ReactNode);
  cell?: (value: any, row: HomeContent, index?: number) => React.ReactNode;
  className?: string;
}

function HomeManagementPage() {
  const [contents, setContents] = useState<HomeContent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState<boolean>(false);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);

  const fetchContents = useCallback(async (page: number = 1, limit: number = 10) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/home-contents?page=${page}&limit=${limit}`);
      console.log("홈 화면 응답:", response.data);

      if (response.data && response.data.data && response.data.pagination) {
        const fetchedContents = response.data.data || [];
        const pagination = response.data.pagination;

        setContents(fetchedContents);
        setTotalItems(pagination.totalItems || 0);
        setTotalPages(pagination.totalPages || 0);
        setCurrentPage(pagination.currentPage || page);
        setPageSize(pagination.pageSize || limit);
        setSelectedIds(new Set());
      } else {
        console.error("홈 화면 불러오기 실패: 응답 형식이 예상과 다릅니다", response.data);
        setContents([]);
        setTotalItems(0);
        setTotalPages(0);
        setCurrentPage(1);
        setSelectedIds(new Set());
      }
    } catch (err) {
      console.error("Error fetching home contents:", err);
      setError("홈 화면 목록을 불러오는데 실패했습니다.");
      setContents([]);
      setTotalItems(0);
      setTotalPages(0);
      setCurrentPage(1);
      setSelectedIds(new Set());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContents(currentPage, pageSize);
  }, [currentPage, pageSize]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page !== currentPage) {
      setCurrentPage(page);
    }
  };

  const isAllSelectedOnPage =
    contents.length > 0 &&
    selectedIds.size === contents.length &&
    contents.every((c) => selectedIds.has(c.id));

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
      const currentPageIds = new Set(contents.map((c) => c.id));
      setSelectedIds(currentPageIds);
    }
  }

  function handleAdd() {
    // TODO: Will be implemented later
  }

  function handleEdit(id: number) {
    // TODO: Will be implemented later
  }

  async function handleDeleteClick(id: number) {
    const contentToDelete = contents.find((c) => c.id === id);
    if (
      !contentToDelete ||
      !confirm(`정말로 이 홈 화면 항목을 삭제하시겠습니까?\n\n제목: ${contentToDelete.title}`)
    ) {
      return;
    }

    setSaving(true);
    setAlertMessage(null);
    try {
      await axios.delete(`/home-contents/${id}`);
      setAlertMessage({ type: "success", message: "홈 화면 항목이 삭제되었습니다." });
      setSelectedIds((prev) => {
        const newSelected = new Set(prev);
        newSelected.delete(id);
        return newSelected;
      });

      const newTotalItems = totalItems - 1;
      const newTotalPages = Math.ceil(newTotalItems / pageSize);
      if (contents.length === 1 && currentPage > 1 && currentPage > newTotalPages) {
        setCurrentPage(currentPage - 1);
      } else {
        fetchContents(Math.min(currentPage, newTotalPages || 1), pageSize);
      }
    } catch (err) {
      console.error("Error deleting home content:", err);
      setAlertMessage({ type: "error", message: "홈 화면 항목 삭제 중 오류가 발생했습니다." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSelectedClick() {
    if (
      selectedIds.size === 0 ||
      !confirm(
        `선택된 ${selectedIds.size}개의 홈 화면 항목을 정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
      )
    ) {
      return;
    }

    setSaving(true);
    setAlertMessage(null);
    const idsToDelete = Array.from(selectedIds);

    try {
      await Promise.all(idsToDelete.map((id) => axios.delete(`/home-contents/${id}`)));
      setAlertMessage({
        type: "success",
        message: `${idsToDelete.length}개의 홈 화면 항목이 삭제되었습니다.`,
      });
      setSelectedIds(new Set());

      const newTotalItems = totalItems - idsToDelete.length;
      const newTotalPages = Math.ceil(newTotalItems / pageSize);
      if (currentPage > newTotalPages) {
        setCurrentPage(Math.max(1, newTotalPages));
      } else {
        fetchContents(currentPage, pageSize);
      }
    } catch (err) {
      console.error("Error deleting selected home contents:", err);
      setAlertMessage({
        type: "error",
        message: "선택된 홈 화면 항목 삭제 중 오류가 발생했습니다.",
      });
    } finally {
      setSaving(false);
    }
  }

  const columns: HomeColumnDef[] = [
    {
      header: (
        <input
          type="checkbox"
          checked={isAllSelectedOnPage}
          onChange={handleSelectAll}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
        />
      ),
      accessor: (item) => (
        <input
          type="checkbox"
          checked={selectedIds.has(item.id)}
          onChange={() => handleSelect(item.id)}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
        />
      ),
      className: "w-[30px]",
    },
    {
      header: "제목",
      accessor: "title",
    },
    {
      header: "등록일시",
      accessor: "createdAt",
      cell: (value) => formatDate(value),
    },
    {
      header: "공개여부",
      accessor: "isPublic",
      cell: (value) => (value ? "공개" : "비공개"),
    },
    {
      header: "관리",
      accessor: (item) => (
        <div className="flex gap-2">
          <Button onClick={() => handleEdit(item.id)} className="px-2 py-1 text-sm">
            수정
          </Button>
          <Button
            onClick={() => handleDeleteClick(item.id)}
            className="px-2 py-1 text-sm bg-red-500 hover:bg-red-600"
          >
            삭제
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">홈 화면 관리</h1>
        <div className="flex gap-2">
          <Button onClick={handleAdd} className="px-4 py-2">
            등록
          </Button>
          {selectedIds.size > 0 && (
            <Button
              onClick={handleDeleteSelectedClick}
              className="px-4 py-2 bg-red-500 hover:bg-red-600"
              disabled={saving}
            >
              선택 삭제
            </Button>
          )}
        </div>
      </div>

      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
        />
      )}

      <DataTable
        columns={columns}
        data={contents}
        loading={loading}
        pagination={{
          currentPage,
          pageSize,
          totalItems,
          onPageChange: handlePageChange,
        }}
      />

      {saving && <LoadingOverlay isLoading />}
    </div>
  );
}

export default HomeManagementPage;
