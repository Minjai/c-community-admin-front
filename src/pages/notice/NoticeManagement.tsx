import axios from "@/api/axios";
import { useEffect, useState } from "react";
import { Post } from "@/types/index";
import { useNavigate } from "react-router-dom";
import ActionButton from "@/components/ActionButton";
import Button from "@/components/Button";
import Alert from "@/components/Alert";
import DataTable from "@/components/DataTable";
import SearchInput from "@/components/SearchInput";
import { formatDate } from "@/utils/dateUtils";
import LoadingOverlay from "@/components/LoadingOverlay";
import ExcelDownloadButton from "@/components/ExcelDownloadButton";

interface ContentViewStats {
  [key: string]: {
    anonymousUsers: number;
    loggedInUsers: number;
    totalViews: number;
  };
}

const NoticeManagement = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [notices, setNotices] = useState<Post[]>([]);
  const [contentViewStats, setContentViewStats] = useState<ContentViewStats>({});
  const navigate = useNavigate();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [displayOrders, setDisplayOrders] = useState<Record<number, number>>({});
  const [searchValue, setSearchValue] = useState<string>("");

  // 공지사항 상세 페이지로 이동
  const handleClick = (id: number) => {
    navigate(`/notice/${id}`);
  };

  // 페이지 변경 처리
  const handlePageChange = (newPage: number) => {
    getAllNotices(newPage, searchValue);
  };

  // 검색 핸들러
  const handleSearch = (value: string) => {
    getAllNotices(1, value);
  };

  // 조회수 표시 함수
  const formatViewCount = (postId: number) => {
    const stats = contentViewStats[postId.toString()];
    if (!stats) return "0";

    const total = stats.totalViews;
    const loggedIn = stats.loggedInUsers;

    if (loggedIn === 0) {
      return total.toString();
    }

    return (
      <span>
        <span className="text-gray-600">{total}</span>
        <span className="text-blue-600">({loggedIn})</span>
      </span>
    );
  };

  // 전체 공지사항 목록 가져오기 (검색 파라미터 추가)
  const getAllNotices = async (page = 1, searchValue: string = "") => {
    setLoading(true);
    try {
      const params: any = {
        page,
        pageSize: pagination.limit,
        boardId: 1, // 공지사항 (boardId=1)
      };

      if (searchValue.trim()) {
        params.search = searchValue;
      }

      const response = await axios.get("/admin/post", { params });

      console.log("공지사항 API 응답:", response.data);

      // 새로운 API 응답 구조에 맞게 처리
      if (response.data.posts && Array.isArray(response.data.posts)) {
        setNotices(response.data.posts);
        setContentViewStats(response.data.contentViewStats || {});
        setPagination({
          ...pagination,
          page: response.data.currentPage || page,
          total: response.data.totalPosts || 0,
          totalPages: response.data.totalPages || 1,
        });
      } else {
        setNotices([]);
        setContentViewStats({});
        setPagination({
          ...pagination,
          page,
          total: 0,
          totalPages: 1,
        });
      }

      // displayOrder 상태 초기화
      const orderMap: Record<number, number> = {};
      response.data.posts?.forEach((n: Post) => {
        orderMap[n.id] = n.displayOrder;
      });
      setDisplayOrders(orderMap);
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

    try {
      // Assume bulk delete endpoint is DELETE /post with body { ids: [...] }
      await axios.delete(`/post`, { data: { ids: idsToDelete } });
      setAlertMessage({
        type: "success",
        message: `${idsToDelete.length}개의 공지사항이 삭제되었습니다.`,
      });
      setSelectedIds(new Set()); // Clear selection
      getAllNotices(pagination.page); // Refresh list
    } catch (error) {
      console.error("선택 공지사항 삭제 오류:", error);
      setAlertMessage({ type: "error", message: "선택된 공지사항 삭제 중 오류가 발생했습니다." });
    } finally {
      setDeleting(false);
    }
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

  // displayOrder 입력 변경 핸들러
  const handleOrderChange = (id: number, value: number) => {
    setDisplayOrders((prev) => ({ ...prev, [id]: value }));
  };

  // 순서저장 버튼 클릭 핸들러
  const handleSaveOrder = async () => {
    setLoading(true);
    try {
      // 변경된 displayOrder만 추출
      const changed = notices.filter((n) => displayOrders[n.id] !== n.displayOrder);
      for (const n of changed) {
        await axios.patch(`/post/admin/${n.id}/display-order`, {
          displayOrder: displayOrders[n.id],
        });
      }
      setAlertMessage({ type: "success", message: "순서가 저장되었습니다." });
      getAllNotices(pagination.page);
    } catch (error) {
      setAlertMessage({ type: "error", message: "순서 저장 중 오류가 발생했습니다." });
    } finally {
      setLoading(false);
    }
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
      cell: (value: unknown, row: Post) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={(e) => handleSelect(row.id, e.target.checked)}
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
      cell: (value: unknown, row: Post) => (
        <span
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer block truncate max-w-xs"
          onClick={(e) => {
            e.stopPropagation(); // Prevent default row click if any
            handleClick(row.id);
          }}
          title={row.title}
        >
          {row.title}
        </span>
      ),
      className: "max-w-xs",
    },
    {
      header: "작성일",
      accessor: "createdAt" as keyof Post,
      cell: (value: unknown, row: Post) => formatDate(row.createdAt),
    },
    {
      header: "공개 여부",
      accessor: "isPublic" as keyof Post,
      cell: (value: unknown, row: Post) => (row.isPublic === 1 ? "공개" : "비공개"),
    },
    {
      header: "조회",
      accessor: "id" as keyof Post,
      cell: (value: unknown, row: Post) => (
        <span className="text-sm text-gray-600">{formatViewCount(row.id)}</span>
      ),
      className: "text-center",
    },
    {
      header: "순서",
      accessor: "displayOrder" as keyof Post,
      cell: (value: unknown, row: Post) => (
        <input
          type="number"
          className="w-20 border rounded px-2 py-1 text-center"
          value={displayOrders[row.id] ?? row.displayOrder ?? 0}
          onChange={(e) => handleOrderChange(row.id, Number(e.target.value))}
          disabled={loading || deleting}
          style={{ minWidth: 60 }}
        />
      ),
      className: "w-24 px-2 text-center",
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
        <SearchInput
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          onSearch={handleSearch}
        />
        <div className="flex space-x-2">
          {/* 엑셀 다운로드 버튼 */}
          <ExcelDownloadButton type="notices" variant="outline" size="sm">
            엑셀 다운로드
          </ExcelDownloadButton>
          <Button variant="primary" onClick={handleSaveOrder} disabled={loading || deleting}>
            순서저장
          </Button>
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
          emptyMessage={searchValue ? "검색된 결과가 없습니다." : "등록된 공지사항이 없습니다."}
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
