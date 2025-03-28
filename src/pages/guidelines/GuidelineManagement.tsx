import { useEffect, useState } from "react";
import { Post } from "@/types/index";
import { useNavigate } from "react-router-dom";
import GuidelineApiService from "@/services/GuidelineApiService";

const GuidelineManagement = ({ boardId = 3 }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const navigate = useNavigate();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });

  // boardId 기반 경로 및 타이틀 결정
  const getPageInfo = () => {
    switch (boardId) {
      case 3:
        return { path: "/guidelines/casino", title: "카지노 가이드라인 목록" };
      case 4:
        return { path: "/guidelines/sports", title: "스포츠 가이드라인 목록" };
      case 5:
        return { path: "/guidelines/crypto", title: "암호화폐 가이드라인 목록" };
      default:
        return { path: "/guidelines/casino", title: "카지노 가이드라인 목록" };
    }
  };

  const { path, title } = getPageInfo();

  // 게시물 상세 페이지로 이동
  const handleClick = (id: number) => {
    navigate(`${path}/${id}`);
  };

  // 페이지 변경 처리
  const handlePageChange = (page: number) => {
    getAllPost(page);
  };

  // 전체 게시물 목록 가져오기
  const getAllPost = async (page = 1) => {
    setLoading(true);
    try {
      console.log(`${title} 가이드라인 요청 매개변수:`, {
        boardId,
        page,
        pageSize: pagination.limit,
      }); // 요청 매개변수 로깅

      const response = await GuidelineApiService.getGuidelines(boardId, page, pagination.limit);

      console.log(`${title} API 응답:`, response);

      // 서버 응답 형식에 맞게 처리
      if (response) {
        // 응답이 posts 배열을 포함하는 객체인지 확인
        if (response.posts && Array.isArray(response.posts)) {
          console.log("응답 타입: posts 배열 포함 객체", response.posts);
          setPosts(response.posts);
          // 페이지네이션 정보가 있는 경우 업데이트
          setPagination({
            page: response.currentPage || page,
            limit: pagination.limit,
            total: response.totalPosts || 0,
          });
        }
        // 응답이 직접 배열인 경우
        else if (Array.isArray(response)) {
          console.log("응답 타입: 직접 배열", response);
          setPosts(response);
          // 페이지네이션 정보 업데이트 (배열 길이 기반)
          setPagination((prev) => ({
            ...prev,
            page,
            total: response.length > 0 ? response.length * 5 : 0, // 임시 값
          }));
        } else if (response.data && Array.isArray(response.data)) {
          console.log("응답 타입: data 속성 배열", response.data);
          setPosts(response.data);
          setPagination((prev) => ({
            ...prev,
            page,
            total: response.count || response.data.length,
          }));
        } else {
          console.error(`${title} 불러오기 실패: 잘못된 응답 형식`, response);
        }
      } else {
        console.error(`${title} 불러오기 실패: 응답 데이터 없음`);
      }
    } catch (error) {
      console.error(`${title} 불러오기 오류:`, error);
    } finally {
      setLoading(false);
    }
  };

  // 게시물 삭제 함수
  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // 이벤트 버블링 방지
    if (!window.confirm("정말 이 가이드라인을 삭제하시겠습니까?")) {
      return;
    }

    try {
      await GuidelineApiService.deleteGuideline(id);
      alert("가이드라인이 삭제되었습니다.");
      // 현재 페이지를 다시 불러오기
      getAllPost(pagination.page);
    } catch (error: any) {
      console.error("가이드라인 삭제 오류:", error);

      // 인증 오류 처리
      if (error.response?.status === 401 || error.response?.status === 403) {
        alert("권한이 없습니다. 로그인이 필요합니다.");
        navigate("/login");
      } else {
        alert(
          "가이드라인을 삭제하는 중 오류가 발생했습니다: " +
            (error.response?.data?.error || "알 수 없는 오류")
        );
      }
    }
  };

  // 게시물 수정 페이지로 이동
  const handleEdit = (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // 이벤트 버블링 방지
    navigate(`${path}/${id}`);
  };

  // 가이드라인 노출 순위 변경
  const handleChangePosition = async (id: number, newPosition: number, e: React.MouseEvent) => {
    e.stopPropagation(); // 이벤트 버블링 방지

    if (newPosition < 0) {
      alert("노출 순위는 0보다 작을 수 없습니다.");
      return;
    }

    try {
      await GuidelineApiService.updateGuidelinePosition(id, newPosition);
      alert("노출 순위가 변경되었습니다.");
      // 목록 다시 불러오기
      getAllPost(pagination.page);
    } catch (error: any) {
      console.error("노출 순위 변경 오류:", error);

      // 인증 오류 처리
      if (error.response?.status === 401 || error.response?.status === 403) {
        alert("권한이 없습니다. 로그인이 필요합니다.");
        navigate("/login");
      } else {
        alert(
          "노출 순위를 변경하는 중 오류가 발생했습니다: " +
            (error.response?.data?.error || "알 수 없는 오류")
        );
      }
    }
  };

  useEffect(() => {
    getAllPost();
  }, []);

  useEffect(() => {
    getAllPost();
  }, [boardId]);

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
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            onClick={() => navigate(`${path}/new`)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            가이드라인 등록
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  순서
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  썸네일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  타이틀
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작성일
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  공개여부
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {posts.length > 0 ? (
                posts.map((post, index) => (
                  <tr key={post.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {post.imageUrl ? (
                        <img
                          src={post.imageUrl}
                          alt={post.title}
                          className="h-16 w-24 object-cover rounded"
                        />
                      ) : (
                        <div className="h-16 w-24 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                          이미지 없음
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        className="text-sm font-medium text-blue-600 cursor-pointer"
                        onClick={() => handleClick(post.id)}
                      >
                        {post.title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          post.isPublic === 1
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {post.isPublic === 1 ? "공개" : "비공개"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex justify-center items-center space-x-2">
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={(e) =>
                              handleChangePosition(post.id, (post.position || 0) - 1, e)
                            }
                            className="text-gray-400 hover:text-gray-600 text-xs"
                            title="순위 올리기"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={(e) =>
                              handleChangePosition(post.id, (post.position || 0) + 1, e)
                            }
                            className="text-gray-400 hover:text-gray-600 text-xs"
                            title="순위 내리기"
                          >
                            ▼
                          </button>
                        </div>

                        <button
                          onClick={(e) => handleEdit(post.id, e)}
                          className="text-indigo-600 hover:text-indigo-900 mx-1"
                          title="수정"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>

                        <button
                          onClick={(e) => handleDelete(post.id, e)}
                          className="text-red-600 hover:text-red-900 mx-1"
                          title="삭제"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                    등록된 가이드라인이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white py-3 flex items-center justify-between border-t border-gray-200 mt-4">
          <div className="flex-1 flex justify-between items-center">
            <p className="text-sm text-gray-700">
              총 <span className="font-medium">{pagination.total || 0}</span>건
            </p>
            <div>
              <nav
                className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                aria-label="Pagination"
              >
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  이전
                </button>
                {Array.from(
                  { length: Math.ceil((pagination.total || 0) / pagination.limit) },
                  (_, i) => (
                    <button
                      key={i}
                      onClick={() => handlePageChange(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium
                        ${
                          pagination.page === i + 1
                            ? "z-10 bg-indigo-50 border-indigo-500 text-indigo-600"
                            : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                        }
                      `}
                    >
                      {i + 1}
                    </button>
                  )
                )}
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={
                    pagination.page >= Math.ceil((pagination.total || 0) / pagination.limit)
                  }
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  다음
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuidelineManagement;
