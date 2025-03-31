import React, { useEffect, useState, useRef } from "react";
import TextEditor from "../../components/forms/TextEditor";
import { useParams, useNavigate } from "react-router-dom";
import { Post, Comment } from "@/types";
import axios from "@/api/axios";

const PostDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
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
          tags: tags || undefined,
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
          tags: tags || undefined,
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
      // API 응답 처리를 위한 로그 추가
      console.log(`게시물 데이터 요청 중: /post/${id}`);
      console.log(`댓글 데이터 요청 중: /comment/${id}`);

      const [postResponse, commentsResponse] = await Promise.all([
        axios.get(`/post/${id}`),
        axios.get(`/comment/${id}`),
      ]);

      console.log("게시물 API 응답:", postResponse.data);
      console.log("댓글 API 응답:", commentsResponse.data);

      // 게시물 데이터 처리: 다양한 응답 형식 지원
      let postData = null;
      if (postResponse.data) {
        // 직접 데이터 객체인 경우
        if (postResponse.data.id && postResponse.data.title) {
          postData = postResponse.data;
        }
        // success/data 형식인 경우
        else if (postResponse.data.success && postResponse.data.data) {
          postData = postResponse.data.data;
        }
        // result 필드에 데이터가 있는 경우
        else if (postResponse.data.result) {
          postData = postResponse.data.result;
        }
        // post 필드에 데이터가 있는 경우
        else if (postResponse.data.post) {
          postData = postResponse.data.post;
        }
      }

      if (postData) {
        setPost(postData);
        setTitle(postData.title || "");

        // 태그 설정
        if (postData.tags) {
          setTags(typeof postData.tags === "string" ? postData.tags : "");
        }

        // 안전하게 content 설정 - 비동기 처리
        setTimeout(() => {
          setContent(postData.content || "");
        }, 0);
      } else {
        setError("게시물을 찾을 수 없습니다.");
        console.error("게시물 조회 실패: 데이터 없음");
      }

      // 댓글 데이터 처리: 다양한 응답 형식 지원
      let commentsData: Comment[] = [];
      if (commentsResponse.data) {
        // 직접 배열인 경우
        if (Array.isArray(commentsResponse.data)) {
          commentsData = commentsResponse.data;
        }
        // success/data 형식인 경우
        else if (commentsResponse.data.success && Array.isArray(commentsResponse.data.data)) {
          commentsData = commentsResponse.data.data;
        }
        // result 필드에 배열이 있는 경우
        else if (commentsResponse.data.result && Array.isArray(commentsResponse.data.result)) {
          commentsData = commentsResponse.data.result;
        }
        // comments 필드에 배열이 있는 경우
        else if (commentsResponse.data.comments && Array.isArray(commentsResponse.data.comments)) {
          commentsData = commentsResponse.data.comments;
        }
        // 응답에 있는 모든 배열 속성 검색
        else {
          for (const key in commentsResponse.data) {
            if (Array.isArray(commentsResponse.data[key])) {
              commentsData = commentsResponse.data[key];
              console.log(`댓글 데이터를 '${key}' 필드에서 찾음:`, commentsData);
              break;
            }
          }
        }
      }

      // 댓글 데이터 유효성 검사 및 처리
      commentsData = commentsData.map((comment: any) => {
        // 필수 필드 확인
        if (!comment.id) {
          console.warn("경고: 댓글에 ID가 없습니다", comment);
        }
        if (!comment.content) {
          console.warn("경고: 댓글에 내용이 없습니다", comment);
        }

        return {
          id: comment.id,
          content: comment.content || "",
          author: comment.author || { nickname: "알 수 없음" },
          createdAt: comment.createdAt || new Date().toISOString(),
          updatedAt: comment.updatedAt || new Date().toISOString(),
          postId: comment.postId || Number(id),
          ...comment,
        };
      });

      setComments(commentsData);
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
      console.log(`댓글 삭제 요청: /comment/${commentId}`);
      const response = await axios.delete(`/comment/${commentId}`);
      console.log("댓글 삭제 응답:", response.data);

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

  // 댓글 추가 함수
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim()) {
      alert("댓글 내용을 입력해주세요.");
      return;
    }

    try {
      console.log(`댓글 추가 요청: /comment/${id}`);
      const response = await axios.post(`/comment`, {
        content: newComment,
        postId: Number(id),
      });

      console.log("댓글 추가 응답:", response.data);

      if (response.status === 201 || response.status === 200) {
        alert("댓글이 추가되었습니다.");
        setNewComment("");
        getPostDetail(); // 댓글 목록 새로고침
      } else {
        alert("댓글 추가에 실패했습니다.");
      }
    } catch (error: any) {
      console.error("댓글 추가 오류:", error);
      alert(
        "댓글을 추가하는 중 오류가 발생했습니다: " +
          (error.response?.data?.error || "알 수 없는 오류")
      );
    }
  };

  // 댓글 수정 시작
  const startEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditCommentContent(comment.content);
  };

  // 댓글 수정 취소
  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditCommentContent("");
  };

  // 댓글 수정 저장
  const handleUpdateComment = async (commentId: number) => {
    if (!editCommentContent.trim()) {
      alert("댓글 내용을 입력해주세요.");
      return;
    }

    try {
      console.log(`댓글 수정 요청: /comment/${commentId}`);
      const response = await axios.put(`/comment/${commentId}`, {
        content: editCommentContent,
      });

      console.log("댓글 수정 응답:", response.data);

      if (response.status === 200) {
        alert("댓글이 수정되었습니다.");
        setEditingCommentId(null);
        setEditCommentContent("");
        getPostDetail(); // 댓글 목록 새로고침
      } else {
        alert("댓글 수정에 실패했습니다.");
      }
    } catch (error: any) {
      console.error("댓글 수정 오류:", error);
      alert(
        "댓글을 수정하는 중 오류가 발생했습니다: " +
          (error.response?.data?.error || "알 수 없는 오류")
      );
    }
  };

  useEffect(() => {
    getPostDetail();
  }, [id]);

  // 에디터 컨테이너 참조가 변경되면 스크롤을 최상단으로 이동
  useEffect(() => {
    if (editorContainerRef.current) {
      editorContainerRef.current.scrollIntoView({ behavior: "auto", block: "nearest" });
    }
  }, [editorContainerRef.current]);

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

        <div ref={editorContainerRef}>
          <label className="block text-sm font-medium text-gray-700 mb-2">내용</label>
          <div className="min-h-[400px] border border-gray-300 rounded-md">
            <TextEditor content={content} setContent={setContent} />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            이미지는 에디터에 직접 드래그 앤 드롭하여 첨부할 수 있습니다.
          </p>
        </div>

        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
            태그
          </label>
          <input
            type="text"
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="태그는 쉼표(,)로 구분하여 입력해주세요"
            className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">예시: 자유게시판,질문,정보</p>
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

          {/* 댓글 추가 폼 */}
          <form onSubmit={handleAddComment} className="mb-6">
            <div className="flex flex-col space-y-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="댓글을 입력하세요"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                rows={3}
              ></textarea>
              <button
                type="submit"
                className="self-end px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                댓글 추가
              </button>
            </div>
          </form>

          <div className="space-y-4">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
                >
                  {editingCommentId === comment.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editCommentContent}
                        onChange={(e) => setEditCommentContent(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        rows={2}
                      ></textarea>
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => cancelEditComment()}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
                        >
                          취소
                        </button>
                        <button
                          onClick={() => handleUpdateComment(comment.id)}
                          className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                          저장
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-900">{comment.content}</p>
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <span>{comment.author?.nickname || "알 수 없음"}</span>
                          <span className="mx-2">•</span>
                          <span>{new Date(comment.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startEditComment(comment)}
                          className="text-sm text-blue-500 hover:text-blue-700"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-sm text-red-500 hover:text-red-700"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  )}
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
