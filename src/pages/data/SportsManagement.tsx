import React, { useState, useEffect } from "react";
import axios from "@/api/axios";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import ActionButton from "@/components/ActionButton";
import Modal from "@/components/Modal";
import Input from "@/components/forms/Input";
import Alert from "@/components/Alert";
import { formatDate } from "@/utils/dateUtils";

// 스포츠 종목 타입 정의
interface Sport {
  id: number;
  name: string;
  isPublic: boolean;
  position: number;
  games: string[];
  createdAt: string;
  updatedAt: string;
}

// 스포츠 종목 선택을 위한 상수
const AVAILABLE_GAMES = [
  "e스포츠",
  "겨울스포츠",
  "경마",
  "골프",
  "농구",
  "럭비",
  "모터스포츠",
  "미식 축구",
  "배구",
  "배드민턴",
  "복싱",
  "사이클",
  "수구",
  "야구",
  "양궁",
  "육상",
  "크리켓",
  "탁구",
  "테니스",
  "하키",
  "핸드볼",
  "축구",
  "데니스",
  "하키",
];

const SportsManagement = () => {
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // 모달 관련 상태
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentSport, setCurrentSport] = useState<Sport | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // 스포츠 데이터 상태
  const [name, setName] = useState<string>("");
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [publicSettings, setPublicSettings] = useState<"public" | "private">("public");

  // 공개 설정 상태 관리
  useEffect(() => {
    setIsPublic(publicSettings === "public");
  }, [publicSettings]);

  // 종목 목록 조회
  const fetchSports = async () => {
    setLoading(true);
    setError(null);

    try {
      // API 경로는 실제 환경에 맞게 수정 필요
      const response = await axios.get("/sports");

      if (response.data && Array.isArray(response.data)) {
        // position 기준으로 내림차순 정렬 (높은 값이 위로)
        const sortedSports = [...response.data].sort(
          (a, b) => (b.position || 0) - (a.position || 0)
        );
        setSports(sortedSports);
      } else {
        setSports([]);
        setError("종목 목록을 불러오는데 실패했습니다.");
      }
    } catch (err) {
      console.error("Error fetching sports:", err);
      setError("종목 목록을 불러오는데 실패했습니다.");
      setSports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSports();
  }, []);

  // 모달 닫기
  const handleCloseModal = () => {
    setShowModal(false);
  };

  // 종목 추가 모달 열기
  const handleAddSport = () => {
    setCurrentSport(null);
    // 초기화
    setName("");
    setSelectedGames([]);
    setIsPublic(true);
    setPublicSettings("public");
    setIsEditing(false);
    setShowModal(true);
  };

  // 종목 수정 모달 열기
  const handleEditSport = (sport: Sport) => {
    setCurrentSport(sport);
    setName(sport.name || "");
    setSelectedGames(sport.games || []);
    setIsPublic(sport.isPublic === true || sport.isPublic === 1);
    setPublicSettings(sport.isPublic === true || sport.isPublic === 1 ? "public" : "private");
    setIsEditing(true);
    setShowModal(true);
  };

  // 종목 삭제
  const handleDeleteSport = async (id: number) => {
    if (!window.confirm("정말로 이 종목을 삭제하시겠습니까?")) {
      return;
    }

    try {
      await axios.delete(`/sports/${id}`);
      setAlertMessage({ type: "success", message: "종목이 삭제되었습니다." });
      fetchSports(); // 목록 새로고침
    } catch (err) {
      console.error("Error deleting sport:", err);
      setAlertMessage({ type: "error", message: "종목 삭제 중 오류가 발생했습니다." });
    }
  };

  // 종목 체크박스 핸들러
  const handleGameToggle = (game: string) => {
    setSelectedGames((prev) => {
      if (prev.includes(game)) {
        return prev.filter((g) => g !== game);
      } else {
        return [...prev, game];
      }
    });
  };

  // 종목 저장 처리
  const handleSaveSport = async () => {
    if (!name.trim()) {
      setAlertMessage({ type: "error", message: "종목명을 입력해주세요." });
      return;
    }

    if (selectedGames.length === 0) {
      setAlertMessage({ type: "error", message: "하나 이상의 경기를 선택해주세요." });
      return;
    }

    try {
      setSaving(true);

      const sportData = {
        name,
        games: selectedGames,
        isPublic,
      };

      if (!isEditing) {
        // 새 종목 생성
        await axios.post("/sports", sportData);
        setAlertMessage({ type: "success", message: "종목이 성공적으로 추가되었습니다." });
      } else if (currentSport) {
        // 기존 종목 수정
        await axios.put(`/sports/${currentSport.id}`, sportData);
        setAlertMessage({ type: "success", message: "종목 정보가 수정되었습니다." });
      }

      // 모달 닫기 및 목록 새로고침
      setShowModal(false);
      fetchSports();
    } catch (err) {
      console.error("Error saving sport:", err);
      setAlertMessage({
        type: "error",
        message: !isEditing
          ? "종목 추가 중 오류가 발생했습니다."
          : "종목 정보 수정 중 오류가 발생했습니다.",
      });
    } finally {
      setSaving(false);
    }
  };

  // 종목 순서 위로 이동
  const handleMoveUp = async (index: number) => {
    if (index <= 0) return; // 이미 첫 번째 항목이면 이동하지 않음

    try {
      const sportToMove = sports[index];
      const sportAbove = sports[index - 1];

      // 위치 교환
      const newPosition = sportAbove.position;
      const oldPosition = sportToMove.position;

      await axios.patch(`/sports/${sportToMove.id}`, { position: newPosition });
      await axios.patch(`/sports/${sportAbove.id}`, { position: oldPosition });

      setAlertMessage({ type: "success", message: "종목 순서가 변경되었습니다." });
      fetchSports(); // 목록 새로고침
    } catch (err) {
      console.error("Error moving sport up:", err);
      setAlertMessage({ type: "error", message: "종목 순서 변경 중 오류가 발생했습니다." });
    }
  };

  // 종목 순서 아래로 이동
  const handleMoveDown = async (index: number) => {
    if (index >= sports.length - 1) return; // 이미 마지막 항목이면 이동하지 않음

    try {
      const sportToMove = sports[index];
      const sportBelow = sports[index + 1];

      // 위치 교환
      const newPosition = sportBelow.position;
      const oldPosition = sportToMove.position;

      await axios.patch(`/sports/${sportToMove.id}`, { position: newPosition });
      await axios.patch(`/sports/${sportBelow.id}`, { position: oldPosition });

      setAlertMessage({ type: "success", message: "종목 순서가 변경되었습니다." });
      fetchSports(); // 목록 새로고침
    } catch (err) {
      console.error("Error moving sport down:", err);
      setAlertMessage({ type: "error", message: "종목 순서 변경 중 오류가 발생했습니다." });
    }
  };

  // DataTable 컬럼 정의
  const columns = [
    {
      header: "종목명",
      accessor: "name" as keyof Sport,
    },
    {
      header: "등록일자",
      accessor: "createdAt" as keyof Sport,
      cell: (value: string) => formatDate(value),
    },
    {
      header: "공개 여부",
      accessor: "isPublic" as keyof Sport,
      cell: (value: boolean | number) => (
        <span
          className={`px-2 py-1 rounded text-xs ${
            value === true || value === 1
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {value === true || value === 1 ? "공개" : "비공개"}
        </span>
      ),
    },
    {
      header: "관리",
      accessor: "id" as keyof Sport,
      cell: (value: number, row: Sport) => (
        <div className="flex items-center space-x-2">
          <ActionButton
            label="수정"
            onClick={() => handleEditSport(row)}
            color="blue"
            action="edit"
          />
          <ActionButton
            label="삭제"
            onClick={() => handleDeleteSport(value)}
            color="red"
            action="delete"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">스포츠 종목 관리</h1>
        <Button onClick={handleAddSport} variant="primary">
          종목 추가
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
        data={sports}
        loading={loading}
        emptyMessage="등록된 종목이 없습니다."
      />

      {/* 종목 추가/수정 모달 */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={isEditing ? "스포츠 종목 수정" : "새 스포츠 종목 추가"}
        size="lg"
      >
        <div className="space-y-6">
          {/* 스포츠 종목명 */}
          <div>
            <Input
              label="스포츠 종목명"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="종목명을 입력하세요"
            />
          </div>

          {/* 경기 종류 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              경기 종류 <span className="text-red-500">*</span>
            </label>
            <div className="h-64 overflow-y-auto border border-gray-300 rounded-md p-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AVAILABLE_GAMES.map((game) => (
                  <div key={game} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`game-${game}`}
                      checked={selectedGames.includes(game)}
                      onChange={() => handleGameToggle(game)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor={`game-${game}`}
                      className="ml-2 block text-sm text-gray-900 truncate"
                    >
                      {game}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">선택된 경기 종류: {selectedGames.length}개</p>
          </div>

          {/* 공개 여부 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">공개 여부</label>
            <div className="flex items-center space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="public"
                  checked={publicSettings === "public"}
                  onChange={() => setPublicSettings("public")}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-900">공개</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="private"
                  checked={publicSettings === "private"}
                  onChange={() => setPublicSettings("private")}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-900">비공개</span>
              </label>
            </div>
          </div>

          {/* 버튼 영역 */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal} disabled={saving}>
              취소
            </Button>
            <Button type="button" variant="primary" onClick={handleSaveSport} disabled={saving}>
              {saving ? "저장 중..." : isEditing ? "수정" : "등록"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SportsManagement;
