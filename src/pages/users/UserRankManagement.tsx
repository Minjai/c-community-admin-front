import React, { useState, useEffect } from "react";
import axios from "@/api/axios";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import ActionButton from "@/components/ActionButton";
import Modal from "@/components/Modal";
import Input from "@/components/forms/Input";
import FileUpload from "@/components/forms/FileUpload";
import Alert from "@/components/Alert";
import { formatDate } from "@/utils/dateUtils";
import { extractDataArray } from "../../api/util";

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

  // 파일 상태 관리
  const [imageFile, setImageFile] = useState<File | null>(null);

  // 등급 목록 조회
  const fetchRanks = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get("/admin/ranks");
      console.log("회원 등급 응답 구조:", response);

      // 유틸리티 함수를 사용하여 데이터 배열 추출
      const rankData = extractDataArray(response.data, true);

      if (rankData && rankData.length > 0) {
        console.log("추출된 등급 데이터:", rankData);

        // 필드 매핑 및 처리
        const processedRanks = rankData.map((rank: any) => ({
          id: rank.id,
          rankName: rank.rankName || rank.name || "",
          image: rank.image || rank.imageUrl || "",
          score: rank.score || 0,
          position: rank.position || rank.displayOrder || 0,
          createdAt: rank.createdAt || new Date().toISOString(),
          updatedAt: rank.updatedAt || rank.createdAt || "",
        }));

        // 등급을 position 기준으로 내림차순 정렬 (높은 값이 위로)
        const sortedRanks = [...processedRanks].sort(
          (a, b) => (b.position || 0) - (a.position || 0)
        );

        setRanks(sortedRanks);
      } else {
        console.log("적절한 등급 데이터를 찾지 못했습니다.");
        setRanks([]);
        setError("회원 등급을 불러오는데 실패했습니다.");
      }
    } catch (err) {
      console.error("Error fetching user ranks:", err);
      setError("회원 등급을 불러오는데 실패했습니다.");
      setRanks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRanks();
  }, []);

  // 등급 추가 모달 열기
  const handleAddRank = () => {
    setCurrentRank({
      id: 0,
      rankName: "",
      image: "",
      score: 0,
      createdAt: new Date().toISOString(),
      position: ranks.length + 1, // 현재 등급 개수 + 1
    });
    setShowModal(true);
    setIsEditing(false);
    setImageFile(null);
  };

  // 등급 수정 모달 열기
  const handleEditRank = (rank: UserRank) => {
    setCurrentRank({
      ...rank,
    });
    setIsEditing(true);
    setShowModal(true);
    setImageFile(null);
  };

  // 등급 저장 (추가 또는 수정)
  const handleSaveRank = async () => {
    if (!currentRank) return;

    try {
      // 필수 필드 검증
      if (!currentRank.rankName) {
        setAlertMessage({ type: "error", message: "등급 이름은 필수 항목입니다." });
        return;
      }

      const formData = new FormData();
      formData.append("rankName", currentRank.rankName);
      formData.append("score", currentRank.score.toString());
      formData.append("position", (currentRank.position || 0).toString());

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

      // 모달 닫고 목록 갱신
      setShowModal(false);
      fetchRanks();
    } catch (error: any) {
      console.error("Error saving rank:", error);
      setAlertMessage({
        type: "error",
        message: `등급 저장 중 오류가 발생했습니다: ${
          error.response?.data?.message || error.message
        }`,
      });
    }
  };

  // 등급 삭제
  const handleDeleteRank = async (id: number) => {
    if (!window.confirm("정말로 이 등급을 삭제하시겠습니까?")) {
      return;
    }

    try {
      await axios.delete(`/admin/ranks/${id}`);
      setAlertMessage({ type: "success", message: "등급이 삭제되었습니다." });
      fetchRanks();
    } catch (error: any) {
      console.error("Error deleting rank:", error);
      setAlertMessage({
        type: "error",
        message: `등급 삭제 중 오류가 발생했습니다: ${
          error.response?.data?.message || error.message
        }`,
      });
    }
  };

  // 등급 순서 위로 이동
  const handleMoveUp = async (index: number) => {
    if (index <= 0 || ranks.length < 2) return;

    try {
      const newRanks = [...ranks];
      const temp = newRanks[index];
      newRanks[index] = newRanks[index - 1];
      newRanks[index - 1] = temp;

      // position 값 업데이트
      const updatedRanks = newRanks.map((rank, idx) => ({
        ...rank,
        position: idx + 1,
      }));

      setRanks(updatedRanks);

      // 서버에 순서 변경 요청
      await axios.put(`/admin/ranks/${temp.id}/position`, {
        position: index,
      });

      await axios.put(`/admin/ranks/${newRanks[index].id}/position`, {
        position: index + 1,
      });

      setAlertMessage({
        type: "success",
        message: "등급 순서가 변경되었습니다.",
      });
    } catch (error: any) {
      console.error("Error moving rank up:", error);
      setAlertMessage({
        type: "error",
        message: `등급 순서 변경 중 오류가 발생했습니다: ${
          error.response?.data?.message || error.message
        }`,
      });
      // 실패 시 다시 불러오기
      fetchRanks();
    }
  };

  // 등급 순서 아래로 이동
  const handleMoveDown = async (index: number) => {
    if (index >= ranks.length - 1 || ranks.length < 2) return;

    try {
      const newRanks = [...ranks];
      const temp = newRanks[index];
      newRanks[index] = newRanks[index + 1];
      newRanks[index + 1] = temp;

      // position 값 업데이트
      const updatedRanks = newRanks.map((rank, idx) => ({
        ...rank,
        position: idx + 1,
      }));

      setRanks(updatedRanks);

      // 서버에 순서 변경 요청
      await axios.put(`/admin/ranks/${temp.id}/position`, {
        position: index + 2,
      });

      await axios.put(`/admin/ranks/${newRanks[index].id}/position`, {
        position: index + 1,
      });

      setAlertMessage({
        type: "success",
        message: "등급 순서가 변경되었습니다.",
      });
    } catch (error: any) {
      console.error("Error moving rank down:", error);
      setAlertMessage({
        type: "error",
        message: `등급 순서 변경 중 오류가 발생했습니다: ${
          error.response?.data?.message || error.message
        }`,
      });
      // 실패 시 다시 불러오기
      fetchRanks();
    }
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

  // DataTable 컬럼 정의
  const columns = [
    {
      header: "등급명",
      accessor: "rankName" as keyof UserRank,
      cell: (value: string, row: UserRank) => (
        <span
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer block max-w-xs truncate"
          onClick={() => handleEditRank(row)}
          title={value}
        >
          {value}
        </span>
      ),
    },
    {
      header: "이미지",
      accessor: "image" as keyof UserRank,
      cell: (value: string) =>
        value ? <img src={value} alt="등급 이미지" className="h-10 w-auto object-contain" /> : "-",
      size: 100,
    },
    {
      header: "점수",
      accessor: "score" as keyof UserRank,
      cell: (value: number) => value.toLocaleString(),
      size: 100,
    },
    {
      header: "등록일자",
      accessor: "createdAt" as keyof UserRank,
      cell: (value: string) => formatDate(value),
    },
    {
      header: "관리",
      accessor: "id" as keyof UserRank,
      cell: (value: number, row: UserRank, index: number) => (
        <div className="flex space-x-2">
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
            disabled={index === ranks.length - 1}
          />
          <ActionButton label="수정" action="edit" size="sm" onClick={() => handleEditRank(row)} />
          <ActionButton
            label="삭제"
            action="delete"
            size="sm"
            onClick={() => handleDeleteRank(value)}
          />
        </div>
      ),
      size: 200,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">회원 등급 관리</h1>
        <Button onClick={handleAddRank} variant="primary">
          새 등급 추가
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
        data={ranks}
        loading={loading}
        emptyMessage="등록된 등급이 없습니다."
      />

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
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                등급 이미지 <span className="text-xs text-gray-500">(사이즈 권장크기 36x36)</span>
              </label>
              <FileUpload onChange={(file) => setImageFile(file)} accept="image/*" preview={true} />
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
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UserRankManagement;
