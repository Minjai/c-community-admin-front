import React, { useEffect, useState, useRef, KeyboardEvent, useCallback } from "react";
import TextEditor from "../../components/forms/TextEditor";
import { useParams, useNavigate } from "react-router-dom";
import { Post } from "@/types";
import GuidelineApiService from "@/services/GuidelineApiService";
import ImageApiService from "@/services/ImageApiService";

// Base64 이미지 추출 및 변환 함수
const extractBase64Images = (htmlContent: string): { dataURLs: string[]; newHtml: string } => {
  const result: { dataURLs: string[]; newHtml: string } = {
    dataURLs: [],
    newHtml: htmlContent,
  };

  // Base64 이미지 패턴 찾기 (data:image/...)
  const imgRegex = /<img[^>]+src="(data:image\/[^"]+)"[^>]*>/g;
  let match;
  let index = 0;

  // 모든 Base64 이미지 찾기
  while ((match = imgRegex.exec(htmlContent)) !== null) {
    const fullImgTag = match[0];
    const dataURL = match[1];

    // 찾은 Base64 이미지 저장
    result.dataURLs.push(dataURL);

    // 임시 플레이스홀더로 대체 (나중에 실제 URL로 바꿀 예정)
    result.newHtml = result.newHtml.replace(
      fullImgTag,
      fullImgTag.replace(dataURL, `__BASE64_IMAGE_${index++}__`)
    );
  }

  return result;
};

// Base64를 Blob으로 변환
const dataURLtoBlob = (dataURL: string): Blob => {
  const arr = dataURL.split(",");
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
};

// File 객체 생성
const createFileFromDataURL = (dataURL: string, index: number): File => {
  const blob = dataURLtoBlob(dataURL);
  const extension = dataURL.substring(dataURL.indexOf("/") + 1, dataURL.indexOf(";"));
  return new File([blob], `inline-image-${index}.${extension}`, { type: blob.type });
};

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
  const [positionCount, setPositionCount] = useState(0);
  const [maxPosition, setMaxPosition] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isNewPost = id === "new";
  const isEditMode = !isNewPost;

  // 마운트 시 상태 초기화하기
  useEffect(() => {
    // 새 게시물인 경우 상태 초기화
    if (isNewPost) {
      setTitle("");
      setContent("");
      setTags([]);
      setImageFile(null);
      setImagePreview(null);
      setIsPublic(true);
    }
  }, [id]);

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

  // 현재 게시판의 게시물 개수와 최대 position 값 가져오기
  const getGuidelineCount = async () => {
    try {
      // 게시물 목록을 모두 가져와서 최대 position 값을 찾음
      const response = await GuidelineApiService.getGuidelines(boardId, 1, 100);

      if (response && response.data) {
        // 게시물 개수 설정
        const count = response.data.length || 0;
        setPositionCount(count);

        // 최대 position 값 찾기
        let maxPos = 0;
        if (Array.isArray(response.data) && response.data.length > 0) {
          response.data.forEach((item: any) => {
            const itemPosition = item.position || item.displayOrder || 0;
            if (itemPosition > maxPos) {
              maxPos = itemPosition;
            }
          });
        }

        setMaxPosition(maxPos);
      }
    } catch (error) {}
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

  // 마운트 시 가이드라인 카운트 가져오기
  useEffect(() => {
    if (isNewPost) {
      getGuidelineCount();
    }
  }, [boardId]);

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

  // 내용 변경 핸들러를 useCallback으로 래핑하여 안정적인 참조 제공
  const handleContentChange = useCallback(
    (newContent: string) => {
      // 이전 내용과 동일한 경우 업데이트 불필요
      if (content === newContent) {
        return;
      }

      // 에디터 초기화 직후 빈 업데이트 방지
      if (newContent === "<p><br></p>" && content === "") {
        return;
      }

      setContent(newContent);
    },
    [content]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 디버깅을 위한 로그 추가
    // console.log(
    //   "제출 시 제목:",
    //   title,
    //   "길이:",
    //   title.length,
    //   "trimmed 길이:",
    //   title.trim().length
    // );
    // console.log("제출 시 내용:", content);
    // console.log("제출 시 내용 길이:", content ? content.length : 0);
    // console.log("제출 시 내용 HTML:", content);

    // 빈 HTML인지 확인 (ReactQuill은 빈 내용일 때도 <p><br></p>와 같은 HTML을 생성함)
    const isContentEmpty = !content || content === "<p><br></p>" || content.trim() === "";

    const trimmedTitle = title.trim();
    let trimmedContent = isContentEmpty ? "" : content;

    if (!trimmedTitle) {
      setError("제목을 입력해주세요.");
      return;
    }

    if (isContentEmpty) {
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
      // HTML 내용에서 Base64 이미지 추출
      const { dataURLs, newHtml } = extractBase64Images(trimmedContent);

      // Base64 이미지가 발견된 경우 처리
      if (dataURLs.length > 0) {
        // console.log(`HTML 내용에서 ${dataURLs.length}개의 Base64 이미지를 발견했습니다.`);

        // 각 Base64 이미지를 파일로 변환
        const imageFiles = dataURLs.map((dataURL, index) => createFileFromDataURL(dataURL, index));

        // GIF 파일 디버깅 로그
        imageFiles.forEach((file) => {
          if (file.type === "image/gif" || file.name.endsWith(".gif")) {
            // console.log(
            //   "GIF 파일 발견:",
            //   file.name,
            //   file.type,
            //   `${(file.size / 1024 / 1024).toFixed(2)}MB`
            // );
          }
        });

        // 각 이미지 파일을 서버에 개별적으로 업로드
        const uploadedUrls = [];
        for (let i = 0; i < imageFiles.length; i++) {
          try {
            const file = imageFiles[i];
            // console.log(
            //   `인라인 이미지 ${i + 1}/${imageFiles.length} 업로드 중:`,
            //   file.name,
            //   file.type
            // );

            // 실제 서버 API 호출
            const imageUrl = await ImageApiService.uploadInlineImage(file);
            uploadedUrls.push(imageUrl);

            // 업로드 진행 상황 로그
            // console.log(`인라인 이미지 ${i + 1}/${imageFiles.length} 업로드 완료:`, imageUrl);
          } catch (err) {
            // console.error(`인라인 이미지 ${i + 1} 업로드 실패:`, err);
            // 오류 발생 시 임시 URL 사용 (실패해도 계속 진행)
            uploadedUrls.push(`https://via.placeholder.com/300x200?text=Image+Upload+Failed`);
          }
        }

        // HTML 내 이미지 플레이스홀더를 실제 URL로 대체
        let finalHtml = newHtml;
        for (let i = 0; i < uploadedUrls.length; i++) {
          finalHtml = finalHtml.replace(`__BASE64_IMAGE_${i}__`, uploadedUrls[i]);
        }

        // 최종 처리된 HTML 사용
        trimmedContent = finalHtml;
        // console.log("최종 처리된 HTML:", trimmedContent.substring(0, 100) + "...");
      }

      if (isEditMode) {
        // 기존 가이드라인 수정
        const requestData = {
          title: trimmedTitle,
          content: trimmedContent,
          boardId: boardId,
          image: imageFile || undefined,
          tags: tags.length > 0 ? JSON.stringify(tags) : undefined,
          isPublic: getPublicValue(), // 1 또는 0으로 전송
          position: post?.position || 0,
        };

        // 요청 데이터 로깅
        // console.log("가이드라인 수정 요청 데이터:", {
        //   ...requestData,
        //   content: requestData.content.substring(0, 100) + "...", // 너무 길지 않게 자름
        // });

        const response = await GuidelineApiService.updateGuideline(
          parseInt(id as string),
          requestData
        );

        // 응답 로깅
        // console.log("가이드라인 수정 응답:", response);

        alert("가이드라인이 수정되었습니다.");
        navigate(getNavigationPath());
      } else {
        // 새 가이드라인 작성
        if (!imageFile) {
          setError("이미지를 업로드해주세요.");
          setSaving(false);
          return;
        }

        // Ensure trimmedContent reflects the final HTML after image processing
        const finalContentForCreate = trimmedContent;

        const requestData = {
          title: trimmedTitle,
          content: finalContentForCreate, // Use the final processed content
          boardId: boardId,
          image: imageFile,
          tags: tags.length > 0 ? JSON.stringify(tags) : undefined,
          isPublic: getPublicValue(), // 1 또는 0으로 전송
          position: maxPosition + 1, // 최대 position 값 + 1
        };

        // 요청 데이터 로깅
        // console.log("가이드라인 생성 요청 데이터:", {
        //   ...requestData,
        //   content: requestData.content.substring(0, 100) + "...", // 너무 길지 않게 자름
        // });

        const response = await GuidelineApiService.createGuideline(requestData);

        // 응답 로깅
        // console.log("가이드라인 생성 응답:", response);

        alert("가이드라인이 작성되었습니다.");
        navigate(getNavigationPath());
      }
    } catch (error: any) {
      // console.error("가이드라인 저장 오류:", error);
      // console.error("에러 응답 데이터:", error.response?.data);

      // 인증 오류 처리
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError("권한이 없습니다. 로그인이 필요합니다.");
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
      // 새 글 작성인 경우, 가이드라인 카운트 조회
      await getGuidelineCount();
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // console.log("가이드라인 상세 조회 시작 - ID:", id);
      const response = await GuidelineApiService.getGuidelineById(parseInt(id as string));
      // console.log("가이드라인 상세 응답:", response); // 서버 응답 로깅

      if (response && response.data) {
        const postData = response.data;
        // console.log("가이드라인 데이터:", postData); // 데이터 구조 로깅
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
          // console.log("태그 데이터 타입:", typeof postData.tags, "값:", postData.tags);
          try {
            // 문자열로 저장된 경우 파싱
            if (typeof postData.tags === "string") {
              // 이중 JSON 문자열 처리 (문자열 안에 이스케이프된 JSON이 있는 경우)
              if (postData.tags.startsWith('"') && postData.tags.endsWith('"')) {
                try {
                  // 외부 따옴표 제거 후 파싱 시도
                  const unescapedString = postData.tags.slice(1, -1).replace(/\\"/g, '"');
                  setTags(JSON.parse(unescapedString));
                  // console.log("이중 JSON 문자열 파싱 성공");
                } catch (e) {
                  // 일반 방식으로 파싱 시도
                  setTags(JSON.parse(postData.tags));
                  // console.log("일반 JSON 문자열 파싱 성공");
                }
              } else {
                setTags(JSON.parse(postData.tags));
                // console.log("표준 JSON 문자열 파싱 성공");
              }
            }
            // 이미 배열인 경우 그대로 사용
            else if (Array.isArray(postData.tags)) {
              setTags(postData.tags);
              // console.log("태그 배열 직접 사용");
            }
          } catch (e) {
            // console.error("태그 파싱 오류:", e, "원본 태그 데이터:", postData.tags);
            // 파싱 오류 시 빈 배열로 설정하고 계속 진행
            setTags([]);
          }
        }

        // 이미지가 있으면 미리보기 설정
        if (postData.imageUrl) {
          setImagePreview(postData.imageUrl);
          // console.log("이미지 URL 설정:", postData.imageUrl);
        }
      } else {
        // console.error("응답 데이터 형식이 예상과 다름:", response);
        setError("가이드라인을 찾을 수 없습니다.");
        // console.error("가이드라인 조회 실패: 데이터 없음");
      }
    } catch (error: any) {
      // console.error("가이드라인 조회 중 예외 발생:", error);
      if (error?.response) {
        // console.error("응답 상태:", error.response.status);
        // console.error("응답 데이터:", error.response.data);
      }
      setError("가이드라인을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getPostDetail();
    if (isNewPost) {
      getGuidelineCount();
    }
  }, [id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  };

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
        <div className="flex justify-between items-center pt-2 pb-4 border-b border-gray-200 mb-4">
          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
            <button
              type="button"
              onClick={() => {
                setImageFile(null);
                setImagePreview(null);
                navigate(getNavigationPath());
              }}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={saving}
            >
              취소
            </button>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPublicPage"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              disabled={saving}
            />
            <label htmlFor="isPublicPage" className="ml-2 block text-sm text-gray-700">
              공개 여부 (체크 시 사용자에게 공개됩니다)
            </label>
          </div>
        </div>

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
          <div className="min-h-[400px] border border-gray-300 rounded-md bg-white">
            <TextEditor content={content} setContent={handleContentChange} height="500px" />
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
      </form>
    </div>
  );
};

export default GuidelineDetail;
