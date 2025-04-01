import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Post as Guideline } from "@/types";
import GuidelineApiService from "@/services/GuidelineApiService";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import ActionButton from "@/components/ActionButton";
import Modal from "@/components/Modal";
import Input from "@/components/forms/Input";
import TextEditor from "@/components/forms/TextEditor";
import FileUpload from "@/components/forms/FileUpload";
import Alert from "@/components/Alert";
import { formatDate } from "@/utils/dateUtils";

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
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

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

      if (response?.data && Array.isArray(response.data)) {
        // displayOrder 또는 position 필드를 기준으로 정렬
        const sortedGuidelines = [...response.data].sort(
          (
            a: GuidelineWithOrder,
            b: GuidelineWithOrder // 타입 명시
          ) => (a.position || a.displayOrder || 0) - (b.position || b.displayOrder || 0)
        );
        setGuidelines(sortedGuidelines);
      } else {
        setGuidelines([]);
        setError(`${title} 가이드라인을 불러오는데 실패했습니다.`);
      }
    } catch (err) {
      console.error(`Error fetching ${title} guidelines:`, err);
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
    setCurrentGuideline({
      title: "",
      content: "",
      boardId: boardId,
      isPublic: true,
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
    // GuidelineWithOrder 사용
    setCurrentGuideline({ ...guideline });
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
        setAlertMessage({ type: "error", message: "제목과 내용은 필수 항목입니다." });
        return;
      }

      const dataToSend = {
        title: currentGuideline.title,
        content: currentGuideline.content,
        boardId: boardId,
        isPublic: currentGuideline.isPublic,
        position: currentGuideline.position,
        image: imageFile || undefined,
        // tags: currentGuideline.tags // 태그 필드가 있다면 추가
      };

      if (isEditing && currentGuideline.id) {
        await GuidelineApiService.updateGuideline(currentGuideline.id, dataToSend);
        setAlertMessage({ type: "success", message: "가이드라인이 수정되었습니다." });
      } else {
        await GuidelineApiService.createGuideline(dataToSend);
        setAlertMessage({ type: "success", message: "새 가이드라인이 추가되었습니다." });
      }

      setShowModal(false);
      fetchGuidelines();
    } catch (error) {
      console.error("Error saving guideline:", error);
      setAlertMessage({ type: "error", message: "가이드라인 저장 중 오류가 발생했습니다." });
    }
  };

  // 가이드라인 삭제
  const handleDeleteGuideline = async (id: number) => {
    if (!window.confirm("정말 이 가이드라인을 삭제하시겠습니까?")) return;

    try {
      await GuidelineApiService.deleteGuideline(id);
      setAlertMessage({ type: "success", message: "가이드라인이 삭제되었습니다." });
      fetchGuidelines();
    } catch (err) {
      console.error("Error deleting guideline:", err);
      setAlertMessage({ type: "error", message: "가이드라인 삭제 중 오류가 발생했습니다." });
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
      console.error("Error moving guideline up:", err);
      setAlertMessage({ type: "error", message: "순서 변경 중 오류가 발생했습니다." });
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
      console.error("Error moving guideline down:", err);
      setAlertMessage({ type: "error", message: "순서 변경 중 오류가 발생했습니다." });
      fetchGuidelines();
    }
  };

  // DataTable 컬럼 정의
  const columns = [
    {
      header: "순서",
      accessor: "position" as keyof GuidelineWithOrder, // GuidelineWithOrder 사용
      cell: (value: any, row: GuidelineWithOrder) => (
        <div className="text-center">
          <span className="font-medium">{row.position ?? row.displayOrder ?? "-"}</span>
        </div>
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
    { header: "제목", accessor: "title" as keyof GuidelineWithOrder },
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
        data={guidelines}
        loading={loading}
        emptyMessage="등록된 가이드라인이 없습니다."
      />

      {/* 가이드라인 추가/수정 모달 */}
      {currentGuideline && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={isEditing ? "가이드라인 수정" : "새 가이드라인 추가"}
          size="xl"
        >
          <div className="space-y-4">
            <Input
              label="제목"
              value={currentGuideline.title || ""}
              onChange={(e) => setCurrentGuideline({ ...currentGuideline, title: e.target.value })}
              required
            />

            <FileUpload
              label="썸네일 이미지"
              id="guidelineImage"
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
              <TextEditor
                content={currentGuideline.content || ""}
                setContent={(content: string) =>
                  setCurrentGuideline({ ...currentGuideline, content })
                }
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={currentGuideline.isPublic === true || currentGuideline.isPublic === 1}
                onChange={(e) =>
                  setCurrentGuideline({
                    ...currentGuideline,
                    isPublic: e.target.checked ? 1 : 0,
                  })
                }
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
                공개 여부
              </label>
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              취소
            </Button>
            <Button variant="primary" onClick={handleSaveGuideline}>
              저장
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default GuidelineManagement;
