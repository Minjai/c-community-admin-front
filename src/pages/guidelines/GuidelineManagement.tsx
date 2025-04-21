import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Post as Guideline } from "@/types";
import GuidelineApiService from "@/services/GuidelineApiService";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import ActionButton from "@/components/ActionButton";
import Modal from "@/components/Modal";
import Input from "@/components/forms/Input";
import TextEditor from "../../components/forms/TextEditor";
import FileUpload from "@/components/forms/FileUpload";
import Alert from "@/components/Alert";
import { formatDate, formatDateForDisplay } from "@/utils/dateUtils";
import { toast } from "react-toastify";

// Guideline 타입에 position과 displayOrder, tags 추가
interface GuidelineWithOrder extends Guideline {
  position?: number;
  displayOrder?: number;
  tags?: string[]; // Explicitly add tags as string array
}

interface GuidelineManagementProps {
  boardId: number;
}

const GuidelineManagement: React.FC<GuidelineManagementProps> = ({ boardId }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [guidelines, setGuidelines] = useState<GuidelineWithOrder[]>([]); // GuidelineWithOrder 사용
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [currentGuideline, setCurrentGuideline] = useState<Partial<GuidelineWithOrder> | null>(
    null
  ); // GuidelineWithOrder 사용
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null); // Modal specific error
  const [isSaving, setIsSaving] = useState<boolean>(false); // Add isSaving state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [currentTagInput, setCurrentTagInput] = useState<string>(""); // State for current tag input

  // 페이지네이션 상태 추가
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10); // 기본 페이지 크기
  const [totalItems, setTotalItems] = useState<number>(0);

  // TextEditor의 content를 업데이트하는 함수를 useCallback으로 감싸기
  const handleEditorContentChange = useCallback(
    (content: string) => {
      if (currentGuideline) {
        // 이전 내용과 동일한 경우 업데이트 불필요
        if (currentGuideline.content === content) {
          return;
        }

        // Log removed
        setCurrentGuideline((prev) => {
          if (!prev) return null;
          return { ...prev, content };
        });
      }
    },
    [currentGuideline]
  );

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

  // 데이터 조회 함수 (페이지네이션 적용)
  const fetchGuidelines = async (page: number = 1, limit: number = 10) => {
    setLoading(true);
    setError(null);

    try {
      // GuidelineApiService.getGuidelines에 page와 pageSize 전달
      const response = await GuidelineApiService.getGuidelines(boardId, page, limit);

      // API 응답 구조에 맞게 데이터와 페이지네이션 정보 추출
      if (response && response.success && Array.isArray(response.data)) {
        // position 기준으로 정렬 (서버에서 처리되지 않은 경우) <-- 이 주석과 아래 정렬 로직 제거
        // const sortedGuidelines = [...response.data].sort(
        //   (a, b) => (a.position || 0) - (b.position || 0)
        // );
        // setGuidelines(sortedGuidelines); <-- sortedGuidelines 대신 response.data 사용

        setGuidelines(response.data); // 서버에서 정렬된 데이터를 그대로 사용

        // 페이지네이션 정보 업데이트
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages);
          setCurrentPage(response.pagination.currentPage);
          setPageSize(response.pagination.pageSize);
          setTotalItems(response.pagination.totalItems);
        } else {
          // 페이지네이션 정보가 없는 경우 (호환성 유지)
          setTotalPages(1);
          setCurrentPage(1);
          setTotalItems(response.data.length); // sortedGuidelines 대신 response.data 사용
        }
      } else {
        setGuidelines([]);
        setError(response?.message || "가이드라인 데이터를 불러오는 중 오류가 발생했습니다.");
        setTotalPages(1);
        setCurrentPage(1);
        setTotalItems(0);
      }
    } catch (err: any) {
      console.error("가이드라인 조회 오류:", err);
      setError(err.message || "가이드라인 목록 조회 중 오류가 발생했습니다.");
      setGuidelines([]);
      setTotalPages(1);
      setCurrentPage(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuidelines(currentPage, pageSize);
  }, [boardId]); // boardId 변경 시에도 재조회

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      fetchGuidelines(page, pageSize);
    }
  };

  // 이미지 파일 처리 함수
  const handleFile = (file: File | null) => {
    setImageFile(file);
    if (file) {
      const fileUrl = URL.createObjectURL(file);
      setPreviewUrl(fileUrl);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    } else {
      handleFile(null); // 파일 선택 취소 시
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // 모달 열기 (추가)
  const handleAddGuideline = () => {
    setModalError(null); // Reset modal error
    setCurrentGuideline({
      title: "",
      content: "",
      boardId: boardId,
      isPublic: 1,
      position: totalItems + 1,
      imageUrl: "",
      tags: [], // Initialize as empty array
    });
    setImageFile(null);
    setShowModal(true);
    setIsEditing(false);
    setPreviewUrl(null);
  };

  // 모달 열기 (수정) - tags 처리 단순화
  const handleEditGuideline = (guideline: GuidelineWithOrder) => {
    setModalError(null);
    const convertedGuideline = {
      ...guideline,
      isPublic: guideline.isPublic === true || guideline.isPublic === 1 ? 1 : 0,
      // Now tags should be correctly typed as string[] | undefined
      tags: guideline.tags || [], // Default to empty array if undefined
    };
    setCurrentGuideline(convertedGuideline);
    setImageFile(null);
    setShowModal(true);
    setIsEditing(true);
    setPreviewUrl(guideline.imageUrl || null);
  };

  // 가이드라인 저장 (추가 또는 수정)
  const handleSaveGuideline = async () => {
    if (!currentGuideline) return;

    try {
      if (!currentGuideline.title || !currentGuideline.content) {
        setModalError("제목과 내용은 필수 항목입니다.");
        return;
      }

      setIsSaving(true); // Set saving state
      setModalError(null); // Clear previous modal error

      // isPublic 값을 확실히 number로 변환
      const isPublicValue =
        currentGuideline.isPublic === true || currentGuideline.isPublic === 1 ? 1 : 0;

      const dataToSend = {
        title: currentGuideline.title,
        content: currentGuideline.content,
        boardId: boardId,
        isPublic: isPublicValue,
        position: currentGuideline.position,
        image: imageFile || undefined,
        tags: currentGuideline.tags?.join(",") || "",
      };

      if (isEditing && currentGuideline.id) {
        await GuidelineApiService.updateGuideline(currentGuideline.id, dataToSend);
        toast.success("가이드라인이 수정되었습니다.");
      } else {
        await GuidelineApiService.createGuideline(dataToSend);
        toast.success("새 가이드라인이 추가되었습니다.");
      }

      setShowModal(false);
      fetchGuidelines(currentPage, pageSize);
    } catch (error) {
      // Error logging removed
      const errorMsg =
        (error as any)?.response?.data?.message || "가이드라인 저장 중 오류가 발생했습니다.";
      setModalError(errorMsg);
    } finally {
      setIsSaving(false); // Ensure saving state is reset
    }
  };

  // 가이드라인 삭제
  const handleDeleteGuideline = async (id: number) => {
    if (!window.confirm("정말 이 가이드라인을 삭제하시겠습니까?")) return;

    try {
      await GuidelineApiService.deleteGuideline(id);
      toast.success("가이드라인이 삭제되었습니다.");
      fetchGuidelines(currentPage, pageSize);
    } catch (err) {
      // Error logging removed
      toast.error("가이드라인 삭제 중 오류가 발생했습니다.");
    }
  };

  // 순서 변경 (위로)
  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;

    const currentGuideline = guidelines[index];
    const targetGuideline = guidelines[index - 1];

    // position 또는 displayOrder 값 교환
    const currentPosition = currentGuideline.position || currentGuideline.displayOrder || 0;
    const targetPosition = targetGuideline.position || targetGuideline.displayOrder || 0;

    try {
      // API 호출 (개별 업데이트 방식 사용)
      await GuidelineApiService.updateGuidelinePosition(currentGuideline.id, targetPosition);
      await GuidelineApiService.updateGuidelinePosition(targetGuideline.id, currentPosition);

      fetchGuidelines(currentPage, pageSize);
    } catch (err) {
      // Error logging removed
      toast.error("순서 변경 중 오류가 발생했습니다.");
      fetchGuidelines(currentPage, pageSize);
    }
  };

  // 순서 변경 (아래로)
  const handleMoveDown = async (index: number) => {
    if (index >= guidelines.length - 1) return;

    const currentGuideline = guidelines[index];
    const targetGuideline = guidelines[index + 1];

    const currentPosition = currentGuideline.position || currentGuideline.displayOrder || 0;
    const targetPosition = targetGuideline.position || targetGuideline.displayOrder || 0;

    try {
      await GuidelineApiService.updateGuidelinePosition(currentGuideline.id, targetPosition);
      await GuidelineApiService.updateGuidelinePosition(targetGuideline.id, currentPosition);

      fetchGuidelines(currentPage, pageSize);
    } catch (err) {
      // Error logging removed
      toast.error("순서 변경 중 오류가 발생했습니다.");
      fetchGuidelines(currentPage, pageSize);
    }
  };

  // 모달 닫기 핸들러 추가
  const handleCloseModal = () => {
    setModalError(null);
    setShowModal(false);
    setImageFile(null); // Reset image file on close
    setPreviewUrl(null);
  };

  // --- New Hashtag Handlers ---
  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTagInput(e.target.value);
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ([",", " ", "Enter"].includes(e.key)) {
      e.preventDefault(); // Prevent default form submission on Enter
      const newTag = currentTagInput.trim();

      if (newTag && currentGuideline?.tags && !currentGuideline.tags.includes(newTag)) {
        setCurrentGuideline((prev) =>
          prev
            ? {
                ...prev,
                tags: [...(prev.tags || []), newTag],
              }
            : null
        );
      }
      setCurrentTagInput(""); // Clear input field
    }
  };

  const removeTag = (tagToRemove: string) => {
    setCurrentGuideline((prev) =>
      prev
        ? {
            ...prev,
            tags: (prev.tags || []).filter((tag) => tag !== tagToRemove),
          }
        : null
    );
  };
  // --- End of New Hashtag Handlers ---

  // DataTable 컬럼 정의
  const columns = [
    {
      header: "제목",
      accessor: "title" as keyof GuidelineWithOrder,
      cell: (value: string, row: GuidelineWithOrder) => (
        <span
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer block w-[300px] truncate text-left"
          onClick={() => handleEditGuideline(row)}
          title={value}
        >
          {value}
        </span>
      ),
    },
    {
      header: "썸네일",
      accessor: "imageUrl" as keyof GuidelineWithOrder,
      cell: (value: string) => (
        <div className="w-20 h-12 bg-gray-100 flex items-center justify-center overflow-hidden">
          {value ? (
            <img src={value} alt="썸네일" className="max-w-full max-h-full object-contain" />
          ) : (
            <span className="text-xs text-gray-500">이미지 없음</span>
          )}
        </div>
      ),
    },
    {
      header: "등록일자",
      accessor: "createdAt" as keyof GuidelineWithOrder,
      cell: (value: string) => {
        const date = new Date(value);
        return date.toLocaleString("ko-KR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        });
      },
    },
    {
      header: "공개 여부",
      accessor: "isPublic" as keyof GuidelineWithOrder,
      cell: (value: boolean | number) => (
        <span
          className={`px-2 py-1 rounded text-xs ${
            value === true || value === 1
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {value === true || value === 1 ? "공개" : "비공개"}
        </span>
      ),
    },
    {
      header: "관리",
      accessor: "id" as keyof GuidelineWithOrder,
      cell: (value: number, row: GuidelineWithOrder, index: number) => (
        <div className="flex space-x-2">
          <ActionButton
            onClick={() => handleMoveUp(index)}
            disabled={index === 0}
            action="up"
            label="위로"
            size="sm"
          />
          <ActionButton
            onClick={() => handleMoveDown(index)}
            disabled={index === guidelines.length - 1}
            action="down"
            label="아래로"
            size="sm"
          />
          <ActionButton
            onClick={() => handleEditGuideline(row)}
            action="edit"
            label="수정"
            size="sm"
          />
          <ActionButton
            onClick={() => handleDeleteGuideline(value)}
            action="delete"
            label="삭제"
            size="sm"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <Button onClick={handleAddGuideline} variant="primary">
          가이드라인 추가
        </Button>
      </div>

      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />
      )}

      <DataTable
        columns={columns}
        data={guidelines}
        loading={loading}
        emptyMessage="등록된 가이드라인이 없습니다."
      />

      {/* 페이지네이션 UI (배너 페이지와 동일하게) */}
      {guidelines && guidelines.length > 0 && totalPages > 1 && (
        <div className="flex justify-center my-6">
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                currentPage === 1
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              이전
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium ${
                  currentPage === page
                    ? "bg-indigo-50 text-indigo-600 z-10"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                currentPage === totalPages
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              다음
            </button>
          </nav>
        </div>
      )}

      {/* 가이드라인 추가/수정 모달 */}
      {currentGuideline && (
        <Modal
          isOpen={showModal}
          onClose={handleCloseModal}
          title={isEditing ? "가이드라인 수정" : "새 가이드라인 추가"}
          size="xl"
        >
          {/* Modal Error Display (Above top controls) */}
          {modalError && (
            <div className="mb-4">
              <Alert type="error" message={modalError} onClose={() => setModalError(null)} />
            </div>
          )}

          {/* New container for top controls - Reordered */}
          <div className="flex justify-between items-center pt-2 pb-4 border-b border-gray-200 mb-4">
            {/* Left side: Action Buttons */}
            <div className="flex space-x-3">
              <Button variant="primary" onClick={handleSaveGuideline} disabled={isSaving}>
                {isSaving ? "저장 중..." : isEditing ? "저장" : "추가"}
              </Button>
              <Button variant="secondary" onClick={handleCloseModal} disabled={isSaving}>
                취소
              </Button>
            </div>

            {/* Right side: Public toggle */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPublicModal"
                checked={currentGuideline.isPublic === true || currentGuideline.isPublic === 1}
                onChange={(e) =>
                  setCurrentGuideline({
                    ...currentGuideline,
                    isPublic: e.target.checked ? 1 : 0,
                  })
                }
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="isPublicModal" className="ml-2 block text-sm text-gray-900">
                공개 여부
              </label>
            </div>
          </div>

          <div className="space-y-4">
            {/* Form fields below */}
            <Input
              label="제목"
              value={currentGuideline.title || ""}
              onChange={(e) =>
                setCurrentGuideline({
                  ...currentGuideline,
                  title: e.target.value,
                })
              }
              required
            />

            <FileUpload
              label="썸네일 이미지"
              id="guidelineImageModal"
              onChange={handleFile}
              value={previewUrl || currentGuideline.imageUrl}
            />
            {isEditing && !previewUrl && currentGuideline.imageUrl && (
              <p className="mt-1 text-xs text-gray-500">
                이미지를 변경하지 않으면 기존 이미지가 유지됩니다.
              </p>
            )}

            {/* --- New Hashtag Input UI --- */}
            <div>
              <label htmlFor="tags-input" className="block text-sm font-medium text-gray-700 mb-1">
                해시태그 (콤마, 스페이스, 엔터로 구분)
              </label>
              <div className="flex flex-wrap items-center gap-2 border border-gray-300 rounded-md p-2">
                {(currentGuideline.tags || []).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center bg-gray-200 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full"
                  >
                    {tag}
                    <button
                      type="button"
                      className="ml-1.5 inline-flex text-gray-500 hover:text-gray-700 focus:outline-none"
                      onClick={() => removeTag(tag)}
                      aria-label={`Remove ${tag}`}
                    >
                      <svg
                        className="h-2.5 w-2.5"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 8 8"
                      >
                        <path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" />
                      </svg>
                    </button>
                  </span>
                ))}
                <input
                  id="tags-input"
                  type="text"
                  value={currentTagInput}
                  onChange={handleTagInputChange}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder={(currentGuideline.tags?.length || 0) > 0 ? "" : "태그 입력..."}
                  className="flex-grow p-1 outline-none text-sm"
                />
              </div>
            </div>
            {/* --- End of New Hashtag Input UI --- */}

            <TextEditor
              content={currentGuideline.content || ""}
              setContent={handleEditorContentChange}
              height="300px"
              readOnly={isSaving}
            />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default GuidelineManagement;
