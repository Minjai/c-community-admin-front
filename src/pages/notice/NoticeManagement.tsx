import axios from "@/api/axios";
import { useEffect, useState } from "react";
import { Post } from "@/types/index";
import { useNavigate } from "react-router-dom";
import ActionButton from "@/components/ActionButton";
import Button from "@/components/Button";
import Alert from "@/components/Alert";

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
  const handlePageChange = (page: number) => {
    getAllNotices(page);
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

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16"
              >
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                제목
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                작성일
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                공개 여부
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                관리
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                  </div>
                </td>
              </tr>
            ) : notices && notices.length > 0 ? (
              notices.map((notice) => (
                <tr
                  key={notice.id}
                  className={`hover:bg-gray-50 ${selectedIds.has(notice.id) ? "bg-indigo-50" : ""}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(notice.id)}
                      onChange={(e) => handleSelect(notice.id, e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </td>
                  <td
                    className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600 cursor-pointer"
                    onClick={() => handleClick(notice.id)}
                  >
                    {notice.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(notice.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        notice.isPublic === 1
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {notice.isPublic === 1 ? "공개" : "비공개"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-1">
                      <ActionButton
                        label="수정"
                        action="edit"
                        size="sm"
                        onClick={(e: React.MouseEvent) => handleEdit(notice.id, e)}
                      />
                      <ActionButton
                        label="삭제"
                        action="delete"
                        size="sm"
                        onClick={(e: React.MouseEvent) => handleDelete(notice.id, e)}
                      />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  등록된 공지사항이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {notices && notices.length > 0 && (
        <div className="flex justify-center my-6">
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
            <button
              onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
              disabled={pagination.page === 1}
              className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                pagination.page === 1
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              이전
            </button>
            {Array.from(
              { length: Math.ceil(pagination.total / pagination.limit) },
              (_, i) => i + 1
            ).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium ${
                  pagination.page === page
                    ? "bg-indigo-50 text-indigo-600 z-10"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() =>
                handlePageChange(
                  Math.min(Math.ceil(pagination.total / pagination.limit), pagination.page + 1)
                )
              }
              disabled={pagination.page === Math.ceil(pagination.total / pagination.limit)}
              className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                pagination.page === Math.ceil(pagination.total / pagination.limit)
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              다음
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};

export default NoticeManagement;
