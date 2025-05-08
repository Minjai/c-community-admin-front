import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "@/api/axios";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import ActionButton from "@/components/ActionButton";
import Modal from "@/components/Modal";
import Input from "@/components/forms/Input";
import FileUpload from "@/components/forms/FileUpload";
import Alert from "@/components/Alert";
import { formatDate } from "@/utils/dateUtils";
import LoadingOverlay from "@/components/LoadingOverlay";

// 회원 등급 타입 정의
interface UserRank {
  id: number;
  rankName: string;
  image: string;
  score: number;
  createdAt: string;
  updatedAt?: string;
  position?: number;
}

const UserRankManagement: React.FC = () => {
  const [ranks, setRanks] = useState<UserRank[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentRank, setCurrentRank] = useState<UserRank | null>(null);
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [moving, setMoving] = useState<boolean>(false);

  // 선택된 등급 ID 상태 추가
  const [selectedRankIds, setSelectedRankIds] = useState<number[]>([]);

  // 페이지네이션 상태 추가
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0); // 초기값 0
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);

  // 파일 상태 관리
  const [imageFile, setImageFile] = useState<File | null>(null);

  // 등급 목록 조회
  const fetchRanks = useCallback(async (page: number = 1, limit: number = 10) => {
    setLoading(true);
    setError(null);

    try {
      // API 호출 시 page, limit 파라미터 전달
      const response = await axios.get(`/admin/ranks?page=${page}&limit=${limit}`);
      //console.log("회원 등급 응답 구조:", response.data);

      // 응답 구조 ({ ranks: [], pagination: {} }) 확인 및 처리
      if (response.data && response.data.ranks && response.data.pagination) {
        const fetchedRanks = response.data.ranks || [];
        const pagination = response.data.pagination;

        // 필드 매핑 및 처리
        const processedRanks = fetchedRanks.map((rank: any) => ({
          id: rank.id,
          rankName: rank.rankName || rank.name || "",
          image: rank.image || rank.imageUrl || "",
          score: rank.score || 0,
          position: rank.position || rank.displayOrder || 0,
          createdAt: rank.createdAt || new Date().toISOString(),
          updatedAt: rank.updatedAt || rank.createdAt || "",
        }));

        // 정렬은 서버에서 지원하지 않으면 여기서 유지 가능
        const sortedRanks = [...processedRanks].sort(
          (a, b) => (b.position || 0) - (a.position || 0)
        );

        setRanks(sortedRanks); // 현재 페이지 데이터 설정
        setTotalItems(pagination.totalItems || 0);
        setTotalPages(pagination.totalPages || 0);
        setCurrentPage(pagination.currentPage || page);
        setPageSize(pagination.pageSize || limit);
        setSelectedRankIds([]); // 페이지 변경 시 선택 초기화
      } else {
        console.error("회원 등급 불러오기 실패: 응답 형식이 예상과 다릅니다", response.data);
        setRanks([]);
        setTotalItems(0);
        setTotalPages(0);
        setCurrentPage(1);
        setError("회원 등급 데이터 형식이 올바르지 않습니다.");
      }
    } catch (err) {
      console.error("Error fetching user ranks:", err);
      setRanks([]);
      setTotalItems(0);
      setTotalPages(0);
      setCurrentPage(1);
      setError("회원 등급을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRanks(currentPage, pageSize);
  }, [fetchRanks, currentPage, pageSize]);

  // 페이지 변경 핸들러 추가
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page); // setCurrentPage만 호출 -> useEffect 트리거
    }
  };

  // 등급 추가 모달 열기
  const handleAddRank = () => {
    setCurrentRank({
      id: 0,
      rankName: "",
      image: "",
      score: 0,
      createdAt: new Date().toISOString(),
    });
    setShowModal(true);
    setIsEditing(false);
    setImageFile(null);
    setAlertMessage(null);
    setSelectedRankIds([]);
  };

  // 등급 수정 모달 열기
  const handleEditRank = (rank: UserRank) => {
    setCurrentRank({
      ...rank,
    });
    setIsEditing(true);
    setShowModal(true);
    setImageFile(null);
    setAlertMessage(null);
    setSelectedRankIds([]);
  };

  // 등급 저장 (추가 또는 수정)
  const handleSaveRank = async () => {
    if (!currentRank) return;

    setSaving(true);
    setAlertMessage(null);

    try {
      // 필수 필드 검증
      if (!currentRank.rankName) {
        setAlertMessage({ type: "error", message: "등급 이름은 필수 항목입니다." });
        return;
      }

      const formData = new FormData();
      formData.append("rankName", currentRank.rankName);
      formData.append("score", currentRank.score.toString());

      if (imageFile) {
        formData.append("image", imageFile);
      }

      if (isEditing && currentRank.id) {
        // 수정 모드일 때
        await axios.put(`/admin/ranks/${currentRank.id}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        setAlertMessage({ type: "success", message: "등급이 수정되었습니다." });
      } else {
        // 추가 모드일 때
        await axios.post("/admin/ranks", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        setAlertMessage({ type: "success", message: "새 등급이 추가되었습니다." });
      }

      setShowModal(false);
      setSelectedRankIds([]);
      fetchRanks(currentPage, pageSize);
    } catch (error: any) {
      console.error("Error saving rank:", error);
      setAlertMessage({
        type: "error",
        message: `등급 저장 중 오류가 발생했습니다: ${
          error.response?.data?.message || error.message
        }`,
      });
    } finally {
      setSaving(false);
    }
  };

  // 등급 삭제
  const handleDeleteRank = async (id: number) => {
    if (!window.confirm("정말로 이 등급을 삭제하시겠습니까?")) {
      return;
    }

    setLoading(true);
    setAlertMessage(null);
    try {
      await axios.delete(`/admin/ranks/${id}`);
      setAlertMessage({ type: "success", message: "등급이 삭제되었습니다." });
      setSelectedRankIds((prev) => prev.filter((rankId) => rankId !== id));
      fetchRanks(currentPage, pageSize);
    } catch (error: any) {
      console.error("Error deleting rank:", error);
      setAlertMessage({
        type: "error",
        message: `등급 삭제 중 오류가 발생했습니다: ${
          error.response?.data?.message || error.message
        }`,
      });
    } finally {
      setLoading(false);
    }
  };

  // 개별 선택 핸들러 추가
  const handleSelectRank = (id: number) => {
    setSelectedRankIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((rankId) => rankId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // 전체 선택 핸들러 추가
  const handleSelectAllRanks = (event: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    if (isChecked) {
      setSelectedRankIds(ranks.map((rank) => rank.id));
    } else {
      setSelectedRankIds([]);
    }
  };

  // 일괄 삭제 핸들러 추가
  const handleBulkDelete = async () => {
    if (selectedRankIds.length === 0) {
      setAlertMessage({ type: "info", message: "삭제할 등급을 선택해주세요." });
      return;
    }
    if (!window.confirm(`선택된 ${selectedRankIds.length}개의 등급을 정말 삭제하시겠습니까?`)) {
      return;
    }

    setLoading(true);
    setAlertMessage(null);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const id of selectedRankIds) {
      try {
        await axios.delete(`/admin/ranks/${id}`);
        successCount++;
      } catch (err: any) {
        errorCount++;
        const message = err.response?.data?.message || `등급(ID: ${id}) 삭제 중 오류`;
        errors.push(message);
        console.error(`Error deleting rank ${id}:`, err.response?.data || err);
      }
    }

    setSelectedRankIds([]);
    setLoading(false);

    if (errorCount === 0) {
      setAlertMessage({
        type: "success",
        message: `${successCount}개의 등급이 성공적으로 삭제되었습니다.`,
      });
    } else if (successCount === 0) {
      setAlertMessage({
        type: "error",
        message: `선택된 등급을 삭제하는 중 오류가 발생했습니다. (${errors.join(", ")})`,
      });
    } else {
      setAlertMessage({
        type: "info",
        message: `${successCount}개 삭제 성공, ${errorCount}개 삭제 실패.`,
      });
    }

    fetchRanks(currentPage, pageSize);
  };

  // 입력 변경 핸들러
  const handleInputChange = (name: string, value: any) => {
    if (currentRank) {
      setCurrentRank({ ...currentRank, [name]: value });
    }
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentRank(null);
    setImageFile(null);
  };

  // 파일 변경 핸들러
  const handleFileChange = (file: File | null) => {
    setImageFile(file);
  };

  // DataTable 컬럼 정의
  const columns = useMemo(
    () => [
      {
        header: (
          <input
            type="checkbox"
            className="form-checkbox h-4 w-4 text-blue-600"
            onChange={handleSelectAllRanks}
            checked={ranks.length > 0 && selectedRankIds.length === ranks.length}
            ref={(input) => {
              if (input) {
                input.indeterminate =
                  selectedRankIds.length > 0 && selectedRankIds.length < ranks.length;
              }
            }}
            disabled={loading || ranks.length === 0}
          />
        ),
        accessor: "id" as keyof UserRank,
        cell: (id: number) => (
          <input
            type="checkbox"
            className="form-checkbox h-4 w-4 text-blue-600"
            checked={selectedRankIds.includes(id)}
            onChange={() => handleSelectRank(id)}
          />
        ),
        className: "w-px px-4",
      },
      {
        header: "이미지",
        accessor: "image" as keyof UserRank,
        cell: (image: string, row: UserRank) => (
          <img
            src={image || "/placeholder-image.png"} // 기본 이미지 경로 설정
            alt={row.rankName}
            className="h-10 w-10 object-cover rounded"
            onError={(e) => (e.currentTarget.src = "/placeholder-image.png")}
          />
        ),
      },
      { header: "등급명", accessor: "rankName" as keyof UserRank },
      { header: "기준 포인트", accessor: "score" as keyof UserRank },
      { header: "생성일", accessor: "createdAt" as keyof UserRank, cell: formatDate },
      {
        header: "관리",
        accessor: "id" as keyof UserRank,
        cell: (id: number, row: UserRank, index: number) => (
          <div className="flex space-x-1 justify-center">
            <ActionButton
              label="수정"
              action="edit"
              size="sm"
              onClick={() => handleEditRank(row)}
            />
            <ActionButton
              label="삭제"
              action="delete"
              size="sm"
              onClick={() => handleDeleteRank(id)}
            />
          </div>
        ),
        className: "text-center",
      },
    ],
    [ranks, selectedRankIds, loading, moving, currentPage, totalPages] // 의존성 업데이트
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">회원 등급 관리</h1>
        <div className="flex space-x-2">
          <Button
            variant="danger"
            onClick={handleBulkDelete}
            disabled={selectedRankIds.length === 0 || loading}
          >
            {`선택 삭제 (${selectedRankIds.length})`}
          </Button>
          <Button variant="primary" onClick={handleAddRank} disabled={loading || saving || moving}>
            새 등급 추가
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
          data={ranks}
          loading={loading}
          emptyMessage="등록된 회원 등급이 없습니다."
          pagination={{
            currentPage: currentPage,
            pageSize: pageSize,
            totalItems: totalItems,
            onPageChange: handlePageChange,
          }}
        />
      </div>

      {/* 등급 추가/수정 모달 */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={isEditing ? "등급 수정" : "새 등급 추가"}
      >
        {/* Modal Error/Success Alert (Above controls) */}
        {alertMessage && (
          <div className="mb-4">
            <Alert
              type={alertMessage.type}
              message={alertMessage.message}
              onClose={() => setAlertMessage(null)}
            />
          </div>
        )}
        {error && (
          <div className="mb-4">
            <Alert type="error" message={error} onClose={() => setError(null)} />
          </div>
        )}

        {/* Top Control Area */}
        <div className="flex justify-between items-center pt-2 pb-4 border-b border-gray-200 mb-6">
          {/* Buttons (Left) */}
          <div className="flex space-x-3">
            <Button onClick={handleSaveRank} variant="primary">
              {isEditing ? "저장" : "등록"}
            </Button>
            <Button onClick={handleCloseModal} variant="secondary">
              취소
            </Button>
          </div>
          {/* Right side - Placeholder if needed in future */}
          <div></div>
        </div>

        {currentRank && (
          <div className="space-y-6">
            <Input
              label="등급명"
              id="rankName"
              value={currentRank.rankName}
              onChange={(e) => handleInputChange("rankName", e.target.value)}
              required
              disabled={saving || moving}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                등급 이미지 <span className="text-xs text-gray-500">(사이즈 권장크기 36x36)</span>
              </label>
              <FileUpload label="프로필 사진" onChange={(file) => setImageFile(file)} />
              {currentRank?.image && !imageFile && (
                <div className="mt-2">
                  <span className="text-xs text-gray-500">현재 이미지:</span>
                  <img
                    src={
                      currentRank.image.startsWith("http")
                        ? currentRank.image
                        : `${import.meta.env.VITE_API_BASE_URL}/${currentRank.image}`
                    }
                    alt="현재 등급 이미지"
                    className="h-20 w-20 object-cover rounded mt-1"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/placeholder-image.png";
                    }}
                  />
                </div>
              )}
            </div>

            <Input
              label="필요 포인트"
              id="score"
              type="number"
              value={currentRank.score.toString()}
              onChange={(e) => handleInputChange("score", parseInt(e.target.value) || 0)}
              min="0"
              disabled={saving || moving}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UserRankManagement;
