import axios from "@/api/axios";
import { useEffect, useState } from "react";
import { Post } from "@/types/index";
import { useNavigate } from "react-router-dom";
import ActionButton from "@/components/ActionButton";
import Button from "@/components/Button";
import Alert from "@/components/Alert";
import DataTable from "@/components/DataTable";
import { formatDate } from "@/utils/dateUtils";
import LoadingOverlay from "@/components/LoadingOverlay";

const NoticeManagement = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [notices, setNotices] = useState<Post[]>([]);
  const navigate = useNavigate();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // 공지사항 상세 페이지로 이동
  const handleClick = (id: number) => {
    navigate(`/notice/${id}`);
  };

  // 페이지 변경 처리
  const handlePageChange = (newPage: number) => {
    getAllNotices(newPage);
  };

  // 전체 공지사항 목록 가져오기
  const getAllNotices = async (page = 1) => {
    setLoading(true);
    try {
      const response = await axios.get("/post", {
        params: {
          page,
          pageSize: pagination.limit,
          boardId: 1, // 공지사항 (boardId=1)
        },
      });

      console.log("공지사항 API 응답:", response.data);

      // 응답 데이터 형식에 따라 처리
      let noticesData: Post[] = [];
      let totalItems = 0;

      if (response.data.posts && Array.isArray(response.data.posts)) {
        noticesData = response.data.posts;
        totalItems = response.data.totalPosts || response.data.total || noticesData.length;
      } else if (Array.isArray(response.data)) {
        noticesData = response.data;
        totalItems = noticesData.length;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        noticesData = response.data.data;
        totalItems = response.data.total || noticesData.length;
      }

      setNotices(noticesData);
      setPagination({
        ...pagination,
        page,
        total: totalItems,
      });
    } catch (error) {
      console.error("공지사항 목록 조회 오류:", error);
    } finally {
      setLoading(false);
    }
  };

  // 개별 선택 처리
  const handleSelect = (id: number, isSelected: boolean) => {
    setSelectedIds((prev) => {
      const newSelected = new Set(prev);
      if (isSelected) {
        newSelected.add(id);
      } else {
        newSelected.delete(id);
      }
      return newSelected;
    });
  };

  // 전체 선택 처리
  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedIds(new Set(notices.map((n) => n.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const isAllSelected = notices.length > 0 && selectedIds.size === notices.length;

  // 선택 항목 삭제 처리
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`선택된 ${selectedIds.size}개의 공지사항을 정말 삭제하시겠습니까?`)) return;

    setDeleting(true);
    setAlertMessage(null);
    const idsToDelete = Array.from(selectedIds);

    let successCount = 0;
    let errorCount = 0;
    for (const id of idsToDelete) {
      try {
        await axios.delete(`/post/${id}`);
        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`공지사항(ID: ${id}) 삭제 오류:`, error);
      }
    }

    setAlertMessage({
      type: errorCount === 0 ? "success" : "error",
      message:
        errorCount === 0
          ? `${successCount}개의 공지사항이 삭제되었습니다.`
          : `${successCount}개 삭제 성공, ${errorCount}개 삭제 실패.`,
    });
    setSelectedIds(new Set()); // Clear selection
    getAllNotices(pagination.page); // Refresh list
    setDeleting(false);
  };

  // 공지사항 삭제 처리
  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // 이벤트 버블링 방지

    if (!window.confirm("정말 이 공지사항을 삭제하시겠습니까?")) {
      return;
    }

    setDeleting(true); // Use deleting state
    setAlertMessage(null);
    try {
      await axios.delete(`/post/${id}`);
      setAlertMessage({ type: "success", message: "공지사항이 삭제되었습니다." });
      // Also remove from selected if it was selected
      setSelectedIds((prev) => {
        const newSelected = new Set(prev);
        newSelected.delete(id);
        return newSelected;
      });
      getAllNotices(pagination.page);
    } catch (error) {
      console.error("공지사항 삭제 오류:", error);
      setAlertMessage({ type: "error", message: "공지사항 삭제 중 오류가 발생했습니다." });
    } finally {
      setDeleting(false); // Use deleting state
    }
  };

  // 공지사항 수정 페이지로 이동
  const handleEdit = (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // 이벤트 버블링 방지
    navigate(`/notice/${id}`);
  };

  // 새 공지사항 작성 페이지로 이동
  const handleNew = () => {
    navigate("/notice/new");
  };

  // DataTable 컬럼 정의
  const columns = [
    {
      header: (
        <input
          type="checkbox"
          checked={isAllSelected}
          onChange={(e) => handleSelectAll(e.target.checked)}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          disabled={loading || notices.length === 0 || deleting}
        />
      ),
      accessor: "id" as keyof Post,
      cell: (id: number) => (
        <input
          type="checkbox"
          checked={selectedIds.has(id)}
          onChange={(e) => handleSelect(id, e.target.checked)}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          onClick={(e) => e.stopPropagation()} // Prevent row click
          disabled={loading || deleting}
        />
      ),
      className: "w-16 px-6", // Adjusted padding
    },
    {
      header: "제목",
      accessor: "title" as keyof Post,
      cell: (title: string, row: Post) => (
        <span
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          onClick={(e) => {
            e.stopPropagation(); // Prevent default row click if any
            handleClick(row.id);
          }}
        >
          {title}
        </span>
      ),
    },
    {
      header: "작성일",
      accessor: "createdAt" as keyof Post,
      cell: (value: string) => formatDate(value),
    },
    {
      header: "공개 여부",
      accessor: "isPublic" as keyof Post,
      cell: (isPublic: number) => (isPublic === 1 ? "공개" : "비공개"),
    },
    {
      header: "관리",
      accessor: "id" as keyof Post,
      cell: (id: number, row: Post) => (
        <div className="flex space-x-1">
          <ActionButton
            label="수정"
            action="edit"
            size="sm"
            onClick={(e) => handleEdit(id, e)}
            disabled={deleting}
          />
          <ActionButton
            label="삭제"
            action="delete"
            size="sm"
            onClick={(e) => handleDelete(id, e)}
            disabled={deleting}
          />
        </div>
      ),
    },
  ];

  useEffect(() => {
    getAllNotices();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">공지사항 관리</h1>
        <div className="flex space-x-2">
          <Button
            variant="danger"
            onClick={handleDeleteSelected}
            disabled={deleting || selectedIds.size === 0}
          >
            {deleting ? "삭제 중..." : `선택 삭제 (${selectedIds.size})`}
          </Button>
          <Button variant="primary" onClick={handleNew}>
            새 공지사항 작성
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

      <LoadingOverlay isLoading={loading || deleting} />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          columns={columns}
          data={notices}
          loading={loading || deleting}
          emptyMessage="등록된 공지사항이 없습니다."
          pagination={{
            currentPage: pagination.page,
            pageSize: pagination.limit,
            totalItems: pagination.total,
            onPageChange: handlePageChange,
          }}
        />
      </div>
    </div>
  );
};

export default NoticeManagement;
