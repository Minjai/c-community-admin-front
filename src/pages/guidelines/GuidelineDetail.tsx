import React, { useEffect, useState, useRef, KeyboardEvent } from "react";
import TextEditor from "../../components/forms/TextEditor";
import { useParams, useNavigate } from "react-router-dom";
import { Post } from "@/types";
import GuidelineApiService from "@/services/GuidelineApiService";

const GuidelineDetail = ({ boardId = 3 }) => {
  // 기본값은 카지노(3)
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isNewPost = id === "new";
  const isEditMode = !isNewPost;

  // boardId에 따라 네비게이션 경로 결정
  const getNavigationPath = () => {
    switch (boardId) {
      case 3:
        return "/guidelines/casino";
      case 4:
        return "/guidelines/sports";
      case 5:
        return "/guidelines/crypto";
      default:
        return "/guidelines/casino";
    }
  };

  // 태그 추가 처리
  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput("");
    }
  };

  // 태그 입력 값 변경 처리
  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value);
  };

  // 태그 삭제 처리
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);

      // 이미지 미리보기 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 공개 여부 값 변환 (UI: boolean -> API: 1/0)
  const getPublicValue = () => {
    return isPublic ? 1 : 0; // 1 또는 0으로 전송
  };

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

    // 새 게시물인데 이미지가 없는 경우
    if (isNewPost && !imageFile) {
      setError("이미지를 업로드해주세요.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isEditMode) {
        // 기존 가이드라인 수정
        const response = await GuidelineApiService.updateGuideline(parseInt(id as string), {
          title,
          content,
          boardId: boardId,
          image: imageFile || undefined,
          tags: tags.length > 0 ? JSON.stringify(tags) : undefined,
          isPublic: getPublicValue(), // 1 또는 0으로 전송
          position: post?.position || 0,
        });

        alert("가이드라인이 수정되었습니다.");
        navigate(getNavigationPath());
      } else {
        // 새 가이드라인 작성
        if (!imageFile) {
          setError("이미지를 업로드해주세요.");
          setSaving(false);
          return;
        }

        const response = await GuidelineApiService.createGuideline({
          title,
          content,
          boardId: boardId,
          image: imageFile,
          tags: tags.length > 0 ? JSON.stringify(tags) : undefined,
          isPublic: getPublicValue(), // 1 또는 0으로 전송
          position: 0,
        });

        alert("가이드라인이 작성되었습니다.");
        navigate(getNavigationPath());
      }
    } catch (error: any) {
      console.error("가이드라인 저장 오류:", error);

      // 인증 오류 처리
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError("권한이 없습니다. 로그인이 필요합니다.");
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      } else {
        setError(
          "가이드라인을 저장하는 중 오류가 발생했습니다: " +
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
      const response = await GuidelineApiService.getGuidelineById(parseInt(id as string));
      console.log("가이드라인 상세 응답:", response); // 서버 응답 로깅

      if (response && response.data) {
        const postData = response.data;
        console.log("가이드라인 데이터:", postData); // 데이터 구조 로깅
        setPost(postData);
        setTitle(postData.title);
        setContent(postData.content);
        setIsPublic(
          postData.isPublic !== undefined
            ? postData.isPublic === true || postData.isPublic === 1
            : true
        );

        // 태그 설정
        if (postData.tags) {
          try {
            // 문자열로 저장된 경우 파싱
            if (typeof postData.tags === "string") {
              setTags(JSON.parse(postData.tags));
            }
            // 이미 배열인 경우 그대로 사용
            else if (Array.isArray(postData.tags)) {
              setTags(postData.tags);
            }
          } catch (e) {
            console.error("태그 파싱 오류:", e);
            setTags([]);
          }
        }

        // 이미지가 있으면 미리보기 설정
        if (postData.imageUrl) {
          setImagePreview(postData.imageUrl);
        }
      } else {
        setError("가이드라인을 찾을 수 없습니다.");
        console.error("가이드라인 조회 실패: 데이터 없음");
      }
    } catch (error) {
      console.error("가이드라인 조회 오류:", error);
      setError("가이드라인을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
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
          <p className="mt-4 text-gray-600">가이드라인 정보를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">
        {isNewPost ? "새 가이드라인 작성" : "가이드라인 수정"}
      </h1>

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
          <label className="block text-sm font-medium text-gray-700 mb-2">대표 이미지</label>
          <div className="flex items-center space-x-6">
            <div className="flex-shrink-0">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="이미지 미리보기"
                  className="h-32 w-auto object-cover rounded-md"
                />
              ) : (
                <div className="h-32 w-32 bg-gray-200 rounded-md flex items-center justify-center text-gray-400">
                  이미지 없음
                </div>
              )}
            </div>
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                ref={fileInputRef}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                이미지 {imagePreview ? "변경" : "업로드"}
              </button>
              {imagePreview && (
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="ml-2 px-4 py-2 bg-red-50 border border-red-300 rounded-md text-sm text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  이미지 삭제
                </button>
              )}
              <p className="mt-1 text-xs text-gray-500">권장 크기: 800 x 600px, 최대 5MB</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">내용</label>
          <div className="min-h-[400px] border border-gray-300 rounded-md">
            <TextEditor content={content} setContent={setContent} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">태그</label>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {tags.map((tag, index) => (
              <div
                key={index}
                className="flex items-center bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  className="ml-1.5 text-blue-600 hover:text-blue-800 focus:outline-none"
                  onClick={() => handleRemoveTag(tag)}
                >
                  &times;
                </button>
              </div>
            ))}
            <div className="flex-1 min-w-[200px]">
              <div className="flex">
                <input
                  type="text"
                  value={tagInput}
                  onChange={handleTagInputChange}
                  placeholder="태그 입력"
                  className="block w-full rounded-l-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    // 인라인으로 태그 추가 로직 구현
                    const currentTag = tagInput.trim();
                    if (currentTag && !tags.includes(currentTag)) {
                      setTags([...tags, currentTag]);
                      setTagInput("");
                    }
                  }}
                  className="px-3 py-2 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100"
                >
                  추가
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isPublic"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
            공개 여부 (체크 시 사용자에게 공개됩니다)
          </label>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate(getNavigationPath())}
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
    </div>
  );
};

export default GuidelineDetail;
