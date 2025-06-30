import React, { useState, useEffect, useRef } from "react";
import { useNavigation } from "../../services/NavigationService";
import BannerApiService from "../../services/BannerApiService";
import { Banner, ApiResponse, PaginationInfo } from "../../types";
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
} from "../../utils/dateUtils";
import SearchInput from "@components/SearchInput.tsx";

const MainBannerPage: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentBanner, setCurrentBanner] = useState<Banner | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // 검색 value 상태
  const [searchValue, setSearchValue] = useState<string>("");

  // 페이지네이션 상태 추가
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1); // API 연동 전까지 1로 초기화
  const [pageSize, setPageSize] = useState<number>(10); // 기본 페이지 크기
  const [totalItems, setTotalItems] = useState<number>(0); // 전체 아이템 수 상태 추가

  // 파일 상태 관리
  const [pcImageFile, setPcImageFile] = useState<File | null>(null);
  const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);

  // 선택된 배너 ID 상태 추가
  const [selectedBannerIds, setSelectedBannerIds] = useState<number[]>([]);

  const handleSearch = (type: string, value: string) => {
    if (type === "title") {
      fetchBanners(currentPage, pageSize, value).then((r) => {
        // 검색 후 선택된 배너 ID 초기화
        setSelectedBannerIds([]);
      });
    }
  };

  // 배너 목록 조회 (페이지네이션 적용)
  const fetchBanners = async (page: number = 1, limit: number = 10, searchValue: string = "") => {
    setLoading(true);
    setError(null); // 에러 초기화

    try {
      // BannerApiService.getMainBanners에 page와 limit 파라미터 전달
      // 반환 타입을 ApiResponse<Banner[]>로 명시
      const response: ApiResponse<Banner[]> = await BannerApiService.getMainBanners(
        page,
        limit,
        searchValue
      );
      console.log("API Response:", response); // 응답 로깅 (디버깅용)

      // API 응답 구조에 맞게 데이터와 페이지네이션 정보 추출
      if (response && response.success && Array.isArray(response.data)) {
        // position 기준 오름차순 정렬 (작은 값이 위로), position이 같으면 createdAt 내림차순(최신이 위)
        const sortedBanners = [...response.data].sort((a, b) => {
          if ((a.position || 0) !== (b.position || 0)) {
            return (a.position || 0) - (b.position || 0);
          }
          // position이 같으면 createdAt 내림차순(최신이 위)
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        setBanners(sortedBanners); // 정렬된 배열을 상태에 저장
        originalBannersRef.current = sortedBanners; // fetchBanners에서만 원본 저장

        // 페이지네이션 정보 업데이트 (API 응답 사용)
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages);
          setCurrentPage(response.pagination.currentPage);
          setPageSize(response.pagination.pageSize); // 페이지 크기도 API 기준으로 업데이트
          setTotalItems(response.pagination.totalItems); // totalItems 상태 업데이트 추가
        } else {
          // 페이지네이션 정보가 없는 경우 (API 오류 등) 기본값 처리
          setTotalPages(1);
          setCurrentPage(1);
          setTotalItems(sortedBanners.length); // 페이지네이션 정보 없을 경우 현재 배너 수로 설정
        }
      } else {
        // API 요청 실패 또는 data 형식이 배열이 아닌 경우
        setBanners([]);
        setError(response?.message || "배너 데이터를 불러오는 중 오류가 발생했습니다.");
        setTotalPages(1);
        setCurrentPage(1);
        setTotalItems(0); // 에러 시 0으로 설정
      }
    } catch (err: any) {
      // 네트워크 오류 등 try 블록 외부에서 발생한 에러 처리
      console.error("Error fetching banners:", err);
      setError(err?.message || "배너 목록 조회 중 오류가 발생했습니다.");
      setBanners([]);
      setTotalPages(1);
      setCurrentPage(1);
      setTotalItems(0); // 에러 시 0으로 설정
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners(currentPage, pageSize); // 현재 페이지와 페이지 크기로 조회
  }, []); // 마운트 시 첫 페이지만 조회 (페이지 변경 시 재조회는 handlePageChange에서)

  // 페이지 변경 핸들러 (CasinoGameManagement.tsx 참고)
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      fetchBanners(page, pageSize); // 새 페이지 데이터 요청
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
      bannerType: "main",
      pDescription: null,
      mDescription: null,
      linkUrl: null,
      showButton: false,
      buttonText: "",
      buttonColor: "#000000",
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
            pDescription: currentBanner.pDescription,
            mDescription: currentBanner.mDescription,
            linkUrl: currentBanner.linkUrl,
            startDate: startDate,
            endDate: endDate,
            isPublic: currentBanner.isPublic,
            position: currentBanner.position,
            bannerType: "main",
            showButton: currentBanner.showButton,
            buttonText: currentBanner.buttonText,
            buttonColor: currentBanner.buttonColor,
          });

          // 이미지 업로드 문제 확인을 위해 임시로 이미지 없이 업데이트 시도
          await BannerApiService.updateMainBanner(
            currentBanner.id,
            {
              id: currentBanner.id,
              title: currentBanner.title,
              pDescription: currentBanner.pDescription,
              mDescription: currentBanner.mDescription,
              linkUrl: currentBanner.linkUrl,
              startDate: startDate,
              endDate: endDate,
              isPublic: currentBanner.isPublic,
              position: currentBanner.position,
              bannerType: "main",
              showButton: currentBanner.showButton,
              buttonText: currentBanner.buttonText,
              buttonColor: currentBanner.buttonColor,
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
          // 새 배너는 position 0으로 생성
          const startDate = new Date(currentBanner.startDate).toISOString();
          const endDate = new Date(currentBanner.endDate).toISOString();

          await BannerApiService.createMainBanner(
            {
              title: currentBanner.title,
              pDescription: currentBanner.pDescription,
              mDescription: currentBanner.mDescription,
              linkUrl: currentBanner.linkUrl,
              startDate: startDate,
              endDate: endDate,
              isPublic: currentBanner.isPublic,
              position: 0, // 새 배너는 항상 0번 순서
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
    if (!window.confirm("정말로 이 배너를 삭제하시겠습니까?")) return;
    try {
      await BannerApiService.deleteMainBanner(id);
      toast.success("배너가 삭제되었습니다.");
      fetchBanners(currentPage, pageSize); // 목록 새로고침
      setSelectedBannerIds((prev) => prev.filter((bannerId) => bannerId !== id)); // 삭제된 ID 제거
    } catch (error: any) {
      console.error("배너 삭제 오류:", error);
      toast.error(error.response?.data?.message || "배너 삭제 중 오류 발생");
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
      setLoading(true); // 로딩 시작
      // 여러 삭제 요청을 동시에 보냄
      const deletePromises = selectedBannerIds.map((id) => BannerApiService.deleteMainBanner(id));
      // 모든 요청이 완료될 때까지 기다림 (성공/실패 여부 확인은 선택적)
      await Promise.allSettled(deletePromises);

      toast.success(`${selectedBannerIds.length}개의 배너가 삭제되었습니다.`);
      fetchBanners(currentPage, pageSize); // 목록 새로고침
      setSelectedBannerIds([]); // 선택 상태 초기화
    } catch (error: any) {
      // 개별 삭제 오류는 BannerApiService에서 처리될 수 있으므로, 여기서는 일반적인 오류 메시지 표시
      console.error("배너 일괄 삭제 중 오류 발생:", error);
      toast.error("배너 삭제 중 일부 오류가 발생했습니다. 목록을 확인해주세요.");
      // 오류 발생 시에도 목록 새로고침 및 선택 초기화 시도
      fetchBanners(currentPage, pageSize);
      setSelectedBannerIds([]);
    } finally {
      setLoading(false); // 로딩 종료
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
      // 현재 페이지 배너들의 ID만 선택
      const currentPageBannerIds = banners.map((banner) => banner.id);
      setSelectedBannerIds(currentPageBannerIds);
    } else {
      setSelectedBannerIds([]);
    }
  };

  // 입력 필드 변경 처리
  const handleInputChange = (name: string, value: any) => {
    if (!currentBanner) return;
    setCurrentBanner((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [name]: value,
      } as Banner;
    });
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setModalError(null);
    setShowModal(false);
    setPcImageFile(null);
    setMobileImageFile(null);
  };

  // 파일 선택 핸들러
  const handleFileSelect = (field: "pcImage" | "mobileImage", file: File | null) => {
    if (!currentBanner) return;

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setCurrentBanner((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            [field]: result,
            [field === "pcImage" ? "pUrl" : "mUrl"]: result,
          } as Banner;
        });
      };
      reader.readAsDataURL(file);
      if (field === "pcImage") {
        setPcImageFile(file);
      } else {
        setMobileImageFile(file);
      }
    } else {
      setCurrentBanner((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          [field]: "",
          [field === "pcImage" ? "pUrl" : "mUrl"]: "",
        } as Banner;
      });
      if (field === "pcImage") {
        setPcImageFile(null);
      } else {
        setMobileImageFile(null);
      }
    }
  };

  // 데이터 테이블 컬럼 정의 (체크박스 컬럼 추가)
  const columns = [
    {
      header: (
        <input
          type="checkbox"
          className="form-checkbox h-4 w-4 text-blue-600"
          onChange={handleSelectAllBanners}
          // 현재 페이지의 모든 배너가 선택되었는지 확인
          checked={
            banners.length > 0 &&
            selectedBannerIds.length === banners.length &&
            banners.every((banner) => selectedBannerIds.includes(banner.id))
          }
          // 일부만 선택되었을 경우 indeterminate 상태
          ref={(input) => {
            if (input) {
              const someSelected =
                selectedBannerIds.length > 0 &&
                selectedBannerIds.length < banners.length &&
                banners.some((banner) => selectedBannerIds.includes(banner.id));
              input.indeterminate = someSelected;
            }
          }}
          disabled={loading || banners.length === 0} // 로딩 중이거나 데이터 없으면 비활성화
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
      // className 조절하여 너비 최소화
      className: "w-px px-4", // w-px 또는 w-1 로 최소 너비 지정, px-4는 좌우 패딩
    },
    {
      header: "제목",
      accessor: "title" as keyof Banner,
      cell: (value: unknown, row: Banner) => (
        <span
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
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
      header: "공개 여부",
      accessor: "isPublic" as keyof Banner,
      cell: (value: unknown, row: Banner) => {
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
        <div className="flex space-x-1">
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

  // position 입력값 변경 핸들러 (공통 함수)
  const handlePositionInputChange = (index: number, newPosition: number) => {
    setBanners((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], position: newPosition };
      }
      return updated;
    });
  };

  // 원본 position 값 저장용 ref
  const originalBannersRef = useRef<Banner[]>([]);

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
          BannerApiService.updateMainBanner(banner.id, {
            id: banner.id,
            title: banner.title,
            pUrl: banner.pUrl,
            mUrl: banner.mUrl,
            startDate: banner.startDate,
            endDate: banner.endDate,
            isPublic: banner.isPublic,
            position: banner.position,
            bannerType: banner.bannerType,
            pDescription: banner.pDescription || null,
            mDescription: banner.mDescription || null,
            linkUrl: banner.linkUrl || null,
            showButton: banner.showButton || false,
            buttonText: banner.buttonText || "",
            buttonColor: banner.buttonColor || "#000000",
          })
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">메인 배너 관리</h1>
        <SearchInput
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          onSearch={handleSearch}
        />
        <div className="flex space-x-2">
          {/* 순서 저장 버튼 */}
          <Button onClick={handleBulkPositionSave} variant="primary" disabled={loading}>
            순서 저장
          </Button>
          {/* 선택 삭제 버튼 */}
          <Button
            onClick={handleBulkDelete}
            variant="danger"
            disabled={selectedBannerIds.length === 0 || loading}
          >
            {`선택 삭제 (${selectedBannerIds.length})`}
          </Button>
          {/* 배너 추가 버튼 */}
          <Button onClick={handleAddBanner} disabled={loading}>
            배너 추가
          </Button>
        </div>
      </div>

      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />
      )}

      <LoadingOverlay isLoading={loading} />

      {/* Re-add the DataTable with correct wrapper and pagination prop */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          columns={columns}
          data={banners}
          loading={loading}
          emptyMessage="등록된 배너가 없습니다."
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
          onClose={handleCloseModal}
          title={isEditing ? "배너 수정" : "새 배너 추가"}
          size="lg"
        >
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
                <Button variant="outline" onClick={handleCloseModal} disabled={isSaving}>
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

export default MainBannerPage;
