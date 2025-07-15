import React, { useState, useEffect, ReactNode } from "react";
import { useNavigation } from "@/services/NavigationService";
// import { getPosts, getBoards } from "@/api"; // Remove non-existent functions import
import axios from "@/api/axios";
import DataTable, { TableProps } from "@/components/DataTable";
import Button from "@/components/Button";
import ActionButton from "@/components/ActionButton";
import Modal from "@/components/Modal";
import Input from "@/components/forms/Input";
import Select from "@/components/forms/Select";
import Alert from "@/components/Alert";
import SearchInput from "@/components/SearchInput";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import type { Post, Board } from "@/types";

// Define column type based on DataTable.tsx
interface PostColumnDef {
  header: string;
  accessor: keyof Post;
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

const PostManagementPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [contentViewStats, setContentViewStats] = useState<ContentViewStats>({});
  const [totalPosts, setTotalPosts] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedBoard, setSelectedBoard] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [currentPost, setCurrentPost] = useState<Post | null>(null);
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

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

  // 게시판 목록 조회
  const fetchBoards = async () => {
    try {
      const response = await axios.get("/boards");
      if (response.data && Array.isArray(response.data.data)) {
        setBoards(response.data.data);
      } else if (Array.isArray(response.data)) {
        setBoards(response.data);
      } else {
        console.error("Invalid format for boards data:", response.data);
        setBoards([]);
      }
    } catch (err) {
      console.error("Error fetching boards:", err);
      setError("게시판 목록을 불러오는데 실패했습니다.");
    }
  };

  // 게시물 목록 조회 (검색 파라미터 추가)
  const fetchPosts = async (searchValue: string = "") => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {
        page: currentPage,
        pageSize: pageSize,
        boardId: selectedBoard,
      };

      if (searchValue.trim()) {
        params.search = searchValue;
      }

      const response = await axios.get("/admin/post", { params });

      // 새로운 API 응답 구조에 맞게 처리
      if (response.data.posts && Array.isArray(response.data.posts)) {
        setPosts(response.data.posts);
        setContentViewStats(response.data.contentViewStats || {});
        setTotalPosts(response.data.totalPosts || 0);
      } else {
        setPosts([]);
        setContentViewStats({});
        setTotalPosts(0);
      }
    } catch (err) {
      setError("게시물 목록을 불러오는 중 오류가 발생했습니다.");
      console.error("Error fetching posts:", err);
      setPosts([]);
      setContentViewStats({});
      setTotalPosts(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  useEffect(() => {
    fetchPosts(searchValue);
  }, [currentPage, pageSize, selectedBoard, searchValue]);

  // 게시물 상세 정보 모달 열기
  const handleViewPost = (post: Post) => {
    setCurrentPost({ ...post });
    setShowModal(true);
  };

  // 게시물 삭제
  const handleDeletePost = async (id: number) => {
    if (!window.confirm("정말로 이 게시물을 삭제하시겠습니까?")) return;

    try {
      setLoading(true);
      setAlertMessage(null);
      await axios.delete(`/post/${id}`);
      setAlertMessage({ type: "success", message: "게시물이 성공적으로 삭제되었습니다." });
      await fetchPosts();
    } catch (err) {
      setAlertMessage({ type: "error", message: "게시물 삭제 중 오류가 발생했습니다." });
      console.error("Error deleting post:", err);
    } finally {
      setLoading(false);
    }
  };

  // 페이지 변경 처리
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 페이지 크기 변경 처리
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // 게시판 필터 변경 처리
  const handleBoardChange = (boardId: string) => {
    setSelectedBoard(boardId === "all" ? undefined : parseInt(boardId));
    setCurrentPage(1);
  };

  // 검색 핸들러
  const handleSearch = (value: string) => {
    fetchPosts(value);
  };

  // 테이블 컬럼 정의 (Use PostColumnDef and correct accessors)
  const columns: PostColumnDef[] = [
    { header: "ID", accessor: "id" },
    {
      header: "게시판",
      accessor: "boardId",
      cell: (value: number) => {
        const board = boards.find((b) => b.id === value);
        return board ? board.name : "-";
      },
    },
    { header: "제목", accessor: "title" },
    {
      header: "작성자",
      accessor: "authorId",
      cell: (value: any, row: Post) => row.author?.nickname || "-",
    },
    {
      header: "조회",
      accessor: "id",
      cell: (value: unknown, row: Post) => (
        <span className="text-sm text-gray-600">{formatViewCount(row.id)}</span>
      ),
      className: "text-center",
    },
    {
      header: "댓글/추천",
      accessor: "id",
      cell: (value: unknown, row: Post) => (
        <span className="text-sm text-gray-600">
          {`${row._count?.comments || 0}/${row._count?.likes || 0}`}
        </span>
      ),
      className: "text-center",
    },
    {
      header: "인기 여부",
      accessor: "isPopular",
      cell: (value: number) => (
        <span className={`font-medium ${value === 1 ? "text-red-600" : "text-gray-900"}`}>
          {value === 1 ? "Y" : "N"}
        </span>
      ),
      className: "text-center",
    },
    {
      header: "작성일",
      accessor: "createdAt",
      cell: (value: string) => (value ? new Date(value).toLocaleDateString() : "-"),
    },
    {
      header: "관리",
      accessor: "id",
      cell: (value: any, row: Post, index?: number) => (
        <div className="flex space-x-1 justify-start">
          <ActionButton
            label="위로"
            action="up"
            size="sm"
            onClick={() => {
              /* No action */
            }}
            disabled={true}
          />
          <ActionButton
            label="아래로"
            action="down"
            size="sm"
            onClick={() => {
              /* No action */
            }}
            disabled={true}
          />
          <ActionButton label="수정" action="edit" size="sm" onClick={() => handleViewPost(row)} />
          <ActionButton
            label="삭제"
            action="delete"
            size="sm"
            onClick={() => handleDeletePost(row.id)}
          />
        </div>
      ),
      className: "text-left",
    },
  ];

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
          <Select
            value={selectedBoard ? selectedBoard.toString() : "all"}
            onChange={(e) => handleBoardChange(e.target.value)}
            options={[
              { value: "all", label: "전체 게시판" },
              ...boards.map((board) => ({ value: board.id.toString(), label: board.name })),
            ]}
            className="w-40"
          />
          <Select
            value={pageSize.toString()}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            options={[
              { value: "10", label: "10개씩 보기" },
              { value: "20", label: "20개씩 보기" },
              { value: "50", label: "50개씩 보기" },
            ]}
            className="w-32"
          />
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

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          columns={columns}
          data={posts}
          loading={loading}
          emptyMessage={searchValue ? "검색된 결과가 없습니다." : "등록된 게시물이 없습니다."}
          pagination={{
            currentPage,
            pageSize,
            totalItems: totalPosts,
            onPageChange: handlePageChange,
          }}
          rowClassName={(row) => (row.isPopular === 1 ? "bg-blue-50 hover:bg-blue-100" : "")}
        />
      </div>

      {/* 게시물 상세 모달 */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="게시물 상세 정보"
        size="lg"
      >
        {currentPost && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="게시판"
                value={boards.find((b) => b.id === currentPost.boardId)?.name || "-"}
                disabled
              />

              <Input label="작성자" value={currentPost.author?.nickname || "-"} disabled />
            </div>

            <Input label="제목" value={currentPost.title || ""} disabled />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">내용</label>
              <div className="p-3 bg-gray-50 rounded-md border border-gray-300 min-h-[200px] whitespace-pre-wrap">
                {currentPost.content || ""}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="조회수"
                value={(() => {
                  const stats = contentViewStats[currentPost.id?.toString() || ""];
                  if (!stats) return "0";
                  const total = stats.totalViews;
                  const loggedIn = stats.loggedInUsers;
                  return loggedIn === 0 ? total.toString() : `${total}(${loggedIn})`;
                })()}
                disabled
              />

              <Input
                label="인기글 여부"
                value={currentPost.isPopular ? "인기글" : "일반글"}
                disabled
              />

              <Input
                label="작성일"
                value={
                  currentPost.createdAt ? new Date(currentPost.createdAt).toLocaleString() : "-"
                }
                disabled
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                닫기
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setShowModal(false);
                  if (currentPost.id) handleDeletePost(currentPost.id);
                }}
              >
                삭제
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PostManagementPage;
