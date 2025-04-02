import React, { useState, useEffect } from "react";
import axios from "@/api/axios";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import ActionButton from "@/components/ActionButton";
import Modal from "@/components/Modal";
import Input from "@/components/forms/Input";
import TextEditor from "@/components/forms/TextEditor";
import FileUpload from "@/components/forms/FileUpload";
import Alert from "@/components/Alert";
import { formatDate } from "@/utils/dateUtils";

// 카지노 게임 타입 정의
interface CasinoGame {
  id: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  rating: number;
  returnRate: number;
  isDirectLinkEnabled: boolean;
  directLinkUrl: string;
  isPublic: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

const CasinoGameManagement = () => {
  const [games, setGames] = useState<CasinoGame[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // 모달 관련 상태
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentGame, setCurrentGame] = useState<CasinoGame | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // 게임 데이터 상태
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [rating, setRating] = useState<number>(5.0);
  const [returnRate, setReturnRate] = useState<number>(95);
  const [isDirectLinkEnabled, setIsDirectLinkEnabled] = useState<boolean>(false);
  const [directLinkUrl, setDirectLinkUrl] = useState<string>("");
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  // 게임 목록 조회
  const fetchGames = async () => {
    setLoading(true);
    setError(null);

    try {
      // API 경로는 실제 환경에 맞게 수정 필요
      const response = await axios.get("/casino-games");

      if (response.data && Array.isArray(response.data)) {
        // position 기준으로 정렬
        const sortedGames = [...response.data].sort(
          (a, b) => (a.position || 0) - (b.position || 0)
        );
        setGames(sortedGames);
      } else {
        setGames([]);
        setError("게임 목록을 불러오는데 실패했습니다.");
      }
    } catch (err) {
      console.error("Error fetching casino games:", err);
      setError("게임 목록을 불러오는데 실패했습니다.");
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  // 모달 닫기
  const handleCloseModal = () => {
    setShowModal(false);
  };

  // 게임 추가 모달 열기
  const handleAddGame = () => {
    setCurrentGame(null);
    // 초기화
    setTitle("");
    setDescription("");
    setRating(5.0);
    setReturnRate(95);
    setIsDirectLinkEnabled(false);
    setDirectLinkUrl("");
    setIsPublic(true);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setIsEditing(false);
    setShowModal(true);
  };

  // 게임 수정 모달 열기
  const handleEditGame = (game: CasinoGame) => {
    setCurrentGame(game);
    setTitle(game.title || "");
    setDescription(game.description || "");
    setRating(game.rating || 5.0);
    setReturnRate(game.returnRate || 95);
    setIsDirectLinkEnabled(game.isDirectLinkEnabled || false);
    setDirectLinkUrl(game.directLinkUrl || "");
    setIsPublic(game.isPublic === true || game.isPublic === 1);
    setThumbnailFile(null);
    setThumbnailPreview(game.thumbnailUrl || null);
    setIsEditing(true);
    setShowModal(true);
  };

  // 게임 삭제
  const handleDeleteGame = async (id: number) => {
    if (!window.confirm("정말로 이 게임을 삭제하시겠습니까?")) {
      return;
    }

    try {
      await axios.delete(`/casino-games/${id}`);
      setAlertMessage({ type: "success", message: "게임이 삭제되었습니다." });
      fetchGames(); // 목록 새로고침
    } catch (err) {
      console.error("Error deleting game:", err);
      setAlertMessage({ type: "error", message: "게임 삭제 중 오류가 발생했습니다." });
    }
  };

  // 별점 입력 처리
  const handleRatingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setRating(Math.min(5, Math.max(0, value))); // 0~5 범위로 제한
  };

  // 환수율 입력 처리
  const handleReturnRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setReturnRate(Math.min(100, Math.max(0, value))); // 0~100 범위로 제한
  };

  // 썸네일 업로드 처리
  const handleThumbnailUpload = (file: File) => {
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  // 게임 저장 처리
  const handleSaveGame = async () => {
    if (!title.trim()) {
      setAlertMessage({ type: "error", message: "게임 제목을 입력해주세요." });
      return;
    }

    // 새 게임 추가 시 썸네일 필수
    if (!isEditing && !thumbnailFile) {
      setAlertMessage({ type: "error", message: "게임 썸네일 이미지를 업로드해주세요." });
      return;
    }

    // 바로가기 활성화 시 URL 필수
    if (isDirectLinkEnabled && !directLinkUrl.trim()) {
      setAlertMessage({ type: "error", message: "바로가기 URL을 입력해주세요." });
      return;
    }

    try {
      setSaving(true);

      // 폼 데이터 구성
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("rating", rating.toString());
      formData.append("returnRate", returnRate.toString());
      formData.append("isDirectLinkEnabled", isDirectLinkEnabled ? "1" : "0");
      formData.append("directLinkUrl", directLinkUrl);
      formData.append("isPublic", isPublic ? "1" : "0");

      if (thumbnailFile) {
        formData.append("thumbnail", thumbnailFile);
      }

      if (!isEditing) {
        // 새 게임 생성
        await axios.post("/casino-games", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        setAlertMessage({ type: "success", message: "게임이 성공적으로 추가되었습니다." });
      } else if (currentGame) {
        // 기존 게임 수정
        await axios.put(`/casino-games/${currentGame.id}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        setAlertMessage({ type: "success", message: "게임 정보가 수정되었습니다." });
      }

      // 모달 닫기 및 목록 새로고침
      setShowModal(false);
      fetchGames();
    } catch (err) {
      console.error("Error saving game:", err);
      setAlertMessage({
        type: "error",
        message: !isEditing
          ? "게임 추가 중 오류가 발생했습니다."
          : "게임 정보 수정 중 오류가 발생했습니다.",
      });
    } finally {
      setSaving(false);
    }
  };

  // 게임 순서 위로 이동
  const handleMoveUp = async (index: number) => {
    if (index <= 0) return; // 이미 첫 번째 항목이면 이동하지 않음

    try {
      const gameToMove = games[index];
      const gameAbove = games[index - 1];

      // 위치 교환
      const newPosition = gameAbove.position;
      const oldPosition = gameToMove.position;

      await axios.patch(`/casino-games/${gameToMove.id}`, { position: newPosition });
      await axios.patch(`/casino-games/${gameAbove.id}`, { position: oldPosition });

      setAlertMessage({ type: "success", message: "게임 순서가 변경되었습니다." });
      fetchGames(); // 목록 새로고침
    } catch (err) {
      console.error("Error moving game up:", err);
      setAlertMessage({ type: "error", message: "게임 순서 변경 중 오류가 발생했습니다." });
    }
  };

  // 게임 순서 아래로 이동
  const handleMoveDown = async (index: number) => {
    if (index >= games.length - 1) return; // 이미 마지막 항목이면 이동하지 않음

    try {
      const gameToMove = games[index];
      const gameBelow = games[index + 1];

      // 위치 교환
      const newPosition = gameBelow.position;
      const oldPosition = gameToMove.position;

      await axios.patch(`/casino-games/${gameToMove.id}`, { position: newPosition });
      await axios.patch(`/casino-games/${gameBelow.id}`, { position: oldPosition });

      setAlertMessage({ type: "success", message: "게임 순서가 변경되었습니다." });
      fetchGames(); // 목록 새로고침
    } catch (err) {
      console.error("Error moving game down:", err);
      setAlertMessage({ type: "error", message: "게임 순서 변경 중 오류가 발생했습니다." });
    }
  };

  // 별점 표시 컴포넌트
  const RatingStars = ({ rating }: { rating: number }) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    return (
      <div className="flex items-center">
        {[...Array(fullStars)].map((_, i) => (
          <span key={`full-${i}`} className="text-yellow-400">
            ★
          </span>
        ))}
        {halfStar && <span className="text-yellow-400">★</span>}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={`empty-${i}`} className="text-gray-300">
            ★
          </span>
        ))}
        <span className="ml-1 text-sm text-gray-600">{rating.toFixed(1)}</span>
      </div>
    );
  };

  // DataTable 컬럼 정의
  const columns = [
    {
      header: "순서",
      accessor: "position" as keyof CasinoGame,
      cell: (value: any, row: CasinoGame, index: number) => (
        <div className="flex items-center space-x-1 justify-center">
          <span className="font-medium">{value || index + 1}</span>
          <div className="flex flex-col">
            <button
              onClick={() => handleMoveUp(index)}
              disabled={index === 0}
              className={`p-1 ${
                index === 0 ? "text-gray-300" : "text-blue-500 hover:text-blue-700"
              }`}
            >
              ▲
            </button>
            <button
              onClick={() => handleMoveDown(index)}
              disabled={index === games.length - 1}
              className={`p-1 ${
                index === games.length - 1 ? "text-gray-300" : "text-blue-500 hover:text-blue-700"
              }`}
            >
              ▼
            </button>
          </div>
        </div>
      ),
    },
    {
      header: "썸네일",
      accessor: "thumbnailUrl" as keyof CasinoGame,
      cell: (value: string) => (
        <div className="w-20 h-12 bg-gray-100 flex items-center justify-center overflow-hidden">
          {value ? (
            <img src={value} alt="썸네일" className="max-w-full max-h-full object-contain" />
          ) : (
            <span className="text-xs text-gray-500">이미지 없음</span>
          )}
        </div>
      ),
    },
    {
      header: "게임 제목",
      accessor: "title" as keyof CasinoGame,
    },
    {
      header: "별점",
      accessor: "rating" as keyof CasinoGame,
      cell: (value: number) => <RatingStars rating={value} />,
    },
    {
      header: "환수율",
      accessor: "returnRate" as keyof CasinoGame,
      cell: (value: number) => `${value}%`,
    },
    {
      header: "등록일자",
      accessor: "createdAt" as keyof CasinoGame,
      cell: (value: string) => formatDate(value),
    },
    {
      header: "공개 여부",
      accessor: "isPublic" as keyof CasinoGame,
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
      accessor: "id" as keyof CasinoGame,
      cell: (value: number, row: CasinoGame) => (
        <div className="flex items-center space-x-2">
          <ActionButton
            label="수정"
            onClick={() => handleEditGame(row)}
            color="blue"
            action="edit"
          />
          <ActionButton
            label="삭제"
            onClick={() => handleDeleteGame(value)}
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
        <h1 className="text-2xl font-semibold">카지노 게임 관리</h1>
        <Button onClick={handleAddGame} variant="primary">
          게임 추가
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
        data={games}
        loading={loading}
        emptyMessage="등록된 게임이 없습니다."
      />

      {/* 게임 추가/수정 모달 */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={isEditing ? "카지노 게임 수정" : "새 카지노 게임 추가"}
        size="xl"
      >
        <div className="space-y-5">
          {/* 게임 타이틀 */}
          <div>
            <div className="mb-1 font-medium text-sm">게임 제목</div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="게임 제목을 입력하세요"
            />
          </div>

          {/* 게임 썸네일 */}
          <div>
            <div className="mb-1 font-medium text-sm">
              썸네일 이미지 {!isEditing && <span className="text-red-500">*</span>}
            </div>
            <div className="flex items-center">
              {thumbnailPreview ? (
                <div className="mr-4">
                  <img
                    src={thumbnailPreview}
                    alt="썸네일 미리보기"
                    className="object-contain h-24 w-24 border border-gray-300 rounded-md p-1"
                  />
                </div>
              ) : null}
              <div>
                <FileUpload onFileSelect={handleThumbnailUpload} accept="image/*" label="" />
                <div className="mt-1 text-xs text-gray-500">
                  권장 크기: 400x300px, 최대 2MB, PNG/JPG 파일
                </div>
              </div>
            </div>
          </div>

          {/* 게임 설명 */}
          <div>
            <div className="mb-1 font-medium text-sm">게임 설명</div>
            <TextEditor
              value={description}
              onChange={setDescription}
              placeholder="내용을 입력하세요..."
            />
          </div>

          {/* 게임 정보 (별점, 환수율) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="mb-1 font-medium text-sm">게임 별점</div>
              <div className="flex items-center">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={rating}
                  onChange={handleRatingChange}
                  className="w-24 mr-3 border border-gray-300 rounded-md px-3 py-2"
                />
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={star <= rating ? "text-yellow-400" : "text-gray-300"}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <span className="ml-2 text-sm">{rating.toFixed(1)}</span>
              </div>
            </div>
            <div>
              <div className="mb-1 font-medium text-sm">환수율 (%)</div>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={returnRate}
                onChange={handleReturnRateChange}
                className="w-24 border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>

          {/* 바로가기 노출 */}
          <div className="border-t border-gray-200 pt-5">
            <div className="flex items-center">
              <span className="font-medium">바로가기 노출</span>
            </div>

            <div className="mt-3 flex items-center">
              <div className="flex items-center mr-8">
                <input
                  type="radio"
                  id="directLink_no"
                  checked={!isDirectLinkEnabled}
                  onChange={() => setIsDirectLinkEnabled(false)}
                  className="mr-2"
                />
                <label htmlFor="directLink_no">미노출</label>
              </div>

              <div className="flex items-center">
                <input
                  type="radio"
                  id="directLink_yes"
                  checked={isDirectLinkEnabled}
                  onChange={() => setIsDirectLinkEnabled(true)}
                  className="mr-2"
                />
                <label htmlFor="directLink_yes">노출</label>
              </div>
            </div>

            {isDirectLinkEnabled && (
              <div className="mt-3">
                <Input
                  value={directLinkUrl}
                  onChange={(e) => setDirectLinkUrl(e.target.value)}
                  placeholder="https://example.com/game"
                  required={isDirectLinkEnabled}
                />
              </div>
            )}
          </div>

          {/* 공개여부 */}
          <div className="border-t border-gray-200 pt-5">
            <div className="flex items-center">
              <span className="font-medium">공개여부</span>
            </div>

            <div className="mt-3 flex items-center">
              <div className="flex items-center mr-8">
                <input
                  type="radio"
                  id="visibility_private"
                  checked={!isPublic}
                  onChange={() => setIsPublic(false)}
                  className="mr-2"
                />
                <label htmlFor="visibility_private">비공개</label>
              </div>

              <div className="flex items-center">
                <input
                  type="radio"
                  id="visibility_public"
                  checked={isPublic}
                  onChange={() => setIsPublic(true)}
                  className="mr-2"
                />
                <label htmlFor="visibility_public">공개</label>
              </div>
            </div>
          </div>

          {/* 등록 버튼 */}
          <div className="border-t border-gray-200 pt-5 mt-5 flex justify-center">
            <Button
              type="button"
              variant="primary"
              onClick={handleSaveGame}
              disabled={saving}
              className="px-8"
            >
              {saving ? "저장 중..." : "등록"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CasinoGameManagement;
