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

  // DataTable 컬럼 정의
  const columns = [
    {
      header: "순서",
      accessor: "displayOrder" as keyof RemittanceBanner,
      cell: (value: number, row: RemittanceBanner, index: number) => <span>{index + 1}</span>, // Display index + 1 for visual order
      size: 50,
    },
    {
      header: "로고",
      accessor: "imageUrl" as keyof RemittanceBanner,
      cell: (value: string) =>
        value ? <img src={value} alt="로고" className="h-10 w-auto object-contain" /> : "-",
      size: 100,
    },
    {
      header: "사이트명",
      accessor: "name" as keyof RemittanceBanner,
    },
    {
      header: "이동링크",
      accessor: "link" as keyof RemittanceBanner,
      cell: (value: string) => (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline truncate block max-w-xs"
        >
          {value}
        </a>
      ),
    },
    {
      header: "공개 여부",
      accessor: "isPublic" as keyof RemittanceBanner,
      cell: (value: number) => (
        <span
          className={`px-2 py-1 rounded ${
            value === 1 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          } text-xs font-medium`}
        >
          {value === 1 ? "공개" : "비공개"}
        </span>
      ),
      size: 100,
    },
    {
      header: "등록일자",
      accessor: "createdAt" as keyof RemittanceBanner,
      cell: (value: string) => formatDate(value),
    },
    {
      header: "관리",
      accessor: "id" as keyof RemittanceBanner,
      cell: (value: number, row: RemittanceBanner, index: number) => (
        // Ensure the div uses flex and centers items vertically
        <div className="flex items-center space-x-2">
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
      size: 200, // Adjust size if needed
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

        <div className="flex justify-between items-center pt-2 pb-4 border-b border-gray-200 mb-6">
          <div className="flex space-x-3">
            <Button onClick={handleSaveBanner} variant="primary">
              {isEditing ? "저장" : "등록"}
            </Button>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              취소
            </Button>
          </div>
          <div className="flex space-x-4">
            <div className="flex items-center">
              <input
                type="radio"
                id="visibility-public-modal"
                name="isPublicModal"
                value="1"
                checked={currentBanner?.isPublic === 1}
                onChange={() =>
                  setCurrentBanner((prev) => (prev ? { ...prev, isPublic: 1 } : null))
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <label htmlFor="visibility-public-modal" className="ml-2 text-sm text-gray-700">
                공개
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="radio"
                id="visibility-private-modal"
                name="isPublicModal"
                value="0"
                checked={currentBanner?.isPublic === 0}
                onChange={() =>
                  setCurrentBanner((prev) => (prev ? { ...prev, isPublic: 0 } : null))
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <label htmlFor="visibility-private-modal" className="ml-2 text-sm text-gray-700">
                비공개
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-4">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이동링크 <span className="text-red-600">*</span>
            </label>
            <Input
              label="이동링크"
              type="text"
              value={currentBanner?.link || ""}
              onChange={(e) =>
                setCurrentBanner((prev) => (prev ? { ...prev, link: e.target.value } : null))
              }
              placeholder="https://..."
              required
            />
          </div>

          <div>
            <div className="mb-2">
              <FileUpload
                label="로고 이미지 (권장크기: 36x36)"
                onChange={setLogoFile}
                value={currentBanner?.imageUrl}
                required={!isEditing}
                accept="image/png, image/jpeg, image/gif, image/svg+xml"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RemittanceBannerPage;
