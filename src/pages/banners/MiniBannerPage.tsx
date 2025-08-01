import React, { useState, useEffect, useRef } from "react";
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
import {
  formatDateForDisplay,
  formatDateForInput,
  convertToISOString,
  getCurrentDateTimeLocalString,
} from "../../utils/dateUtils";
import LoadingOverlay from "../../components/LoadingOverlay";
import SearchInput from "@components/SearchInput.tsx";
import ExcelDownloadButton from "../../components/ExcelDownloadButton";

const MiniBannerPage: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [currentBanner, setCurrentBanner] = useState<Banner | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [pcImageFile, setPcImageFile] = useState<File | null>(null);
  const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);

  // 검색 value 상태
  const [searchValue, setSearchValue] = useState<string>("");

  // 페이지네이션 상태 추가
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);

  // 선택된 배너 ID 상태 추가
  const [selectedBannerIds, setSelectedBannerIds] = useState<number[]>([]);

  // 원본 배너 데이터 참조 (순서 변경 시 비교용)
  const originalBannersRef = useRef<Banner[]>([]);

  // 조회수 통계 상태 추가
  const [viewStats, setViewStats] = useState<{
    [key: number]: { anonymousUsers: number; loggedInUsers: number; totalViews: number };
  }>({});

  const handleSearch = (type: string, value: string) => {
    if (type === "title") {
      fetchBanners(currentPage, pageSize, value).then((r) => {
        // 검색 후 선택된 배너 ID 초기화
        setSelectedBannerIds([]);
      });
    }
  };

  // 배너 목록 조회
  const fetchBanners = async (page: number = 1, limit: number = 10, searchValue: string = "") => {
    setLoading(true);
    setError("");

    try {
      const response = await BannerApiService.getMiniBanners(page, limit, searchValue);
      if (response && response.success && Array.isArray(response.data)) {
        // position 기준 오름차순 정렬 (작은 값이 위로), position이 같으면 createdAt 내림차순(최신이 위)
        const sortedBanners = [...response.data].sort((a, b) => {
          if ((a.position || 0) !== (b.position || 0)) {
            return (a.position || 0) - (b.position || 0);
          }
          // position이 같으면 createdAt 내림차순(최신이 위)
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        setBanners(sortedBanners);
        originalBannersRef.current = sortedBanners; // fetchBanners에서만 원본 저장

        // 조회수 통계 저장
        if (response.contentViewStats) {
          setViewStats(response.contentViewStats);
        }

        if (response.pagination) {
          setTotalPages(response.pagination.totalPages);
          setCurrentPage(response.pagination.currentPage);
          setPageSize(response.pagination.pageSize);
          setTotalItems(response.pagination.totalItems);
        } else {
          setTotalPages(1);
          setCurrentPage(1);
          setTotalItems(sortedBanners.length);
        }
      } else {
        setBanners([]);
        setError("배너를 불러오는데 실패했습니다.");
        setTotalPages(1);
        setCurrentPage(1);
        setTotalItems(0);
      }
    } catch (err) {
      console.error("Error fetching banners:", err);
      setError("배너를 불러오는데 실패했습니다.");
      setBanners([]);
      setTotalPages(1);
      setCurrentPage(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners(currentPage, pageSize);
  }, []);

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      fetchBanners(page, pageSize, searchValue);
    }
  };

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
      position: 0, // 새 배너는 항상 0번 순서
      bannerType: "mini",
      pDescription: null,
      mDescription: null,
      linkUrl: null,
      showButton: false,
      buttonText: "",
      buttonColor: "#000000",
    });
    setPcImageFile(null);
    setMobileImageFile(null);
    setShowModal(true);
    setIsEditing(false);
  };

  // 배너 수정 모달 열기
  const handleEditBanner = (banner: Banner) => {
    setModalError(null);

    const formattedStartDate = formatDateForInput(banner.startDate);
    const formattedEndDate = formatDateForInput(banner.endDate);

    setCurrentBanner({
      ...banner,
      pcImage: banner.pUrl,
      mobileImage: banner.mUrl,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      isPublic: banner.isPublic === 1 ? 1 : 0,
      pDescription: banner.pDescription || null,
      mDescription: banner.mDescription || null,
      linkUrl: banner.linkUrl || null,
      showButton: banner.showButton || false,
      buttonText: banner.buttonText || "",
      buttonColor: banner.buttonColor || "#000000",
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

      // 링크 URL 필수 검증
      if (!currentBanner.linkUrl || currentBanner.linkUrl.trim() === "") {
        setModalError("링크 등록은 필수 항목입니다.");
        return;
      }

      setIsSaving(true);
      setModalError(null);

      if (isEditing && currentBanner.id) {
        // 수정 모드일 때
        try {
          // 날짜 형식 변환 - 로컬 시간 -> UTC ISO 문자열
          const startDate = new Date(currentBanner.startDate).toISOString();
          const endDate = new Date(currentBanner.endDate).toISOString();

          await BannerApiService.updateMiniBanner(
            currentBanner.id,
            {
              id: currentBanner.id,
              title: currentBanner.title,
              startDate: startDate,
              endDate: endDate,
              isPublic: currentBanner.isPublic,
              position: currentBanner.position,
              bannerType: "mini",
              pDescription: currentBanner.pDescription,
              mDescription: currentBanner.mDescription,
              linkUrl: currentBanner.linkUrl,
              showButton: currentBanner.showButton,
              buttonText: currentBanner.buttonText,
              buttonColor: currentBanner.buttonColor,
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
          // 새 배너는 position 0으로 생성
          const startDate = new Date(currentBanner.startDate).toISOString();
          const endDate = new Date(currentBanner.endDate).toISOString();

          await BannerApiService.createMiniBanner(
            {
              title: currentBanner.title,
              startDate: startDate,
              endDate: endDate,
              isPublic: currentBanner.isPublic,
              position: 0, // 새 배너는 항상 0번 순서
              bannerType: "mini",
              pDescription: currentBanner.pDescription,
              mDescription: currentBanner.mDescription,
              linkUrl: currentBanner.linkUrl,
              showButton: currentBanner.showButton,
              buttonText: currentBanner.buttonText,
              buttonColor: currentBanner.buttonColor,
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
      fetchBanners(currentPage, pageSize);
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
        fetchBanners(currentPage, pageSize);
        // Ensure deleted ID is removed from selection
        setSelectedBannerIds((prev) => prev.filter((bannerId) => bannerId !== id));
      } catch (error: any) {
        console.error("배너 삭제 중 오류:", error);
        toast.error(error.response?.data?.message || "배너 삭제 중 오류가 발생했습니다.");
      }
    }
  };

  // 선택된 배너 일괄 삭제
  const handleBulkDelete = async () => {
    if (selectedBannerIds.length === 0) {
      toast.info("삭제할 배너를 선택해주세요.");
      return;
    }
    if (!window.confirm(`선택된 ${selectedBannerIds.length}개의 배너를 정말 삭제하시겠습니까?`))
      return;

    try {
      setLoading(true);
      const deletePromises = selectedBannerIds.map(
        (id) => BannerApiService.deleteMiniBanner(id) // Use deleteMiniBanner
      );
      await Promise.allSettled(deletePromises);

      toast.success(`${selectedBannerIds.length}개의 배너가 삭제되었습니다.`);
      fetchBanners(currentPage, pageSize);
      setSelectedBannerIds([]);
    } catch (error: any) {
      console.error("배너 일괄 삭제 중 오류 발생:", error);
      toast.error("배너 삭제 중 일부 오류가 발생했습니다. 목록을 확인해주세요.");
      fetchBanners(currentPage, pageSize);
      setSelectedBannerIds([]);
    } finally {
      setLoading(false);
    }
  };

  // 개별 배너 선택/해제
  const handleSelectBanner = (id: number) => {
    setSelectedBannerIds((prevSelected) => {
      if (prevSelected.includes(id)) {
        return prevSelected.filter((bannerId) => bannerId !== id);
      } else {
        return [...prevSelected, id];
      }
    });
  };

  // 현재 페이지의 모든 배너 선택/해제
  const handleSelectAllBanners = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const currentPageBannerIds = banners.map((banner) => banner.id);
      setSelectedBannerIds(currentPageBannerIds);
    } else {
      setSelectedBannerIds([]);
    }
  };

  // position 입력값 변경 핸들러 (공통 함수)
  const handlePositionInputChange = (index: number, newPosition: number) => {
    setBanners((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], position: newPosition };
      return updated;
    });
  };

  // position 일괄 저장 핸들러 (공통 함수)
  const handleBulkPositionSave = async () => {
    setLoading(true);
    try {
      // 변경된 배너만 추출
      const changed = banners.filter(
        (b, i) => b.position !== originalBannersRef.current[i]?.position
      );
      if (changed.length === 0) {
        toast.info("변경된 순서가 없습니다.");
        setLoading(false);
        return;
      }
      await Promise.all(
        changed.map((banner) =>
          BannerApiService.updateMiniBanner(banner.id, { id: banner.id, position: banner.position })
        )
      );
      toast.success("순서가 저장되었습니다.");
      fetchBanners(currentPage, pageSize);
    } catch (err) {
      toast.error("순서 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 테이블 컬럼 정의
  const columns = [
    {
      header: (
        <input
          type="checkbox"
          className="form-checkbox h-4 w-4 text-blue-600"
          onChange={handleSelectAllBanners}
          checked={
            banners.length > 0 &&
            selectedBannerIds.length === banners.length &&
            banners.every((banner) => selectedBannerIds.includes(banner.id))
          }
          ref={(input) => {
            if (input) {
              const someSelected =
                selectedBannerIds.length > 0 &&
                selectedBannerIds.length < banners.length &&
                banners.some((banner) => selectedBannerIds.includes(banner.id));
              input.indeterminate = someSelected;
            }
          }}
          disabled={loading || banners.length === 0}
        />
      ),
      accessor: "id" as keyof Banner,
      cell: (value: unknown, row: Banner) => (
        <input
          type="checkbox"
          className="form-checkbox h-4 w-4 text-blue-600"
          checked={selectedBannerIds.includes(row.id)}
          onChange={() => handleSelectBanner(row.id)}
        />
      ),
      className: "w-px px-4",
    },
    {
      header: "제목",
      accessor: "title" as keyof Banner,
      cell: (value: unknown, row: Banner) => (
        <span
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer truncate block max-w-xs"
          title={value as string}
          onClick={() => handleEditBanner(row)}
        >
          {value as string}
        </span>
      ),
    },
    {
      header: "이미지",
      accessor: "pUrl" as keyof Banner,
      cell: (value: unknown) => (
        <div className="w-20 h-12 bg-gray-100 flex items-center justify-center overflow-hidden">
          {value ? (
            <img
              src={value as string}
              alt="PC 배너"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <span className="text-xs text-gray-500">이미지 없음</span>
          )}
        </div>
      ),
    },
    {
      header: "모바일 이미지",
      accessor: "mUrl" as keyof Banner,
      cell: (value: unknown) => (
        <div className="w-16 h-12 bg-gray-100 flex items-center justify-center overflow-hidden">
          {value ? (
            <img
              src={value as string}
              alt="모바일 배너"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <span className="text-xs text-gray-500">이미지 없음</span>
          )}
        </div>
      ),
    },
    {
      header: "시작일",
      accessor: "startDate" as keyof Banner,
      cell: (value: unknown) => formatDateForDisplay(value as string),
    },
    {
      header: "종료일",
      accessor: "endDate" as keyof Banner,
      cell: (value: unknown) => formatDateForDisplay(value as string),
    },
    {
      header: "조회",
      accessor: "id" as keyof Banner,
      cell: (value: unknown, row: Banner) => {
        const stats = viewStats[row.id];
        if (!stats) {
          return <span className="text-sm text-gray-600">0</span>;
        }
        const totalViews = stats.totalViews;
        const loggedInUsers = stats.loggedInUsers;
        return (
          <span className="text-sm text-gray-600">
            {totalViews.toLocaleString()}
            {loggedInUsers > 0 && (
              <span className="text-sm text-blue-500 ml-1">({loggedInUsers.toLocaleString()})</span>
            )}
          </span>
        );
      },
      className: "w-24 text-center",
    },
    {
      header: "공개 여부",
      accessor: "isPublic" as keyof Banner,
      cell: (value: unknown, row: Banner) => {
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
      header: "순서",
      accessor: "position" as keyof Banner,
      cell: (value: unknown, row: Banner, index: number) => (
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
      accessor: "id" as keyof Banner,
      cell: (value: unknown, row: Banner, index: number) => (
        <div className="flex space-x-2">
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
            onClick={() => handleDeleteBanner(row.id)}
          />
        </div>
      ),
    },
  ];

  // 입력 필드 변경 처리
  const handleInputChange = (name: string, value: any) => {
    if (currentBanner) {
      setCurrentBanner({ ...currentBanner, [name]: value });
    }
  };

  const handleFileSelect = (field: "pcImage" | "mobileImage", file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setCurrentBanner((prev) =>
          prev
            ? {
                ...prev,
                [field]: result,
                [field === "pcImage" ? "pUrl" : "mUrl"]: result,
              }
            : null
        );
      };
      reader.readAsDataURL(file);
      if (field === "pcImage") {
        setPcImageFile(file);
      } else {
        setMobileImageFile(file);
      }
    } else {
      setCurrentBanner((prev) =>
        prev
          ? {
              ...prev,
              [field]: "",
              [field === "pcImage" ? "pUrl" : "mUrl"]: "",
            }
          : null
      );
      if (field === "pcImage") {
        setPcImageFile(null);
      } else {
        setMobileImageFile(null);
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">미니 배너 관리</h1>
        <SearchInput
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          onSearch={(value) => handleSearch("title", value)}
        />
        <div className="flex space-x-2">
          {/* 엑셀 다운로드 버튼 */}
          <ExcelDownloadButton type="bannerMini" variant="outline" size="sm">
            엑셀 다운로드
          </ExcelDownloadButton>
          {/* 순서 저장 버튼 */}
          <Button onClick={handleBulkPositionSave} variant="primary" disabled={loading}>
            순서 저장
          </Button>
          {/* 선택 삭제 버튼 추가 */}
          <Button
            onClick={handleBulkDelete}
            variant="danger"
            disabled={selectedBannerIds.length === 0 || loading}
          >
            {`선택 삭제 (${selectedBannerIds.length})`}
          </Button>
          <Button onClick={handleAddBanner} disabled={loading}>
            배너 추가
          </Button>
        </div>
      </div>

      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />
      )}

      {/* LoadingOverlay 추가 */}
      <LoadingOverlay isLoading={loading || isSaving} />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          columns={columns}
          data={banners}
          loading={loading}
          emptyMessage={searchValue ? "검색된 결과가 없습니다." : "등록된 배너가 없습니다."}
          pagination={{
            currentPage: currentPage,
            pageSize: pageSize,
            totalItems: totalItems,
            onPageChange: handlePageChange,
          }}
        />
      </div>

      {/* 배너 추가/수정 모달 */}
      {currentBanner && (
        <Modal
          isOpen={showModal}
          onClose={() => {
            setModalError(null);
            setShowModal(false);
            setPcImageFile(null);
            setMobileImageFile(null);
          }}
          title={isEditing ? "배너 수정" : "새 배너 추가"}
          size="lg"
        >
          {/* Modal Error Display (Above top controls) */}
          {modalError && (
            <div className="mb-4">
              <Alert type="error" message={modalError} onClose={() => setModalError(null)} />
            </div>
          )}

          <div className="space-y-6">
            {/* 상단 버튼 영역 */}
            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                <Button onClick={handleSaveBanner} disabled={isSaving}>
                  저장
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setModalError(null);
                    setShowModal(false);
                    setPcImageFile(null);
                    setMobileImageFile(null);
                  }}
                  disabled={isSaving}
                >
                  취소
                </Button>
              </div>

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

            {/* 배너 제목 */}
            <div>
              <Input
                label="배너 제목"
                value={currentBanner.title || ""}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="배너 제목을 입력하세요"
              />
            </div>

            {/* PC/모바일 상세 설명 */}
            <div>
              <Input
                label="배너 상세(PC)"
                value={currentBanner.pDescription || ""}
                onChange={(e) => handleInputChange("pDescription", e.target.value)}
                placeholder="PC용 상세 설명을 입력하세요"
              />
            </div>
            <div>
              <Input
                label="배너 상세(MO)"
                value={currentBanner.mDescription || ""}
                onChange={(e) => handleInputChange("mDescription", e.target.value)}
                placeholder="모바일용 상세 설명을 입력하세요"
              />
            </div>

            {/* 버튼 설정 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="showButton"
                  checked={currentBanner.showButton || false}
                  onChange={(e) => handleInputChange("showButton", e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="showButton" className="text-sm font-medium text-gray-700">
                  버튼 노출
                </label>
              </div>

              {currentBanner.showButton && (
                <div className="space-y-4 pl-8">
                  <div className="flex items-center space-x-2">
                    <label className="block text-sm font-medium text-gray-700 w-20">
                      버튼 문구
                    </label>
                    <Input
                      value={currentBanner.buttonText || ""}
                      onChange={(e) => handleInputChange("buttonText", e.target.value)}
                      placeholder="버튼에 표시할 텍스트"
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="block text-sm font-medium text-gray-700 w-20">
                      버튼 색상
                    </label>
                    <div className="flex flex-1 items-center space-x-2">
                      <Input
                        value={currentBanner.buttonColor || "#000000"}
                        onChange={(e) => handleInputChange("buttonColor", e.target.value)}
                        placeholder="#000000"
                        className="flex-1"
                      />
                      <input
                        type="color"
                        value={currentBanner.buttonColor || "#000000"}
                        className="h-9 w-9 p-0 rounded-md border-gray-300 cursor-default"
                        readOnly
                        disabled
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 이미지 업로드 영역 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PC 이미지</label>
                <FileUpload
                  onFileSelect={(file) => handleFileSelect("pcImage", file)}
                  initialPreview={currentBanner.pcImage}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  모바일 이미지
                </label>
                <FileUpload
                  onFileSelect={(file) => handleFileSelect("mobileImage", file)}
                  initialPreview={currentBanner.mobileImage}
                />
              </div>
            </div>

            {/* 링크 URL */}
            <div>
              <Input
                label="링크 URL"
                value={currentBanner.linkUrl || ""}
                onChange={(e) => handleInputChange("linkUrl", e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            {/* 시작일/종료일 */}
            <div className="grid grid-cols-2 gap-4">
              <DatePicker
                label="시작일"
                value={currentBanner.startDate || ""}
                onChange={(date) => handleInputChange("startDate", date)}
              />
              <DatePicker
                label="종료일"
                value={currentBanner.endDate || ""}
                onChange={(date) => handleInputChange("endDate", date)}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MiniBannerPage;
