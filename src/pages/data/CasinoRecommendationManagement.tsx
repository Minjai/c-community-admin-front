import React, { useState, useEffect, useRef, useCallback, useMemo, ReactNode } from "react";
import axios from "@/api/axios";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import ActionButton from "@/components/ActionButton";
import Modal from "@/components/Modal";
import Input from "@/components/forms/Input";
import Alert from "@/components/Alert";
import {
  formatDate,
  formatDateForDisplay,
  formatISODateToDateTimeLocal,
  convertDateTimeLocalToISOUTC,
} from "@/utils/dateUtils";
import { extractDataArray } from "../../api/util";
import LoadingOverlay from "@/components/LoadingOverlay";

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
  gameIds: number[];
  startDate: string; // ISO String
  endDate: string; // ISO String
  isPublic: boolean;
  displayOrder?: number;
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

  // 선택된 추천 ID 상태 추가
  const [selectedRecommendationIds, setSelectedRecommendationIds] = useState<number[]>([]);

  // 페이지네이션 상태 추가
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0); // 초기값 0으로 설정
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);

  // 공개 설정 상태 관리
  useEffect(() => {
    setIsPublic(publicSettings === "public" ? 1 : 0);
  }, [publicSettings]);

  // 게임 추천 목록 조회 (페이지네이션 적용)
  const fetchRecommendations = useCallback(async (page: number = 1, limit: number = 10) => {
    setLoading(true);
    setError(null);
    try {
      // 페이지네이션 파라미터 추가
      const response = await axios.get("/casino-recommends", {
        params: { page, limit },
      });

      // API 응답 구조 확인 및 처리 (data가 배열이고 pagination 객체가 있다고 가정)
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        const recommendationData = response.data.data;

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

        // 페이지네이션 정보 업데이트 (API 응답에 pagination 객체가 있다고 가정)
        if (response.data.pagination) {
          setTotalItems(response.data.pagination.totalItems || 0);
          setTotalPages(response.data.pagination.totalPages || 1);
          setCurrentPage(response.data.pagination.currentPage || 1);
          setPageSize(response.data.pagination.pageSize || limit);
        } else {
          // 페이지네이션 정보 없을 경우, 현재 데이터 기준으로 처리 (권장하지 않음)
          setTotalItems(sortedRecommendations.length);
          setTotalPages(1);
          setCurrentPage(1);
          setPageSize(limit);
        }
      } else {
        // API 실패 또는 data 형식이 잘못된 경우
        setRecommendations([]);
        setError(response.data?.message || "게임 추천 목록 형식이 올바르지 않습니다.");
        setTotalItems(0);
        setTotalPages(0);
        setCurrentPage(1);
        setPageSize(limit);
      }
    } catch (err: any) {
      setError("게임 추천 목록을 불러오는데 실패했습니다.");
      setRecommendations([]);
      setTotalItems(0);
      setTotalPages(0);
      setCurrentPage(1);
      setPageSize(limit);
    } finally {
      setLoading(false);
    }
  }, []);

  // 가능한 게임 목록 가져오기
  const fetchAvailableGames = async () => {
    try {
      const response = await axios.get("/casino/all");
      const gameData = extractDataArray(response.data, true);
      if (gameData && gameData.length > 0) {
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
        // Game list is empty, but not an error
        setAvailableGames([]);
        setFilteredGames([]);
      }
    } catch (err: any) {
      // Actual error during fetch
      setError("게임 목록을 불러오는데 실패했습니다.");
      setAvailableGames([]); // Ensure lists are empty on error
      setFilteredGames([]);
    }
  };

  useEffect(() => {
    fetchRecommendations(); // 컴포넌트 마운트 시 첫 페이지 로드
    fetchAvailableGames();
  }, []); // 빈 의존성 배열로 변경

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

    // 시작일/종료일 빈 값으로 초기화
    setStartDate("");
    setEndDate("");

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

    // Convert UTC ISO from server to local datetime-local for input
    setStartDate(formatISODateToDateTimeLocal(recommendation.startDate));
    setEndDate(formatISODateToDateTimeLocal(recommendation.endDate));

    setPublicSettings(recommendation.isPublic === 1 ? "public" : "private");
    setError(null);
    setSaving(false);
    setSearchQuery("");
    setShowModal(true);
  };

  // 게임 추천 삭제
  const handleDeleteRecommendation = async (id: number) => {
    if (window.confirm("정말로 이 추천 목록을 삭제하시겠습니까?")) {
      try {
        setLoading(true);
        await axios.delete(`/casino-recommends/${id}`);
        setAlertMessage({ type: "success", message: "추천 목록이 삭제되었습니다." });
        fetchRecommendations(); // 목록 새로고침
        setSelectedRecommendationIds((prev) => prev.filter((recId) => recId !== id)); // 선택 해제
      } catch (err) {
        setError("추천 목록 삭제 중 오류가 발생했습니다.");
        console.error("Delete error:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  // 선택된 추천 일괄 삭제
  const handleBulkDelete = async () => {
    if (selectedRecommendationIds.length === 0) {
      setAlertMessage({ type: "info", message: "삭제할 추천 목록을 선택해주세요." });
      return;
    }
    if (
      !window.confirm(
        `선택된 ${selectedRecommendationIds.length}개의 추천 목록을 정말 삭제하시겠습니까?`
      )
    )
      return;

    try {
      setLoading(true);
      const deletePromises = selectedRecommendationIds.map((id) =>
        axios.delete(`/casino-recommends/${id}`)
      );
      await Promise.allSettled(deletePromises);

      setAlertMessage({
        type: "success",
        message: `${selectedRecommendationIds.length}개의 추천 목록이 삭제되었습니다.`,
      });
      fetchRecommendations(); // 목록 새로고침
      setSelectedRecommendationIds([]); // 선택 초기화
    } catch (error: any) {
      console.error("추천 목록 일괄 삭제 중 오류 발생:", error);
      setError("추천 목록 삭제 중 일부 오류가 발생했습니다. 목록을 확인해주세요.");
      // 오류 발생 시에도 목록 새로고침 및 선택 초기화 (선택적)
      fetchRecommendations();
      setSelectedRecommendationIds([]);
    } finally {
      setLoading(false);
    }
  };

  // 개별 추천 선택/해제
  const handleSelectRecommendation = (id: number) => {
    setSelectedRecommendationIds((prevSelected) => {
      if (prevSelected.includes(id)) {
        return prevSelected.filter((recId) => recId !== id);
      } else {
        return [...prevSelected, id];
      }
    });
  };

  // 현재 페이지의 모든 추천 선택/해제
  const handleSelectAllRecommendations = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const currentPageRecommendationIds = recommendations.map((rec) => rec.id);
      setSelectedRecommendationIds(currentPageRecommendationIds);
    } else {
      setSelectedRecommendationIds([]);
    }
  };

  // 순서 변경 (위로)
  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;
    const currentItem = recommendations[index];
    const targetItem = recommendations[index - 1];
    const currentPosition = currentItem.position || 0;
    const targetPosition = targetItem.position || 0;

    try {
      setLoading(true);
      // Use the batch update endpoint
      await axios.patch(`/casino-recommends/display-order`, {
        updates: [
          { id: currentItem.id, displayOrder: targetPosition },
          { id: targetItem.id, displayOrder: currentPosition },
        ],
      });
      fetchRecommendations(); // Refresh list
    } catch (err) {
      setError("순서 변경 중 오류가 발생했습니다.");
      fetchRecommendations(); // Refresh list even on error to revert optimistic update
    } finally {
      setLoading(false);
    }
  };

  // 순서 변경 (아래로)
  const handleMoveDown = async (index: number) => {
    if (index >= recommendations.length - 1) return;
    const currentItem = recommendations[index];
    const targetItem = recommendations[index + 1];
    const currentPosition = currentItem.position || 0;
    const targetPosition = targetItem.position || 0;

    try {
      setLoading(true);
      await axios.patch(`/casino-recommends/display-order`, {
        updates: [
          { id: currentItem.id, displayOrder: targetPosition },
          { id: targetItem.id, displayOrder: currentPosition },
        ],
      });
      fetchRecommendations(); // Refresh list
    } catch (err) {
      setError("순서 변경 중 오류가 발생했습니다.");
      fetchRecommendations(); // Refresh list even on error
    } finally {
      setLoading(false);
    }
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setShowModal(false);
  };

  // 게임 선택/해제 토글
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

  // 선택 목록에서 게임 제거
  const removeGameFromSelection = (gameId: number, gameTitle: string) => {
    setSelectedGameIds((prev) => prev.filter((id) => id !== gameId));
    setSelectedGames((prev) => prev.filter((title) => title !== gameTitle));
  };

  // 추천 저장 (추가/수정)
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
    setError(null);

    try {
      // 새 항목의 displayOrder 계산 (기존 항목들의 position 값 기반)
      const newDisplayOrder = isEditing
        ? recommendations.find((rec) => rec.id === currentRecommendationId)?.position // 수정 시 기존 position 유지 또는 필요시 업데이트 로직 추가
        : recommendations.length > 0
        ? Math.max(...recommendations.map((rec) => rec.position || 0)) + 1
        : 1;

      // Convert local datetime-local input strings to UTC ISO strings for saving
      const payload: UpsertCasinoRecommendationPayload = {
        title,
        isMainDisplay,
        gameIds: selectedGameIds,
        startDate: convertDateTimeLocalToISOUTC(startDate),
        endDate: convertDateTimeLocalToISOUTC(endDate),
        isPublic: publicSettings === "public",
        displayOrder: newDisplayOrder,
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
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 페이지 변경 핸들러 추가
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      fetchRecommendations(page, pageSize);
    }
  };

  // 테이블 컬럼 정의
  const columns = useMemo(
    () => [
      // 체크박스 컬럼 추가
      {
        header: (
          <input
            type="checkbox"
            className="form-checkbox h-4 w-4 text-blue-600"
            onChange={handleSelectAllRecommendations}
            checked={
              recommendations.length > 0 &&
              selectedRecommendationIds.length === recommendations.length &&
              recommendations.every((rec) => selectedRecommendationIds.includes(rec.id))
            }
            ref={(input) => {
              if (input) {
                const someSelected =
                  selectedRecommendationIds.length > 0 &&
                  selectedRecommendationIds.length < recommendations.length &&
                  recommendations.some((rec) => selectedRecommendationIds.includes(rec.id));
                input.indeterminate = someSelected;
              }
            }}
            disabled={loading || recommendations.length === 0}
          />
        ),
        accessor: "id" as keyof CasinoRecommendation,
        cell: (id: number) => (
          <input
            type="checkbox"
            className="form-checkbox h-4 w-4 text-blue-600"
            checked={selectedRecommendationIds.includes(id)}
            onChange={() => handleSelectRecommendation(id)}
          />
        ),
        className: "w-px px-4",
      },
      {
        header: "제목",
        accessor: "title" as keyof CasinoRecommendation,
        cell: (value: string, row: CasinoRecommendation) => (
          <span
            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
            onClick={() => handleOpenEditModal(row)}
          >
            {value}
          </span>
        ),
      },
      {
        header: "메인 노출",
        accessor: "isMainDisplay" as keyof CasinoRecommendation,
        cell: (value: boolean) => (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              value ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
            }`}
          >
            {value ? "노출" : "미노출"}
          </span>
        ),
        className: "text-center",
      },
      {
        header: "게임 목록",
        accessor: "games" as keyof CasinoRecommendation,
        cell: (games: string[]) => games?.join(", ") || "-", // Use optional chaining
        className: "max-w-xs truncate", // Prevent long list overflow
      },
      {
        header: "시작일",
        accessor: "startDate" as keyof CasinoRecommendation,
        cell: (value: string) => formatDateForDisplay(value),
      },
      {
        header: "종료일",
        accessor: "endDate" as keyof CasinoRecommendation,
        cell: (value: string) => formatDateForDisplay(value),
      },
      {
        header: "공개 상태",
        accessor: "isPublic" as keyof CasinoRecommendation,
        cell: (value: number) => (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              value === 1 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {value === 1 ? "공개" : "비공개"}
          </span>
        ),
        className: "text-center",
      },
      {
        header: "관리",
        accessor: "id" as keyof CasinoRecommendation,
        cell: (id: number, row: CasinoRecommendation, index: number) => (
          <div className="flex space-x-1 justify-center">
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
              disabled={index === recommendations.length - 1}
            />
            <ActionButton
              label="수정"
              action="edit"
              size="sm"
              onClick={() => handleOpenEditModal(row)}
            />
            <ActionButton
              label="삭제"
              action="delete"
              size="sm"
              onClick={() => handleDeleteRecommendation(id)}
            />
          </div>
        ),
        className: "text-center",
      },
    ],
    [loading, recommendations, selectedRecommendationIds] // Add dependencies
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">카지노 게임 추천 관리</h1>
        <div className="flex space-x-2">
          {/* 선택 삭제 버튼 추가 */}
          <Button
            onClick={handleBulkDelete}
            variant="danger"
            disabled={selectedRecommendationIds.length === 0 || loading || saving}
          >
            {`선택 삭제 (${selectedRecommendationIds.length})`}
          </Button>
          <Button onClick={handleAddRecommendation} disabled={loading || saving}>
            추천 추가
          </Button>
        </div>
      </div>

      {/* Alert Message */}
      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
          className="mb-4"
        />
      )}

      {/* Loading Overlay */}
      <LoadingOverlay isLoading={loading || saving} />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          columns={columns}
          data={recommendations}
          loading={loading}
          emptyMessage="등록된 카지노 추천이 없습니다."
          pagination={{
            currentPage: currentPage,
            pageSize: pageSize,
            totalItems: totalItems,
            onPageChange: handlePageChange,
          }}
        />
      </div>

      {/* 모달 */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={handleCloseModal}
          title={isEditing ? "추천 수정" : "새 추천 추가"}
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
              <Button
                type="button"
                variant="secondary"
                onClick={handleCloseModal}
                disabled={saving}
              >
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
                          className="flex justify-between items-center py-1 px-2 bg-gray-50 mb-1 rounded overflow-hidden"
                        >
                          <span
                            className="text-sm truncate flex-1 mr-2 min-w-0 overflow-hidden whitespace-nowrap"
                            title={gameTitle}
                          >
                            {gameTitle}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              removeGameFromSelection(selectedGameIds[index], gameTitle)
                            }
                            className="text-red-500 hover:text-red-700 flex-shrink-0"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="노출 시작일시"
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Input
                    label="노출 종료일시"
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CasinoRecommendationManagement;
