import React, { useState, useEffect, useCallback, ReactNode, useRef } from "react";
import {
  getSportRecommendations,
  createSportRecommendation,
  updateSportRecommendation,
  deleteSportRecommendation,
  getSportGames,
  getSportRecommendationById,
  createSportManualGame,
  updateSportManualGame,
  getSportManualGameById,
  createSportManualRecommendation,
  updateSportManualRecommendation,
} from "@/api";
import { SportGame, SportRecommendation } from "@/types";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import ActionButton from "@/components/ActionButton";
import Modal from "@/components/Modal";
import Alert from "@/components/Alert";
import SearchInput from "@/components/SearchInput";
import ExcelDownloadButton from "../../components/ExcelDownloadButton";
import {
  formatDateForDisplay,
  formatISODateToDateTimeLocal,
  convertDateTimeLocalToISOUTC,
  formatDate,
} from "@/utils/dateUtils";
import LoadingOverlay from "@/components/LoadingOverlay";
import { DragManager } from "./components/drag/DragManager";
import DatePicker from "@/components/forms/DatePicker";
import Input from "@/components/forms/Input";
import FileUpload, { FileUploadRef } from "@/components/forms/FileUpload";
import { RefObject } from "react";

// 스포츠 게임 상세 정보 타입
interface SportGameDetail {
  id?: number;
  home: string;
  away: string;
  league: string;
  time: string;
  icon?: string;
}

// 수동 등록 폼 데이터 타입
interface ManualRegistrationForm {
  title: string;
  startTime: string;
  endTime: string;
  games: SportGameDetail[];
  isPublic: number;
  displayOrder?: number;
}

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

  // FileUpload ref 추가
  const fileUploadRef = useRef<FileUploadRef>(null);

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

  // Reference to track previous sportGames to prevent unnecessary re-renders
  const prevSportGamesRef = useRef<SportGame[]>([]);

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
  // 제목을 별도 상태로 관리
  // const [title, setTitle] = useState(""); // 롤백: 제거

  // 스포츠 게임 선택 관련 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [filteredGames, setFilteredGames] = useState<SportGame[]>([]);
  const [selectedGames, setSelectedGames] = useState<SportGame[]>([]);

  // === 스텝 모달 상태 ===
  // const [step, setStep] = useState(1); // 롤백: 제거

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
    [] // Remove sportMapping from dependency array to prevent infinite loop
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

  // 검색 핸들러
  const handleSearch = (type: string, value: string) => {
    console.log(
      "SportRecommendationsManagement: 검색 핸들러 호출됨, 타입:",
      type,
      "검색어:",
      value
    );
    if (type === "title" || type === "content" || type === "both") {
      fetchRecommendations(value);
    }
  };

  // 추천 목록 조회 (검색 파라미터 추가)
  const fetchRecommendations = useCallback(
    async (searchValue: string = "") => {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const currentSelected = [...selectedRecommendationIds]; // Keep selection

      try {
        const params: any = { page, limit };

        if (searchValue.trim()) {
          params.search = searchValue;
        }

        const result = await getSportRecommendations(params);
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
    },
    [page, limit]
  );

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
  }, [fetchRecommendations, fetchSportGames, page]);

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
      // Only update mappings when sportGames changes, not on every render
      if (sportGames !== prevSportGamesRef.current) {
        updateSportMappings(sportGames);
        prevSportGamesRef.current = sportGames;
      }
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
    // setTitle(""); // 롤백: 제거
    setSelectedGames([]);
    // setStep(1); // Reset step to 1 for new recommendation // 롤백: 제거
    setShowModal(true);
  };

  // 추천 수정 모달 열기
  const handleEditRecommendation = async (recommendation: SportRecommendation) => {
    // 수동 등록된 추천인지 확인 (여러 조건으로 체크)
    const isManualRecommendation =
      ((recommendation as any).manualGames && (recommendation as any).manualGames.length > 0) ||
      (recommendation as any).category === "manual" ||
      (recommendation as any).source === "manual" ||
      (recommendation.games &&
        Array.isArray(recommendation.games) &&
        recommendation.games.length > 0 &&
        recommendation.games.some(
          (game: any) => game.source === "manual" || game.home || game.away
        ));

    if (isManualRecommendation) {
      // 수동 등록된 추천은 별도 모달로 처리
      handleOpenManualEditModal(recommendation);
      return;
    }

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

      // 서버에서 제공하는 games 배열을 직접 사용
      let selectedGamesData: SportGame[] = [];
      let gameIds: (string | number)[] = [];

      if (detailData.games && Array.isArray(detailData.games)) {
        // games 배열에서 null이 아닌 게임들만 필터링하고 타입 변환
        selectedGamesData = detailData.games
          .filter((game: any) => game !== null)
          .map((game: any) => {
            // goalserve 데이터인지 확인
            const isGoalserve = game.source === "goalserve" || String(game.id).startsWith("0.");

            return {
              ...game,
              id: typeof game.id === "string" ? game.id : game.id, // 문자열 ID도 그대로 유지
              // goalserve 데이터의 경우 실제 데이터 사용 (서버에서 제공하는 대로)
              matchName: game.matchName || game.sport || "Unknown Game",
              homeTeam: game.homeTeam || "Unknown",
              awayTeam: game.awayTeam || "Unknown",
              league: game.league || "Unknown League",
              sport: game.sport || "Unknown Sport",
              dateTime: game.dateTime || new Date().toISOString(),
              iconUrl: game.iconUrl || "",
              createdAt: game.createdAt || new Date().toISOString(),
              updatedAt: game.updatedAt || new Date().toISOString(),
              // goalserve 데이터임을 표시하기 위한 추가 정보
              isGoalserve: isGoalserve,
            };
          });
        gameIds = selectedGamesData.map((game: any) => game.id);
      } else if (detailData.sportGames && Array.isArray(detailData.sportGames)) {
        // fallback: sportGames 배열 사용 (이전 로직)
        detailData.sportGames.forEach((sportGameItem: any) => {
          if (sportGameItem.sportGameId) {
            // 데이터베이스 게임인 경우
            const dbGame = detailData.games?.find(
              (game: any) => game && game.id === sportGameItem.sportGameId
            );
            if (dbGame) {
              selectedGamesData.push(dbGame);
              gameIds.push(dbGame.id);
            }
          } else if (sportGameItem.goalserveId) {
            // goalserve 게임인 경우 - 임시 객체 생성
            const tempGame: SportGame = {
              id: sportGameItem.goalserveId as any, // string을 number로 캐스팅
              matchName: `Goalserve Game (${sportGameItem.goalserveId})`,
              homeTeam: "Home Team",
              awayTeam: "Away Team",
              league: "League",
              sport: "Sport",
              dateTime: new Date().toISOString(),
              createdAt: sportGameItem.createdAt,
              updatedAt: sportGameItem.updatedAt,
            };
            selectedGamesData.push(tempGame);
            gameIds.push(sportGameItem.goalserveId);
          }
        });
      }

      setSelectedGames(selectedGamesData);

      setFormData({
        title: detailData.title || "",
        sportGameIds: gameIds as number[], // 타입 캐스팅
        startTime: formatISODateToDateTimeLocal(detailData.startTime),
        endTime: formatISODateToDateTimeLocal(detailData.endTime),
        isPublic: detailData.isPublic === 1 ? 1 : 0,
        displayOrder: detailData.displayOrder || 0,
      });
      // setTitle(detailData.title || ""); // 롤백: 제거
      // setStep(1); // Reset step to 1 for existing recommendation // 롤백: 제거
      setShowModal(true);
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
      // setTitle(recommendation.title || ""); // 롤백: 제거
      // setStep(1); // Reset step to 1 for existing recommendation // 롤백: 제거
      setShowModal(true);
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

    // ID가 "0."으로 시작하는지 확인하는 함수
    const isGoalserveData = (id: string | number): boolean => {
      return String(id).startsWith("0.");
    };

    // games 배열 구성
    const games = selectedGames.map((game) => {
      if (isGoalserveData(game.id)) {
        // goalserve 게임인 경우 상세 정보 포함
        return {
          id: game.id,
          source: "goalserve" as const,
          sport: game.sport || "Unknown",
          dateTime: game.dateTime || new Date().toISOString(),
          league: game.league || "Unknown League",
          matchName: game.matchName || "Unknown Game",
          homeTeam: game.homeTeam || "Unknown",
          awayTeam: game.awayTeam || "Unknown",
        };
      } else {
        // 데이터베이스 게임인 경우 id만 포함 (이미 숫자 ID이므로 그대로 사용)
        return {
          id: game.id,
          source: "database" as const,
        };
      }
    });

    const payload = {
      ...formData,
      title,
      games, // games 배열 추가
      sportGameIds: selectedGames.map((g) => g.id), // 기존 호환성을 위해 유지
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

  // === 드래그 앤 드롭 시작 ===
  // DragManager 인스턴스 보관
  const dragManagerRef = useRef<DragManager | null>(null);

  useEffect(() => {
    if (selectedGames.length > 0) {
      dragManagerRef.current = new DragManager((from, to) => {
        const tempSelectedGames = [...selectedGames];

        // 원본을 건드리지 않고 새로운 배열 생성
        const games = [...tempSelectedGames.slice(0, from), ...tempSelectedGames.slice(from + 1)];

        const newGames = [...games.slice(0, to), selectedGames[from], ...games.slice(to)];

        setSelectedGames(newGames);
      });
    }
  }, [selectedGames]);

  // 드래그 이벤트 핸들러 (자동 추천용)
  const handleAutoDragStart = (index: number) => {
    if (!dragManagerRef.current) return;
    dragManagerRef.current.startDrag(index);
  };

  const handleAutoDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleAutoDrop = (index: number) => {
    if (!dragManagerRef.current) return;
    dragManagerRef.current.drop(index);
  };
  // === 드래그 앤 드롭 종료 ===

  // 게임 수 표시 렌더링 함수
  const renderGameCount = (gameIds: number[]) => {
    return gameIds ? `${gameIds.length}개` : "0개";
  };

  // 제목 입력 스텝 컴포넌트
  // const TitleStep = ({
  //   value,
  //   onChange,
  //   onNext,
  //   loading,
  // }: {
  //   value: string;
  //   onChange: (v: string) => void;
  //   onNext: () => void;
  //   loading: boolean;
  // }) => (
  //   <div className="space-y-6">
  //     <div>
  //       <label className="label">제목</label>
  //       <input
  //         type="text"
  //         name="title"
  //         value={value}
  //         onChange={(e) => onChange(e.target.value)}
  //         className="input"
  //         placeholder="예: 이번 주 주목할 경기"
  //         disabled={loading}
  //       />
  //     </div>
  //     <div className="flex justify-end">
  //       <Button onClick={onNext} disabled={loading || !value.trim()}>
  //         다음
  //       </Button>
  //     </div>
  //   </div>
  // );

  // 게임 선택 스텝 컴포넌트
  // const GameStep = ({
  //   selectedGames,
  //   onChange,
  //   onPrev,
  //   onSave,
  //   loading,
  //   searchQuery,
  //   setSearchQuery,
  //   filteredGames,
  //   handleToggleGame,
  //   handleRemoveSelectedGame,
  // }: any) => (
  //   <div className="space-y-6">
  //     {/* 2. 선택된 스포츠 게임 표시 */}
  //     <div>
  //       <label className="label">선택된 스포츠 게임 ({selectedGames.length})</label>
  //       <div
  //         className="border border-gray-300 rounded-md p-3 bg-gray-50"
  //         style={{ minHeight: "100px", maxHeight: "200px", overflowY: "auto" }}
  //       >
  //         {selectedGames.length > 0 ? (
  //           <div className="space-y-2">
  //             {selectedGames.map((game: any, index: number) => (
  //               <div
  //                 key={`selected-${game.id}-${index}`}
  //                 className="flex justify-between items-center border-b pb-2 last:border-b-0"
  //                 draggable
  //                 style={{ cursor: "grab" }}
  //               >
  //                 <div>
  //                   <div className="font-medium text-sm">{game.matchName}</div>
  //                   <div className="flex items-center space-x-4">
  //                     <p className="text-xs text-gray-500">{game.league}</p>
  //                     <div className="text-xs text-gray-600">
  //                       {formatDateForDisplay(game.dateTime?.replace("FRO", ""))}
  //                     </div>
  //                   </div>
  //                 </div>
  //                 <button
  //                   type="button"
  //                   onClick={() => handleRemoveSelectedGame(game.id)}
  //                   className="text-red-500 hover:text-red-700 text-xs p-1"
  //                   disabled={loading}
  //                 >
  //                   삭제
  //                 </button>
  //               </div>
  //             ))}
  //           </div>
  //         ) : (
  //           <div className="flex items-center justify-center h-full text-gray-400 text-sm">
  //             아래 목록에서 스포츠 게임을 선택해주세요.
  //           </div>
  //         )}
  //       </div>
  //     </div>
  //     {/* 3. 스포츠 게임 선택 */}
  //     <div>
  //       <div className="flex justify-between items-center mb-2">
  //         <label className="label">스포츠 게임 선택</label>
  //         <input
  //           type="text"
  //           value={searchQuery}
  //           onChange={(e) => setSearchQuery(e.target.value)}
  //           placeholder="게임 검색 (팀명, 리그, 종목...)"
  //           className="input w-64"
  //           disabled={loading}
  //         />
  //       </div>
  //       <div
  //         className="border border-gray-300 rounded-md p-3"
  //         style={{ maxHeight: "300px", overflowY: "auto" }}
  //       >
  //         {loading && filteredGames.length === 0 ? (
  //           <div className="text-center text-gray-500">게임 목록 로딩 중...</div>
  //         ) : filteredGames.length > 0 ? (
  //           <div className="space-y-2">
  //             {filteredGames.map((game: any, index: number) => (
  //               <div
  //                 key={`filtered-${game.id}-${index}`}
  //                 className={`p-2 border rounded-md cursor-pointer flex items-start ${
  //                   selectedGames.some((g: any) => g.id === game.id)
  //                     ? "bg-blue-50 border-blue-300"
  //                     : "border-gray-200 hover:bg-gray-50"
  //                 }`}
  //                 onClick={() => !loading && handleToggleGame(game)}
  //               >
  //                 <input
  //                   type="checkbox"
  //                   name={`game-${game.id}`}
  //                   checked={selectedGames.some((g: any) => g.id === game.id)}
  //                   onChange={() => {}}
  //                   onClick={(e) => {
  //                     e.stopPropagation();
  //                     !loading && handleToggleGame(game);
  //                   }}
  //                   className="h-4 w-4 text-blue-600 mr-3 mt-1 rounded focus:ring-blue-500"
  //                   disabled={loading}
  //                 />
  //                 <div className="flex-1">
  //                   <div className="font-medium text-sm">{game.matchName}</div>
  //                   <div className="text-xs">
  //                     {game.homeTeam} vs {game.awayTeam}
  //                   </div>
  //                   <div className="text-xs text-gray-500 mt-1">
  //                     {game.league} ({game.sport}) |{" "}
  //                     {formatDateForDisplay(game.dateTime?.replace("FRO", ""))}
  //                   </div>
  //                 </div>
  //               </div>
  //             ))}
  //           </div>
  //         ) : (
  //           <div className="text-center p-6 text-gray-500">
  //             {searchQuery.trim() ? "검색 결과가 없습니다." : "등록된 게임이 없습니다."}
  //           </div>
  //         )}
  //       </div>
  //     </div>
  //     <div className="flex justify-between mt-4">
  //       <Button variant="outline" onClick={onPrev} disabled={loading}>
  //         이전
  //       </Button>
  //       <Button onClick={onSave} disabled={loading}>
  //         저장
  //       </Button>
  //     </div>
  //   </div>
  // );

  // === 수동 추천 수정 상태/함수/모달 ===
  const [showManualEditModal, setShowManualEditModal] = useState(false);
  const [editManualForm, setEditManualForm] = useState<ManualRegistrationForm & { id?: number }>({
    title: "",
    startTime: "",
    endTime: "",
    games: [],
    isPublic: 1,
  });
  const [editCurrentGameDetail, setEditCurrentGameDetail] = useState<SportGameDetail>({
    home: "",
    away: "",
    league: "",
    time: "",
    icon: "",
  });
  const [editDraggedIndex, setEditDraggedIndex] = useState<number | null>(null);
  const editFileUploadRef: RefObject<FileUploadRef> = useRef<FileUploadRef>(null);
  const [editGameDetailError, setEditGameDetailError] = useState<string | null>(null);

  const handleOpenManualEditModal = (recommendation: SportRecommendation) => {
    // 시작시간/종료시간이 없으면 현재 시간으로 설정
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);

    const formatDateForInput = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}T00:00`;
    };

    // 수동 등록된 추천인지 확인
    const isManualRecommendation =
      (recommendation as any).manualGames && (recommendation as any).manualGames.length > 0;

    let games: SportGameDetail[] = [];
    let startTime = recommendation.startTime || formatDateForInput(now);
    let endTime = recommendation.endTime || formatDateForInput(nextWeek);

    if (isManualRecommendation) {
      // 수동 등록된 추천: manualGames에서 데이터 가져오기 (displayOrder 순서대로 정렬)
      games = (recommendation as any).manualGames
        .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0))
        .map((game: any, i: number) => ({
          id: game.id,
          home: game.home,
          away: game.away,
          league: game.league,
          time: game.time,
          icon: game.iconUrl || "",
        }));

      // 첫 번째 게임의 시작/종료 시간 사용
      if (games.length > 0) {
        startTime = (recommendation as any).manualGames[0].startTime || startTime;
        endTime = (recommendation as any).manualGames[0].endTime || endTime;
      }
    } else {
      // 자동 등록된 추천: games 배열에서 수동 게임만 필터링
      games = ((recommendation.games as any[]) || [])
        .filter((game: any) => game.source === "manual")
        .map((game: any, i: number) => ({
          id: game.id,
          home: game.homeTeam,
          away: game.awayTeam,
          league: game.league,
          time: game.dateTime,
          icon: game.iconUrl || "",
        }));
    }

    setEditManualForm({
      id: recommendation.id,
      title: recommendation.title || "",
      startTime: formatISODateToDateTimeLocal(startTime),
      endTime: formatISODateToDateTimeLocal(endTime),
      games: games,
      isPublic: recommendation.isPublic,
      displayOrder: (recommendation as any).displayOrder || 0,
    });
    setEditCurrentGameDetail({ home: "", away: "", league: "", time: "", icon: "" });
    setEditGameDetailError(null);
    setShowManualEditModal(true);
  };
  const handleCloseManualEditModal = () => {
    setShowManualEditModal(false);
    setEditGameDetailError(null);
  };
  const handleEditGameDetailChange = (field: keyof SportGameDetail, value: string) => {
    setEditCurrentGameDetail((prev) => ({ ...prev, [field]: value }));
  };
  const handleEditAddGameDetail = () => {
    if (
      !editCurrentGameDetail.home ||
      !editCurrentGameDetail.away ||
      !editCurrentGameDetail.league ||
      !editCurrentGameDetail.time
    ) {
      setEditGameDetailError("모든 필드를 입력해주세요.");
      return;
    }
    setEditManualForm((prev) => ({
      ...prev,
      games: [...prev.games, { ...editCurrentGameDetail, id: Date.now() }],
    }));
    setEditCurrentGameDetail({ home: "", away: "", league: "", time: "", icon: "" });
    if (editFileUploadRef.current) editFileUploadRef.current.reset();
    setEditGameDetailError(null);
  };
  const handleEditRemoveGameDetail = (id: number) => {
    setEditManualForm((prev) => ({
      ...prev,
      games: prev.games.filter((game: SportGameDetail) => game.id !== id),
    }));
  };
  const handleEditDragStart = (index: number, e: React.DragEvent<HTMLDivElement>) => {
    setEditDraggedIndex(index);
  };
  const handleEditDrop = (index: number, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (editDraggedIndex === null || editDraggedIndex === index) return;
    const items = Array.from(editManualForm.games);
    const [reorderedItem] = items.splice(editDraggedIndex, 1);
    items.splice(index, 0, reorderedItem);
    setEditManualForm((prev) => ({ ...prev, games: items }));
    setEditDraggedIndex(null);
  };
  const handleSaveManualEdit = async (id: number) => {
    if (!editManualForm.title) {
      setEditGameDetailError("추천명을 입력해주세요.");
      return;
    }
    if (!editManualForm.startTime) {
      setEditGameDetailError("시작 시간을 입력해주세요.");
      return;
    }
    if (!editManualForm.endTime) {
      setEditGameDetailError("종료 시간을 입력해주세요.");
      return;
    }
    if (editManualForm.games.length === 0) {
      setEditGameDetailError("최소 한 개의 스포츠 경기를 등록해주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const recommendationData = {
        title: editManualForm.title,
        startTime: editManualForm.startTime,
        endTime: editManualForm.endTime,
        isPublic: editManualForm.isPublic,
        games: editManualForm.games.map((game: SportGameDetail, index: number) => ({
          home: game.home,
          away: game.away,
          league: game.league,
          time: game.time,
          icon: game.icon || "",
          displayOrder: index,
        })),
      };

      // id가 있으면 수정, 없으면 새로 등록
      if (editManualForm.id) {
        await updateSportManualRecommendation(editManualForm.id, recommendationData);
        setSuccess("수동 추천이 수정되었습니다.");
      } else {
        await createSportManualRecommendation(recommendationData);
        setSuccess("수동 추천이 등록되었습니다.");
      }

      handleCloseManualEditModal();
      fetchRecommendations();
    } catch (error: any) {
      setError(error.response?.data?.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
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
      cell: (value: unknown, row: SportRecommendation, index: number) => (
        <input
          type="checkbox"
          className="form-checkbox h-4 w-4 text-blue-600"
          checked={selectedRecommendationIds.includes(row.id)}
          onChange={() => handleSelectRecommendation(row.id)}
          disabled={loading}
        />
      ),
      className: "w-px px-4", // Adjust width and padding
    },
    {
      header: "추천명",
      accessor: "title" as keyof SportRecommendation,
      cell: (value: unknown, row: SportRecommendation, index: number) => (
        <span
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          onClick={() => handleEditRecommendation(row)}
        >
          {value as string}
        </span>
      ),
    },
    {
      header: "게임 수",
      accessor: "sportGameIds" as keyof SportRecommendation,
      cell: (value: unknown, row: SportRecommendation, index: number) => {
        // 수동 등록: manualGames가 있는 경우
        if ((row as any).manualGames && (row as any).manualGames.length > 0) {
          return <span>{(row as any).manualGames.length}개 (수동)</span>;
        }
        // 1. sportGames 배열 확인 (API 응답에서 가장 정확한 데이터)
        else if ((row as any).sportGames && (row as any).sportGames.length > 0) {
          return <span>{(row as any).sportGames.length}개</span>;
        }
        // 2. games 배열 확인
        else if (row.games && row.games.length > 0) {
          return <span>{row.games.length}개</span>;
        }
        // 3. sportGameIds 배열 확인 (이전 코드 호환성)
        else if (Array.isArray(value) && value.length > 0) {
          return <span>{value.length}개</span>;
        }
        // 4. sportGameId 단일 값 확인 (이전 코드 호환성)
        else if ((row as any).sportGameId) {
          return <span>1개</span>;
        }
        // 데이터가 없는 경우
        return <span>0개</span>;
      },
    },

    {
      header: "시작 시간",
      accessor: "startTime" as keyof SportRecommendation,
      cell: (value: unknown, row: SportRecommendation, index: number) => {
        // 수동 등록: manualGames에서 시간 가져오기
        if ((row as any).manualGames && (row as any).manualGames.length > 0) {
          const manualGame = (row as any).manualGames[0];
          return <span>{formatDateForDisplay(manualGame.startTime)}</span>;
        }
        // 자동 등록: 추천 레벨의 startTime 사용
        return <span>{formatDateForDisplay(value as string)}</span>;
      },
    },
    {
      header: "종료 시간",
      accessor: "endTime" as keyof SportRecommendation,
      cell: (value: unknown, row: SportRecommendation, index: number) => {
        // 수동 등록: manualGames에서 시간 가져오기
        if ((row as any).manualGames && (row as any).manualGames.length > 0) {
          const manualGame = (row as any).manualGames[0];
          return <span>{formatDateForDisplay(manualGame.endTime)}</span>;
        }
        // 자동 등록: 추천 레벨의 endTime 사용
        return <span>{formatDateForDisplay(value as string)}</span>;
      },
    },
    {
      header: "공개 여부",
      accessor: "isPublic" as keyof SportRecommendation,
      cell: (value: unknown, row: SportRecommendation, index: number) => {
        const now = new Date();
        const startTime = row.startTime ? new Date(row.startTime) : null;
        const endTime = row.endTime ? new Date(row.endTime) : null;
        if (value !== 1) {
          return <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">비공개</span>;
        }
        if (startTime && startTime > now) {
          return (
            <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">공개 전</span>
          );
        }
        if (endTime && endTime < now) {
          return (
            <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">공개 종료</span>
          );
        }
        return <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">공개</span>;
      },
    },
    {
      header: "관리",
      accessor: "id" as keyof SportRecommendation,
      cell: (value: unknown, row: SportRecommendation, index: number) => (
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
            onClick={() => handleDeleteRecommendation(row.id)}
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

  // renderGameSelectionModal 함수 복원
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
            style={{
              minHeight: "100px",
              maxHeight: "200px",
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            {selectedGames.length > 0 ? (
              <div className="space-y-2">
                {selectedGames.map((game, index) => (
                  <div
                    key={`selected-${game.id}-${index}`}
                    className="flex justify-between items-center border-b pb-2 last:border-b-0"
                    draggable
                    style={{ cursor: "grab" }}
                  >
                    <div className="flex-1 min-w-0 overflow-hidden mr-2">
                      <div className="font-medium text-sm truncate">{game.matchName}</div>
                      <div className="flex items-center space-x-4">
                        <p className="text-xs text-gray-500 truncate flex-1">{game.league}</p>
                        <div className="text-xs text-gray-600 flex-shrink-0">
                          {formatDateForDisplay(game.dateTime?.replace("FRO", ""))}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSelectedGame(game.id)}
                      className="text-red-500 hover:text-red-700 text-xs p-1 flex-shrink-0"
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
                {filteredGames.map((game, index) => (
                  <div
                    key={`filtered-${game.id}-${index}`}
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
                        e.stopPropagation();
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">스포츠 종목 추천 관리</h1>
        <SearchInput
          searchValue={searchQuery}
          setSearchValue={setSearchQuery}
          onSearch={(value) => handleSearch("title", value)}
        />
        <div className="flex space-x-2">
          <ExcelDownloadButton type="sportRecommends" variant="outline" size="sm">
            엑셀 다운로드
          </ExcelDownloadButton>
          <Button
            variant="primary"
            onClick={() => {
              // 새로 등록할 때는 editManualForm 초기화
              setEditManualForm({
                title: "",
                startTime: "",
                endTime: "",
                games: [],
                isPublic: 1,
              });
              setEditCurrentGameDetail({ home: "", away: "", league: "", time: "", icon: "" });
              setEditGameDetailError(null);
              setShowManualEditModal(true);
            }}
            disabled={loading}
          >
            수동 등록
          </Button>
          <Button variant="primary" onClick={handleAddRecommendation} disabled={loading}>
            추천 추가
          </Button>
          <Button
            variant="danger"
            onClick={handleBulkDelete}
            disabled={selectedRecommendationIds.length === 0 || loading}
          >
            {`선택 삭제 (${selectedRecommendationIds.length})`}
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />
      )}
      {success && (
        <Alert type="success" message={success} onClose={() => setSuccess(null)} className="mb-4" />
      )}

      {/* Loading Overlay */}
      <LoadingOverlay isLoading={loading} />

      {/* Standardize container div classes */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          columns={columns}
          data={recommendations}
          loading={loading}
          emptyMessage={searchQuery ? "검색된 결과가 없습니다." : "등록된 추천이 없습니다."}
          pagination={{
            currentPage: page,
            pageSize: limit,
            totalItems: total,
            onPageChange: handlePageChange,
          }}
        />
      </div>

      {/* 기존 추천 추가/수정 모달 */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalType === "add" ? "새 추천 추가" : "추천 수정"}
        size="xl"
      >
        {renderGameSelectionModal()}
      </Modal>

      {/* 수동 등록 모달 */}
      <Modal
        isOpen={showManualEditModal}
        onClose={handleCloseManualEditModal}
        title={editManualForm.id ? "스포츠 종목 추천 수동 등록 수정" : "스포츠 종목 추천 수동 등록"}
        size="xl"
      >
        <div className="max-h-[80vh] overflow-y-auto space-y-6">
          {/* 1. 최상단 라인: 버튼(좌) + 공개여부 체크박스(우) */}
          <div className="flex justify-between items-center border-b pb-4">
            {/* 왼쪽: 저장/취소 버튼 */}
            <div className="flex space-x-2">
              <Button
                onClick={() => handleSaveManualEdit(editManualForm.id || 0)}
                disabled={loading}
              >
                {loading ? "저장 중..." : "저장"}
              </Button>
              <Button variant="secondary" onClick={handleCloseManualEditModal} disabled={loading}>
                취소
              </Button>
            </div>
            {/* 오른쪽: 공개 여부 체크박스 */}
            <div className="flex items-center">
              <input
                id="isPublicCheckbox"
                type="checkbox"
                checked={Boolean(editManualForm.isPublic === 1)}
                onChange={(e) =>
                  setEditManualForm((prev) => ({ ...prev, isPublic: e.target.checked ? 1 : 0 }))
                }
                className="form-checkbox h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                disabled={loading}
              />
              <label
                htmlFor="isPublicCheckbox"
                className="ml-2 block text-sm font-medium text-gray-700"
              >
                공개 여부
              </label>
            </div>
          </div>

          {/* 2. 추천명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">추천명</label>
            <Input
              type="text"
              value={editManualForm.title}
              onChange={(e) => setEditManualForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="추천명을 입력하세요"
              disabled={loading}
            />
          </div>

          {/* 3. 시작/종료 시간 (가로 배치) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">시작 시간</label>
              <input
                type="datetime-local"
                name="startTime"
                value={editManualForm.startTime}
                onChange={(e) =>
                  setEditManualForm((prev) => ({ ...prev, startTime: e.target.value }))
                }
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">종료 시간</label>
              <input
                type="datetime-local"
                name="endTime"
                value={editManualForm.endTime}
                onChange={(e) =>
                  setEditManualForm((prev) => ({ ...prev, endTime: e.target.value }))
                }
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={loading}
              />
            </div>
          </div>

          {/* 4. 선택된 스포츠 게임 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              선택된 스포츠 게임
            </label>
            <div
              className="border rounded-lg p-4 min-h-[100px] bg-gray-50"
              style={{ overflowX: "hidden" }}
            >
              <div className="space-y-2">
                {editManualForm.games && editManualForm.games.length > 0 ? (
                  editManualForm.games.map((game: SportGameDetail, index: number) => (
                    <div
                      key={game.id ?? index}
                      className="flex items-center bg-white p-3 rounded border"
                      draggable
                      onDragStart={(e) => handleEditDragStart(index, e)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleEditDrop(index, e);
                      }}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {/* 이미지 */}
                        <div className="w-8 h-8 flex-shrink-0">
                          {game.icon ? (
                            <img
                              src={game.icon}
                              alt="icon"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                              <svg
                                className="w-4 h-4 text-gray-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* 텍스트 정보 */}
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="font-medium truncate">
                            {game.home} vs {game.away}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            {game.league} | {new Date(game.time).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleEditRemoveGameDetail(game.id!)}
                        className="ml-4 text-red-600 hover:text-red-800 flex-shrink-0"
                      >
                        삭제
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    등록된 스포츠 게임이 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5. 스포츠 게임 상세 */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium mb-4">스포츠 게임 상세</h3>
            <div className="space-y-4">
              {/* Home */}
              <div className="flex items-center">
                <label className="block text-sm font-medium text-gray-700 w-24">Home</label>
                <div className="flex-1">
                  <Input
                    type="text"
                    value={editCurrentGameDetail.home}
                    onChange={(e) => handleEditGameDetailChange("home", e.target.value)}
                    placeholder="홈 팀"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Away */}
              <div className="flex items-center">
                <label className="block text-sm font-medium text-gray-700 w-24">Away</label>
                <div className="flex-1">
                  <Input
                    type="text"
                    value={editCurrentGameDetail.away}
                    onChange={(e) => handleEditGameDetailChange("away", e.target.value)}
                    placeholder="어웨이 팀"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* League */}
              <div className="flex items-center">
                <label className="block text-sm font-medium text-gray-700 w-24">League</label>
                <div className="flex-1">
                  <Input
                    type="text"
                    value={editCurrentGameDetail.league}
                    onChange={(e) => handleEditGameDetailChange("league", e.target.value)}
                    placeholder="리그"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Time */}
              <div className="flex items-center">
                <label className="block text-sm font-medium text-gray-700 w-24">Time</label>
                <div className="flex-1">
                  <input
                    type="datetime-local"
                    value={editCurrentGameDetail.time}
                    onChange={(e) => handleEditGameDetailChange("time", e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Icon */}
              <div className="flex items-center">
                <label className="block text-sm font-medium text-gray-700 w-24">Icon</label>
                <div className="flex-1">
                  <FileUpload
                    onFileSelect={(file) => {
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          handleEditGameDetailChange("icon", reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      } else {
                        handleEditGameDetailChange("icon", "");
                      }
                    }}
                    accept="image/*"
                    disabled={loading}
                    initialPreview={editCurrentGameDetail.icon}
                    ref={editFileUploadRef}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-center">
              <Button
                onClick={handleEditAddGameDetail}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white px-12 py-2.5 rounded-md w-2/3 text-lg font-medium"
              >
                스포츠 경기 등록
              </Button>
            </div>
          </div>

          {editGameDetailError && (
            <Alert
              type="error"
              message={editGameDetailError}
              onClose={() => setEditGameDetailError(null)}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}
