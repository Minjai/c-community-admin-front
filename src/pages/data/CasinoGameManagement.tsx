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
      const response = await axios.get("/casino");

      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        // 서버 응답 데이터를 클라이언트 형식으로 변환
        const transformedGames = response.data.data.map((game: any) => ({
          id: game.id,
          title: game.title,
          description: game.content,
          thumbnailUrl: game.imageUrl,
          rating: Number(game.rating) || 0,
          returnRate: Number(game.payoutRate) || 0,
          isDirectLinkEnabled: game.isShortcut === 1 || game.isShortcut === true,
          directLinkUrl: game.shortcutUrl || "",
          isPublic: game.isPublic === 1 || game.isPublic === true,
          position: game.displayOrder,
          createdAt: game.createdAt,
          updatedAt: game.updatedAt,
        }));

        // position 기준으로 정렬
        const sortedGames = [...transformedGames].sort(
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

    // 설명 설정 - 기존 문제였던 비동기 타이밍 이슈 해결
    setDescription(game.description || "");

    setRating(game.rating || 5.0);
    setReturnRate(game.returnRate || 95);
    setIsDirectLinkEnabled(game.isDirectLinkEnabled || false);
    setDirectLinkUrl(game.directLinkUrl || "");
    setIsPublic(game.isPublic || false);
    setThumbnailFile(null);

    // 이미지 URL 처리
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
      await axios.delete(`/casino/${id}`);
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
  const handleThumbnailUpload = (file: File | null) => {
    if (!file) {
      setThumbnailFile(null);
      setThumbnailPreview(null);
      return;
    }

    // 파일 크기 체크 (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setAlertMessage({ type: "error", message: "이미지 크기는 2MB를 초과할 수 없습니다." });
      return;
    }

    // 파일 타입 체크
    if (!file.type.startsWith("image/")) {
      setAlertMessage({ type: "error", message: "이미지 파일만 업로드 가능합니다." });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setThumbnailFile(file);
      setThumbnailPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 바로가기 노출 토글
  const handleDirectLinkToggle = (enabled: boolean) => {
    setIsDirectLinkEnabled(enabled);
    if (!enabled) {
      setDirectLinkUrl("");
    }
  };

  // 게임 저장 처리
  const handleSaveGame = async () => {
    if (!title.trim()) {
      setAlertMessage({ type: "error", message: "게임 제목을 입력해주세요." });
      return;
    }

    if (!description.trim()) {
      setAlertMessage({ type: "error", message: "게임 설명을 입력해주세요." });
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
      formData.append("title", title.trim());
      formData.append("content", description); // HTML 형식 그대로 전송

      formData.append("rating", rating.toString());
      formData.append("payoutRate", returnRate.toString());
      formData.append("isShortcut", isDirectLinkEnabled ? "1" : "0");

      if (isDirectLinkEnabled && directLinkUrl) {
        formData.append("shortcutUrl", directLinkUrl.trim());
      }

      formData.append("isPublic", isPublic ? "1" : "0");

      if (!isEditing) {
        // 새 게임 생성
        if (thumbnailFile) {
          formData.append("image", thumbnailFile);
        }

        const response = await axios.post("/casino", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        if (response.status === 201 || response.status === 200) {
          setAlertMessage({ type: "success", message: "게임이 성공적으로 추가되었습니다." });
        }
      } else if (currentGame) {
        // 기존 게임 수정
        if (thumbnailFile) {
          formData.append("image", thumbnailFile);
        }

        const response = await axios.put(`/casino/${currentGame.id}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        if (response.status === 200) {
          setAlertMessage({ type: "success", message: "게임 정보가 수정되었습니다." });
        }
      }

      // 모달 닫기 및 목록 새로고침
      setShowModal(false);
      fetchGames();
    } catch (err: any) {
      console.error("Error saving game:", err);

      // 서버 오류 메시지 표시
      const errorMessage = err.response?.data?.message || "게임 저장 중 오류가 발생했습니다.";
      setAlertMessage({
        type: "error",
        message: errorMessage,
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

      await axios.patch(`/casino/${gameToMove.id}`, { position: newPosition });
      await axios.patch(`/casino/${gameAbove.id}`, { position: oldPosition });

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

      await axios.patch(`/casino/${gameToMove.id}`, { position: newPosition });
      await axios.patch(`/casino/${gameBelow.id}`, { position: oldPosition });

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
        <div className="flex items-center justify-center">
          <span className="font-medium">{value || index + 1}</span>
        </div>
      ),
    },
    {
      header: "썸네일",
      accessor: "thumbnailUrl" as keyof CasinoGame,
      cell: (value: string) => (
        <div className="w-20 h-12 bg-gray-100 flex items-center justify-center overflow-hidden">
          {value && value.trim() !== "" ? (
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

  // 5. 모달 컨텐츠 - 게임 추가/수정 폼
  const renderModalContent = () => {
    return (
      <div className="space-y-4">
        {/* 제목 */}
        <Input
          label="게임 제목"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="게임 제목을 입력하세요"
          required
          maxLength={100}
          disabled={saving}
        />

        {/* 썸네일 업로드 - 상단으로 이동 */}
        <div>
          <FileUpload
            label="썸네일 이미지"
            onChange={handleThumbnailUpload}
            preview={true}
            value={thumbnailPreview || undefined}
            helperText="권장 크기: 600x400px, 최대 2MB"
            accept="image/jpeg, image/png"
            required={!isEditing}
            disabled={saving}
          />
        </div>

        {/* 게임 설명 */}
        <div>
          <label className="label">게임 설명</label>
          <div className="border border-gray-300 rounded-md overflow-hidden">
            <TextEditor content={description} setContent={setDescription} showImageAndLink={true} />
          </div>
        </div>

        {/* 별점 - 시각적 별 표시 추가 */}
        <div>
          <label className="label">별점 (0-5)</label>
          <div className="flex items-center">
            <input
              type="number"
              value={rating}
              onChange={handleRatingChange}
              min={0}
              max={5}
              step={0.1}
              disabled={saving}
              className="input w-20 mr-3"
            />
            <div className="flex text-xl">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={star <= Math.round(rating) ? "text-yellow-400" : "text-gray-300"}
                >
                  ★
                </span>
              ))}
            </div>
            <span className="ml-2 text-sm text-gray-500">{rating.toFixed(1)}</span>
          </div>
        </div>

        {/* 환수율 */}
        <Input
          label="환수율 (%)"
          type="number"
          value={returnRate}
          onChange={handleReturnRateChange}
          min={0}
          max={100}
          step={0.1}
          disabled={saving}
        />

        {/* 바로가기 설정 */}
        <div>
          <label className="label">바로가기 설정</label>
          <div className="flex items-center space-x-4 mt-1">
            <label className="flex items-center">
              <input
                type="radio"
                name="directLinkEnabled"
                checked={!isDirectLinkEnabled}
                onChange={() => handleDirectLinkToggle(false)}
                className="mr-2"
                disabled={saving}
              />
              <span>사용 안함</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="directLinkEnabled"
                checked={isDirectLinkEnabled}
                onChange={() => handleDirectLinkToggle(true)}
                className="mr-2"
                disabled={saving}
              />
              <span>사용</span>
            </label>
          </div>
        </div>

        {/* 바로가기 URL */}
        {isDirectLinkEnabled && (
          <Input
            label="바로가기 URL"
            type="url"
            value={directLinkUrl}
            onChange={(e) => setDirectLinkUrl(e.target.value)}
            placeholder="예: https://example.com/"
            disabled={saving}
            required={isDirectLinkEnabled}
          />
        )}

        {/* 공개 여부 */}
        <div>
          <label className="label">공개 여부</label>
          <div className="flex items-center space-x-4 mt-1">
            <label className="flex items-center">
              <input
                type="radio"
                name="isPublic"
                checked={isPublic}
                onChange={() => setIsPublic(true)}
                className="mr-2"
                disabled={saving}
              />
              <span>공개</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="isPublic"
                checked={!isPublic}
                onChange={() => setIsPublic(false)}
                className="mr-2"
                disabled={saving}
              />
              <span>비공개</span>
            </label>
          </div>
        </div>
      </div>
    );
  };

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
        {renderModalContent()}

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
      </Modal>
    </div>
  );
};

export default CasinoGameManagement;
