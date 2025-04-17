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
import LoadingOverlay from "../../components/LoadingOverlay";
import { toast } from "react-toastify";
import {
  formatDateForDisplay,
  formatDateForInput,
  convertToISOString,
  getCurrentDateTimeLocalString,
} from "../../utils/dateUtils";

const MainBannerPage: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentBanner, setCurrentBanner] = useState<Banner | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // 파일 상태 관리
  const [pcImageFile, setPcImageFile] = useState<File | null>(null);
  const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);

  // 날짜 입력 처리 함수
  const handleDateChange = (name: string, dateString: string) => {
    if (!dateString) return;
    const isoDate = convertToISOString(dateString);
    handleInputChange(name, isoDate);
  };

  // 배너 목록 조회
  const fetchBanners = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await BannerApiService.getMainBanners();
      // API 응답의 형식에 맞게 데이터를 추출합니다
      if (response && Array.isArray(response)) {
        // 배너를 position 기준으로 내림차순 정렬 (높은 값이 위로)
        const sortedBanners = [...response].sort((a, b) => (b.position || 0) - (a.position || 0));
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
    setModalError(null);
    setCurrentBanner({
      id: 0,
      title: "",
      pUrl: "",
      mUrl: "",
      startDate: "",
      endDate: "",
      isPublic: 1,
      position: banners.length + 1, // 현재 배너 개수 + 1
      bannerType: "main",
    });
    setShowModal(true);
    setIsEditing(false);
  };

  // 배너 수정 모달 열기
  const handleEditBanner = (banner: Banner) => {
    setModalError(null);
    console.log("수정할 배너 데이터:", banner);

    const formattedStartDate = formatDateForInput(banner.startDate);
    const formattedEndDate = formatDateForInput(banner.endDate);

    console.log("DatePicker 표시용 시작일:", formattedStartDate);
    console.log("DatePicker 표시용 종료일:", formattedEndDate);

    setCurrentBanner({
      ...banner,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      isPublic: banner.isPublic === 1 ? 1 : 0,
    });

    setPcImageFile(null);
    setMobileImageFile(null);
    setShowModal(true);
    setIsEditing(true);
  };

  // 배너 저장 (추가 또는 수정)
  const handleSaveBanner = async () => {
    if (!currentBanner) return;

    try {
      // 필수 필드 검증
      if (!currentBanner.title || !currentBanner.startDate || !currentBanner.endDate) {
        setModalError("제목, 시작일, 종료일은 필수 항목입니다.");
        return;
      }

      // 저장 시작 시 로딩 상태 활성화
      setIsSaving(true);
      setModalError(null);

      if (isEditing && currentBanner.id) {
        // 수정 모드일 때
        try {
          // 날짜 형식 변환 - 로컬 시간 -> UTC ISO 문자열
          const startDate = new Date(currentBanner.startDate).toISOString();
          const endDate = new Date(currentBanner.endDate).toISOString();

          console.log("날짜 변환 전/후 비교:", {
            원래_시작일: currentBanner.startDate,
            변환된_시작일: startDate,
            원래_종료일: currentBanner.endDate,
            변환된_종료일: endDate,
          });

          // 서버 측 500 에러 디버깅을 위해 추가 로깅
          console.log("Banner data being sent:", {
            id: currentBanner.id,
            title: currentBanner.title,
            linkUrl: currentBanner.linkUrl,
            linkUrl2: null,
            startDate: startDate,
            endDate: endDate,
            isPublic: currentBanner.isPublic,
            position: currentBanner.position,
            bannerType: "main",
          });

          // 이미지 업로드 문제 확인을 위해 임시로 이미지 없이 업데이트 시도
          await BannerApiService.updateMainBanner(
            currentBanner.id,
            {
              id: currentBanner.id,
              title: currentBanner.title,
              linkUrl: currentBanner.linkUrl,
              linkUrl2: null,
              startDate: startDate,
              endDate: endDate,
              isPublic: currentBanner.isPublic,
              position: currentBanner.position,
              bannerType: "main",
            },
            pcImageFile,
            mobileImageFile
          );

          toast.success("배너가 수정되었습니다.");
        } catch (err) {
          console.error("Error updating banner:", err);
          const errorMsg =
            (err as any)?.response?.data?.message || "배너 수정 중 오류가 발생했습니다.";
          setModalError(errorMsg);
          return;
        }
      } else {
        // 추가 모드일 때 (pcImageFile과 mobileImageFile이 반드시 있어야 함)
        if (!pcImageFile || !mobileImageFile) {
          setModalError("PC 이미지와 모바일 이미지가 필요합니다.");
          return;
        }

        try {
          // 날짜 형식 변환 - 로컬 시간 -> UTC ISO 문자열
          const startDate = new Date(currentBanner.startDate).toISOString();
          const endDate = new Date(currentBanner.endDate).toISOString();

          // 현재 배너 개수 + 1을 position으로 설정
          const newPosition = banners.length + 1;
          console.log("Creating banner:", {
            data: {
              title: currentBanner.title,
              linkUrl: currentBanner.linkUrl,
              linkUrl2: null,
              startDate: startDate,
              endDate: endDate,
              isPublic: currentBanner.isPublic,
              position: newPosition,
              bannerType: "main",
            },
          });

          await BannerApiService.createMainBanner(
            {
              title: currentBanner.title,
              linkUrl: currentBanner.linkUrl,
              linkUrl2: null,
              startDate: startDate,
              endDate: endDate,
              isPublic: currentBanner.isPublic,
              position: newPosition,
              bannerType: "main",
            },
            pcImageFile,
            mobileImageFile
          );

          toast.success("배너가 추가되었습니다.");
        } catch (err) {
          console.error("Error creating banner:", err);
          const errorMsg =
            (err as any)?.response?.data?.message || "배너 추가 중 오류가 발생했습니다.";
          setModalError(errorMsg);
          return;
        }
      }

      setShowModal(false);
      setPcImageFile(null);
      setMobileImageFile(null);

      // 데이터 저장 후 서버가 처리할 시간을 약간 주기 위해 타임아웃 추가
      setTimeout(() => {
        fetchBanners();
      }, 500);
    } catch (err) {
      console.error("Error saving banner:", err);
      setModalError("배너 저장 중 예상치 못한 오류가 발생했습니다.");
    } finally {
      // 저장 완료 후 로딩 상태 비활성화
      setIsSaving(false);
    }
  };

  // 배너 삭제
  const handleDeleteBanner = async (id: number) => {
    if (!window.confirm("정말 이 배너를 삭제하시겠습니까?")) return;

    try {
      await BannerApiService.deleteMainBanner(id);
      toast.success("배너가 삭제되었습니다.");
      fetchBanners();
    } catch (err) {
      console.error("Error deleting banner:", err);
      toast.error("배너 삭제 중 오류가 발생했습니다.");
    }
  };

  // 배너 순서 변경
  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;

    const newBanners = [...banners];

    // 실제 배너 객체
    const currentBanner = newBanners[index]; // 현재 선택된 배너 (3번)
    const targetBanner = newBanners[index - 1]; // 위의 배너 (2번)

    // position 값 교환
    const currentPosition = currentBanner.position;
    const targetPosition = targetBanner.position;

    // position 값 교환
    currentBanner.position = targetPosition;
    targetBanner.position = currentPosition;

    // 배열 내 위치 교환
    newBanners[index] = targetBanner;
    newBanners[index - 1] = currentBanner;

    try {
      // 로컬 상태 먼저 업데이트
      setBanners(newBanners);

      // API를 통해 각 배너 개별적으로 업데이트
      await BannerApiService.updateMainBanner(
        currentBanner.id, // 현재 배너 (원래 3번)
        {
          id: currentBanner.id,
          position: currentBanner.position, // 변경된 position (2)
        },
        undefined,
        undefined
      );

      await BannerApiService.updateMainBanner(
        targetBanner.id, // 타겟 배너 (원래 2번)
        {
          id: targetBanner.id,
          position: targetBanner.position, // 변경된 position (3)
        },
        undefined,
        undefined
      );

      // API 호출이 성공한 후에만 서버에서 최신 데이터를 가져옴
      fetchBanners();
    } catch (err) {
      // 에러 발생 시 원래 순서로 되돌림
      fetchBanners();
      setModalError("배너 순서 변경 중 오류가 발생했습니다.");
      console.error("Error updating banner order:", err);
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index >= banners.length - 1) return;

    const newBanners = [...banners];

    // 실제 배너 객체
    const currentBanner = newBanners[index]; // 현재 선택된 배너 (2번)
    const targetBanner = newBanners[index + 1]; // 아래 배너 (3번)

    // position 값 교환
    const currentPosition = currentBanner.position;
    const targetPosition = targetBanner.position;

    // position 값 교환
    currentBanner.position = targetPosition;
    targetBanner.position = currentPosition;

    // 배열 내 위치 교환
    newBanners[index] = targetBanner;
    newBanners[index + 1] = currentBanner;

    try {
      // 로컬 상태 먼저 업데이트
      setBanners(newBanners);

      // API를 통해 각 배너 개별적으로 업데이트
      await BannerApiService.updateMainBanner(
        currentBanner.id, // 현재 배너 (원래 2번)
        {
          id: currentBanner.id,
          position: currentBanner.position, // 변경된 position (3)
        },
        undefined,
        undefined
      );

      await BannerApiService.updateMainBanner(
        targetBanner.id, // 타겟 배너 (원래 3번)
        {
          id: targetBanner.id,
          position: targetBanner.position, // 변경된 position (2)
        },
        undefined,
        undefined
      );

      // API 호출이 성공한 후에만 서버에서 최신 데이터를 가져옴
      fetchBanners();
    } catch (err) {
      // 에러 발생 시 원래 순서로 되돌림
      fetchBanners();
      setModalError("배너 순서 변경 중 오류가 발생했습니다.");
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
    setModalError(null);
    setShowModal(false);
    setPcImageFile(null);
    setMobileImageFile(null);
  };

  // 테이블 컬럼 정의
  const columns = [
    {
      header: "제목",
      accessor: "title" as keyof Banner,
      cell: (value: string, row: Banner) => (
        <span
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          onClick={() => handleEditBanner(row)}
        >
          {value}
        </span>
      ),
    },
    {
      header: "이미지",
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
    {
      header: "시작일",
      accessor: "startDate" as keyof Banner,
      cell: (value: string) => formatDateForDisplay(value),
    },
    {
      header: "종료일",
      accessor: "endDate" as keyof Banner,
      cell: (value: string) => formatDateForDisplay(value),
    },
    {
      header: "공개 여부",
      accessor: "isPublic" as keyof Banner,
      cell: (value: number | boolean, row: Banner) => {
        const isCurrentlyPublic = value === 1 || value === true;
        if (!isCurrentlyPublic) {
          return (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              비공개
            </span>
          );
        }
        const now = new Date();
        const startTime = row.startDate ? new Date(row.startDate) : null;
        const endTime = row.endDate ? new Date(row.endDate) : null;
        let status = "공개";
        let colorClass = "bg-green-100 text-green-800";
        if (startTime && now < startTime) {
          status = "공개 전";
          colorClass = "bg-gray-100 text-gray-800";
        } else if (endTime && now > endTime) {
          status = "공개 종료";
          colorClass = "bg-gray-100 text-gray-800";
        }
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
            {status}
          </span>
        );
      },
    },
    {
      header: "관리",
      accessor: "id" as keyof Banner,
      cell: (value: number, row: Banner, index: number) => (
        <div className="flex space-x-1">
          <ActionButton
            label="위로"
            action="up"
            size="sm"
            onClick={() => handleMoveUp(index)}
            disabled={index === 0}
          />
          <ActionButton
            label="아래로"
            action="down"
            size="sm"
            onClick={() => handleMoveDown(index)}
            disabled={index === banners.length - 1}
          />
          <ActionButton
            label="수정"
            action="edit"
            size="sm"
            onClick={() => handleEditBanner(row)}
          />
          <ActionButton
            label="삭제"
            action="delete"
            size="sm"
            onClick={() => handleDeleteBanner(value)}
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
          onClose={handleCloseModal}
          title={isEditing ? "배너 수정" : "새 배너 추가"}
          size="lg"
        >
          {/* Modal Error Display (Above top controls) */}
          {modalError && (
            <div className="mb-4">
              <Alert type="error" message={modalError} onClose={() => setModalError(null)} />
            </div>
          )}

          {/* Container for top controls - Similar to CompanyBannerPage */}
          <div className="flex justify-between items-center pt-2 pb-4 border-b border-gray-200 mb-4">
            {/* Left side: Action Buttons */}
            <div className="flex space-x-2">
              <Button onClick={handleSaveBanner} disabled={isSaving}>
                {isSaving ? "저장 중..." : isEditing ? "저장" : "추가"}
              </Button>
              <Button variant="outline" onClick={handleCloseModal} disabled={isSaving}>
                취소
              </Button>
            </div>

            {/* Right side: Public toggle */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={currentBanner.isPublic === 1}
                onChange={(e) => handleInputChange("isPublic", e.target.checked ? 1 : 0)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isSaving}
              />
              <label htmlFor="isPublic" className="text-sm font-medium text-gray-700">
                공개 여부
              </label>
            </div>
          </div>

          {/* Form content - Similar to CompanyBannerPage */}
          <div className="space-y-4">
            {/* Title */}
            <Input
              label="배너 제목"
              name="title"
              value={currentBanner.title || ""}
              onChange={(e) => handleInputChange("title", e.target.value)}
              required
              disabled={isSaving}
            />

            {/* PC and Mobile Images */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FileUpload
                label="PC 이미지 (권장 크기: 1260x270, 라운드 사이즈)"
                name="pUrl"
                id="pUrl"
                onChange={(file) => {
                  if (file) {
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
                disabled={isSaving}
              />

              <FileUpload
                label="모바일 이미지 (권장 크기: 370x140, 라운드 사이즈)"
                name="mUrl"
                id="mUrl"
                onChange={(file) => {
                  if (file) {
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
                disabled={isSaving}
              />
            </div>

            {/* Link URLs - 수정 */}
            <div>
              {" "}
              {/* 그리드 제거, 별도 div로 감싸기 */}
              <Input
                label="링크 URL"
                name="linkUrl"
                value={currentBanner.linkUrl || ""}
                onChange={(e) => handleInputChange("linkUrl", e.target.value)}
                placeholder="https://example.com"
                disabled={isSaving}
              />
            </div>

            {/* Start and End Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DatePicker
                label="시작일"
                value={currentBanner.startDate || ""}
                onChange={(date) => handleInputChange("startDate", date)}
                disabled={isSaving}
              />
              <DatePicker
                label="종료일"
                value={currentBanner.endDate || ""}
                onChange={(date) => handleInputChange("endDate", date)}
                disabled={isSaving}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* 로딩 오버레이 */}
      <LoadingOverlay isLoading={isSaving} />
    </div>
  );
};

export default MainBannerPage;
