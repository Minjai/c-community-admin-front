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
      console.log("가이드라인 응답 전체 구조:", response); // 전체 응답 구조 확인

      // 응답 구조를 더 자세히 확인
      if (response?.data) {
        console.log("response.data 구조:", response.data);
      }
      if (response?.data?.data) {
        console.log("response.data.data 구조:", response.data.data);
        // 중요: 첫 번째 객체의 구조를 자세히 로그
        if (Array.isArray(response.data.data) && response.data.data.length > 0) {
          console.log("첫 번째 데이터 객체 구조:", response.data.data[0]);
          console.log("모든 키:", Object.keys(response.data.data[0]));
        }
      }

      // 페이지네이션 정보 확인
      if (response?.data?.pagination) {
        console.log("페이지네이션 정보:", response.data.pagination);
      }

      // 가이드라인 데이터 추출 시도
      let dataArray = null;
      let extractedData = null;

      // 1. response.data가 배열인 경우
      if (response?.data && Array.isArray(response.data)) {
        dataArray = response.data;
        console.log("case 1: response.data는 배열입니다");
      }
      // 2. response.data.data가 배열인 경우
      else if (response?.data?.data && Array.isArray(response.data.data)) {
        dataArray = response.data.data;
        console.log("case 2: response.data.data는 배열입니다");
      }
      // 3. response.data.data가 객체이고 내부에 배열 필드가 있는 경우
      else if (response?.data?.data && typeof response.data.data === "object") {
        console.log("case 3: response.data.data는 객체입니다");
        // 가능한 배열 필드 이름들
        const possibleArrayFields = ["guidelines", "posts", "items", "list", "results", "posts"];

        for (const field of possibleArrayFields) {
          if (Array.isArray(response.data.data[field])) {
            dataArray = response.data.data[field];
            console.log(`데이터 배열 필드 발견: ${field}`, dataArray);
            break;
          }
        }

        // 직접 객체 내용 확인
        if (!dataArray) {
          console.log("객체 내 모든 키 확인:", Object.keys(response.data.data));
          // 첫 번째 배열 형태의 값을 찾아 사용
          for (const key in response.data.data) {
            if (Array.isArray(response.data.data[key])) {
              dataArray = response.data.data[key];
              console.log(`배열 형태의 데이터 발견(${key}):`, dataArray);
              break;
            }
          }
        }
      }
      // 4. response.success가 true이고 response.data 자체가 가이드라인 데이터인 경우
      else if (response?.success === true && response?.data) {
        console.log("case 4: response.success가 true이고 data가 있습니다");
        // response.data가 가이드라인 객체 자체일 수 있음
        extractedData = response.data;
      }

      // 페이지네이션이 있는 경우 별도 처리
      if (response?.data?.pagination && response?.data?.posts) {
        console.log("페이지네이션 구조 데이터 발견:", response.data.posts);
        dataArray = response.data.posts;
      }

      // 데이터가 객체이고 posts 속성을 가진 경우
      if (!dataArray && extractedData && extractedData.posts) {
        console.log("posts 속성을 가진 객체 발견:", extractedData.posts);
        dataArray = extractedData.posts;
      }

      // response.data에 items 배열이 있는 경우 (로그에서 확인된 실제 구조)
      if (!dataArray && response?.data?.items && Array.isArray(response.data.items)) {
        console.log("response.data.items 배열 발견:", response.data.items);
        dataArray = response.data.items;
      }

      // 데이터가 객체이고 posts 속성을 가진 경우
      if (!dataArray && extractedData && extractedData.posts) {
        console.log("posts 속성을 가진 객체 발견:", extractedData.posts);
        dataArray = extractedData.posts;
      }

      // extractedData에 items 배열이 있는 경우
      if (
        !dataArray &&
        extractedData &&
        extractedData.items &&
        Array.isArray(extractedData.items)
      ) {
        console.log("extractedData.items 배열 발견:", extractedData.items);
        dataArray = extractedData.items;
      }

      // 추출된 데이터 배열이 있으면 정렬하여 표시
      if (dataArray && dataArray.length > 0) {
        console.log("추출된 데이터 배열:", dataArray);

        // 데이터 매핑 - 필드명이 다를 수 있으므로 확인
        const mappedData = dataArray.map((item: any) => {
          console.log("매핑 전 항목:", item);
          // 필수 필드가 없는 경우 로그
          if (!item.id || !item.title) {
            console.warn("주요 필드가 없는 항목:", item);
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

        console.log("매핑된 데이터:", mappedData);

        // 정렬
        const sortedGuidelines = [...mappedData].sort(
          (a: GuidelineWithOrder, b: GuidelineWithOrder) =>
            (a.position || a.displayOrder || 0) - (b.position || b.displayOrder || 0)
        );

        setGuidelines(sortedGuidelines);
      } else {
        console.log("적절한 데이터 배열을 찾지 못했습니다.");
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
        setAlertMessage({ type: "error", message: "제목과 내용은 필수 항목입니다." });
        return;
      }

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
