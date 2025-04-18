import React, { useEffect, useState, useRef } from "react";
import TextEditor from "../../components/forms/TextEditor";
import { useParams, useNavigate } from "react-router-dom";
import { Post, Comment } from "@/types";
import axios from "@/api/axios";
import { AxiosProgressEvent } from "axios";
import Alert from "@/components/Alert";
import Button from "@/components/Button";

// replaceAsync 유틸리티 함수 추가
const replaceAsync = async (
  str: string,
  regex: RegExp,
  asyncFn: (match: string, ...args: any[]) => Promise<string>
): Promise<string> => {
  // 입력 문자열 검증
  if (!str || typeof str !== "string") {
    console.warn("Invalid string provided to replaceAsync:", str);
    return str || "";
  }

  const promises: Promise<string>[] = [];

  // 정규식 매치 처리
  str.replace(regex, (match, ...args) => {
    // match가 유효한지 확인
    if (!match) {
      console.warn("Invalid match in replaceAsync");
      return match;
    }

    try {
      const promise = asyncFn(match, ...args);
      promises.push(promise);
    } catch (error) {
      console.error("Error in asyncFn:", error);
      promises.push(Promise.resolve(match));
    }

    return match; // 이 반환값은 실제로 사용되지 않음
  });

  // 모든 프로미스 처리
  let replacementData: string[] = [];
  try {
    replacementData = await Promise.all(promises);
  } catch (error) {
    console.error("Error in Promise.all:", error);
    // 오류 발생 시 원본 반환
    return str;
  }

  // 결과 문자열 생성
  try {
    return str.replace(regex, () => {
      const replacement = replacementData.shift();
      return replacement !== undefined ? replacement : "";
    });
  } catch (error) {
    console.error("Error in final replace:", error);
    return str;
  }
};

// S3에 이미지 업로드 함수
const uploadBase64ImageToS3 = async (
  base64Data: string,
  userId: number,
  folder: string,
  postId: number
): Promise<string> => {
  try {
    // 이미지 크기 확인
    const sizeInBytes = Math.ceil((base64Data.length * 3) / 4);
    const sizeInMB = sizeInBytes / (1024 * 1024);

    console.log(`이미지 업로드 시도: 크기 약 ${sizeInMB.toFixed(2)}MB`);

    // 크기 제한 (8MB)
    if (sizeInMB > 8) {
      console.warn(
        `이미지 크기가 ${sizeInMB.toFixed(
          2
        )}MB로 제한(8MB)을 초과합니다. 업로드가 실패할 수 있습니다.`
      );
    }

    // 대용량 이미지는 청크로 나누어 처리
    if (sizeInMB > 4) {
      console.log("대용량 이미지 감지. FormData를 사용한 업로드를 권장합니다.");
    }

    // 이미지 업로드는 게시물 저장 시 함께 처리될 예정이므로 여기서는 가짜 응답을 반환
    // 실제 구현에서는 이 함수 호출이 필요 없을 수 있음
    console.log("이미지 데이터 준비 완료, 게시물 저장 시 함께 전송됩니다.");
    return `temp_image_url_${Date.now()}.jpg`;
  } catch (error: any) {
    console.error("이미지 처리 오류:", error);
    if (error.response) {
      console.error("서버 응답:", error.response.status, error.response.data);
    }

    if (error.response?.status === 413) {
      throw new Error("이미지 크기가 너무 큽니다. 8MB 이하의 이미지를 사용해주세요.");
    }

    throw error;
  }
};

interface Response {
  success: boolean;
  data?: {
    id: number;
    title: string;
    content: string;
    // 다른 필요한 속성들
  };
  imageUrl?: string;
  error?: string;
}

const PostDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // 업로드 진행 상태
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const isNewPost = id === "new";
  const isEditMode = !isNewPost;

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    setError(null);

    try {
      // 폼 유효성 검사
      const trimmedTitle = title.trim();
      if (trimmedTitle.length === 0) {
        setError("제목을 입력해주세요.");
        return;
      }

      if (content.length <= 20) {
        setError("내용은 최소 20자 이상 입력해주세요.");
        return;
      }

      // 에디터 내용 분석
      const contentAnalysis = analyzeContent(content);

      // **이미지와 콘텐츠를 함께 저장하는 새로운 접근법**
      console.log("서버 API 명세에 맞춰 이미지와 게시물을 함께 전송합니다.");

      // 서버측 요구사항에 맞게 요청 형식 변경
      const formData = new FormData();
      formData.append("title", trimmedTitle);
      formData.append("content", content);
      formData.append("boardId", "2");
      formData.append("isPublic", "1");

      // 이미지 파일 추가 (에디터에서 감지된 이미지)
      if (contentAnalysis.imgSources.length > 0) {
        let imageCount = 0;

        // 이미지 소스를 파일로 변환하여 추가
        for (const imgSrc of contentAnalysis.imgSources) {
          if (imgSrc.startsWith("data:image/")) {
            const file = base64ToFile(imgSrc);
            if (file) {
              formData.append("images", file);
              imageCount++;
              console.log(
                `Base64 이미지를 File로 변환하여 추가: ${file.name} (${file.size} bytes)`
              );
            }
          }
        }

        console.log(`총 ${imageCount}개의 이미지가 FormData에 추가됨`);
      } else {
        console.log("이미지가 감지되지 않았습니다.");
      }

      // 진행률 설정
      setUploadProgress(30);

      console.log("FormData 준비 완료");

      const response = await axios({
        method: isEditMode ? "PUT" : "POST",
        url: isEditMode ? `/admin/post/${id}` : "/admin/post",
        data: formData,
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          const total = progressEvent.total || 0;
          const progress = total ? Math.round((progressEvent.loaded * 100) / total) : 0;
          console.log(`업로드 진행률: ${progress}%`);
          setUploadProgress(30 + progress * 0.7); // 30%~100% 구간으로 설정
        },
      });

      if (response.data && (response.data.success || response.data.post)) {
        console.log("게시물 저장 성공:", response.data);
        setLoading(false);
        alert(isEditMode ? "게시물이 수정되었습니다." : "게시물이 작성되었습니다.");
        navigate("/community/posts");
      } else {
        console.error("게시물 저장 실패:", response.data);
        setError(
          response.data?.message ||
            (isEditMode ? "수정 중 오류가 발생했습니다." : "등록 중 오류가 발생했습니다.")
        );
      }
    } catch (error: any) {
      console.error("처리 중 오류 발생:", error);
      setError("게시물 처리 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
      setUploadProgress(0);
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

  // 데이터 분석 및 콘텐츠 내 이미지 처리
  const analyzeContent = (content: string) => {
    console.log("전체 에디터 내용:", content);

    // 에디터 내용 샘플 출력 (기본값)
    const contentSample = content;
    console.log("에디터 내용 샘플:", contentSample);

    // 이미지 태그 추출 (정규식)
    const imgTags = content.match(/<img[^>]+>/g) || [];
    console.log("에디터의 모든 이미지 태그:", imgTags.length ? imgTags : "이미지 태그 없음");

    // 이미지 소스 추출
    const imgSources: string[] = [];
    imgTags.forEach((tag) => {
      const srcMatch = tag.match(/src=["']([^"']+)["']/);
      if (srcMatch && srcMatch[1]) {
        imgSources.push(srcMatch[1]);
      }
    });

    // 이미지 태그 수와 추출된 이미지 소스 수가 일치하는지 확인
    console.log(
      `이미지 태그 개수: ${imgTags.length}, 추출된 이미지 소스 개수: ${imgSources.length}`
    );
    if (imgSources.length > 0) {
      // 첫 번째와 마지막 이미지 소스 미리보기
      console.log("첫 번째 이미지 소스:", imgSources[0].substring(0, 50) + "...");
      if (imgSources.length > 1) {
        console.log(
          "마지막 이미지 소스:",
          imgSources[imgSources.length - 1].substring(0, 50) + "..."
        );
      }
    }

    // 이미지 감지 여부
    const hasImgTag = imgTags.length > 0;
    const hasBase64Image = content.includes("data:image/");
    const hasEmbeddedImage = imgSources.some((src) => src.startsWith("data:image/"));
    const hasQuillImage = content.includes('class="ql-image"');
    const hasGifImage = content.toLowerCase().includes(".gif") || content.includes("image/gif");

    console.log("폼 제출 전 내용 분석:", {
      hasImgTag,
      hasBase64Image,
      hasEmbeddedImage,
      hasQuillImage,
      hasGifImage,
      imgTagCount: imgTags.length,
      imgSourceCount: imgSources.length,
    });

    return {
      imgTags,
      imgSources,
      hasImage: hasImgTag || hasBase64Image || hasEmbeddedImage || hasQuillImage,
      hasBase64Images: hasBase64Image || hasEmbeddedImage,
    };
  };

  // base64 이미지를 File 객체로 변환하는 함수
  const base64ToFile = (base64String: string): File | null => {
    try {
      // Base64 데이터에서 파일로 변환
      const parts = base64String.split(",");
      if (parts.length !== 2) {
        console.error("잘못된 base64 형식:", base64String.substring(0, 30) + "...");
        return null;
      }

      const mimeMatch = parts[0].match(/:(.*?);/);
      if (!mimeMatch || !mimeMatch[1]) {
        console.error("MIME 타입을 찾을 수 없음");
        return null;
      }

      const mime = mimeMatch[1];
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);

      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }

      const blob = new Blob([u8arr], { type: mime });
      const extension = mime.split("/")[1] || "png";
      const fileName = `image-${new Date().getTime()}-${Math.floor(
        Math.random() * 1000
      )}.${extension}`;
      return new File([blob], fileName, { type: mime });
    } catch (error) {
      console.error("Base64 이미지 변환 오류:", error);
      return null;
    }
  };

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
      <h1 className="text-3xl font-bold mb-6">{isNewPost ? "새 게시물 작성" : "게시물 수정"}</h1>

      {/* Error Alert Area */}
      {error && (
        <div className="mb-4">
          <Alert type="error" message={error} onClose={() => setError(null)} />
        </div>
      )}

      {/* Top Control Area */}
      <div className="flex justify-start items-center mb-4 pb-4 border-b border-gray-200 space-x-2">
        {/* Buttons on the left, Edit/Register first, then Cancel */}
        <Button
          variant="primary"
          onClick={() => handleSubmit()} // Trigger submit handler directly
          disabled={saving}
        >
          {saving ? `저장 중... (${uploadProgress.toFixed(0)}%)` : isEditMode ? "수정" : "등록"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => navigate(-1)} // Go back
          disabled={saving}
        >
          취소
        </Button>
      </div>

      {/* Title Input */}
      <div className="mb-4">
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          제목
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="제목을 입력하세요"
          disabled={saving}
        />
      </div>

      {/* Text Editor */}
      <div ref={editorContainerRef} className="mb-6">
        <TextEditor content={content} setContent={setContent} height="400px" />
      </div>

      {/* Comments Section (only in edit mode) */}
      {isEditMode && post && (
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-4">댓글 ({comments.length})</h2>
          {/* Add comment form */}
          <form onSubmit={handleAddComment} className="mb-6">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="댓글을 입력하세요..."
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-md mb-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
            <div className="text-right">
              <Button type="submit" variant="primary" size="sm">
                댓글 등록
              </Button>
            </div>
          </form>

          {/* Comments list */}
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-gray-50 p-4 rounded-lg shadow-sm">
                {editingCommentId === comment.id ? (
                  // Editing Comment
                  <div>
                    <textarea
                      value={editCommentContent}
                      onChange={(e) => setEditCommentContent(e.target.value)}
                      rows={3}
                      className="w-full p-2 border border-gray-300 rounded-md mb-2"
                      required
                    />
                    <div className="flex justify-end space-x-2">
                      <Button variant="secondary" size="sm" onClick={cancelEditComment}>
                        취소
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleUpdateComment(comment.id)}
                      >
                        저장
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Displaying Comment
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm text-gray-800">
                        {comment.authorName || comment.User?.nickname || "익명"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm mb-2 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                    {/* Add Edit/Delete buttons if user has permission */}
                    <div className="text-right space-x-2">
                      <button
                        onClick={() => startEditComment(comment)}
                        className="text-xs text-blue-500 hover:underline"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {comments.length === 0 && <p className="text-center text-gray-500">댓글이 없습니다.</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default PostDetail;
