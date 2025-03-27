import React, { useState, useEffect, useRef } from "react";
import { useNavigation } from "../../services/NavigationService";
import BannerApiService from "../../services/BannerApiService";
import { Banner } from "../../types";
import DataTable from "../../components/DataTable";
import Button from "../../components/Button";
import ActionButton from "../../components/ActionButton";
import Modal from "../../components/Modal";
import Input from "../../components/forms/Input";
import DatePicker from "../../components/forms/DatePicker";
import FileUpload from "../../components/forms/FileUpload";
import Alert from "../../components/Alert";

const MainBannerPage: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentBanner, setCurrentBanner] = useState<Banner | null>(null);
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // 파일 상태 관리
  const [pcImageFile, setPcImageFile] = useState<File | null>(null);
  const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);

  // 배너 목록 조회
  const fetchBanners = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await BannerApiService.getMainBanners();
      // API 응답의 형식에 맞게 데이터를 추출합니다
      if (response && Array.isArray(response)) {
        // 배너를 displayOrder 기준으로 정렬
        const sortedBanners = [...response].sort(
          (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)
        );
        setBanners(sortedBanners);
      } else {
        setBanners([]);
        setError("배너를 불러오는데 실패했습니다.");
      }
    } catch (err) {
      console.error("Error fetching banners:", err);
      setError("배너를 불러오는데 실패했습니다.");
      setBanners([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // 배너 추가 모달 열기
  const handleAddBanner = () => {
    setCurrentBanner({
      id: 0,
      title: "",
      pUrl: "",
      mUrl: "",
      startDate: "",
      endDate: "",
      isPublic: true,
      displayOrder:
        banners.length > 0 ? Math.max(...banners.map((b) => b.displayOrder || 0)) + 1 : 1,
      bannerType: "main",
    });
    setShowModal(true);
    setIsEditing(false);
  };

  // 배너 수정 모달 열기
  const handleEditBanner = (banner: Banner) => {
    setCurrentBanner({ ...banner });
    setShowModal(true);
    setIsEditing(true);
  };

  // 배너 저장 (추가 또는 수정)
  const handleSaveBanner = async () => {
    if (!currentBanner) return;

    try {
      // 필수 필드 검증
      if (!currentBanner.title || !currentBanner.startDate || !currentBanner.endDate) {
        setAlertMessage({ type: "error", message: "제목, 시작일, 종료일은 필수 항목입니다." });
        return;
      }

      // 이미지 검증 (새 배너 추가 시)
      if (!isEditing && !pcImageFile && !currentBanner.pUrl) {
        setAlertMessage({ type: "error", message: "PC 이미지는 필수 항목입니다." });
        return;
      }

      if (isEditing && currentBanner.id) {
        // 수정 모드일 때
        await BannerApiService.updateMainBanner(
          currentBanner.id,
          {
            title: currentBanner.title,
            startDate: currentBanner.startDate,
            endDate: currentBanner.endDate,
            isPublic: currentBanner.isPublic,
            displayOrder: currentBanner.displayOrder,
          },
          pcImageFile,
          mobileImageFile
        );

        setAlertMessage({ type: "success", message: "배너가 수정되었습니다." });
      } else {
        // 추가 모드일 때 (pcImageFile과 mobileImageFile이 반드시 있어야 함)
        if (pcImageFile && mobileImageFile) {
          await BannerApiService.createMainBanner(
            {
              title: currentBanner.title,
              startDate: currentBanner.startDate,
              endDate: currentBanner.endDate,
              isPublic: currentBanner.isPublic,
              displayOrder: currentBanner.displayOrder,
            },
            pcImageFile,
            mobileImageFile
          );

          setAlertMessage({ type: "success", message: "배너가 추가되었습니다." });
        } else {
          setAlertMessage({ type: "error", message: "PC 이미지와 모바일 이미지가 필요합니다." });
          return;
        }
      }

      setShowModal(false);
      setPcImageFile(null);
      setMobileImageFile(null);
      fetchBanners();
    } catch (err) {
      console.error("Error saving banner:", err);
      setAlertMessage({ type: "error", message: "배너 저장 중 오류가 발생했습니다." });
    }
  };

  // 배너 삭제
  const handleDeleteBanner = async (id: number) => {
    if (!window.confirm("정말 이 배너를 삭제하시겠습니까?")) return;

    try {
      await BannerApiService.deleteMainBanner(id);
      setAlertMessage({ type: "success", message: "배너가 삭제되었습니다." });
      fetchBanners();
    } catch (err) {
      console.error("Error deleting banner:", err);
      setAlertMessage({ type: "error", message: "배너 삭제 중 오류가 발생했습니다." });
    }
  };

  // 배너 순서 변경
  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;

    const newBanners = [...banners];
    const temp = newBanners[index].displayOrder || 0;
    newBanners[index].displayOrder = newBanners[index - 1].displayOrder || 0;
    newBanners[index - 1].displayOrder = temp;

    try {
      // API를 통해 각 배너 개별적으로 업데이트
      await BannerApiService.updateMainBanner(
        newBanners[index].id,
        { displayOrder: newBanners[index].displayOrder },
        undefined,
        undefined
      );

      await BannerApiService.updateMainBanner(
        newBanners[index - 1].id,
        { displayOrder: newBanners[index - 1].displayOrder },
        undefined,
        undefined
      );

      fetchBanners();
    } catch (err) {
      setAlertMessage({ type: "error", message: "배너 순서 변경 중 오류가 발생했습니다." });
      console.error("Error updating banner order:", err);
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index >= banners.length - 1) return;

    const newBanners = [...banners];
    const temp = newBanners[index].displayOrder || 0;
    newBanners[index].displayOrder = newBanners[index + 1].displayOrder || 0;
    newBanners[index + 1].displayOrder = temp;

    try {
      // API를 통해 각 배너 개별적으로 업데이트
      await BannerApiService.updateMainBanner(
        newBanners[index].id,
        { displayOrder: newBanners[index].displayOrder },
        undefined,
        undefined
      );

      await BannerApiService.updateMainBanner(
        newBanners[index + 1].id,
        { displayOrder: newBanners[index + 1].displayOrder },
        undefined,
        undefined
      );

      fetchBanners();
    } catch (err) {
      setAlertMessage({ type: "error", message: "배너 순서 변경 중 오류가 발생했습니다." });
      console.error("Error updating banner order:", err);
    }
  };

  // 입력 필드 변경 처리
  const handleInputChange = (name: string, value: any) => {
    if (!currentBanner) return;
    setCurrentBanner({ ...currentBanner, [name]: value });
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setShowModal(false);
    setPcImageFile(null);
    setMobileImageFile(null);
  };

  // 테이블 컬럼 정의
  const columns = [
    { header: "순서", accessor: "displayOrder" as keyof Banner },
    { header: "제목", accessor: "title" as keyof Banner },
    {
      header: "PC 이미지",
      accessor: "pUrl" as keyof Banner,
      cell: (value: string) => (
        <div className="w-20 h-12 bg-gray-100 flex items-center justify-center overflow-hidden">
          {value ? (
            <img src={value} alt="PC 배너" className="max-w-full max-h-full object-contain" />
          ) : (
            <span className="text-xs text-gray-500">이미지 없음</span>
          )}
        </div>
      ),
    },
    {
      header: "모바일 이미지",
      accessor: "mUrl" as keyof Banner,
      cell: (value: string) => (
        <div className="w-16 h-12 bg-gray-100 flex items-center justify-center overflow-hidden">
          {value ? (
            <img src={value} alt="모바일 배너" className="max-w-full max-h-full object-contain" />
          ) : (
            <span className="text-xs text-gray-500">이미지 없음</span>
          )}
        </div>
      ),
    },
    { header: "시작일", accessor: "startDate" as keyof Banner },
    { header: "종료일", accessor: "endDate" as keyof Banner },
    {
      header: "공개 여부",
      accessor: "isPublic" as keyof Banner,
      cell: (value: boolean) => (
        <span
          className={`px-2 py-1 rounded-full text-xs ${
            value ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {value ? "공개" : "비공개"}
        </span>
      ),
    },
    {
      header: "관리",
      accessor: "id" as keyof Banner,
      cell: (value: number, row: Banner, index: number) => (
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
            disabled={index === banners.length - 1}
            action="down"
            label="아래로"
            size="sm"
          />
          <ActionButton
            onClick={() => handleEditBanner(row)}
            action="edit"
            label="수정"
            size="sm"
          />
          <ActionButton
            onClick={() => handleDeleteBanner(value)}
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
        <h1 className="text-2xl font-semibold">메인 배너 관리</h1>
        <Button onClick={handleAddBanner} variant="primary">
          배너 추가
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
        data={banners}
        loading={loading}
        emptyMessage="등록된 배너가 없습니다."
      />

      {/* 배너 추가/수정 모달 */}
      {currentBanner && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={isEditing ? "배너 수정" : "새 배너 추가"}
          size="lg"
        >
          <div className="space-y-4">
            <Input
              label="배너 제목"
              name="title"
              value={currentBanner.title || ""}
              onChange={(e) => handleInputChange("title", e.target.value)}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FileUpload
                label="PC 이미지 (권장 크기: 1920x400)"
                name="pcImageUrl"
                id="pcImageUrl"
                onChange={(file) => {
                  if (file) {
                    // 파일 선택 시 미리보기 URL 생성
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      handleInputChange("pUrl", reader.result as string);
                    };
                    reader.readAsDataURL(file);
                    setPcImageFile(file);
                  } else {
                    setPcImageFile(null);
                  }
                }}
                value={currentBanner.pUrl}
                required
              />

              <FileUpload
                label="모바일 이미지 (권장 크기: 640x400)"
                name="mobileImageUrl"
                id="mobileImageUrl"
                onChange={(file) => {
                  if (file) {
                    // 파일 선택 시 미리보기 URL 생성
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      handleInputChange("mUrl", reader.result as string);
                    };
                    reader.readAsDataURL(file);
                    setMobileImageFile(file);
                  } else {
                    setMobileImageFile(null);
                  }
                }}
                value={currentBanner.mUrl}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DatePicker
                label="시작일"
                name="startDate"
                value={currentBanner.startDate || ""}
                onChange={(date) => handleInputChange("startDate", date)}
                required
              />

              <DatePicker
                label="종료일"
                name="endDate"
                value={currentBanner.endDate || ""}
                onChange={(date) => handleInputChange("endDate", date)}
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={currentBanner.isPublic || false}
                onChange={(e) => handleInputChange("isPublic", e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isPublic" className="text-sm font-medium text-gray-700">
                공개 여부
              </label>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="secondary" onClick={handleCloseModal}>
                취소
              </Button>
              <Button onClick={handleSaveBanner}>{isEditing ? "수정" : "추가"}</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MainBannerPage;
