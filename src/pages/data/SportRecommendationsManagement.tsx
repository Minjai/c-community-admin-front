import React, { useState, useEffect, useCallback, ReactNode } from "react";
import {
  getSportRecommendations,
  createSportRecommendation,
  updateSportRecommendation,
  deleteSportRecommendation,
  getSportGames,
  getSportRecommendationById,
} from "@/api";
import { SportGame, SportRecommendation } from "@/types";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import ActionButton from "@/components/ActionButton";
import Modal from "@/components/Modal";
import Alert from "@/components/Alert";
import {
  formatDateForDisplay,
  formatISODateToDateTimeLocal,
  convertDateTimeLocalToISOUTC,
  formatDate,
} from "@/utils/dateUtils";
import LoadingOverlay from "@/components/LoadingOverlay";

// 스포츠 종목 추천 관리 컴포넌트
export default function SportRecommendationsManagement() {
  // 상태 관리
  const [recommendations, setRecommendations] = useState<SportRecommendation[]>([]);
  const [sportGames, setSportGames] = useState<SportGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 선택된 추천 ID 상태 추가
  const [selectedRecommendationIds, setSelectedRecommendationIds] = useState<number[]>([]);

  // 페이지네이션 상태
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"add" | "edit">("add");
  const [currentRecommendation, setCurrentRecommendation] = useState<SportRecommendation | null>(
    null
  );

  // 동적으로 생성될 스포츠 매핑
  const [sportMapping, setSportMapping] = useState<Record<string, string[]>>({
    football: ["풋볼", "축구"],
    soccer: ["축구", "풋볼"],
    basketball: ["농구", "바스켓볼"],
    baseball: ["야구", "베이스볼"],
    hockey: ["하키"],
    tennis: ["테니스"],
    volleyball: ["배구"],
  });

  // 한글-영문 매핑 생성
  const [korToEngMapping, setKorToEngMapping] = useState<Record<string, string[]>>({});

  // Helper function to check if a string starts with a number
  const startsWithNumber = (str: string): boolean => {
    return /^[0-9]/.test(str.trim());
  };

  // Custom sort function: Letters first, then numbers, then natural sort within groups
  const customGameSort = (a: SportGame, b: SportGame): number => {
    const nameA = a.matchName || "";
    const nameB = b.matchName || "";
    const aIsNumeric = startsWithNumber(nameA);
    const bIsNumeric = startsWithNumber(nameB);

    if (!aIsNumeric && bIsNumeric) {
      return -1; // Letters come before numbers
    } else if (aIsNumeric && !bIsNumeric) {
      return 1; // Numbers come after letters
    } else {
      // Both are numbers or both are letters, use natural sort
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "base" });
    }
  };

  // 폼 데이터
  const [formData, setFormData] = useState({
    title: "",
    sportGameIds: [] as number[],
    startTime: "",
    endTime: "",
    isPublic: 1,
    displayOrder: 0,
  });

  // 스포츠 게임 선택 관련 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [filteredGames, setFilteredGames] = useState<SportGame[]>([]);
  const [selectedGames, setSelectedGames] = useState<SportGame[]>([]);

  // 스포츠 종목 매핑 자동 생성 (먼저 정의)
  const updateSportMappings = useCallback(
    (games: SportGame[]) => {
      // 새로운 매핑 객체 생성 (기존 매핑 유지)
      const newMapping = { ...sportMapping };

      // 게임 데이터에서 모든 종목 수집
      games.forEach((game) => {
        if (!game || !game.sport) return;

        const sportName = game.sport.toLowerCase();
        if (!newMapping[sportName]) {
          newMapping[sportName] = [];
        }
      });

      // 매핑 업데이트
      setSportMapping(newMapping);

      // 한글-영문 매핑 업데이트
      const newKorToEngMapping: Record<string, string[]> = {};
      Object.entries(newMapping).forEach(([eng, korArr]) => {
        korArr.forEach((kor) => {
          if (!newKorToEngMapping[kor]) newKorToEngMapping[kor] = [];
          newKorToEngMapping[kor].push(eng);
        });
      });

      setKorToEngMapping(newKorToEngMapping);
    },
    [sportMapping]
  );

  // 검색어에 따른 게임 필터링 및 정렬 함수 (먼저 정의)
  const filterAndSortGames = useCallback(
    (games: SportGame[], query: string) => {
      const normalizedQuery = query.toLowerCase().trim();
      let gamesToFilter = [...games];
      let sortedGames: SportGame[]; // 정렬된 결과를 담을 변수

      if (!normalizedQuery) {
        // 검색어가 없을 때: dateTime 기준 내림차순 정렬
        sortedGames = gamesToFilter.sort((a, b) => {
          const dateA = a.dateTime ? new Date(a.dateTime).getTime() : 0;
          const dateB = b.dateTime ? new Date(b.dateTime).getTime() : 0;
          const timeA = !isNaN(dateA) ? dateA : 0;
          const timeB = !isNaN(dateB) ? dateB : 0;
          return timeB - timeA; // 내림차순
        });
      } else {
        // 검색어가 있을 때: 필터링 후 dateTime 기준 내림차순 정렬
        let alternativeTerms: string[] = [];
        if (sportMapping[normalizedQuery]) {
          alternativeTerms = sportMapping[normalizedQuery];
        } else if (korToEngMapping[normalizedQuery]) {
          alternativeTerms = korToEngMapping[normalizedQuery];
        }
        const allSearchTerms = [normalizedQuery, ...alternativeTerms];

        const filtered = gamesToFilter.filter((game) => {
          if (!game) return false;
          const searchableFields = [
            game.matchName,
            game.homeTeam,
            game.awayTeam,
            game.league,
            game.sport,
          ].map((field) => (field || "").toLowerCase());
          return allSearchTerms.some((term) =>
            searchableFields.some((field) => field.includes(term))
          );
        });

        // 필터링된 결과를 dateTime 기준으로 내림차순 정렬
        sortedGames = filtered.sort((a, b) => {
          const dateA = a.dateTime ? new Date(a.dateTime).getTime() : 0;
          const dateB = b.dateTime ? new Date(b.dateTime).getTime() : 0;
          const timeA = !isNaN(dateA) ? dateA : 0;
          const timeB = !isNaN(dateB) ? dateB : 0;
          return timeB - timeA; // 내림차순
        });
      }

      // 최종 정렬된 결과를 상태에 반영
      setFilteredGames(sortedGames);
    },
    [sportMapping, korToEngMapping]
  );

  // 추천 목록 조회
  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    const currentSelected = [...selectedRecommendationIds]; // Keep selection

    try {
      const result = await getSportRecommendations({ page, limit });
      const sortedData = result.data.sort((a, b) => b.id - a.id);
      setRecommendations(sortedData);
      setTotal(result.meta.total || 0);
      // totalPages 상태 업데이트 추가
      setTotalPages(Math.ceil((result.meta.total || 0) / limit) || 1);

      // Restore selection after fetch
      setSelectedRecommendationIds(
        currentSelected.filter((id) => sortedData.some((rec) => rec.id === id))
      );
    } catch (err) {
      console.error("Error fetching sport recommendations:", err);
      setError("스포츠 종목 추천 목록을 불러오는데 실패했습니다.");
      setRecommendations([]); // Clear data on error
      setSelectedRecommendationIds([]); // Clear selection on error
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  // 스포츠 게임 목록 조회 (updateSportMappings 호출 제거 및 의존성 제거)
  const fetchSportGames = useCallback(async () => {
    try {
      const result = await getSportGames({});
      setSportGames(result.data || []);
    } catch (err) {
      console.error("Error fetching sport games:", err);
      setSportGames([]);
    }
  }, []);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    fetchRecommendations();
    fetchSportGames();
  }, [fetchRecommendations, fetchSportGames]);

  // Debounce search query 업데이트 로직 추가
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms 지연

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // sportGames 또는 debouncedSearchQuery 변경 시 게임 목록 필터링/정렬 및 매핑 업데이트
  useEffect(() => {
    // 주석 제거 및 로직 활성화
    if (sportGames.length > 0) {
      updateSportMappings(sportGames);
      filterAndSortGames(sportGames, debouncedSearchQuery);
    } else {
      setFilteredGames([]);
    }
  }, [sportGames, debouncedSearchQuery, updateSportMappings, filterAndSortGames]);

  // 추천 추가 모달 열기
  const handleAddRecommendation = () => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const formatDateForInput = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}T00:00`;
    };

    setModalType("add");
    setCurrentRecommendation(null);
    setFormData({
      title: "",
      sportGameIds: [],
      startTime: formatDateForInput(today),
      endTime: formatDateForInput(nextWeek),
      isPublic: 1,
      displayOrder:
        recommendations.length > 0
          ? Math.max(...recommendations.map((rec) => rec.displayOrder || 0)) + 1
          : 1,
    });
    setSelectedGames([]);
    setShowModal(true);
  };

  // 추천 수정 모달 열기
  const handleEditRecommendation = async (recommendation: SportRecommendation) => {
    // 가드 조건 추가
    if (!sportGames || sportGames.length === 0) {
      console.log("사용 가능한 게임이 로드되지 않았습니다");
      setError("사용 가능한 게임이 로드되지 않았습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setModalType("edit");
    setCurrentRecommendation(recommendation);

    try {
      const detailData = await getSportRecommendationById(recommendation.id);
      const gameIds = detailData.games ? detailData.games.map((game: SportGame) => game.id) : [];
      const games = detailData.games || [];
      setSelectedGames(games);

      setFormData({
        title: detailData.title || "",
        sportGameIds: gameIds,
        startTime: formatISODateToDateTimeLocal(detailData.startTime),
        endTime: formatISODateToDateTimeLocal(detailData.endTime),
        isPublic: detailData.isPublic === 1 ? 1 : 0,
        displayOrder: detailData.displayOrder || 0,
      });
    } catch (err) {
      console.error("Error loading recommendation details:", err);
      setError("추천 상세 정보를 불러오는데 실패했습니다.");
      // Fallback
      const gameIds =
        recommendation.sportGameIds ||
        (recommendation.sportGameId ? [recommendation.sportGameId] : []);
      setSelectedGames(sportGames.filter((g) => gameIds.includes(g.id)));
      setFormData({
        title: recommendation.title || "",
        sportGameIds: gameIds,
        startTime: formatISODateToDateTimeLocal(recommendation.startTime),
        endTime: formatISODateToDateTimeLocal(recommendation.endTime),
        isPublic: recommendation.isPublic === 1 ? 1 : 0,
        displayOrder: recommendation.displayOrder || 0,
      });
    } finally {
      setLoading(false);
    }
    // Reset search query before showing modal
    setSearchQuery("");
    setShowModal(true);
  };

  // 추천 삭제
  const handleDeleteRecommendation = async (id: number) => {
    if (!window.confirm("정말로 이 추천을 삭제하시겠습니까?")) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await deleteSportRecommendation(id);
      setSuccess("추천이 삭제되었습니다.");
      // Remove from selection
      setSelectedRecommendationIds((prev) => prev.filter((recId) => recId !== id));
      fetchRecommendations(); // 목록 새로고침
    } catch (err) {
      console.error("Error deleting recommendation:", err);
      const apiError = (err as any)?.response?.data?.message || "추천 삭제 중 오류가 발생했습니다.";
      setError(apiError);
    } finally {
      setLoading(false);
    }
  };

  // 일괄 삭제 핸들러 추가
  const handleBulkDelete = async () => {
    if (selectedRecommendationIds.length === 0) {
      setError("삭제할 추천을 선택해주세요.");
      return;
    }
    if (
      !window.confirm(
        `선택된 ${selectedRecommendationIds.length}개의 추천을 정말 삭제하시겠습니까?`
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const deletePromises = selectedRecommendationIds.map((id) => deleteSportRecommendation(id));
      const results = await Promise.allSettled(deletePromises);

      const failedDeletes = results.filter((result) => result.status === "rejected");

      if (failedDeletes.length > 0) {
        console.error("일부 추천 삭제 실패:", failedDeletes);
        setError(`일부 추천 삭제에 실패했습니다. (${failedDeletes.length}개)`);
        setSuccess(null);
      } else {
        setSuccess(`${selectedRecommendationIds.length}개의 추천이 삭제되었습니다.`);
        setError(null);
      }

      setSelectedRecommendationIds([]); // Clear selection
      fetchRecommendations(); // Reload list
    } catch (err) {
      console.error("Error during bulk delete:", err);
      setError("일괄 삭제 중 오류가 발생했습니다.");
      setSuccess(null);
      // Attempt to refresh and clear selection even on general error
      setSelectedRecommendationIds([]);
      fetchRecommendations();
    } finally {
      setLoading(false);
    }
  };

  // 개별 선택 핸들러 추가
  const handleSelectRecommendation = (id: number) => {
    setSelectedRecommendationIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((recId) => recId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // 전체 선택 핸들러 추가
  const handleSelectAllRecommendations = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedRecommendationIds(recommendations.map((rec) => rec.id));
    } else {
      setSelectedRecommendationIds([]);
    }
  };

  // 폼 입력값 변경 처리
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const isCheckbox = type === "checkbox";

    if (name === "isPublic") {
      // Handle radio buttons for isPublic
      setFormData((prev) => ({
        ...prev,
        isPublic: parseInt(value),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value,
      }));
    }
  };

  // 추천 저장 (추가 또는 수정)
  const handleSaveRecommendation = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const payload = {
      ...formData,
      sportGameIds: selectedGames.map((g) => g.id), // Use selectedGames state
      startTime: convertDateTimeLocalToISOUTC(formData.startTime),
      endTime: convertDateTimeLocalToISOUTC(formData.endTime),
      displayOrder: formData.displayOrder || 0, // Ensure displayOrder is a number
    };

    try {
      if (modalType === "add") {
        await createSportRecommendation(payload);
        setSuccess("추천이 성공적으로 추가되었습니다.");
      } else if (currentRecommendation) {
        await updateSportRecommendation(currentRecommendation.id, payload);
        setSuccess("추천이 성공적으로 수정되었습니다.");
      }
      setShowModal(false);
      fetchRecommendations(); // 목록 새로고침
    } catch (err) {
      console.error("Error saving recommendation:", err);
      const apiError = (err as any)?.response?.data?.message || "추천 저장 중 오류가 발생했습니다.";
      setError(apiError);
    } finally {
      setLoading(false);
    }
  };

  // ID로 게임 정보 찾기 (표시용)
  const getGameInfo = (gameId: number): SportGame | undefined => {
    return sportGames.find((game) => game.id === gameId);
  };

  // 모달에서 게임 선택/해제 토글
  const handleToggleGame = (game: SportGame) => {
    setSelectedGames((prevSelected) => {
      const isSelected = prevSelected.some((g) => g.id === game.id);
      if (isSelected) {
        return prevSelected.filter((g) => g.id !== game.id);
      } else {
        return [...prevSelected, game];
      }
    });
  };

  // 선택된 게임 목록에서 게임 제거
  const handleRemoveSelectedGame = (gameId: number) => {
    setSelectedGames((prevSelected) => prevSelected.filter((game) => game.id !== gameId));
  };

  // 게임 수 표시 렌더링 함수
  const renderGameCount = (gameIds: number[]) => {
    return gameIds ? `${gameIds.length}개` : "0개";
  };

  // 게임 선택 모달 내용 렌더링 함수 추가
  const renderGameSelectionModal = () => {
    return (
      <div className="space-y-6">
        {/* Modal Error Alert */}
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        {/* Top Control Area */}
        <div className="flex justify-between items-center pt-2 pb-4 border-b border-gray-200 mb-6">
          {/* Buttons (Left) */}
          <div className="flex space-x-3">
            <Button onClick={handleSaveRecommendation} disabled={loading}>
              {loading ? "저장 중..." : modalType === "add" ? "등록" : "저장"}
            </Button>
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={loading}>
              취소
            </Button>
          </div>
          {/* Public Toggle (Right) */}
          <div className="flex space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="isPublic"
                value={1}
                checked={formData.isPublic === 1}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                disabled={loading}
              />
              <span className="ml-2 text-sm text-gray-700">공개</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="isPublic"
                value={0}
                checked={formData.isPublic === 0}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                disabled={loading}
              />
              <span className="ml-2 text-sm text-gray-700">비공개</span>
            </label>
          </div>
        </div>

        {/* 1. 제목 입력 */}
        <div>
          <label className="label">제목</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className="input"
            placeholder="예: 이번 주 주목할 경기"
            disabled={loading}
          />
        </div>

        {/* 2. 선택된 스포츠 게임 표시 */}
        <div>
          <label className="label">선택된 스포츠 게임 ({selectedGames.length})</label>
          <div
            className="border border-gray-300 rounded-md p-3 bg-gray-50"
            style={{ minHeight: "100px", maxHeight: "200px", overflowY: "auto" }}
          >
            {selectedGames.length > 0 ? (
              <div className="space-y-2">
                {selectedGames.map((game) => (
                  <div
                    key={game.id}
                    className="flex justify-between items-center border-b pb-2 last:border-b-0"
                  >
                    <div>
                      <div className="font-medium text-sm">{game.matchName}</div>
                      <div className="text-xs text-gray-600">
                        {formatDateForDisplay(game.dateTime?.replace("FRO", ""))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSelectedGame(game.id)}
                      className="text-red-500 hover:text-red-700 text-xs p-1"
                      disabled={loading}
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                아래 목록에서 스포츠 게임을 선택해주세요.
              </div>
            )}
          </div>
        </div>

        {/* 3. 스포츠 게임 선택 */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="label">스포츠 게임 선택</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="게임 검색 (팀명, 리그, 종목...)"
              className="input w-64"
              disabled={loading}
            />
          </div>
          <div
            className="border border-gray-300 rounded-md p-3"
            style={{ maxHeight: "300px", overflowY: "auto" }}
          >
            {loading && filteredGames.length === 0 ? (
              <div className="text-center text-gray-500">게임 목록 로딩 중...</div>
            ) : filteredGames.length > 0 ? (
              <div className="space-y-2">
                {filteredGames.map((game) => (
                  <div
                    key={game.id}
                    className={`p-2 border rounded-md cursor-pointer flex items-start ${
                      selectedGames.some((g) => g.id === game.id)
                        ? "bg-blue-50 border-blue-300"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                    onClick={() => !loading && handleToggleGame(game)}
                  >
                    <input
                      type="checkbox"
                      name={`game-${game.id}`}
                      checked={selectedGames.some((g) => g.id === game.id)}
                      onChange={() => {}}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row click
                        !loading && handleToggleGame(game);
                      }}
                      className="h-4 w-4 text-blue-600 mr-3 mt-1 rounded focus:ring-blue-500"
                      disabled={loading}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{game.matchName}</div>
                      <div className="text-xs">
                        {game.homeTeam} vs {game.awayTeam}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {game.league} ({game.sport}) |{" "}
                        {formatDateForDisplay(game.dateTime?.replace("FRO", ""))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-6 text-gray-500">
                {searchQuery.trim() ? "검색 결과가 없습니다." : "등록된 게임이 없습니다."}
              </div>
            )}
          </div>
        </div>

        {/* 4. 기간 설정 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">시작 시간</label>
            <input
              type="datetime-local"
              name="startTime"
              value={formData.startTime}
              onChange={handleInputChange}
              className="input"
              disabled={loading}
            />
          </div>
          <div>
            <label className="label">종료 시간</label>
            <input
              type="datetime-local"
              name="endTime"
              value={formData.endTime}
              onChange={handleInputChange}
              className="input"
              disabled={loading}
            />
          </div>
        </div>
      </div>
    );
  };

  // 데이터 테이블 컬럼 정의
  const columns = [
    // 체크박스 컬럼 추가
    {
      header: (
        <input
          type="checkbox"
          className="form-checkbox h-4 w-4 text-blue-600"
          onChange={handleSelectAllRecommendations}
          checked={
            recommendations.length > 0 &&
            selectedRecommendationIds.length === recommendations.length
          }
          ref={(input) => {
            if (input) {
              input.indeterminate =
                selectedRecommendationIds.length > 0 &&
                selectedRecommendationIds.length < recommendations.length;
            }
          }}
          disabled={loading || recommendations.length === 0}
        />
      ),
      accessor: "id" as keyof SportRecommendation,
      cell: (id: number) => (
        <input
          type="checkbox"
          className="form-checkbox h-4 w-4 text-blue-600"
          checked={selectedRecommendationIds.includes(id)}
          onChange={() => handleSelectRecommendation(id)}
          disabled={loading}
        />
      ),
      className: "w-px px-4", // Adjust width and padding
    },
    {
      header: "추천명",
      accessor: "title" as keyof SportRecommendation,
      cell: (value: string, row: SportRecommendation) => (
        <span
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          onClick={() => handleEditRecommendation(row)}
        >
          {value}
        </span>
      ),
    },
    {
      header: "게임 수",
      accessor: "sportGameIds" as keyof SportRecommendation,
      cell: (gameIds: number[] | undefined, row: SportRecommendation) => {
        // 1. sportGames 배열 확인 (API 응답에서 가장 정확한 데이터)
        if ((row as any).sportGames && (row as any).sportGames.length > 0) {
          return `${(row as any).sportGames.length}개`;
        }
        // 2. games 배열 확인
        else if (row.games && row.games.length > 0) {
          return `${row.games.length}개`;
        }
        // 3. sportGameIds 배열 확인 (이전 코드 호환성)
        else if (gameIds && gameIds.length > 0) {
          return `${gameIds.length}개`;
        }
        // 4. sportGameId 단일 값 확인 (이전 코드 호환성)
        else if (row.sportGameId) {
          return "1개";
        }
        // 데이터가 없는 경우
        return "0개";
      },
    },
    {
      header: "시작 시간",
      accessor: "startTime" as keyof SportRecommendation,
      cell: (value: string) => formatDateForDisplay(value),
    },
    {
      header: "종료 시간",
      accessor: "endTime" as keyof SportRecommendation,
      cell: (value: string) => formatDateForDisplay(value),
    },
    {
      header: "공개 여부",
      accessor: "isPublic" as keyof SportRecommendation,
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
      header: "관리",
      accessor: "id" as keyof SportRecommendation,
      cell: (id: number, row: SportRecommendation) => (
        <div className="flex space-x-2">
          <ActionButton
            label="수정"
            action="edit"
            color="blue"
            onClick={() => handleEditRecommendation(row)}
            disabled={loading}
          />
          <ActionButton
            label="삭제"
            action="delete"
            color="red"
            onClick={() => handleDeleteRecommendation(id)}
            disabled={loading}
          />
        </div>
      ),
    },
  ];

  // 페이지 변경 핸들러 추가 (CompanyBannerPage 기준, setPage 래핑)
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      setPage(newPage);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">스포츠 종목 추천 관리</h1>

      {/* Alerts */}
      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />
      )}
      {success && (
        <Alert type="success" message={success} onClose={() => setSuccess(null)} className="mb-4" />
      )}

      <div className="flex justify-between items-center mb-4">
        {/* Placeholder for title alignment */}
        <div></div>
        {/* Buttons on the right */}
        <div className="flex space-x-2">
          {/* 선택 삭제 버튼 추가 */}
          <Button
            variant="danger"
            onClick={handleBulkDelete}
            disabled={selectedRecommendationIds.length === 0 || loading}
          >
            {`선택 삭제 (${selectedRecommendationIds.length})`}
          </Button>
          <Button variant="primary" onClick={handleAddRecommendation} disabled={loading}>
            추천 추가
          </Button>
        </div>
      </div>

      {/* Loading Overlay */}
      <LoadingOverlay isLoading={loading} />

      {/* Standardize container div classes */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          columns={columns}
          data={recommendations}
          loading={loading}
          emptyMessage="등록된 추천이 없습니다."
          pagination={{
            currentPage: page,
            pageSize: limit,
            totalItems: total,
            onPageChange: handlePageChange,
          }}
        />
      </div>

      {/* Modal for Add/Edit */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalType === "add" ? "새 추천 추가" : "추천 수정"}
        size="xl" // Use supported size 'xl'
      >
        {renderGameSelectionModal()}
      </Modal>
    </div>
  );
}
