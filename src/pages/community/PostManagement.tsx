import axios from "@/api/axios";
import { useEffect, useState } from "react";
import { Post } from "@/types/index";
import { useNavigate } from "react-router-dom";

const PostManagement = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const navigate = useNavigate();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });

  // 게시물 상세 페이지로 이동
  const handleClick = (id: number) => {
    navigate(`/community/posts/${id}`);
  };

  // 페이지 변경 처리
  const handlePageChange = (page: number) => {
    getAllPost(page);
  };

  // 전체 게시물 목록 가져오기
  const getAllPost = async (page = 1) => {
    setLoading(true);
    try {
      const response = await axios.get("/post", {
        params: {
          page,
          pageSize: pagination.limit,
          boardId: 2, // 자유게시판(boardId: 2)에 해당하는 게시물만 불러오기
        },
      });

      console.log("게시물 API 응답:", response.data);

      // 서버 응답 형식에 맞게 처리
      if (response.data) {
        // 응답이 posts 배열을 포함하는 객체인지 확인
        if (response.data.posts && Array.isArray(response.data.posts)) {
          setPosts(response.data.posts);
          // 페이지네이션 정보가 있는 경우 업데이트
          setPagination({
            page: response.data.currentPage || page,
            limit: pagination.limit,
            total: response.data.totalPosts || 0,
          });
        }
        // 응답이 직접 배열인 경우
        else if (Array.isArray(response.data)) {
          setPosts(response.data);
          // 페이지네이션 정보 업데이트 (배열 길이 기반)
          setPagination((prev) => ({
            ...prev,
            page,
            total: response.data.length > 0 ? response.data.length * 5 : 0, // 임시 값
          }));
        } else {
          console.error("게시물 불러오기 실패: 잘못된 응답 형식", response.data);
        }
      } else {
        console.error("게시물 불러오기 실패: 응답 데이터 없음");
      }
    } catch (error) {
      console.error("게시물 불러오기 오류:", error);
    } finally {
      setLoading(false);
    }
  };

  // 게시물 삭제 함수
  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // 이벤트 버블링 방지
    if (!window.confirm("정말 이 게시물을 삭제하시겠습니까?")) {
      return;
    }

    try {
      const response = await axios.delete(`/post/${id}`);
      console.log("삭제 응답:", response.status, response.data);

      if (response.status === 200 || response.status === 204) {
        alert("게시물이 삭제되었습니다.");
        // 현재 페이지를 다시 불러오기
        getAllPost(pagination.page);
      } else {
        alert("게시물 삭제에 실패했습니다.");
      }
    } catch (error: any) {
      console.error("게시물 삭제 오류:", error);

      // 인증 오류 처리
      if (error.response?.status === 401 || error.response?.status === 403) {
        alert("권한이 없습니다. 로그인이 필요합니다.");
        // navigate("/login");
      } else {
        alert(
          "게시물을 삭제하는 중 오류가 발생했습니다: " +
            (error.response?.data?.error || "알 수 없는 오류")
        );
      }
    }
  };

  // 게시물 수정 페이지로 이동
  const handleEdit = (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // 이벤트 버블링 방지
    navigate(`/community/posts/${id}`);
  };

  useEffect(() => {
    getAllPost();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">데이터를 가지고 오는 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-xl font-semibold mb-4">게시물 목록</h2>

      <div className="mb-4 flex justify-end">
        <button
          onClick={() => navigate("/community/posts/new")}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          새 게시물 작성
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg">
        <table className="min-w-full text-sm text-left border border-gray-200">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-semibold">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">제목</th>
              <th className="px-4 py-3">작성자</th>
              <th className="px-4 py-3">작성일</th>
              <th className="px-4 py-3 text-center">조회수</th>
              <th className="px-4 py-3 text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {posts.length > 0 ? (
              posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{post.id}</td>
                  <td
                    className="px-4 py-3 font-medium text-blue-600 cursor-pointer"
                    onClick={() => handleClick(post.id)}
                  >
                    {post.title}
                  </td>
                  <td className="px-4 py-3">{post.author?.nickname || "알 수 없음"}</td>
                  <td className="px-4 py-3">{new Date(post.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center">{post.viewCount}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => handleEdit(post.id, e)}
                      className="text-sm text-blue-500 hover:underline"
                    >
                      수정
                    </button>
                    <button
                      onClick={(e) => handleDelete(post.id, e)}
                      className="ml-2 text-sm text-red-500 hover:underline"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  게시물이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            총 <span className="font-semibold text-gray-700">{pagination.total || 0}</span>건 중
            {pagination.page * pagination.limit - pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total || 0)}
          </p>
          <div className="inline-flex items-center space-x-1">
            <button
              className="px-3 py-1 text-sm text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40"
              disabled={pagination.page <= 1}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              이전
            </button>

            {/* 페이지네이션 버튼 생성 */}
            {Array.from(
              { length: Math.ceil((pagination.total || 0) / pagination.limit) },
              (_, i) => (
                <button
                  key={i}
                  className={`px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 
                  ${
                    pagination.page === i + 1
                      ? "bg-blue-100 text-blue-700"
                      : "bg-white text-gray-700"
                  }`}
                  onClick={() => handlePageChange(i + 1)}
                >
                  {i + 1}
                </button>
              )
            )}

            <button
              className="px-3 py-1 text-sm text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40"
              disabled={pagination.page >= Math.ceil((pagination.total || 0) / pagination.limit)}
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              다음
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostManagement;
