import React, { useState, useEffect, useCallback, useMemo } from "react";
import RemittanceBannerService from "../../services/RemittanceBannerService";
import { RemittanceBanner } from "../../types";
import DataTable from "../../components/DataTable";
import Button from "../../components/Button";
import ActionButton from "../../components/ActionButton";
import Modal from "../../components/Modal";
import Input from "../../components/forms/Input";
import FileUpload from "../../components/forms/FileUpload";
import Alert from "../../components/Alert";
import SearchInput from "../../components/SearchInput";
import LoadingOverlay from "../../components/LoadingOverlay";

// 날짜 포맷 변환 함수 (컴포넌트 밖으로 이동)
function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}.${month}.${day} ${hours}:${minutes}`;
}

interface ContentViewStats {
  [key: string]: {
    anonymousUsers: number;
    loggedInUsers: number;
    totalViews: number;
  };
}

const RemittanceBannerPage: React.FC = () => {
  const [banners, setBanners] = useState<RemittanceBanner[]>([]);
  const [originalBanners, setOriginalBanners] = useState<RemittanceBanner[]>([]);
  const [contentViewStats, setContentViewStats] = useState<ContentViewStats>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [currentBanner, setCurrentBanner] = useState<Partial<RemittanceBanner> | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [moving, setMoving] = useState<boolean>(false);
  const [selectedBannerIds, setSelectedBannerIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(30);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [searchValue, setSearchValue] = useState<string>("");

  // 조회수 표시 함수
  const formatViewCount = (bannerId: number) => {
    const stats = contentViewStats[bannerId.toString()];
    if (!stats) return "0";

    const total = stats.totalViews;
    const loggedIn = stats.loggedInUsers;

    if (loggedIn === 0) {
      return total.toString();
    }

    return (
      <span>
        <span className="text-gray-600">{total}</span>
        <span className="text-blue-600">({loggedIn})</span>
      </span>
    );
  };

  // 검색 핸들러
  const handleSearch = (value: string) => {
    fetchBanners(1, pageSize, value);
  };

  // 배너 목록 조회 (페이지네이션 적용, 검색 파라미터 추가)
  const fetchBanners = useCallback(
    async (page: number = 1, limit: number = 30, searchValue: string = "") => {
      setLoading(true);
      setError(null);
      try {
        const response = await RemittanceBannerService.getRemittanceBanners(
          page,
          limit,
          searchValue
        );
        if (response && response.data && response.pagination) {
          const fetchedBanners = response.data || [];
          const pagination = response.pagination;
          const processedBanners = fetchedBanners.map((banner: any) => ({
            id: banner.id,
            name: banner.name || "",
            link: banner.link || "",
            imageUrl: banner.imageUrl || banner.image || "",
            isPublic: banner.isPublic === undefined ? 1 : banner.isPublic,
            displayOrder: banner.displayOrder || 0,
            createdAt: banner.createdAt || "",
            updatedAt: banner.updatedAt || "",
          }));
          // displayOrder 오름차순, 같으면 createdAt 내림차순
          const sortedBanners = [...processedBanners].sort((a, b) => {
            if ((a.displayOrder || 0) !== (b.displayOrder || 0)) {
              return (a.displayOrder || 0) - (b.displayOrder || 0);
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
          setBanners(sortedBanners);
          setOriginalBanners(sortedBanners);
          setContentViewStats(response.contentViewStats || {});
          setTotalItems(pagination.totalItems || 0);
          setTotalPages(pagination.totalPages || 0);
          setCurrentPage(pagination.currentPage || page);
          setPageSize(pagination.pageSize || limit);
          setSelectedBannerIds([]);
        } else {
          setBanners([]);
          setOriginalBanners([]);
          setContentViewStats({});
          setTotalItems(0);
          setTotalPages(0);
          setCurrentPage(1);
          setError("송금 배너 데이터 형식이 올바르지 않습니다.");
        }
      } catch (err) {
        setError("송금 배너를 불러오는데 실패했습니다.");
        setBanners([]);
        setOriginalBanners([]);
        setContentViewStats({});
        setTotalItems(0);
        setTotalPages(0);
        setCurrentPage(1);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchBanners(currentPage, pageSize, searchValue);
  }, [fetchBanners, currentPage, pageSize, searchValue]);

  // 배너 추가 모달 열기
  const handleAddBanner = () => {
    setCurrentBanner({
      id: 0,
      name: "",
      link: "",
      imageUrl: "",
      isPublic: 1,
      displayOrder: 0,
      createdAt: "",
      updatedAt: "",
    });
    setLogoFile(null);
    setShowModal(true);
    setIsEditing(false);
    setAlertMessage(null);
    setSelectedBannerIds([]);
    // 기존 배너 displayOrder +1
    setBanners((prev) => prev.map((b) => ({ ...b, displayOrder: (b.displayOrder || 0) + 1 })));
  };

  // 배너 수정 모달 열기
  const handleEditBanner = (banner: RemittanceBanner) => {
    setCurrentBanner({ ...banner });
    setLogoFile(null);
    setShowModal(true);
    setIsEditing(true);
    setAlertMessage(null);
    setSelectedBannerIds([]);
  };

  // 배너 저장 (추가 또는 수정)
  const handleSaveBanner = async () => {
    if (!currentBanner) return;

    setSaving(true);
    setAlertMessage(null);

    try {
      // 필수 필드 검증
      if (!currentBanner.name || !currentBanner.link) {
        setAlertMessage({ type: "error", message: "사이트명과 이동링크는 필수 항목입니다." });
        return;
      }

      // 새 배너 추가 시 로고 필수 체크
      if (!isEditing && !logoFile) {
        setAlertMessage({ type: "error", message: "로고 이미지는 필수 항목입니다." });
        return;
      }

      if (isEditing && currentBanner.id) {
        // 수정 모드일 때
        await RemittanceBannerService.updateRemittanceBanner(
          currentBanner.id,
          {
            name: currentBanner.name,
            link: currentBanner.link,
            isPublic: currentBanner.isPublic,
            displayOrder: currentBanner.displayOrder,
          },
          logoFile || undefined
        );

        setAlertMessage({ type: "success", message: "송금 배너가 수정되었습니다." });
      } else {
        // 추가 모드일 때
        if (!logoFile) {
          setAlertMessage({ type: "error", message: "로고 이미지를 선택해주세요." });
          return;
        }

        await RemittanceBannerService.createRemittanceBanner(
          {
            name: currentBanner.name,
            link: currentBanner.link,
            isPublic: currentBanner.isPublic,
            displayOrder: currentBanner.displayOrder,
          },
          logoFile
        );

        setAlertMessage({ type: "success", message: "새 송금 배너가 등록되었습니다." });
      }

      // 모달 닫고 배너 목록 새로고침
      setShowModal(false);
      setSelectedBannerIds([]);
      fetchBanners(currentPage, pageSize, searchValue);
      fetchBanners(currentPage, pageSize);
    } catch (err) {
      console.error("Error saving remittance banner:", err);
      setAlertMessage({ type: "error", message: "송금 배너 저장 중 오류가 발생했습니다." });
    } finally {
      setSaving(false);
    }
  };

  // 배너 삭제
  const handleDeleteBanner = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    setLoading(true);
    setAlertMessage(null);

    try {
      const success = await RemittanceBannerService.deleteRemittanceBanner(id);
      if (success) {
        setAlertMessage({ type: "success", message: "송금 배너가 삭제되었습니다." });
        setSelectedBannerIds((prev) => prev.filter((bannerId) => bannerId !== id));
        fetchBanners(currentPage, pageSize);
      } else {
        setAlertMessage({ type: "error", message: "송금 배너 삭제에 실패했습니다." });
      }
    } catch (err) {
      console.error("Error deleting remittance banner:", err);
      setAlertMessage({ type: "error", message: "송금 배너 삭제 중 오류가 발생했습니다." });
    } finally {
      setLoading(false);
    }
  };

  // 개별 선택 핸들러 추가
  const handleSelectBanner = (id: number) => {
    setSelectedBannerIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((bannerId) => bannerId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // 전체 선택 핸들러 추가
  const handleSelectAllBanners = (event: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    if (isChecked) {
      setSelectedBannerIds(banners.map((banner) => banner.id));
    } else {
      setSelectedBannerIds([]);
    }
  };

  // 일괄 삭제 핸들러 추가
  const handleBulkDelete = async () => {
    if (selectedBannerIds.length === 0) {
      setAlertMessage({ type: "info", message: "삭제할 배너를 선택해주세요." });
      return;
    }
    if (!window.confirm(`선택된 ${selectedBannerIds.length}개의 배너를 정말 삭제하시겠습니까?`)) {
      return;
    }

    setLoading(true);
    setAlertMessage(null);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const id of selectedBannerIds) {
      try {
        // 개별 삭제 서비스 함수 호출
        const success = await RemittanceBannerService.deleteRemittanceBanner(id);
        if (success) {
          successCount++;
        } else {
          errorCount++;
          errors.push(`배너(ID: ${id}) 삭제 실패 (서비스 응답)`);
        }
      } catch (err: any) {
        errorCount++;
        const message = err.message || `배너(ID: ${id}) 삭제 중 오류`;
        errors.push(message);
        console.error(`Error deleting banner ${id}:`, err);
      }
    }

    setSelectedBannerIds([]);
    setLoading(false);

    if (errorCount === 0) {
      setAlertMessage({
        type: "success",
        message: `${successCount}개의 배너가 성공적으로 삭제되었습니다.`,
      });
    } else if (successCount === 0) {
      setAlertMessage({
        type: "error",
        message: `선택된 배너를 삭제하는 중 오류가 발생했습니다. (${errors.join(", ")})`,
      });
    } else {
      setAlertMessage({
        type: "error",
        message: `${successCount}개 삭제 성공, ${errorCount}개 삭제 실패.`,
      });
    }

    fetchBanners(currentPage, pageSize);
  };

  // 배너 위로 이동
  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;
    setMoving(true);
    setAlertMessage(null);
    setSelectedBannerIds([]);

    const newBanners = [...banners];

    // 실제 배너 객체
    const currentBanner = newBanners[index]; // 현재 선택된 배너
    const targetBanner = newBanners[index - 1]; // 위의 배너

    // displayOrder 값 교환
    const currentDisplayOrder = currentBanner.displayOrder;
    const targetDisplayOrder = targetBanner.displayOrder;

    // displayOrder 값 교환
    currentBanner.displayOrder = targetDisplayOrder;
    targetBanner.displayOrder = currentDisplayOrder;

    // 배열 내 위치 교환
    newBanners[index] = targetBanner;
    newBanners[index - 1] = currentBanner;

    try {
      // 로컬 상태 먼저 업데이트
      setBanners(newBanners);

      // API를 통해 각 배너 개별적으로 업데이트
      await RemittanceBannerService.updateRemittanceBanner(currentBanner.id, {
        displayOrder: currentBanner.displayOrder,
      });

      await RemittanceBannerService.updateRemittanceBanner(targetBanner.id, {
        displayOrder: targetBanner.displayOrder,
      });

      // API 호출이 성공한 후에만 서버에서 최신 데이터를 가져옴
      fetchBanners(currentPage, pageSize);
    } catch (err) {
      // 에러 발생 시 원래 순서로 되돌림
      fetchBanners(currentPage, pageSize);
      setAlertMessage({ type: "error", message: "송금 배너 순서 변경 중 오류가 발생했습니다." });
      console.error("Error updating remittance banner order:", err);
    } finally {
      setMoving(false);
    }
  };

  // 배너 아래로 이동
  const handleMoveDown = async (index: number) => {
    if (index >= banners.length - 1) return;
    setMoving(true);
    setAlertMessage(null);
    setSelectedBannerIds([]);

    const newBanners = [...banners];

    // 실제 배너 객체
    const currentBanner = newBanners[index]; // 현재 선택된 배너
    const targetBanner = newBanners[index + 1]; // 아래 배너

    // displayOrder 값 교환
    const currentDisplayOrder = currentBanner.displayOrder;
    const targetDisplayOrder = targetBanner.displayOrder;

    // displayOrder 값 교환
    currentBanner.displayOrder = targetDisplayOrder;
    targetBanner.displayOrder = currentDisplayOrder;

    // 배열 내 위치 교환
    newBanners[index] = targetBanner;
    newBanners[index + 1] = currentBanner;

    try {
      // 로컬 상태 먼저 업데이트
      setBanners(newBanners);

      // API를 통해 각 배너 개별적으로 업데이트
      await RemittanceBannerService.updateRemittanceBanner(currentBanner.id, {
        displayOrder: currentBanner.displayOrder,
      });

      await RemittanceBannerService.updateRemittanceBanner(targetBanner.id, {
        displayOrder: targetBanner.displayOrder,
      });

      // API 호출이 성공한 후에만 서버에서 최신 데이터를 가져옴
      fetchBanners(currentPage, pageSize);
    } catch (err) {
      // 에러 발생 시 원래 순서로 되돌림
      fetchBanners(currentPage, pageSize);
      setAlertMessage({ type: "error", message: "송금 배너 순서 변경 중 오류가 발생했습니다." });
      console.error("Error updating remittance banner order:", err);
    } finally {
      setMoving(false);
    }
  };

  // 입력 변경 핸들러
  const handleInputChange = (name: string, value: any) => {
    if (currentBanner) {
      if (name === "isPublic") {
        setCurrentBanner({ ...currentBanner, [name]: value === "1" ? 1 : 0 });
      } else {
        setCurrentBanner({ ...currentBanner, [name]: value });
      }
    }
  };

  // 모달 닫기 핸들러
  const handleCloseModal = () => {
    setShowModal(false);
  };

  // 파일 변경 핸들러
  const handleFileChange = (file: File | null) => {
    setLogoFile(file);
  };

  // displayOrder 직접 입력 핸들러
  const handleDisplayOrderInputChange = (index: number, newOrder: number) => {
    setBanners((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], displayOrder: newOrder };
      return updated;
    });
  };

  // 순서 저장 핸들러
  const handleBulkDisplayOrderSave = async () => {
    setLoading(true);
    try {
      const changed = banners.filter((banner) => {
        const original = originalBanners.find((o) => o.id === banner.id);
        return original && banner.displayOrder !== original.displayOrder;
      });
      if (changed.length === 0) {
        setLoading(false);
        return;
      }
      await Promise.all(
        changed.map((banner) =>
          RemittanceBannerService.updateRemittanceBanner(banner.id, {
            displayOrder: banner.displayOrder,
          })
        )
      );
      fetchBanners(currentPage, pageSize);
    } catch (err) {
      // do nothing
    } finally {
      setLoading(false);
    }
  };

  // 페이지 변경 핸들러 복구
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
    }
  };

  // 테이블 컬럼 정의
  const columns = useMemo(
    () => [
      {
        header: (
          <input
            type="checkbox"
            className="form-checkbox h-4 w-4 text-blue-600"
            checked={selectedBannerIds.length === banners.length && banners.length > 0}
            onChange={handleSelectAllBanners}
          />
        ),
        accessor: "id" as keyof RemittanceBanner,
        cell: (value: unknown, row: RemittanceBanner) => (
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
        header: "로고",
        accessor: "imageUrl" as keyof RemittanceBanner,
        cell: (value: unknown, row: RemittanceBanner) => (
          <img
            src={row.imageUrl || "/placeholder-image.png"}
            alt={row.name}
            className="h-8 w-auto object-contain"
            onError={(e) => (e.currentTarget.src = "/placeholder-image.png")}
          />
        ),
        className: "text-center",
      },
      { header: "사이트명", accessor: "name" as keyof RemittanceBanner },
      { header: "이동링크", accessor: "link" as keyof RemittanceBanner },
      { header: "생성일", accessor: "createdAt" as keyof RemittanceBanner, cell: formatDate },
      {
        header: "수정일",
        accessor: "updatedAt" as keyof RemittanceBanner,
        cell: formatDate,
      },
      {
        header: "조회",
        accessor: "id" as keyof RemittanceBanner,
        cell: (value: unknown, row: RemittanceBanner) => (
          <span className="text-sm text-gray-600">{formatViewCount(row.id)}</span>
        ),
        className: "text-center",
      },
      {
        header: "공개여부",
        accessor: "isPublic" as keyof RemittanceBanner,
        cell: (isPublic: number) => (
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
              isPublic === 1 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {isPublic === 1 ? "공개" : "비공개"}
          </span>
        ),
        className: "text-center",
      },
      {
        header: "순서",
        accessor: "displayOrder" as keyof RemittanceBanner,
        cell: (displayOrder: number, row: RemittanceBanner, index: number) => (
          <input
            type="number"
            min={1}
            className="w-16 border rounded text-center"
            value={displayOrder}
            onChange={(e) => handleDisplayOrderInputChange(index, Number(e.target.value))}
            disabled={loading}
          />
        ),
        className: "text-center",
      },
      {
        header: "관리",
        accessor: "id" as keyof RemittanceBanner,
        cell: (id: number, row: RemittanceBanner) => (
          <div className="flex space-x-1 justify-center">
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
              onClick={() => handleDeleteBanner(id)}
            />
          </div>
        ),
        className: "text-center",
      },
    ],
    [banners, selectedBannerIds, loading, contentViewStats]
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">송금 배너 관리</h1>
        <SearchInput
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          onSearch={handleSearch}
        />
        <div className="flex space-x-2">
          <Button onClick={handleBulkDisplayOrderSave} variant="primary" disabled={loading}>
            순서 저장
          </Button>
          <Button
            onClick={handleBulkDelete}
            variant="danger"
            disabled={selectedBannerIds.length === 0 || loading}
          >
            {`선택 삭제 (${selectedBannerIds.length})`}
          </Button>
          <Button onClick={handleAddBanner} disabled={loading}>
            배너 등록
          </Button>
        </div>
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

      <LoadingOverlay isLoading={loading || saving || moving} />

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

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={isEditing ? "배너 수정" : "배너 등록"}
      >
        {alertMessage && (
          <div className="mb-4">
            <Alert
              type={alertMessage.type}
              message={alertMessage.message}
              onClose={() => setAlertMessage(null)}
            />
          </div>
        )}
        <div className="space-y-4">
          <Input
            label="사이트명"
            name="name"
            value={currentBanner?.name || ""}
            onChange={(e) => handleInputChange("name", e.target.value)}
            required
          />
          <Input
            label="이동링크"
            name="link"
            value={currentBanner?.link || ""}
            onChange={(e) => handleInputChange("link", e.target.value)}
            required
            placeholder="https://example.com"
          />
          <FileUpload label="로고 이미지" onChange={handleFileChange} />
          <div>
            <label htmlFor="isPublic" className="block text-sm font-medium text-gray-700">
              공개여부
            </label>
            <select
              id="isPublic"
              name="isPublic"
              value={currentBanner?.isPublic === undefined ? 1 : currentBanner.isPublic}
              onChange={(e) => handleInputChange("isPublic", e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="1">공개</option>
              <option value="0">비공개</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="secondary" onClick={handleCloseModal} disabled={saving}>
            취소
          </Button>
          <Button onClick={handleSaveBanner} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default RemittanceBannerPage;
