import React, { useState, useEffect } from "react";
import RemittanceBannerService from "../../services/RemittanceBannerService";
import { RemittanceBanner } from "../../types";
import DataTable from "../../components/DataTable";
import Button from "../../components/Button";
import ActionButton from "../../components/ActionButton";
import Modal from "../../components/Modal";
import Input from "../../components/forms/Input";
import FileUpload from "../../components/forms/FileUpload";
import Alert from "../../components/Alert";
import LoadingOverlay from "../../components/LoadingOverlay";

const RemittanceBannerPage: React.FC = () => {
  const [banners, setBanners] = useState<RemittanceBanner[]>([]);
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

  // 날짜 포맷 변환 함수
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";

    // ISO 형식 문자열을 Date 객체로 변환
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
    const currentSelected = [...selectedBannerIds];

    try {
      const response = await RemittanceBannerService.getRemittanceBanners();
      // 배너를 displayOrder 기준으로 오름차순 정렬 (낮은 값이 위로)
      const sortedBanners = [...response].sort(
        (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)
      );
      setBanners(sortedBanners);
      setSelectedBannerIds(
        currentSelected.filter((id) => sortedBanners.some((banner) => banner.id === id))
      );
    } catch (err) {
      setError("송금 배너를 불러오는데 실패했습니다.");
      setBanners([]);
      setSelectedBannerIds([]);
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
      name: "",
      link: "",
      imageUrl: "",
      isPublic: 1,
      displayOrder: banners.length > 0 ? Math.max(...banners.map((b) => b.displayOrder)) + 1 : 1,
      createdAt: "",
      updatedAt: "",
    });
    setLogoFile(null);
    setShowModal(true);
    setIsEditing(false);
    setAlertMessage(null);
    setSelectedBannerIds([]);
  };

  // 배너 수정 모달 열기
  const handleEditBanner = (banner: RemittanceBanner) => {
    setCurrentBanner({
      ...banner,
    });
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
      fetchBanners();
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
        fetchBanners();
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
    if (event.target.checked) {
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

    fetchBanners();
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
      fetchBanners();
    } catch (err) {
      // 에러 발생 시 원래 순서로 되돌림
      fetchBanners();
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
      fetchBanners();
    } catch (err) {
      // 에러 발생 시 원래 순서로 되돌림
      fetchBanners();
      setAlertMessage({ type: "error", message: "송금 배너 순서 변경 중 오류가 발생했습니다." });
      console.error("Error updating remittance banner order:", err);
    } finally {
      setMoving(false);
    }
  };

  // DataTable 컬럼 정의
  const columns = [
    {
      header: (
        <input
          type="checkbox"
          className="form-checkbox h-4 w-4 text-blue-600"
          onChange={handleSelectAllBanners}
          checked={banners.length > 0 && selectedBannerIds.length === banners.length}
          ref={(input) => {
            if (input) {
              input.indeterminate =
                selectedBannerIds.length > 0 && selectedBannerIds.length < banners.length;
            }
          }}
          disabled={loading || banners.length === 0 || saving || moving}
        />
      ),
      accessor: "id" as keyof RemittanceBanner,
      cell: (id: number) => (
        <input
          type="checkbox"
          className="form-checkbox h-4 w-4 text-blue-600"
          checked={selectedBannerIds.includes(id)}
          onChange={() => handleSelectBanner(id)}
          disabled={loading || saving || moving}
        />
      ),
      className: "w-px px-4",
      size: 50,
    },
    {
      header: "사이트명",
      accessor: "name" as keyof RemittanceBanner,
      cell: (value: string, row: RemittanceBanner) => (
        <span
          className="text-blue-600 hover:underline cursor-pointer"
          onClick={() => handleEditBanner(row)}
        >
          {value}
        </span>
      ),
    },
    {
      header: "로고 이미지",
      accessor: "imageUrl" as keyof RemittanceBanner,
      cell: (value: string) =>
        value ? <img src={value} alt="로고" className="h-10 w-auto object-contain" /> : "-",
    },
    {
      header: "이동 링크",
      accessor: "link" as keyof RemittanceBanner,
      cell: (value: string) => (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
          title={value}
        >
          {value}
        </a>
      ),
    },
    {
      header: "상태",
      accessor: "isPublic" as keyof RemittanceBanner,
      cell: (value: number) => (
        <span
          className={`px-2 py-1 rounded text-xs ${
            value === 1 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {value === 1 ? "공개" : "비공개"}
        </span>
      ),
    },
    {
      header: "등록일",
      accessor: "createdAt" as keyof RemittanceBanner,
      cell: (value: string) => formatDate(value),
    },
    {
      header: "관리",
      accessor: "id" as keyof RemittanceBanner,
      cell: (id: number, row: RemittanceBanner) => (
        <div className="flex space-x-2">
          <ActionButton
            label="수정"
            action="edit"
            size="sm"
            onClick={() => handleEditBanner(row)}
            disabled={loading || saving || moving}
          />
          <ActionButton
            label="삭제"
            action="delete"
            size="sm"
            onClick={() => handleDeleteBanner(id)}
            disabled={loading || saving || moving}
          />
        </div>
      ),
      size: 120,
    },
  ];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">송금 배너 관리</h1>

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

      <div className="flex justify-end mb-4 space-x-2">
        <Button
          variant="danger"
          onClick={handleBulkDelete}
          disabled={selectedBannerIds.length === 0 || loading || saving || moving}
        >
          {`선택 삭제 (${selectedBannerIds.length})`}
        </Button>
        <Button variant="primary" onClick={handleAddBanner} disabled={loading || saving || moving}>
          송금 배너 추가
        </Button>
      </div>

      <LoadingOverlay isLoading={loading || saving || moving} />

      <DataTable
        columns={columns}
        data={banners}
        loading={false}
        emptyMessage="등록된 송금 배너가 없습니다."
      />

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isEditing ? "송금 배너 수정" : "새 송금 배너 추가"}
        size="lg"
      >
        {currentBanner && (
          <div className="space-y-4">
            {alertMessage && alertMessage.type === "error" && (
              <div className="mb-4">
                <Alert
                  type="error"
                  message={alertMessage.message}
                  onClose={() => setAlertMessage(null)}
                />
              </div>
            )}
            <Input
              label="사이트명"
              name="name"
              value={currentBanner.name || ""}
              onChange={(e) =>
                setCurrentBanner((prev) => (prev ? { ...prev, name: e.target.value } : null))
              }
              required
              disabled={saving || moving}
            />
            <Input
              label="이동 링크"
              name="link"
              value={currentBanner.link || ""}
              onChange={(e) =>
                setCurrentBanner((prev) => (prev ? { ...prev, link: e.target.value } : null))
              }
              required
              disabled={saving || moving}
            />
            <FileUpload
              label="로고 이미지"
              onChange={setLogoFile}
              value={currentBanner.imageUrl}
              disabled={saving || moving}
            />
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPublic-modal"
                checked={currentBanner.isPublic === 1}
                onChange={(e) =>
                  setCurrentBanner((prev) =>
                    prev ? { ...prev, isPublic: e.target.checked ? 1 : 0 } : null
                  )
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={saving || moving}
              />
              <label htmlFor="isPublic-modal" className="text-sm font-medium text-gray-700">
                공개 여부
              </label>
            </div>
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => setShowModal(false)}
                disabled={saving || moving}
              >
                취소
              </Button>
              <Button variant="primary" onClick={handleSaveBanner} disabled={saving || moving}>
                {saving ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RemittanceBannerPage;
