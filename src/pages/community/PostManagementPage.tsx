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
import type { Post, Board } from "@/types";

// Define column type based on DataTable.tsx
interface PostColumnDef {
  header: string;
  accessor: keyof Post | ((item: Post) => ReactNode);
  cell?: (value: any, row: Post, index?: number) => React.ReactNode;
  className?: string;
}

const PostManagementPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
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

  // 게시물 목록 조회
  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get("/post", {
        params: {
          page: currentPage,
          pageSize: pageSize,
          boardId: selectedBoard,
        },
      });

      if (response.data && response.data.posts && Array.isArray(response.data.posts)) {
        setPosts(response.data.posts);
        setTotalPosts(response.data.totalPosts || response.data.total || 0);
      } else {
        console.error("Invalid format for posts data:", response.data);
        setPosts([]);
        setTotalPosts(0);
      }
    } catch (err) {
      setError("게시물 목록을 불러오는 중 오류가 발생했습니다.");
      console.error("Error fetching posts:", err);
      setPosts([]);
      setTotalPosts(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [currentPage, pageSize, selectedBoard]);

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
      accessor: (item: Post) => item.author?.nickname || "-",
      cell: (value: string) => value,
    },
    { header: "조회수", accessor: "viewCount" },
    {
      header: "인기글",
      accessor: "isPopular",
      cell: (value: number) => (
        <span
          className={`px-2 py-1 rounded-full text-xs ${
            value ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"
          }`}
        >
          {value ? "인기" : "일반"}
        </span>
      ),
    },
    {
      header: "작성일",
      accessor: "createdAt",
      cell: (value: string) => (value ? new Date(value).toLocaleDateString() : "-"),
    },
    {
      header: "관리",
      accessor: (item: Post) => item.id,
      cell: (value: any, row: Post, index?: number) => (
        <div className="flex space-x-1">
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
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6 px-4 py-3 bg-white border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-800">게시물 관리</h1>
        <div className="flex items-center space-x-2">
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

      <DataTable
        columns={columns}
        data={posts}
        loading={loading}
        emptyMessage="등록된 게시물이 없습니다."
        pagination={{
          currentPage,
          pageSize,
          totalItems: totalPosts,
          onPageChange: handlePageChange,
        }}
      />

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
              <Input label="조회수" value={currentPost.viewCount?.toString() || "0"} disabled />

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
