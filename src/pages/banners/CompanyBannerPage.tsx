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

const CompanyBannerPage: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [currentBanner, setCurrentBanner] = useState<Partial<Banner> | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [pcImageFile, setPcImageFile] = useState<File | null>(null);
  const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);

  // 날짜 포맷 변환 함수
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
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
      const response = await BannerApiService.getCompanyBanners();
      // API 응답의 형식에 맞게 데이터를 추출합니다
      if (response && Array.isArray(response)) {
        // 배너를 position 기준으로 정렬
        const sortedBanners = [...response].sort((a, b) => (a.position || 0) - (b.position || 0));
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
      position: banners.length + 1, // 현재 배너 개수 + 1
      bannerType: "company",
      linkUrl: "",
      linkUrl2: "",
    });
    setPcImageFile(null);
    setMobileImageFile(null);
    setShowModal(true);
    setIsEditing(false);
  };

  // 배너 수정 모달 열기
  const handleEditBanner = (banner: Banner) => {
    // ISO 날짜 문자열을 datetime-local 형식으로 변환
    const formattedStartDate = banner.startDate
      ? (() => {
          const date = new Date(banner.startDate);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          const hours = String(date.getHours()).padStart(2, "0");
          const minutes = String(date.getMinutes()).padStart(2, "0");
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        })()
      : "";

    const formattedEndDate = banner.endDate
      ? (() => {
          const date = new Date(banner.endDate);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          const hours = String(date.getHours()).padStart(2, "0");
          const minutes = String(date.getMinutes()).padStart(2, "0");
          return `${year}-${month}-${day}T${hours}:${minutes}`;
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
        setAlertMessage({ type: "error", message: "제목, 시작일, 종료일은 필수 항목입니다." });
        return;
      }

      if (isEditing && currentBanner.id) {
        // 수정 모드일 때
        try {
          await BannerApiService.updateCompanyBanner(
            currentBanner.id,
            {
              id: currentBanner.id,
              title: currentBanner.title,
              startDate: currentBanner.startDate,
              endDate: currentBanner.endDate,
              isPublic: currentBanner.isPublic,
              position: currentBanner.position,
              bannerType: "company",
              linkUrl: currentBanner.linkUrl,
              linkUrl2: currentBanner.linkUrl2,
            },
            pcImageFile || undefined,
            mobileImageFile || undefined
          );

          setAlertMessage({ type: "success", message: "배너가 수정되었습니다." });
        } catch (err) {
          console.error("Error updating banner:", err);
          setAlertMessage({ type: "error", message: "배너 수정 중 오류가 발생했습니다." });
          return;
        }
      } else {
        // 추가 모드일 때 (pcImageFile과 mobileImageFile이 반드시 있어야 함)
        if (!pcImageFile || !mobileImageFile) {
          setAlertMessage({ type: "error", message: "PC 이미지와 모바일 이미지가 필요합니다." });
          return;
        }

        try {
          // 현재 배너 개수 + 1을 position으로 설정
          const newPosition = banners.length + 1;
          await BannerApiService.createCompanyBanner(
            {
              title: currentBanner.title,
              startDate: currentBanner.startDate,
              endDate: currentBanner.endDate,
              isPublic: currentBanner.isPublic,
              position: newPosition, // 현재 배너 개수 + 1
              bannerType: "company",
              linkUrl: currentBanner.linkUrl,
              linkUrl2: currentBanner.linkUrl2,
            },
            pcImageFile,
            mobileImageFile
          );

          setAlertMessage({ type: "success", message: "배너가 추가되었습니다." });
        } catch (err) {
          console.error("Error creating banner:", err);
          setAlertMessage({ type: "error", message: "배너 추가 중 오류가 발생했습니다." });
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
      await BannerApiService.deleteCompanyBanner(id);
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
      await BannerApiService.updateCompanyBanner(
        currentBanner.id,
        {
          id: currentBanner.id,
          position: currentBanner.position,
        },
        undefined,
        undefined
      );

      await BannerApiService.updateCompanyBanner(
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
      setAlertMessage({ type: "error", message: "배너 순서 변경 중 오류가 발생했습니다." });
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
      await BannerApiService.updateCompanyBanner(
        currentBanner.id,
        {
          id: currentBanner.id,
          position: currentBanner.position,
        },
        undefined,
        undefined
      );

      await BannerApiService.updateCompanyBanner(
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
      setAlertMessage({ type: "error", message: "배너 순서 변경 중 오류가 발생했습니다." });
      console.error("Error updating banner order:", err);
    }
  };

  // 테이블 컬럼 정의
  const columns = [
    { header: "순서", accessor: "position" as keyof Banner },
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
    {
      header: "링크 URL",
      accessor: "linkUrl" as keyof Banner,
    },
    {
      header: "링크 URL2",
      accessor: "linkUrl2" as keyof Banner,
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
      cell: (value: boolean, row: Banner) => {
        // 공개 여부가 false인 경우 단순히 "비공개"로 표시
        if (!value) {
          return (
            <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">비공개</span>
          );
        }

        // 현재 시간과 시작일/종료일 비교
        const now = new Date();
        const startDate = row.startDate ? new Date(row.startDate) : null;
        const endDate = row.endDate ? new Date(row.endDate) : null;

        // 공개 상태 결정
        let status = "공개";
        let colorClass = "bg-green-100 text-green-800";

        if (startDate && now < startDate) {
          status = "공개 전";
          colorClass = "bg-gray-100 text-gray-800";
        } else if (endDate && now > endDate) {
          status = "공개 종료";
          colorClass = "bg-gray-100 text-gray-800";
        }

        return <span className={`px-2 py-1 rounded-full text-xs ${colorClass}`}>{status}</span>;
      },
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
        <h1 className="text-2xl font-semibold">업체 배너 관리</h1>
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
              onChange={(e) => setCurrentBanner({ ...currentBanner, title: e.target.value })}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FileUpload
                label="PC 이미지 (권장 크기: 1920x400)"
                name="pUrl"
                id="pUrl"
                onChange={(file) => {
                  if (file) {
                    // 파일 선택 시 미리보기 URL 생성
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
                label="모바일 이미지 (권장 크기: 640x400)"
                name="mUrl"
                id="mUrl"
                onChange={(file) => {
                  if (file) {
                    // 파일 선택 시 미리보기 URL 생성
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="링크 URL"
                name="linkUrl"
                value={currentBanner.linkUrl || ""}
                onChange={(e) => setCurrentBanner({ ...currentBanner, linkUrl: e.target.value })}
                placeholder="https://example.com"
              />

              <Input
                label="링크 URL2"
                name="linkUrl2"
                value={currentBanner.linkUrl2 || ""}
                onChange={(e) => setCurrentBanner({ ...currentBanner, linkUrl2: e.target.value })}
                placeholder="https://example2.com"
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

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPublic"
                checked={currentBanner.isPublic}
                onChange={(e) => setCurrentBanner({ ...currentBanner, isPublic: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
                공개 여부
              </label>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                취소
              </Button>
              <Button onClick={handleSaveBanner}>{isEditing ? "저장" : "추가"}</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CompanyBannerPage;
