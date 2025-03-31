import axios from "@/api/axios";
import { useEffect, useState } from "react";
import { Post } from "@/types/index";
import { useNavigate } from "react-router-dom";

const NoticeManagement = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [notices, setNotices] = useState<Post[]>([]);
  const navigate = useNavigate();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });

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

  // 공지사항 삭제 처리
  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // 이벤트 버블링 방지

    if (!window.confirm("정말 이 공지사항을 삭제하시겠습니까?")) {
      return;
    }

    try {
      await axios.delete(`/post/${id}`);
      alert("공지사항이 삭제되었습니다.");
      getAllNotices(pagination.page);
    } catch (error) {
      console.error("공지사항 삭제 오류:", error);
      alert("공지사항 삭제 중 오류가 발생했습니다.");
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
        <button
          onClick={handleNew}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          새 공지사항 작성
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                번호
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
                  onClick={() => handleClick(notice.id)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{notice.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                    {notice.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(notice.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        notice.isPublic ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {notice.isPublic ? "공개" : "비공개"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={(e) => handleEdit(notice.id, e)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      수정
                    </button>
                    <button
                      onClick={(e) => handleDelete(notice.id, e)}
                      className="text-red-600 hover:text-red-900"
                    >
                      삭제
                    </button>
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

      {/* 페이지네이션 */}
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
            {/* 페이지 번호 */}
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
