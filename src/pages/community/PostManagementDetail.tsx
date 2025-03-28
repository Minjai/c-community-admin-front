import React, { useEffect, useState } from "react";
import TextEditor from "../../components/forms/TextEditor";
import { useParams, useNavigate } from "react-router-dom";
import { Post, Comment } from "@/types";
import axios from "@/api/axios";

const PostDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isNewPost = id === "new";
  const isEditMode = !isNewPost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }

    if (!content.trim()) {
      setError("내용을 입력해주세요.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isEditMode) {
        // 기존 게시물 수정
        const response = await axios.put<Post>(`/post/${id}`, {
          title,
          content,
          boardId: post?.boardId || 2, // 기본값 설정 (자유게시판)
        });

        if (response.status === 200) {
          alert("게시물이 수정되었습니다.");
          navigate("/community/posts");
        } else {
          setError("게시물 수정 중 오류가 발생했습니다.");
        }
      } else {
        // 새 게시물 작성
        const response = await axios.post<Post>("/post", {
          title,
          content,
          boardId: 2, // 기본 자유게시판으로 설정
        });

        if (response.status === 201 || response.status === 200) {
          alert("게시물이 작성되었습니다.");
          navigate("/community/posts");
        } else {
          setError("게시물 작성 중 오류가 발생했습니다.");
        }
      }
    } catch (error: any) {
      console.error("게시물 저장 오류:", error);

      // 인증 오류 처리
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError("권한이 없습니다. 로그인이 필요합니다.");
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      } else {
        setError(
          "게시물을 저장하는 중 오류가 발생했습니다: " +
            (error.response?.data?.error || "알 수 없는 오류")
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const getPostDetail = async () => {
    if (isNewPost) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [postResponse, commentsResponse] = await Promise.all([
        axios.get<Post>(`/post/${id}`),
        axios.get<Comment[]>(`/comment/${id}`)
      ]);

      if (postResponse.data) {
        const postData = postResponse.data;
        setPost(postData);
        setTitle(postData.title);
        setContent(postData.content);
      } else {
        setError("게시물을 찾을 수 없습니다.");
        console.error("게시물 조회 실패: 데이터 없음");
      }

      if (commentsResponse.data) {
        setComments(commentsResponse.data);
      }
    } catch (error) {
      console.error("게시물/댓글 조회 오류:", error);
      setError("게시물을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 댓글 삭제 함수
  const handleDeleteComment = async (commentId: number) => {
    if (!window.confirm("정말 이 댓글을 삭제하시겠습니까?")) {
      return;
    }

    try {
      const response = await axios.delete(`/comment/${commentId}`);
      if (response.status === 200 || response.status === 204) {
        alert("댓글이 삭제되었습니다.");
        getPostDetail();
      } else {
        alert("댓글 삭제에 실패했습니다.");
      }
    } catch (error: any) {
      console.error("댓글 삭제 오류:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        alert("권한이 없습니다. 로그인이 필요합니다.");
        navigate("/login");
      } else {
        alert(
          "댓글을 삭제하는 중 오류가 발생했습니다: " +
            (error.response?.data?.error || "알 수 없는 오류")
        );
      }
    }
  };

  useEffect(() => {
    getPostDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">게시물 정보를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{isNewPost ? "새 게시물 작성" : "게시물 수정"}</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            제목
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">내용</label>
          <div className="min-h-[400px] border border-gray-300 rounded-md">
            <TextEditor content={content} setContent={setContent} />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate("/community/posts")}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>

      {/* 댓글 목록 */}
      {!isNewPost && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">댓글 목록</h2>
          <div className="space-y-4">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-900">{comment.content}</p>
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <span>{comment.author?.nickname || "알 수 없음"}</span>
                        <span className="mx-2">•</span>
                        <span>{new Date(comment.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">등록된 댓글이 없습니다.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PostDetail;
