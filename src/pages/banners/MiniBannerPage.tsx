import React, { useState, useEffect } from "react";
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
import { toast } from "react-toastify";

const MiniBannerPage: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [currentBanner, setCurrentBanner] = useState<Partial<Banner> | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [pcImageFile, setPcImageFile] = useState<File | null>(null);
  const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);

  // 날짜 포맷 변환 함수
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";

    // ISO 형식 문자열을 Date 객체로 변환 (UTC 시간 기준)
    const date = new Date(dateStr);

    // 로컬 시간대로 변환
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}.${month}.${day} ${hours}:${minutes}`;
  };

  // 배너 목록 조회
  const fetchBanners = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await BannerApiService.getMiniBanners();
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
      bannerType: "mini",
      linkUrl: "",
    });
    setPcImageFile(null);
    setMobileImageFile(null);
    setShowModal(true);
    setIsEditing(false);
  };

  // 배너 수정 모달 열기
  const handleEditBanner = (banner: Banner) => {
    setModalError(null);
    // ISO 날짜 문자열을 datetime-local 형식으로 변환
    const formattedStartDate = banner.startDate
      ? (() => {
          // UTC 시간을 로컬 시간으로 변환
          const date = new Date(banner.startDate);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          const hours = String(date.getHours()).padStart(2, "0");
          const minutes = String(date.getMinutes()).padStart(2, "0");
          const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
          console.log("원본 시작일(미니):", banner.startDate, "변환된 시작일:", formattedDate);
          return formattedDate;
        })()
      : "";

    const formattedEndDate = banner.endDate
      ? (() => {
          // UTC 시간을 로컬 시간으로 변환
          const date = new Date(banner.endDate);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          const hours = String(date.getHours()).padStart(2, "0");
          const minutes = String(date.getMinutes()).padStart(2, "0");
          const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
          console.log("원본 종료일(미니):", banner.endDate, "변환된 종료일:", formattedDate);
          return formattedDate;
        })()
      : "";

    setCurrentBanner({
      ...banner,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
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

      setIsSaving(true);
      setModalError(null);

      if (isEditing && currentBanner.id) {
        // 수정 모드일 때
        try {
          // 날짜 형식 변환 - 로컬 시간 유지하면서 ISO 형식으로 변환
          // 브라우저에서 new Date()는 로컬 시간을 기준으로 하지만, toISOString()은 항상 UTC로 변환
          // 따라서 시간대 차이를 보정해야 함

          // 시간대 오프셋 계산 (분 단위)
          const tzOffset = new Date().getTimezoneOffset(); // 예: 한국은 -540 (UTC+9)

          // 시작일 변환
          const startDateObj = new Date(currentBanner.startDate);
          // 로컬 시간 유지를 위해 타임존 오프셋 적용 (UTC로 변환될 때 오프셋을 적용)
          startDateObj.setMinutes(startDateObj.getMinutes() - tzOffset);
          const startDate = startDateObj.toISOString();

          // 종료일 변환
          const endDateObj = new Date(currentBanner.endDate);
          // 로컬 시간 유지를 위해 타임존 오프셋 적용
          endDateObj.setMinutes(endDateObj.getMinutes() - tzOffset);
          const endDate = endDateObj.toISOString();

          console.log("날짜 변환 전/후 비교(미니):", {
            원래_시작일: currentBanner.startDate,
            변환된_시작일: startDate,
            원래_종료일: currentBanner.endDate,
            변환된_종료일: endDate,
            타임존_오프셋: tzOffset,
          });

          await BannerApiService.updateMiniBanner(
            currentBanner.id,
            {
              id: currentBanner.id,
              title: currentBanner.title,
              startDate: startDate, // 변환된 ISO 형식 사용
              endDate: endDate, // 변환된 ISO 형식 사용
              isPublic: currentBanner.isPublic === 1 ? 1 : 0,
              position: currentBanner.position,
              bannerType: "mini",
              linkUrl: currentBanner.linkUrl,
            },
            pcImageFile || undefined,
            mobileImageFile || undefined
          );

          toast.success("배너가 수정되었습니다.");
        } catch (err) {
          console.error("Error updating banner:", err);
          const errorMsg =
            (err as any)?.response?.data?.message || "배너 수정 중 오류가 발생했습니다.";
          setModalError(errorMsg);
          setIsSaving(false);
          return;
        }
      } else {
        // 추가 모드일 때 (pcImageFile과 mobileImageFile이 반드시 있어야 함)
        if (!pcImageFile || !mobileImageFile) {
          setModalError("PC 이미지와 모바일 이미지가 필요합니다.");
          setIsSaving(false);
          return;
        }

        try {
          // 시간대 오프셋 계산 (분 단위)
          const tzOffset = new Date().getTimezoneOffset(); // 예: 한국은 -540 (UTC+9)

          // 시작일 변환
          const startDateObj = new Date(currentBanner.startDate);
          // 로컬 시간 유지를 위해 타임존 오프셋 적용 (UTC로 변환될 때 오프셋을 적용)
          startDateObj.setMinutes(startDateObj.getMinutes() - tzOffset);
          const startDate = startDateObj.toISOString();

          // 종료일 변환
          const endDateObj = new Date(currentBanner.endDate);
          // 로컬 시간 유지를 위해 타임존 오프셋 적용
          endDateObj.setMinutes(endDateObj.getMinutes() - tzOffset);
          const endDate = endDateObj.toISOString();

          console.log("미니 배너 생성 날짜 변환:", {
            원래_시작일: currentBanner.startDate,
            변환된_시작일: startDate,
            원래_종료일: currentBanner.endDate,
            변환된_종료일: endDate,
            타임존_오프셋: tzOffset,
          });

          // 현재 배너 개수 + 1을 position으로 설정
          const newPosition = banners.length + 1;
          await BannerApiService.createMiniBanner(
            {
              title: currentBanner.title,
              startDate: startDate, // 변환된 ISO 형식 사용
              endDate: endDate, // 변환된 ISO 형식 사용
              isPublic: currentBanner.isPublic === 1 ? 1 : 0,
              position: newPosition, // 현재 배너 개수 + 1
              bannerType: "mini",
              linkUrl: currentBanner.linkUrl,
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
          setIsSaving(false);
          return;
        }
      }

      // 성공 후 모달 닫기, 배너 목록 다시 불러오기
      setShowModal(false);
      fetchBanners();
    } catch (error) {
      console.error("배너 저장 중 오류:", error);
      setModalError("배너 저장 중 예상치 못한 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // 배너 삭제
  const handleDeleteBanner = async (id: number) => {
    if (window.confirm("정말 이 배너를 삭제하시겠습니까?")) {
      try {
        await BannerApiService.deleteMiniBanner(id);
        toast.success("배너가 삭제되었습니다.");
        fetchBanners();
      } catch (error) {
        console.error("배너 삭제 중 오류:", error);
        toast.error("배너 삭제 중 오류가 발생했습니다.");
      }
    }
  };

  // 배너 순서 변경
  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;

    const newBanners = [...banners];

    // 실제 배너 객체
    const currentBanner = newBanners[index]; // 현재 선택된 배너
    const targetBanner = newBanners[index - 1]; // 위의 배너

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
      await BannerApiService.updateMiniBanner(
        currentBanner.id,
        {
          id: currentBanner.id,
          position: currentBanner.position,
        },
        undefined,
        undefined
      );

      await BannerApiService.updateMiniBanner(
        targetBanner.id,
        {
          id: targetBanner.id,
          position: targetBanner.position,
        },
        undefined,
        undefined
      );

      // API 호출이 성공한 후에만 서버에서 최신 데이터를 가져옴
      fetchBanners();
    } catch (err) {
      // 에러 발생 시 원래 순서로 되돌림
      fetchBanners();
      toast.error("배너 순서 변경 중 오류가 발생했습니다.");
      console.error("Error updating banner order:", err);
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index >= banners.length - 1) return;

    const newBanners = [...banners];

    // 실제 배너 객체
    const currentBanner = newBanners[index]; // 현재 선택된 배너
    const targetBanner = newBanners[index + 1]; // 아래 배너

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
      await BannerApiService.updateMiniBanner(
        currentBanner.id,
        {
          id: currentBanner.id,
          position: currentBanner.position,
        },
        undefined,
        undefined
      );

      await BannerApiService.updateMiniBanner(
        targetBanner.id,
        {
          id: targetBanner.id,
          position: targetBanner.position,
        },
        undefined,
        undefined
      );

      // API 호출이 성공한 후에만 서버에서 최신 데이터를 가져옴
      fetchBanners();
    } catch (err) {
      // 에러 발생 시 원래 순서로 되돌림
      fetchBanners();
      toast.error("배너 순서 변경 중 오류가 발생했습니다.");
      console.error("Error updating banner order:", err);
    }
  };

  // 모달 닫기 핸들러 추가
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
      cell: (value: string) => formatDate(value),
    },
    {
      header: "종료일",
      accessor: "endDate" as keyof Banner,
      cell: (value: string) => formatDate(value),
    },
    {
      header: "공개 여부",
      accessor: "isPublic" as keyof Banner,
      cell: (value: number, row: Banner) => {
        const isCurrentlyPublic = value === 1;
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
        <h1 className="text-2xl font-semibold">미니 배너 관리</h1>
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

          {/* Container for top controls */}
          <div className="flex justify-between items-center pt-2 pb-4 border-b border-gray-200 mb-4">
            <div className="flex space-x-2">
              <Button onClick={handleSaveBanner} disabled={isSaving}>
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
                checked={currentBanner.isPublic === 1}
                onChange={(e) =>
                  setCurrentBanner({ ...currentBanner, isPublic: e.target.checked ? 1 : 0 })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isSaving}
              />
              <label htmlFor="isPublic" className="text-sm font-medium text-gray-700">
                공개 여부
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="배너 제목"
              name="title"
              value={currentBanner.title || ""}
              onChange={(e) => setCurrentBanner({ ...currentBanner, title: e.target.value })}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FileUpload
                label="PC 이미지 (권장 크기: 620x130)"
                name="pUrl"
                id="pUrl"
                onChange={(file) => {
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setCurrentBanner({ ...currentBanner, pUrl: reader.result as string });
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
                label="모바일 이미지 (권장 크기: 370x170)"
                name="mUrl"
                id="mUrl"
                onChange={(file) => {
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setCurrentBanner({ ...currentBanner, mUrl: reader.result as string });
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

            <div>
              <Input
                label="링크 URL"
                name="linkUrl"
                value={currentBanner.linkUrl || ""}
                onChange={(e) => setCurrentBanner({ ...currentBanner, linkUrl: e.target.value })}
                placeholder="https://example.com"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DatePicker
                label="시작일"
                value={currentBanner.startDate || ""}
                onChange={(date) => setCurrentBanner({ ...currentBanner, startDate: date })}
              />
              <DatePicker
                label="종료일"
                value={currentBanner.endDate || ""}
                onChange={(date) => setCurrentBanner({ ...currentBanner, endDate: date })}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MiniBannerPage;
