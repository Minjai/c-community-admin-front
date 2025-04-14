import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import { formatDate } from "@/utils/dateUtils";
import { toast } from "react-toastify";

// Guideline 타입에 position과 displayOrder가 선택적으로 포함될 수 있도록 확장
interface GuidelineWithOrder extends Guideline {
  position?: number;
  displayOrder?: number;
}

const GuidelineManagement = ({ boardId = 3 }) => {
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

  // 가이드라인 목록 조회
  const fetchGuidelines = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await GuidelineApiService.getGuidelines(boardId);
      // Log removed

      // 응답 구조를 더 자세히 확인
      if (response?.data) {
        // Log removed
      }
      if (response?.data?.data) {
        // Log removed
        // 중요: 첫 번째 객체의 구조를 자세히 로그
        if (Array.isArray(response.data.data) && response.data.data.length > 0) {
          // Log removed
          // Log removed
        }
      }

      // 페이지네이션 정보 확인
      if (response?.data?.pagination) {
        // Log removed
      }

      // 가이드라인 데이터 추출 시도
      let dataArray = null;
      let extractedData = null;

      // 1. response.data가 배열인 경우
      if (response?.data && Array.isArray(response.data)) {
        dataArray = response.data;
        // Log removed
      }
      // 2. response.data.data가 배열인 경우
      else if (response?.data?.data && Array.isArray(response.data.data)) {
        dataArray = response.data.data;
        // Log removed
      }
      // 3. response.data.data가 객체이고 내부에 배열 필드가 있는 경우
      else if (response?.data?.data && typeof response.data.data === "object") {
        // Log removed
        // 가능한 배열 필드 이름들
        const possibleArrayFields = ["guidelines", "posts", "items", "list", "results", "posts"];

        for (const field of possibleArrayFields) {
          if (Array.isArray(response.data.data[field])) {
            dataArray = response.data.data[field];
            // Log removed
            break;
          }
        }

        // 직접 객체 내용 확인
        if (!dataArray) {
          // Log removed
          // 첫 번째 배열 형태의 값을 찾아 사용
          for (const key in response.data.data) {
            if (Array.isArray(response.data.data[key])) {
              dataArray = response.data.data[key];
              // Log removed
              break;
            }
          }
        }
      }
      // 4. response.success가 true이고 response.data 자체가 가이드라인 데이터인 경우
      else if (response?.success === true && response?.data) {
        // Log removed
        // response.data가 가이드라인 객체 자체일 수 있음
        extractedData = response.data;
      }

      // 페이지네이션이 있는 경우 별도 처리
      if (response?.data?.pagination && response?.data?.posts) {
        // Log removed
        dataArray = response.data.posts;
      }

      // 데이터가 객체이고 posts 속성을 가진 경우
      if (!dataArray && extractedData && extractedData.posts) {
        // Log removed
        dataArray = extractedData.posts;
      }

      // response.data에 items 배열이 있는 경우 (로그에서 확인된 실제 구조)
      if (!dataArray && response?.data?.items && Array.isArray(response.data.items)) {
        // Log removed
        dataArray = response.data.items;
      }

      // 데이터가 객체이고 posts 속성을 가진 경우
      if (!dataArray && extractedData && extractedData.posts) {
        // Log removed
        dataArray = extractedData.posts;
      }

      // extractedData에 items 배열이 있는 경우
      if (
        !dataArray &&
        extractedData &&
        extractedData.items &&
        Array.isArray(extractedData.items)
      ) {
        // Log removed
        dataArray = extractedData.items;
      }

      // 추출된 데이터 배열이 있으면 정렬하여 표시
      if (dataArray && dataArray.length > 0) {
        // Log removed

        // 데이터 매핑 - 필드명이 다를 수 있으므로 확인
        const mappedData = dataArray.map((item: any) => {
          // Log removed
          // 필수 필드가 없는 경우 로그
          if (!item.id || !item.title) {
            // Log removed
          }

          return {
            id: item.id,
            title: item.title || "제목 없음",
            content: item.content || "",
            createdAt: item.createdAt || item.created_at || new Date().toISOString(),
            isPublic: item.isPublic !== undefined ? item.isPublic : item.is_public || 1,
            imageUrl: item.imageUrl || item.image_url || "",
            position: item.position || item.displayOrder || 0,
            displayOrder: item.displayOrder || item.position || 0,
          };
        });

        // Log removed

        // position 값이 높은 순서대로 내림차순 정렬
        const sortedGuidelines = [...mappedData].sort(
          (a: GuidelineWithOrder, b: GuidelineWithOrder) =>
            (b.position || b.displayOrder || 0) - (a.position || a.displayOrder || 0)
        );
        setGuidelines(sortedGuidelines);
        setError(null); // 성공적으로 데이터 로드
      } else if (
        // 성공적인 응답이지만 데이터가 없는 다양한 케이스 처리
        (response?.success === true &&
          Array.isArray(response.data) &&
          response.data.length === 0) ||
        (dataArray && dataArray.length === 0) ||
        response?.data?.total === 0 ||
        response?.total === 0
      ) {
        // 정상 응답이지만 데이터가 없는 경우 (빈 배열)
        // Log removed
        setGuidelines([]);
        setError(null); // 성공적인 응답이므로 에러 메시지 삭제
      } else {
        // Log removed
        setGuidelines([]);
        setError(`${title} 가이드라인을 불러오는데 실패했습니다.`);
      }
    } catch (err) {
      // Error logging removed
      setError(`${title} 가이드라인을 불러오는데 실패했습니다.`);
      setGuidelines([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuidelines();
  }, [boardId]);

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
      isPublic: 1, // boolean true 대신 number 1 사용
      position: guidelines.length + 1, // 기본 순서
      imageUrl: "",
    });
    setImageFile(null);
    setShowModal(true);
    setIsEditing(false);
    setPreviewUrl(null);
  };

  // 모달 열기 (수정)
  const handleEditGuideline = (guideline: GuidelineWithOrder) => {
    setModalError(null); // Reset modal error
    // Boolean 타입인 isPublic을 Number 타입으로 변환
    const convertedGuideline = {
      ...guideline,
      isPublic: guideline.isPublic === true || guideline.isPublic === 1 ? 1 : 0,
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
        isPublic: isPublicValue, // 변환된 값 사용
        position: currentGuideline.position,
        image: imageFile || undefined,
        // tags: currentGuideline.tags // 태그 필드가 있다면 추가
      };

      if (isEditing && currentGuideline.id) {
        await GuidelineApiService.updateGuideline(currentGuideline.id, dataToSend);
        toast.success("가이드라인이 수정되었습니다.");
      } else {
        await GuidelineApiService.createGuideline(dataToSend);
        toast.success("새 가이드라인이 추가되었습니다.");
      }

      setShowModal(false);
      fetchGuidelines();
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
      fetchGuidelines();
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

      fetchGuidelines(); // 목록 새로고침
    } catch (err) {
      // Error logging removed
      toast.error("순서 변경 중 오류가 발생했습니다.");
      fetchGuidelines(); // 에러 시 원상복구
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

      fetchGuidelines();
    } catch (err) {
      // Error logging removed
      toast.error("순서 변경 중 오류가 발생했습니다.");
      fetchGuidelines();
    }
  };

  // 모달 닫기 핸들러 추가
  const handleCloseModal = () => {
    setModalError(null);
    setShowModal(false);
    setImageFile(null); // Reset image file on close
    setPreviewUrl(null);
  };

  // DataTable 컬럼 정의
  const columns = [
    { header: "제목", accessor: "title" as keyof GuidelineWithOrder },
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
      cell: (value: string) => formatDate(value),
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
              onChange={(e) => setCurrentGuideline({ ...currentGuideline, title: e.target.value })}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
              <div className="border border-gray-300 rounded-md bg-white">
                <TextEditor
                  content={currentGuideline.content || ""}
                  setContent={handleEditorContentChange}
                  height="200px"
                />
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default GuidelineManagement;
