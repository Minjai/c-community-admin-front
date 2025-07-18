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
import LoadingOverlay from "@/components/LoadingOverlay";
import SearchInput from "@components/SearchInput.tsx";
import ExcelDownloadButton from "../../components/ExcelDownloadButton";

// Guideline 타입에 position과 tags 추가 (복원)
interface GuidelineWithOrder extends Guideline {
  position?: number;
  tags?: string[]; // Explicitly add tags as string array
}

interface GuidelineManagementProps {
  boardId: number;
}

const GuidelineManagement: React.FC<GuidelineManagementProps> = ({ boardId }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [guidelines, setGuidelines] = useState<GuidelineWithOrder[]>([]); // GuidelineWithOrder 사용 (복원)
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [currentGuideline, setCurrentGuideline] = useState<Partial<GuidelineWithOrder> | null>(
    null
  ); // GuidelineWithOrder 사용 (복원)
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [currentTagInput, setCurrentTagInput] = useState<string>(""); // State for current tag input (복원)

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(30);
  const [totalItems, setTotalItems] = useState<number>(0);

  const [selectedGuidelineIds, setSelectedGuidelineIds] = useState<number[]>([]);

  // 검색 value 상태
  const [searchValue, setSearchValue] = useState<string>("");

  // 조회수 통계 상태 추가
  const [viewStats, setViewStats] = useState<{
    [key: number]: { anonymousUsers: number; loggedInUsers: number; totalViews: number };
  }>({});

  // 원본 position 값 저장용 ref
  const originalGuidelinesRef = useRef<GuidelineWithOrder[]>([]);

  const handleEditorContentChange = useCallback(
    (content: string) => {
      if (currentGuideline) {
        if (currentGuideline.content === content) {
          return;
        }
        setCurrentGuideline((prev) => {
          if (!prev) return null;
          return { ...prev, content };
        });
      }
    },
    [currentGuideline]
  );

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

  const handleSearch = (value: string) => {
    fetchGuidelines(currentPage, pageSize, value);
  };

  const fetchGuidelines = async (
    page: number = 1,
    limit: number = 10,
    searchValue: string = ""
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await GuidelineApiService.getGuidelines(boardId, page, limit, searchValue);

      if (
        response &&
        response.success &&
        response.data &&
        Array.isArray((response.data as any).items)
      ) {
        // Process tags: Convert comma-separated string to array
        const processedGuidelines = (response.data as any).items.map((guideline: any) => ({
          ...guideline,
          tags:
            typeof guideline.tags === "string"
              ? guideline.tags
                  .split(",")
                  .map((tag: string) => tag.trim())
                  .filter((tag: string) => tag !== "")
              : guideline.tags || [],
        }));

        // position 기준 오름차순 정렬 (작은 값이 위로), position이 같으면 createdAt 내림차순(최신이 위)
        const sortedGuidelines = [...processedGuidelines].sort((a, b) => {
          if ((a.position || 0) !== (b.position || 0)) {
            return (a.position || 0) - (b.position || 0);
          }
          // position이 같으면 createdAt 내림차순(최신이 위)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setGuidelines(sortedGuidelines);
        originalGuidelinesRef.current = sortedGuidelines;

        // 조회수 통계 저장
        if (response.contentViewStats) {
          setViewStats(response.contentViewStats);
        }

        // 페이지네이션 정보 업데이트 (API 응답 사용)
        if (response.data) {
          setTotalPages((response.data as any).totalPages);
          setCurrentPage((response.data as any).page);
          setPageSize((response.data as any).limit);
          setTotalItems((response.data as any).total);
        } else {
          // 페이지네이션 정보가 없는 경우 (API 오류 등) 기본값 처리
          setTotalPages(1);
          setCurrentPage(1);
          setTotalItems(sortedGuidelines.length);
        }
      } else {
        // API 요청 실패 또는 data 형식이 배열이 아닌 경우
        setGuidelines([]);
        setError(response?.message || "가이드라인 데이터를 불러오는 중 오류가 발생했습니다.");
        setTotalPages(1);
        setCurrentPage(1);
        setTotalItems(0);
      }
    } catch (err: any) {
      setError(err?.message || "가이드라인 목록 조회 중 오류가 발생했습니다.");
      setGuidelines([]);
      setTotalPages(1);
      setCurrentPage(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuidelines(currentPage, pageSize, searchValue);
  }, [boardId, currentPage, pageSize, searchValue]); // useEffect 의존성 배열 복원

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      fetchGuidelines(page, pageSize, searchValue);
    }
  };

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
      handleFile(null);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleAddGuideline = () => {
    setModalError(null);
    setCurrentGuideline({
      title: "",
      content: "",
      boardId: boardId,
      isPublic: 1,
      position: 0, // 새 가이드라인은 항상 0번 순서
      imageUrl: "",
      tags: [], // 복원
    });
    setImageFile(null);
    setShowModal(true);
    setIsEditing(false);
    setPreviewUrl(null);
  };

  const handleEditGuideline = (guideline: GuidelineWithOrder) => {
    // GuidelineWithOrder 복원
    setModalError(null);
    const convertedGuideline = {
      ...guideline,
      isPublic: guideline.isPublic === true || guideline.isPublic === 1 ? 1 : 0,
      tags: guideline.tags || [], // 복원
    };
    setCurrentGuideline(convertedGuideline);
    setImageFile(null);
    setShowModal(true);
    setIsEditing(true);
    setPreviewUrl(guideline.imageUrl || null);
  };

  const handleSaveGuideline = async () => {
    if (!currentGuideline) return;

    try {
      if (!currentGuideline.title || !currentGuideline.content) {
        setModalError("제목과 내용은 필수 항목입니다.");
        return;
      }

      setIsSaving(true);
      setModalError(null);

      const isPublicValue =
        currentGuideline.isPublic === true || currentGuideline.isPublic === 1 ? 1 : 0;

      const dataToSend = {
        title: currentGuideline.title,
        content: currentGuideline.content,
        boardId: boardId,
        isPublic: isPublicValue,
        position: currentGuideline.position, // 복원
        image: imageFile || undefined,
        tags: currentGuideline.tags?.join(",") || "", // 복원
      };

      if (isEditing && currentGuideline.id) {
        await GuidelineApiService.updateGuideline(currentGuideline.id, dataToSend);
        toast.success("가이드라인이 수정되었습니다.");
      } else {
        // 새 가이드라인은 position 0으로 생성
        await GuidelineApiService.createGuideline({ ...dataToSend, position: 0 });
        toast.success("새 가이드라인이 추가되었습니다.");
      }

      setShowModal(false);
      fetchGuidelines(currentPage, pageSize);
    } catch (error) {
      const errorMsg =
        (error as any)?.response?.data?.message || "가이드라인 저장 중 오류가 발생했습니다.";
      setModalError(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGuideline = async (id: number) => {
    if (window.confirm("정말 이 가이드라인을 삭제하시겠습니까?")) {
      try {
        await GuidelineApiService.deleteGuideline(id);
        toast.success("가이드라인이 삭제되었습니다.");
        fetchGuidelines(currentPage, pageSize);
        setSelectedGuidelineIds((prev) => prev.filter((guidelineId) => guidelineId !== id));
      } catch (error) {
        toast.error("가이드라인 삭제 중 오류가 발생했습니다.");
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedGuidelineIds.length === 0) {
      toast.info("삭제할 가이드라인을 선택해주세요.");
      return;
    }
    if (
      !window.confirm(
        `선택된 ${selectedGuidelineIds.length}개의 가이드라인을 정말 삭제하시겠습니까?`
      )
    )
      return;

    try {
      setLoading(true);
      const deletePromises = selectedGuidelineIds.map((id) =>
        GuidelineApiService.deleteGuideline(id)
      );
      await Promise.allSettled(deletePromises);

      toast.success(`${selectedGuidelineIds.length}개의 가이드라인이 삭제되었습니다.`);
      fetchGuidelines(currentPage, pageSize);
      setSelectedGuidelineIds([]);
    } catch (error: any) {
      toast.error("가이드라인 삭제 중 일부 오류가 발생했습니다. 목록을 확인해주세요.");
      fetchGuidelines(currentPage, pageSize);
      setSelectedGuidelineIds([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGuideline = (id: number) => {
    setSelectedGuidelineIds((prevSelected) => {
      if (prevSelected.includes(id)) {
        return prevSelected.filter((guidelineId) => guidelineId !== id);
      } else {
        return [...prevSelected, id];
      }
    });
  };

  const handleSelectAllGuidelines = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const currentPageGuidelineIds = guidelines.map((g) => g.id);
      setSelectedGuidelineIds(currentPageGuidelineIds);
    } else {
      setSelectedGuidelineIds([]);
    }
  };

  // position 입력값 변경 핸들러 (공통 함수)
  const handlePositionInputChange = (index: number, newPosition: number) => {
    setGuidelines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], position: newPosition };
      return updated;
    });
  };

  // position 일괄 저장 핸들러 (공통 함수)
  const handleBulkPositionSave = async () => {
    setLoading(true);
    try {
      // 변경된 가이드라인만 추출
      const changed = guidelines.filter(
        (g, i) => g.position !== originalGuidelinesRef.current[i]?.position
      );
      if (changed.length === 0) {
        toast.info("변경된 순서가 없습니다.");
        setLoading(false);
        return;
      }
      await Promise.all(
        changed.map((guideline) =>
          GuidelineApiService.updateGuideline(guideline.id, { position: guideline.position })
        )
      );
      toast.success("순서가 저장되었습니다.");
      fetchGuidelines(currentPage, pageSize);
    } catch (err) {
      toast.error("순서 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setModalError(null);
    setShowModal(false);
    setImageFile(null);
    setPreviewUrl(null);
    setCurrentTagInput(""); // 태그 입력 상태 초기화 추가 (복원)
  };

  // 태그 핸들러 복원
  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTagInput(e.target.value);
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ([",", " ", "Enter"].includes(e.key)) {
      e.preventDefault();
      const newTag = currentTagInput.trim();
      if (newTag && currentGuideline?.tags && !currentGuideline.tags.includes(newTag)) {
        setCurrentGuideline((prev) =>
          prev ? { ...prev, tags: [...(prev.tags || []), newTag] } : null
        );
      }
      setCurrentTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setCurrentGuideline((prev) =>
      prev ? { ...prev, tags: (prev.tags || []).filter((tag) => tag !== tagToRemove) } : null
    );
  };

  const columns = [
    {
      header: (
        <input
          type="checkbox"
          className="form-checkbox h-4 w-4 text-blue-600"
          onChange={handleSelectAllGuidelines}
          checked={
            guidelines.length > 0 &&
            selectedGuidelineIds.length === guidelines.length &&
            guidelines.every((g) => selectedGuidelineIds.includes(g.id))
          }
          ref={(input) => {
            if (input) {
              const someSelected =
                selectedGuidelineIds.length > 0 &&
                selectedGuidelineIds.length < guidelines.length &&
                guidelines.some((g) => selectedGuidelineIds.includes(g.id));
              input.indeterminate = someSelected;
            }
          }}
          disabled={loading || guidelines.length === 0}
        />
      ),
      accessor: "id" as keyof GuidelineWithOrder,
      cell: (value: unknown, row: GuidelineWithOrder) => (
        <input
          type="checkbox"
          className="form-checkbox h-4 w-4 text-blue-600"
          checked={selectedGuidelineIds.includes(value as number)}
          onChange={() => handleSelectGuideline(value as number)}
        />
      ),
      className: "w-px px-4",
    },
    {
      header: "제목",
      accessor: "title" as keyof GuidelineWithOrder,
      cell: (value: unknown, row: GuidelineWithOrder) => (
        <span
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer block truncate max-w-xs"
          onClick={() => handleEditGuideline(row)}
          title={value as string}
        >
          {value as string}
        </span>
      ),
      className: "max-w-xs",
    },
    {
      header: "이미지",
      accessor: "imageUrl" as keyof GuidelineWithOrder,
      cell: (value: unknown) => {
        return (
          <div className="h-12 flex items-center justify-center">
            {value ? (
              <img
                src={value as string}
                alt="썸네일"
                className="max-h-full max-w-full object-contain"
              />
            ) : null}
          </div>
        );
      },
      className: "text-center px-2",
    },
    {
      header: "등록일",
      accessor: "createdAt" as keyof GuidelineWithOrder,
      cell: (value: unknown) => formatDateForDisplay(value as string | undefined),
    },
    {
      header: "조회",
      accessor: "id" as keyof GuidelineWithOrder,
      cell: (value: unknown, row: GuidelineWithOrder) => {
        const stats = viewStats[row.id];
        const totalViews = stats ? stats.totalViews : 0;
        const loggedInUsers = stats ? stats.loggedInUsers : 0;
        return (
          <span className="text-sm text-gray-600">
            {totalViews.toLocaleString()}
            <span className="text-blue-600">({loggedInUsers.toLocaleString()})</span>
          </span>
        );
      },
      className: "w-20 text-center",
    },
    {
      header: "공개 여부",
      accessor: "isPublic" as keyof GuidelineWithOrder,
      cell: (value: unknown) => {
        const isPublic = value === 1 || value === true;
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              isPublic ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {isPublic ? "공개" : "비공개"}
          </span>
        );
      },
      className: "text-center",
    },
    {
      header: "순서",
      accessor: "position" as keyof GuidelineWithOrder,
      cell: (value: unknown, row: GuidelineWithOrder, index: number) => (
        <input
          type="number"
          min={1}
          className="w-16 border rounded px-2 py-1 text-center"
          value={value as number}
          onChange={(e) => handlePositionInputChange(index, Number(e.target.value))}
          style={{ background: "#fff" }}
        />
      ),
      className: "w-20 text-center",
    },
    {
      header: "관리",
      accessor: "id" as keyof GuidelineWithOrder,
      cell: (value: unknown, row: GuidelineWithOrder, index: number) => (
        <div className="flex items-center space-x-1 justify-center">
          <ActionButton
            label="수정"
            action="edit"
            size="sm"
            onClick={() => handleEditGuideline(row)}
          />
          <ActionButton
            label="삭제"
            action="delete"
            size="sm"
            onClick={() => handleDeleteGuideline(value as number)}
          />
        </div>
      ),
      className: "text-center",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <SearchInput
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          onSearch={handleSearch}
        />
        <div className="flex space-x-2">
          {/* 엑셀 다운로드 버튼 */}
          <ExcelDownloadButton
            type={
              boardId === 3
                ? "guidelineCasino"
                : boardId === 4
                ? "guidelineSports"
                : "guidelineCrypto"
            }
            variant="outline"
            size="sm"
          >
            엑셀 다운로드
          </ExcelDownloadButton>
          <Button onClick={handleBulkPositionSave} variant="primary" disabled={loading || isSaving}>
            순서 저장
          </Button>
          <Button
            onClick={handleBulkDelete}
            variant="danger"
            disabled={selectedGuidelineIds.length === 0 || loading || isSaving}
          >
            {`선택 삭제 (${selectedGuidelineIds.length})`}
          </Button>
          <Button onClick={handleAddGuideline} disabled={loading || isSaving}>
            가이드라인 추가
          </Button>
        </div>
      </div>

      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />
      )}

      <LoadingOverlay isLoading={loading || isSaving} />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          columns={columns}
          data={guidelines}
          loading={loading}
          emptyMessage={searchValue ? "검색된 결과가 없습니다." : "등록된 가이드라인이 없습니다."}
          pagination={{
            currentPage: currentPage,
            pageSize: pageSize,
            totalItems: totalItems,
            onPageChange: handlePageChange,
          }}
        />
      </div>

      {currentGuideline && (
        <Modal
          isOpen={showModal}
          onClose={handleCloseModal}
          title={isEditing ? "가이드라인 수정" : "새 가이드라인 추가"}
          size="xl"
        >
          {modalError && (
            <div className="mb-4">
              <Alert type="error" message={modalError} onClose={() => setModalError(null)} />
            </div>
          )}

          <div className="flex justify-between items-center pt-2 pb-4 border-b border-gray-200 mb-4">
            <div className="flex space-x-2">
              <Button onClick={handleSaveGuideline} disabled={isSaving}>
                {isSaving ? "저장 중..." : isEditing ? "저장" : "추가"}
              </Button>
              <Button variant="outline" onClick={handleCloseModal} disabled={isSaving}>
                취소
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={currentGuideline.isPublic === 1}
                onChange={(e) =>
                  setCurrentGuideline({
                    ...currentGuideline,
                    isPublic: e.target.checked ? 1 : 0,
                  })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isSaving}
              />
              <label htmlFor="isPublic" className="text-sm font-medium text-gray-700">
                공개 여부
              </label>
            </div>
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <Input
              label="제목"
              name="title"
              value={currentGuideline.title || ""}
              onChange={(e) => setCurrentGuideline({ ...currentGuideline, title: e.target.value })}
              required
              disabled={isSaving}
            />

            <div className="flex items-end space-x-4">
              <div className="flex-grow">
                <FileUpload
                  label="썸네일 이미지 (선택 사항)"
                  name="imageUrl"
                  id="imageUrl"
                  onChange={handleFile}
                  value={currentGuideline.imageUrl || ""}
                  disabled={isSaving}
                />
              </div>
            </div>

            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                태그 (쉼표 또는 엔터로 구분)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {currentGuideline.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1.5 text-blue-600 hover:text-blue-800 focus:outline-none"
                      disabled={isSaving}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              <Input
                id="tags"
                name="tags"
                value={currentTagInput}
                onChange={handleTagInputChange}
                onKeyDown={handleTagInputKeyDown}
                placeholder="태그 입력 후 Enter 또는 ,"
                disabled={isSaving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
              <TextEditor
                content={currentGuideline.content || ""}
                setContent={handleEditorContentChange}
                readOnly={isSaving}
                height="300px"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default GuidelineManagement;
