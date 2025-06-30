import React, { useEffect, useState, useRef } from "react";
import TextEditor from "../../components/forms/TextEditor";
import { useParams, useNavigate } from "react-router-dom";
import { Post, Comment } from "@/types";
import axios from "@/api/axios";
import { AxiosProgressEvent } from "axios";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import { formatDate } from "@/utils/dateUtils";
import FileUpload from "@/components/forms/FileUpload";

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

// 사용자 등급 타입 정의
interface UserRank {
  id: number;
  rankName: string;
  image: string;
  score: number;
}

// tempUser 타입 정의
interface TempUser {
  nickname: string;
  profileImageUrl: string;
  rank: string;
  title: string;
  content: string;
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
  const [isPopular, setIsPopular] = useState<number>(0); // isPublic -> isPopular, 기본값 0
  const [isPublic, setIsPublic] = useState<number>(1); // 공개 상태 추가, 기본값 1
  const isNewPost = id === "new";
  const isEditMode = !isNewPost;

  // tempUser 관련 상태 추가
  const [tempUser, setTempUser] = useState<TempUser>({
    nickname: "",
    profileImageUrl: "",
    rank: "",
    title: "",
    content: "",
  });
  const [userRanks, setUserRanks] = useState<UserRank[]>([]);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);

  // 댓글 작성 관련 상태 추가
  const [commentTempUser, setCommentTempUser] = useState({
    nickname: "",
    rank: "",
    profileImageFile: null as File | null,
  });
  const [commentContent, setCommentContent] = useState("");

  // 사용자 등급 목록 조회
  const fetchUserRanks = async () => {
    try {
      const response = await axios.get("/admin/ranks");
      if (response.data && response.data.ranks && Array.isArray(response.data.ranks)) {
        setUserRanks(response.data.ranks);
      } else if (Array.isArray(response.data)) {
        setUserRanks(response.data);
      } else {
        setUserRanks([]);
      }
    } catch (err) {
      console.error("Error fetching user ranks:", err);
      setUserRanks([]);
    }
  };

  // tempUser 정보 업데이트
  const handleTempUserChange = (field: keyof TempUser, value: string) => {
    setTempUser((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 댓글 tempUser 정보 업데이트
  const handleCommentTempUserChange = (field: string, value: string) => {
    setCommentTempUser((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 프로필 이미지 파일 변경 처리
  const handleProfileImageChange = (file: File | null) => {
    setProfileImageFile(file);
  };

  // 댓글 프로필 이미지 파일 변경 처리
  const handleCommentProfileImageChange = (file: File | null) => {
    setCommentTempUser((prev) => ({
      ...prev,
      profileImageFile: file,
    }));
  };

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

      // 에디터 내용 분석
      const contentAnalysis = analyzeContent(content);

      // 서버측 요구사항에 맞게 요청 형식 변경
      const formData = new FormData();
      formData.append("title", trimmedTitle);
      formData.append("content", content);
      formData.append("boardId", post?.boardId?.toString() || "2");
      formData.append("isPopular", isPopular.toString());
      formData.append("isPublic", isPublic.toString());

      // tempUser 정보가 있는 경우
      if (tempUser.nickname.trim()) {
        formData.append("tempUserNickname", tempUser.nickname.trim());
        formData.append("tempUserRank", tempUser.rank);
        formData.append("tempUserTitle", tempUser.title);
        formData.append("tempUserContent", tempUser.content);

        // 프로필 이미지 파일이 있으면 추가
        if (profileImageFile) {
          formData.append("images", profileImageFile);
        }
      }

      // 에디터에서 감지된 이미지들 추가
      if (contentAnalysis.imgSources.length > 0) {
        for (const imgSrc of contentAnalysis.imgSources) {
          if (imgSrc.startsWith("data:image/")) {
            const file = base64ToFile(imgSrc);
            if (file) {
              formData.append("images", file);
            }
          }
        }
      }

      // 진행률 설정
      setUploadProgress(30);

      const response = await axios({
        method: isEditMode ? "PUT" : "POST",
        url: isEditMode ? `/admin/post/${id}` : "/admin/post",
        data: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        },
      });

      if (response.status === 200 || response.status === 201) {
        alert(isEditMode ? "게시물이 수정되었습니다." : "게시물이 등록되었습니다.");
        navigate("/community/posts");
      } else {
        setError("게시물 저장에 실패했습니다.");
      }
    } catch (error: any) {
      console.error("게시물 저장 오류:", error);
      setError(
        "게시물을 저장하는 중 오류가 발생했습니다: " +
          (error.response?.data?.error || "알 수 없는 오류")
      );
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  const getPostDetail = async () => {
    if (isNewPost) {
      setLoading(false);
      setIsPopular(0);
      setIsPublic(1);
      return;
    }

    setLoading(true);
    try {
      const [postResponse, commentsResponse] = await Promise.all([
        axios.get(`/post/${id}`),
        axios.get(`/comment/${id}`),
      ]);

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
        setTimeout(() => {
          setContent(postData.content || "");
        }, 0);
        const popularStatusFromServer = postData.isPopular;
        const newIsPopularState = popularStatusFromServer === 1 ? 1 : 0;
        setIsPopular(newIsPopularState);

        const publicStatusFromServer = postData.isPublic;
        const newIsPublicState =
          publicStatusFromServer === 1 || publicStatusFromServer === true ? 1 : 0;
        setIsPublic(newIsPublicState);
      } else {
        setError("게시물을 찾을 수 없습니다.");
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

  // 댓글 등록 처리
  const handleCommentSubmit = async () => {
    if (!commentContent.trim()) {
      alert("댓글 내용을 입력해주세요.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("content", commentContent.trim());
      formData.append("postId", id!);

      // tempUser 정보가 있는 경우
      if (commentTempUser.nickname.trim()) {
        formData.append("tempUser[nickname]", commentTempUser.nickname.trim());
        formData.append("tempUser[rank]", commentTempUser.rank);
        formData.append("tempUser[title]", "");
        formData.append("tempUser[content]", "");

        if (commentTempUser.profileImageFile) {
          formData.append("tempUserProfileImage", commentTempUser.profileImageFile);
        }
      }

      const response = await axios.post("/comment", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.status === 201 || response.status === 200) {
        alert("댓글이 등록되었습니다.");
        setCommentContent("");
        setCommentTempUser({
          nickname: "",
          rank: "",
          profileImageFile: null,
        });
        getPostDetail(); // 댓글 목록 새로고침
      } else {
        alert("댓글 등록에 실패했습니다.");
      }
    } catch (error: any) {
      console.error("댓글 등록 오류:", error);
      alert(
        "댓글을 등록하는 중 오류가 발생했습니다: " +
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
      const response = await axios.put(`/comment/${commentId}`, {
        content: editCommentContent,
      });

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
    fetchUserRanks();
  }, [id]);

  // 에디터 컨테이너 참조가 변경되면 스크롤을 최상단으로 이동
  useEffect(() => {
    if (editorContainerRef.current) {
      editorContainerRef.current.scrollIntoView({ behavior: "auto", block: "nearest" });
    }
  }, [editorContainerRef.current]);

  // 데이터 분석 및 콘텐츠 내 이미지 처리
  const analyzeContent = (content: string) => {
    // 에디터 내용 샘플 출력 (기본값)
    const sampleContent = content.substring(0, 100) + (content.length > 100 ? "..." : "");

    // 이미지 태그 추출
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const imgSources: string[] = [];
    let match;

    while ((match = imgRegex.exec(content)) !== null) {
      const imgSrc = match[1];
      if (imgSrc && !imgSrc.startsWith("http")) {
        imgSources.push(imgSrc);
      }
    }

    return {
      imgSources,
      sampleContent,
    };
  };

  // base64 이미지를 File 객체로 변환하는 함수
  const base64ToFile = (base64String: string): File | null => {
    try {
      const parts = base64String.split(",");
      if (parts.length !== 2) {
        return null;
      }

      const mimeMatch = parts[0].match(/:(.*?);/);
      if (!mimeMatch || !mimeMatch[1]) {
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
      <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200 space-x-2">
        {/* Buttons on the left */}
        <div className="flex space-x-2">
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

        {/* 체크박스 그룹 (오른쪽 끝) */}
        <div className="flex items-center space-x-4">
          {" "}
          {/* 두 체크박스를 묶는 부모 div */}
          {/* 인기 게시물 등록 체크박스 */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPopular"
              checked={isPopular === 1}
              onChange={(e) => setIsPopular(e.target.checked ? 1 : 0)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={saving || isNewPost}
            />
            <label htmlFor="isPopular" className="ml-2 block text-sm text-gray-900">
              인기 게시물 등록
            </label>
          </div>
          {/* 공개 상태 체크박스 */}
          <div className="flex items-center">
            {" "}
            {/* ml-4 제거 */}
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic === 1}
              onChange={(e) => setIsPublic(e.target.checked ? 1 : 0)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={saving}
            />
            <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
              공개 상태
            </label>
          </div>
        </div>
      </div>

      {/* TempUser Information Section */}
      <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 닉네임 */}
          <div>
            <label
              htmlFor="tempUserNickname"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              닉네임
            </label>
            <input
              type="text"
              id="tempUserNickname"
              value={tempUser.nickname}
              onChange={(e) => handleTempUserChange("nickname", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="닉네임을 입력하세요"
              disabled={saving}
            />
          </div>
        </div>

        {/* 프로필 이미지와 회원등급 */}
        <div className="mt-4 flex gap-4">
          {/* 프로필 이미지 */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              프로필 이미지 (선택사항)
            </label>
            <FileUpload onChange={handleProfileImageChange} accept="image/*" />
          </div>

          {/* 회원등급 */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">회원등급</label>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
              {userRanks.map((rank) => (
                <label
                  key={rank.id}
                  className="flex items-center p-2 border border-gray-200 rounded hover:bg-gray-100"
                >
                  <input
                    type="radio"
                    name="userRank"
                    value={rank.rankName}
                    checked={tempUser.rank === rank.rankName}
                    onChange={(e) => handleTempUserChange("rank", e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    disabled={saving}
                  />
                  <span className="ml-2 text-sm">{rank.rankName}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
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

      {/* 댓글 작성 영역 */}
      <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
        <h3 className="text-lg font-medium text-gray-900 mb-4">댓글 ({comments.length})</h3>

        <div className="flex gap-4 mb-4">
          {/* 닉네임 입력란 */}
          <div className="w-1/3">
            <input
              type="text"
              placeholder="닉네임"
              value={commentTempUser.nickname}
              onChange={(e) => handleCommentTempUserChange("nickname", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* 프로필 이미지 */}
          <div className="w-20">
            <FileUpload
              onChange={handleCommentProfileImageChange}
              accept="image/*"
              className="w-full h-10"
              showText={false}
            />
          </div>

          {/* 등급 선택 */}
          <div className="flex-1">
            <div className="grid grid-cols-3 gap-2 max-h-20 overflow-y-auto">
              {userRanks.map((rank) => (
                <label
                  key={rank.id}
                  className="flex items-center p-1 border border-gray-200 rounded hover:bg-gray-100 text-xs"
                >
                  <input
                    type="radio"
                    name="commentUserRank"
                    value={rank.rankName}
                    checked={commentTempUser.rank === rank.rankName}
                    onChange={(e) => handleCommentTempUserChange("rank", e.target.value)}
                    className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-1">{rank.rankName}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* 댓글 입력란과 등록 버튼 */}
        <div className="flex gap-4">
          <div className="flex-1">
            <textarea
              placeholder="댓글을 입력하세요..."
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex items-end">
            <Button variant="primary" size="sm" onClick={handleCommentSubmit}>
              댓글 등록
            </Button>
          </div>
        </div>
      </div>

      {/* Comments Section (only in edit mode) */}
      {isEditMode && post && (
        <div className="mt-12">
          {/* Comments list */}
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-gray-50 p-4 rounded-md shadow-sm">
                {editingCommentId === comment.id ? (
                  <div>
                    <textarea
                      value={editCommentContent}
                      onChange={(e) => setEditCommentContent(e.target.value)}
                      rows={3}
                      className="w-full p-2 border border-gray-300 rounded-md mb-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleUpdateComment(comment.id)}
                      >
                        수정 완료
                      </Button>
                      <Button variant="secondary" size="sm" onClick={cancelEditComment}>
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-semibold text-gray-800">
                        {comment.author?.nickname || "익명"}
                      </p>
                      <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap break-words">
                      {comment.content}
                    </p>
                    {/* 수정 및 삭제 버튼 (임시로 숨김 또는 권한 로직 추가 필요) */}
                    <div className="flex justify-end space-x-2 mt-2">
                      <Button variant="outline" size="sm" onClick={() => startEditComment(comment)}>
                        수정
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteComment(comment.id)}
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {comments.length === 0 && (
              <p className="text-center text-gray-500">등록된 댓글이 없습니다.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PostDetail;
