import axios from "@/api/axios";
import { useEffect, useState, ReactNode } from "react";
import { Post } from "@/types/index";
import { useNavigate } from "react-router-dom";
import ActionButton from "@/components/ActionButton";
import DataTable from "@/components/DataTable";
import SearchInput from "@/components/SearchInput";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import ExcelDownloadButton from "@/components/ExcelDownloadButton";

// Define column type based on DataTable.tsx
interface PostColumnDef {
  header: string;
  accessor: keyof Post | ((item: Post) => ReactNode);
  cell?: (value: any, row: Post, index?: number) => React.ReactNode;
  className?: string;
}

interface ContentViewStats {
  [key: string]: {
    anonymousUsers: number;
    loggedInUsers: number;
    totalViews: number;
  };
}

const PostManagement = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [contentViewStats, setContentViewStats] = useState<ContentViewStats>({});
  const [selectedPosts, setSelectedPosts] = useState<number[]>([]);
  const navigate = useNavigate();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // 검색 value 상태
  const [searchValue, setSearchValue] = useState<string>("");

  // 스크롤을 맨 위로 이동
  useScrollToTop();

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

  // 게시물 상세 페이지로 이동
  const handleClick = (id: number) => {
    navigate(`/community/posts/${id}`);
  };

  // 페이지 변경 처리
  const handlePageChange = (page: number) => {
    getAllPost(page, searchValue);
  };

  // 검색 핸들러
  const handleSearch = (value: string) => {
    console.log("PostManagement: 검색 핸들러 호출됨, 검색어:", value);
    getAllPost(1, value);
  };

  // 전체 게시물 목록 가져오기 (검색 파라미터 추가)
  const getAllPost = async (page = 1, searchValue: string = "") => {
    setLoading(true);
    try {
      const params: any = {
        page,
        pageSize: pagination.limit,
        boardId: 2, // 자유게시판(boardId: 2)에 해당하는 게시물만 불러오기
      };

      if (searchValue.trim()) {
        params.search = searchValue;
      }

      const response = await axios.get("/admin/post", { params });

      console.log("게시물 API 응답:", response.data);

      // 새로운 API 응답 구조에 맞게 처리
      if (response.data.posts && Array.isArray(response.data.posts)) {
        setPosts(response.data.posts);
        setContentViewStats(response.data.contentViewStats || {});
        setPagination({
          page: response.data.currentPage || page,
          limit: pagination.limit,
          total: response.data.totalPosts || 0,
          totalPages: response.data.totalPages || 1,
        });
      } else {
        setPosts([]);
        setContentViewStats({});
        setPagination({
          page,
          limit: pagination.limit,
          total: 0,
          totalPages: 1,
        });
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

  // 선택된 게시물 일괄 삭제
  const handleDeleteSelected = async () => {
    if (selectedPosts.length === 0) {
      alert("삭제할 게시물을 선택해주세요.");
      return;
    }

    if (!window.confirm(`선택한 ${selectedPosts.length}개의 게시물을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      // 선택된 모든 게시물에 대해 삭제 요청 병렬 처리
      const deletePromises = selectedPosts.map((id) => axios.delete(`/post/${id}`));
      const results = await Promise.allSettled(deletePromises);

      // 성공 및 실패 건수 계산
      const successful = results.filter((result) => result.status === "fulfilled").length;

      if (successful > 0) {
        alert(`${successful}개의 게시물이 삭제되었습니다.`);
        setSelectedPosts([]); // 선택 목록 초기화
        getAllPost(pagination.page); // 목록 새로고침
      } else {
        alert("게시물 삭제에 실패했습니다.");
      }
    } catch (error: any) {
      console.error("선택 게시물 삭제 오류:", error);
      alert("게시물을 삭제하는 중 오류가 발생했습니다.");
    }
  };

  // 게시물 수정 페이지로 이동
  const handleEdit = (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // 이벤트 버블링 방지
    navigate(`/community/posts/${id}`);
  };

  // 테이블 컬럼 정의
  const columns = [
    {
      header: "제목",
      accessor: "title" as keyof Post,
      cell: (value: unknown, row: Post) => (
        <span
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          onClick={() => handleClick(row.id)}
        >
          <div className="truncate max-w-xs" title={value as string}>
            {value as string}
          </div>
        </span>
      ),
    },
    {
      header: "작성자",
      accessor: "id" as keyof Post,
      cell: (value: unknown, row: Post) =>
        row.author?.nickname || row.tempUser?.nickname || "알 수 없음",
    },
    {
      header: "작성일",
      accessor: "createdAt" as keyof Post,
      cell: (value: unknown) => new Date(value as string).toLocaleDateString(),
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
      header: "댓글/추천",
      accessor: "id" as keyof Post,
      cell: (value: unknown, row: Post) => (
        <span className="text-sm text-gray-600">
          {`${row._count?.comments || 0}/${row._count?.likes || 0}`}
        </span>
      ),
      className: "text-center",
    },
    {
      header: "인기 여부",
      accessor: "isPopular" as keyof Post,
      cell: (value: unknown, row: Post) => (
        <span
          className={`font-medium ${(value as number) === 1 ? "text-red-600" : "text-gray-900"}`}
        >
          {(value as number) === 1 ? "Y" : "N"}
        </span>
      ),
      className: "text-center",
    },
    {
      header: "관리",
      accessor: "id" as keyof Post,
      cell: (value: unknown, row: Post) => (
        <div className="flex space-x-1 justify-start">
          <ActionButton
            label="수정"
            action="edit"
            size="sm"
            onClick={(e) => handleEdit(row.id, e)}
          />
          <ActionButton
            label="삭제"
            action="delete"
            size="sm"
            onClick={(e) => handleDelete(row.id, e)}
          />
        </div>
      ),
      className: "text-left",
    },
  ];

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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">게시물 목록</h1>
        <SearchInput
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          onSearch={handleSearch}
        />
        <div className="flex space-x-2">
          <ExcelDownloadButton type="posts" variant="outline" size="sm">
            엑셀 다운로드
          </ExcelDownloadButton>
          <button
            onClick={handleDeleteSelected}
            disabled={selectedPosts.length === 0}
            className={`px-4 py-2 rounded-md transition-colors ${
              selectedPosts.length === 0
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
          >
            선택 삭제 ({selectedPosts.length})
          </button>
          <button
            onClick={() => navigate("/community/posts/new")}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            새 게시물 작성
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          columns={columns}
          data={posts}
          loading={loading}
          emptyMessage={searchValue ? "검색된 결과가 없습니다." : "게시물이 없습니다."}
          pagination={{
            currentPage: pagination.page,
            pageSize: pagination.limit,
            totalItems: pagination.total,
            onPageChange: handlePageChange,
          }}
          selectedIds={selectedPosts}
          onSelectIds={setSelectedPosts}
          rowClassName={(row) => (row.isPopular === 1 ? "bg-blue-50 hover:bg-blue-100" : "")}
        />
      </div>
    </div>
  );
};

export default PostManagement;
