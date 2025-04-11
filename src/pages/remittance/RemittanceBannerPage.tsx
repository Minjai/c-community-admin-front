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

const RemittanceBannerPage: React.FC = () => {
  const [banners, setBanners] = useState<RemittanceBanner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [currentBanner, setCurrentBanner] = useState<Partial<RemittanceBanner> | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

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

    try {
      const response = await RemittanceBannerService.getRemittanceBanners();
      // 배너를 displayOrder 기준으로 오름차순 정렬 (낮은 값이 위로)
      const sortedBanners = [...response].sort(
        (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)
      );
      setBanners(sortedBanners);
    } catch (err) {
      setError("송금 배너를 불러오는데 실패했습니다.");
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
  };

  // 배너 수정 모달 열기
  const handleEditBanner = (banner: RemittanceBanner) => {
    setCurrentBanner({
      ...banner,
    });
    setLogoFile(null);
    setShowModal(true);
    setIsEditing(true);
  };

  // 배너 저장 (추가 또는 수정)
  const handleSaveBanner = async () => {
    if (!currentBanner) return;

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
      fetchBanners();
    } catch (err) {
      console.error("Error saving remittance banner:", err);
      setAlertMessage({ type: "error", message: "송금 배너 저장 중 오류가 발생했습니다." });
    }
  };

  // 배너 삭제
  const handleDeleteBanner = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      const success = await RemittanceBannerService.deleteRemittanceBanner(id);
      if (success) {
        setAlertMessage({ type: "success", message: "송금 배너가 삭제되었습니다." });
        fetchBanners();
      } else {
        setAlertMessage({ type: "error", message: "송금 배너 삭제에 실패했습니다." });
      }
    } catch (err) {
      console.error("Error deleting remittance banner:", err);
      setAlertMessage({ type: "error", message: "송금 배너 삭제 중 오류가 발생했습니다." });
    }
  };

  // 배너 위로 이동
  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;

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
    }
  };

  // 배너 아래로 이동
  const handleMoveDown = async (index: number) => {
    if (index >= banners.length - 1) return;

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
    }
  };

  // 테이블 컬럼 정의
  const columns = [
    {
      header: "순서",
      accessor: "displayOrder" as keyof RemittanceBanner,
      cell: (value: number, row: RemittanceBanner, index: number) => (
        <div className="text-center">
          <span className="font-medium">{index + 1}번째</span>
        </div>
      ),
    },
    {
      header: "로고",
      accessor: "imageUrl" as keyof RemittanceBanner,
      cell: (value: string) => (
        <div className="w-16 h-12 bg-gray-100 flex items-center justify-center overflow-hidden">
          {value ? (
            <img src={value} alt="로고" className="max-w-full max-h-full object-contain" />
          ) : (
            <span className="text-xs text-gray-500">이미지 없음</span>
          )}
        </div>
      ),
    },
    {
      header: "사이트명",
      accessor: "name" as keyof RemittanceBanner,
    },
    {
      header: "이동링크",
      accessor: "link" as keyof RemittanceBanner,
      cell: (value: string) => (
        <div className="max-w-xs truncate">
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline hover:text-blue-800"
            title={value}
          >
            {value}
          </a>
        </div>
      ),
    },
    {
      header: "등록일자",
      accessor: "createdAt" as keyof RemittanceBanner,
      cell: (value: string) => formatDate(value),
    },
    {
      header: "공개 여부",
      accessor: "isPublic" as keyof RemittanceBanner,
      cell: (value: number) => (
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
      accessor: "id" as keyof RemittanceBanner,
      cell: (value: number, row: RemittanceBanner, index: number) => (
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
    <div className="mb-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">송금 배너 관리</h1>
        <p className="text-sm text-gray-600">
          사이트에 노출될 송금 배너를 관리하고 공개 여부와 노출 순서를 설정할 수 있습니다.
        </p>
      </div>

      {alertMessage && (
        <div className="mb-4">
          <Alert
            type={alertMessage.type}
            message={alertMessage.message}
            onClose={() => setAlertMessage(null)}
          />
        </div>
      )}

      <div className="flex justify-end mb-4">
        <Button onClick={handleAddBanner}>
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>새 송금 배너 추가</span>
          </div>
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          columns={columns}
          data={banners}
          loading={loading}
          emptyMessage="등록된 송금 배너가 없습니다."
        />
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isEditing ? "송금 배너 수정" : "새 송금 배너 추가"}
        size="md"
        footer={
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              취소
            </Button>
            <Button onClick={handleSaveBanner}>저장</Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* 사이트명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              사이트명 <span className="text-red-600">*</span>
            </label>
            <Input
              type="text"
              value={currentBanner?.name || ""}
              onChange={(e) =>
                setCurrentBanner((prev) => (prev ? { ...prev, name: e.target.value } : null))
              }
              placeholder="예: 000 송금"
              className="w-full"
            />
          </div>

          {/* 이동링크 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이동링크 <span className="text-red-600">*</span>
            </label>
            <Input
              type="text"
              value={currentBanner?.link || ""}
              onChange={(e) =>
                setCurrentBanner((prev) => (prev ? { ...prev, link: e.target.value } : null))
              }
              placeholder="https://example.com"
              className="w-full"
            />
          </div>

          {/* 로고 이미지 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              로고 이미지 {!isEditing && <span className="text-red-600">*</span>}
            </label>
            <div className="mb-2">
              <FileUpload
                onChange={(file) => setLogoFile(file)}
                accept="image/*"
                label={isEditing ? "로고 이미지 변경" : "로고 이미지 선택"}
              />
              <p className="text-xs text-gray-500 mt-1">권장 크기: 400x200px, 최대 2MB</p>
            </div>
            {/* 기존 이미지 미리보기 (수정 시) */}
            {isEditing && currentBanner?.imageUrl && (
              <div className="mt-2">
                <p className="text-sm mb-1">현재 로고:</p>
                <div className="w-40 h-20 border border-gray-200 rounded-md overflow-hidden">
                  <img
                    src={currentBanner.imageUrl}
                    alt="현재 로고"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 공개 여부 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">공개 여부</label>
            <div className="flex space-x-4">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="visibility-public"
                  name="isPublic"
                  value="1"
                  checked={currentBanner?.isPublic === 1}
                  onChange={() =>
                    setCurrentBanner((prev) => (prev ? { ...prev, isPublic: 1 } : null))
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="visibility-public" className="ml-2 text-sm text-gray-700">
                  공개
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="visibility-private"
                  name="isPublic"
                  value="0"
                  checked={currentBanner?.isPublic === 0}
                  onChange={() =>
                    setCurrentBanner((prev) => (prev ? { ...prev, isPublic: 0 } : null))
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="visibility-private" className="ml-2 text-sm text-gray-700">
                  비공개
                </label>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RemittanceBannerPage;
