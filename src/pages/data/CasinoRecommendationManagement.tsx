import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "@/api/axios";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import ActionButton from "@/components/ActionButton";
import Modal from "@/components/Modal";
import Input from "@/components/forms/Input";
import Alert from "@/components/Alert";
import { formatDate } from "@/utils/dateUtils";
import { extractDataArray } from "../../api/util";

// 카지노 게임 추천 타입 정의
interface CasinoRecommendation {
  id: number;
  title: string;
  isMainDisplay: boolean;
  games: string[];
  gameIds?: number[];
  startDate: string;
  endDate: string;
  isPublic: number;
  position: number;
  createdAt: string;
  updatedAt: string;
}

interface CasinoGame {
  id: number;
  title: string;
  // 다른 필드들...
}

// Payload type for creating/updating recommendations
interface UpsertCasinoRecommendationPayload {
  title: string;
  isMainDisplay: boolean;
  selectedGameIds: number[];
  startDate: string; // ISO String
  endDate: string; // ISO String
  isPublic: boolean;
}

const CasinoRecommendationManagement = () => {
  const [recommendations, setRecommendations] = useState<CasinoRecommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // 모달 관련 상태
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentRecommendationId, setCurrentRecommendationId] = useState<number | null>(null);

  // 추천 게임 관련 상태
  const [title, setTitle] = useState<string>("");
  const [isMainDisplay, setIsMainDisplay] = useState<boolean>(false);
  const [availableGames, setAvailableGames] = useState<CasinoGame[]>([]);
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [selectedGameIds, setSelectedGameIds] = useState<number[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isPublic, setIsPublic] = useState<number>(1);
  const [publicSettings, setPublicSettings] = useState<"public" | "private">("public");
  const [saving, setSaving] = useState<boolean>(false);

  // 검색 필터링 상태
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredGames, setFilteredGames] = useState<CasinoGame[]>([]);

  // 게임 선택 상태 관리
  const selectedListRef = useRef<HTMLDivElement>(null);

  // 공개 설정 상태 관리
  useEffect(() => {
    setIsPublic(publicSettings === "public" ? 1 : 0);
  }, [publicSettings]);

  // 게임 추천 목록 조회
  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      // API 호출
      const response = await axios.get("/casino-recommends");
      console.log("카지노 추천 응답 구조:", response);

      // 유틸리티 함수를 사용하여 데이터 배열 추출
      const recommendationData = extractDataArray(response.data, true);

      if (recommendationData && recommendationData.length > 0) {
        console.log("추출된 추천 데이터:", recommendationData);

        // 서버 응답을 컴포넌트에서 사용하는 형식으로 변환
        const transformedRecommendations = recommendationData.map((item: any) => {
          // 각 게임의 제목 추출 - 서로 다른 구조 처리
          let gameTitles: string[] = [];
          let gameIds: number[] = [];

          // 1. 기존 구조: item.games 배열이 있고 각 요소에 casinoGame 객체가 있는 경우
          if (item.games && Array.isArray(item.games)) {
            gameTitles = item.games.map((game: any) => {
              if (game.casinoGame) {
                return game.casinoGame.title || "제목 없음";
              } else if (game.title) {
                return game.title;
              }
              return "제목 없음";
            });

            gameIds = item.games.map((game: any) => {
              return game.casinoGameId || game.id || 0;
            });
          }
          // 2. item.gameList 배열이 있는 경우
          else if (item.gameList && Array.isArray(item.gameList)) {
            gameTitles = item.gameList.map((game: any) => game.title || "제목 없음");
            gameIds = item.gameList.map((game: any) => game.id || 0);
          }
          // 3. item.gameIds와 item.gameTitles가 직접 있는 경우
          else if (item.gameIds && Array.isArray(item.gameIds)) {
            gameIds = item.gameIds;
            gameTitles = item.gameTitles || item.gameIds.map(() => "제목 없음");
          }

          return {
            id: item.id,
            title: item.title,
            isMainDisplay: item.isMainDisplay === 1 || item.isMainDisplay === true,
            games: gameTitles,
            gameIds: gameIds,
            startDate: item.startDate || item.start_date || "",
            endDate: item.endDate || item.end_date || "",
            isPublic: item.isPublic === 1 || item.isPublic === true ? 1 : 0,
            position: item.displayOrder || item.position || 0,
            createdAt: item.createdAt || item.created_at || new Date().toISOString(),
            updatedAt:
              item.updatedAt || item.updated_at || item.createdAt || new Date().toISOString(),
          };
        });

        // displayOrder(position) 기준으로 내림차순 정렬 (높은 값이 위로)
        const sortedRecommendations = [...transformedRecommendations].sort(
          (a, b) => (b.position || 0) - (a.position || 0)
        );

        setRecommendations(sortedRecommendations);
      } else {
        console.log("적절한 추천 데이터를 찾지 못했습니다.");
        setRecommendations([]);
      }
    } catch (err: any) {
      console.error("게임 추천 목록 조회 오류:", err);
      setError("게임 추천 목록을 불러오는데 실패했습니다.");
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  // 가능한 게임 목록 가져오기
  const fetchAvailableGames = async () => {
    try {
      const response = await axios.get("/casino");
      console.log("사용 가능한 게임 응답 구조:", response);

      // 유틸리티 함수를 사용하여 데이터 배열 추출
      const gameData = extractDataArray(response.data, true);

      if (gameData && gameData.length > 0) {
        console.log("추출된 사용 가능한 게임 데이터:", gameData);

        // 필드 매핑 및 처리
        const processedGames = gameData.map((game: any) => ({
          id: game.id,
          title: game.title || "",
          imageUrl: game.imageUrl || game.thumbnailUrl || "",
          // 필요한 경우 다른 필드도 추가
        }));

        setAvailableGames(processedGames);
        setFilteredGames(processedGames);
      } else {
        console.log("적절한 게임 데이터를 찾지 못했습니다.");
        setAvailableGames([]);
        setFilteredGames([]);
        setError("게임 목록을 불러오는데 실패했습니다.");
      }
    } catch (err: any) {
      console.error("Error fetching available games:", err);
      setError("게임 목록을 불러오는데 실패했습니다.");
    }
  };

  useEffect(() => {
    fetchRecommendations();
    fetchAvailableGames();
  }, []);

  // 검색어로 게임 필터링
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredGames(availableGames);
    } else {
      const filtered = availableGames.filter((game) =>
        game.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredGames(filtered);
    }
  }, [searchQuery, availableGames]);

  // 게임 추천 추가 모달 열기
  const handleAddRecommendation = () => {
    setCurrentRecommendationId(null);
    // 초기화
    setTitle("");
    setIsMainDisplay(false);
    setSelectedGames([]);
    setSelectedGameIds([]);

    // 현재 시각을 기본 시작 시간으로 설정
    const now = new Date();
    setStartDate(now.toISOString().substring(0, 16));

    // 기본 종료 시간: 1주일 후
    const weekLater = new Date();
    weekLater.setDate(weekLater.getDate() + 7);
    setEndDate(weekLater.toISOString().substring(0, 16));

    setIsPublic(1);
    setPublicSettings("public");
    setIsEditing(false);
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (recommendation: CasinoRecommendation) => {
    setIsEditing(true);
    setCurrentRecommendationId(recommendation.id);
    setTitle(recommendation.title || "");
    setIsMainDisplay(recommendation.isMainDisplay || false);

    const currentSelectedGames = availableGames.filter((g) =>
      recommendation.gameIds?.includes(g.id)
    );
    setSelectedGames(currentSelectedGames.map((g) => g.title));
    setSelectedGameIds(currentSelectedGames.map((g) => g.id));

    setStartDate(
      recommendation.startDate
        ? new Date(recommendation.startDate).toISOString().substring(0, 16)
        : ""
    );
    setEndDate(
      recommendation.endDate ? new Date(recommendation.endDate).toISOString().substring(0, 16) : ""
    );
    setPublicSettings(recommendation.isPublic === 1 ? "public" : "private");
    setError(null);
    setSaving(false);
    setSearchQuery("");
    setShowModal(true);
  };

  // 게임 추천 삭제
  const handleDeleteRecommendation = async (id: number) => {
    if (!window.confirm("정말로 이 게임 추천을 삭제하시겠습니까?")) {
      return;
    }

    try {
      // 올바른 API 경로로 수정
      await axios.delete(`/casino-recommends/${id}`);
      setAlertMessage({ type: "success", message: "게임 추천이 삭제되었습니다." });
      fetchRecommendations(); // 목록 새로고침
    } catch (err: any) {
      console.error("Error deleting recommendation:", err);
      setAlertMessage({ type: "error", message: "게임 추천 삭제 중 오류가 발생했습니다." });
    }
  };

  // 게임 추천 순서 위로 이동
  const handleMoveUp = async (index: number) => {
    if (index <= 0) return; // 이미 첫 번째 항목이면 이동하지 않음

    try {
      const recommendationToMove = recommendations[index];
      const recommendationAbove = recommendations[index - 1];

      // 위치 교환
      const newDisplayOrder = recommendationAbove.position; // position 값을 가져옴
      const oldDisplayOrder = recommendationToMove.position; // position 값을 가져옴

      // API 요청시 displayOrder 필드로 전송
      await axios.patch(`/casino-recommends/${recommendationToMove.id}`, {
        displayOrder: newDisplayOrder,
      });
      await axios.patch(`/casino-recommends/${recommendationAbove.id}`, {
        displayOrder: oldDisplayOrder,
      });

      setAlertMessage({ type: "success", message: "게임 추천 순서가 변경되었습니다." });
      fetchRecommendations(); // 목록 새로고침
    } catch (err: any) {
      console.error("게임 추천 순서 변경 오류:", err);
      setAlertMessage({ type: "error", message: "게임 추천 순서 변경 중 오류가 발생했습니다." });
    }
  };

  // 게임 추천 순서 아래로 이동
  const handleMoveDown = async (index: number) => {
    if (index >= recommendations.length - 1) return; // 이미 마지막 항목이면 이동하지 않음

    try {
      const recommendationToMove = recommendations[index];
      const recommendationBelow = recommendations[index + 1];

      // 위치 교환
      const newDisplayOrder = recommendationBelow.position; // position 값을 가져옴
      const oldDisplayOrder = recommendationToMove.position; // position 값을 가져옴

      // API 요청시 displayOrder 필드로 전송
      await axios.patch(`/casino-recommends/${recommendationToMove.id}`, {
        displayOrder: newDisplayOrder,
      });
      await axios.patch(`/casino-recommends/${recommendationBelow.id}`, {
        displayOrder: oldDisplayOrder,
      });

      setAlertMessage({ type: "success", message: "게임 추천 순서가 변경되었습니다." });
      fetchRecommendations(); // 목록 새로고침
    } catch (err: any) {
      console.error("게임 추천 순서 변경 오류:", err);
      setAlertMessage({ type: "error", message: "게임 추천 순서 변경 중 오류가 발생했습니다." });
    }
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setShowModal(false);
  };

  // 게임 체크박스 토글 핸들러
  const handleGameToggle = (gameId: number, gameTitle: string) => {
    // 이미 선택된 게임인지 확인
    const isSelected = selectedGameIds.includes(gameId);

    if (isSelected) {
      // 선택 해제
      setSelectedGameIds((prev) => prev.filter((id) => id !== gameId));
      setSelectedGames((prev) => prev.filter((title) => title !== gameTitle));
    } else {
      // 선택 추가
      setSelectedGameIds((prev) => [...prev, gameId]);
      setSelectedGames((prev) => [...prev, gameTitle]);
    }
  };

  // 선택된 게임에서 제거
  const removeGameFromSelection = (gameId: number, gameTitle: string) => {
    setSelectedGameIds((prev) => prev.filter((id) => id !== gameId));
    setSelectedGames((prev) => prev.filter((title) => title !== gameTitle));
  };

  // 폼 제출 처리
  const handleSaveRecommendation = async () => {
    setError(null);
    if (!title.trim()) {
      setError("카테고리 타이틀을 입력해주세요.");
      return;
    }
    if (selectedGameIds.length === 0) {
      setError("추천 게임을 하나 이상 선택해주세요.");
      return;
    }
    if (!startDate || !endDate) {
      setError("노출 시작일시와 종료일시를 모두 설정해주세요.");
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      setError("노출 종료일시는 시작일시보다 이후여야 합니다.");
      return;
    }

    setSaving(true);
    setAlertMessage(null);

    try {
      const payload: UpsertCasinoRecommendationPayload = {
        title,
        isMainDisplay,
        selectedGameIds,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        isPublic: publicSettings === "public",
      };

      if (isEditing && currentRecommendationId !== null) {
        await axios.put(`/casino-recommends/${currentRecommendationId}`, payload);
        setAlertMessage({ type: "success", message: "게임 추천이 성공적으로 수정되었습니다." });
      } else {
        await axios.post("/casino-recommends", payload);
        setAlertMessage({ type: "success", message: "새 게임 추천이 성공적으로 등록되었습니다." });
      }
      fetchRecommendations();
      handleCloseModal();
    } catch (err: unknown) {
      console.error("Failed to save casino recommendation:", err);
      const errorMessage = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
      setError(`저장에 실패했습니다: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  // DataTable 컬럼 정의
  const columns = [
    {
      header: "타이틀",
      accessor: "title" as keyof CasinoRecommendation,
    },
    {
      header: "메인 노출",
      accessor: "isMainDisplay" as keyof CasinoRecommendation,
      cell: (value: boolean | number) => (
        <span
          className={`px-2 py-1 rounded text-xs ${
            value === true || value === 1
              ? "bg-blue-100 text-blue-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {value === true || value === 1 ? "노출" : "미노출"}
        </span>
      ),
    },
    {
      header: "등록 게임",
      accessor: "games" as keyof CasinoRecommendation,
      cell: (value: string[]) => (
        <div className="max-w-xs truncate">
          {value?.length > 0
            ? `${value.length}개 (${value.slice(0, 2).join(", ")}${value.length > 2 ? "..." : ""})`
            : "등록된 게임 없음"}
        </div>
      ),
    },
    {
      header: "시작일자",
      accessor: "startDate" as keyof CasinoRecommendation,
      cell: (value: string) => formatDate(value),
    },
    {
      header: "종료일자",
      accessor: "endDate" as keyof CasinoRecommendation,
      cell: (value: string) => formatDate(value),
    },
    {
      header: "공개 여부",
      accessor: "isPublic" as keyof CasinoRecommendation,
      cell: (value: boolean | number, row: CasinoRecommendation) => {
        // 공개 여부가 false인 경우 단순히 "비공개"로 표시
        if (!(value === true || value === 1)) {
          return (
            <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">비공개</span>
          );
        }

        // 현재 시간과 시작일/종료일 비교
        const now = new Date();
        const startDate = row.startDate ? new Date(row.startDate) : null;
        const endDate = row.endDate ? new Date(row.endDate) : null;

        // 공개 상태 결정
        let status = "공개";
        let colorClass = "bg-green-100 text-green-800";

        if (startDate && now < startDate) {
          status = "공개 전";
          colorClass = "bg-gray-100 text-gray-800";
        } else if (endDate && now > endDate) {
          status = "공개 종료";
          colorClass = "bg-gray-100 text-gray-800";
        }

        return <span className={`px-2 py-1 rounded-full text-xs ${colorClass}`}>{status}</span>;
      },
    },
    {
      header: "관리",
      accessor: "id" as keyof CasinoRecommendation,
      cell: (value: number, row: CasinoRecommendation) => (
        <div className="flex items-center space-x-2">
          <ActionButton
            label="수정"
            onClick={() => handleOpenEditModal(row)}
            color="blue"
            action="edit"
          />
          <ActionButton
            label="삭제"
            onClick={() => handleDeleteRecommendation(value)}
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
        <h1 className="text-2xl font-semibold">카지노 게임 추천 관리</h1>
        <Button onClick={handleAddRecommendation} variant="primary">
          게임 추천 추가
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
        data={recommendations}
        loading={loading}
        emptyMessage="등록된 게임 추천이 없습니다."
      />

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={isEditing ? "게임 추천 수정" : "새 게임 추천 추가"}
        size="xl"
      >
        {/* Modal Error Alert (below title, above controls) */}
        {error && (
          <div className="my-4">
            <Alert type="error" message={error} onClose={() => setError(null)} />
          </div>
        )}
        {/* Top Control Area: Buttons and Public Toggle - Moved to top */}
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          {/* Buttons (Left) - Modified order: Save/Edit first */}
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="primary"
              onClick={handleSaveRecommendation}
              disabled={saving}
            >
              {saving ? "저장 중..." : isEditing ? "수정" : "등록"}
            </Button>
            <Button type="button" variant="secondary" onClick={handleCloseModal} disabled={saving}>
              취소
            </Button>
          </div>
          {/* Public/Private Toggle (Right) */}
          <div className="flex items-center space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="public"
                checked={publicSettings === "public"}
                onChange={() => setPublicSettings("public")}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                disabled={saving}
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
                disabled={saving}
              />
              <span className="ml-2 text-sm text-gray-900">비공개</span>
            </label>
          </div>
        </div>

        {/* Modal Content Area */}
        <div className="space-y-6">
          {/* 카테고리 타이틀 */}
          <div>
            <Input
              label="카테고리 타이틀"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="타이틀을 입력하세요"
            />
          </div>

          {/* 메인 노출 여부 */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isMainDisplay"
              checked={isMainDisplay}
              onChange={(e) => setIsMainDisplay(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isMainDisplay" className="ml-2 block text-sm text-gray-900">
              메인 노출
            </label>
          </div>

          {/* 추천 게임 편성 */}
          <div>
            <h3 className="text-lg font-medium mb-2">추천 게임 편성</h3>
            <div className="flex flex-col md:flex-row md:space-x-4">
              {/* 왼쪽: 게임 선택 */}
              <div className="flex-1 mb-4 md:mb-0 border border-gray-300 rounded-md p-4">
                <div className="mb-2">
                  <Input
                    placeholder="게임 검색"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="h-64 overflow-y-auto border border-gray-200 rounded-md p-2">
                  {filteredGames.length > 0 ? (
                    filteredGames.map((game) => (
                      <div key={game.id} className="flex items-center py-1">
                        <input
                          type="checkbox"
                          id={`game-${game.id}`}
                          checked={selectedGameIds.includes(game.id)}
                          onChange={() => handleGameToggle(game.id, game.title)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label
                          htmlFor={`game-${game.id}`}
                          className="ml-2 block text-sm text-gray-900 truncate"
                        >
                          {game.title}
                        </label>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      {searchQuery ? "검색 결과가 없습니다." : "등록된 게임이 없습니다."}
                    </div>
                  )}
                </div>
              </div>

              {/* 오른쪽: 선택된 게임 목록 */}
              <div className="flex-1 border border-gray-300 rounded-md p-4">
                <h4 className="font-medium mb-2">선택된 게임 목록</h4>
                <div
                  ref={selectedListRef}
                  className="h-64 overflow-y-auto border border-gray-200 rounded-md p-2"
                >
                  {selectedGames.length > 0 ? (
                    selectedGames.map((gameTitle, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center py-1 px-2 bg-gray-50 mb-1 rounded"
                      >
                        <span className="text-sm truncate">{gameTitle}</span>
                        <button
                          type="button"
                          onClick={() => removeGameFromSelection(selectedGameIds[index], gameTitle)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-4">선택된 게임이 없습니다.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 노출 기간 */}
          <div>
            <h3 className="text-lg font-medium mb-2">노출 기간</h3>
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
              <div className="flex-1">
                <label className="block mb-1 text-sm font-medium">시작일시</label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
              <div className="flex-1">
                <label className="block mb-1 text-sm font-medium">종료일시</label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CasinoRecommendationManagement;
