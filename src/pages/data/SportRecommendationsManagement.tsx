import React, { useState, useEffect, useCallback } from "react";
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
import { formatDate } from "@/utils/dateUtils";

// 스포츠 종목 추천 관리 컴포넌트
export default function SportRecommendationsManagement() {
  // 상태 관리
  const [recommendations, setRecommendations] = useState<SportRecommendation[]>([]);
  const [sportGames, setSportGames] = useState<SportGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 페이지네이션 상태
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  // 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"add" | "edit">("add");
  const [currentRecommendation, setCurrentRecommendation] = useState<SportRecommendation | null>(
    null
  );

  // 스포츠 영문-한글 매핑
  const sportMapping: Record<string, string[]> = {
    football: ["풋볼", "축구"],
    soccer: ["축구", "풋볼"],
    basketball: ["농구", "바스켓볼"],
    baseball: ["야구", "베이스볼"],
    hockey: ["하키"],
    tennis: ["테니스"],
    volleyball: ["배구"],
  };

  // 한글-영문 매핑 생성
  const korToEngMapping: Record<string, string[]> = {};
  Object.entries(sportMapping).forEach(([eng, korArr]) => {
    korArr.forEach((kor) => {
      if (!korToEngMapping[kor]) korToEngMapping[kor] = [];
      korToEngMapping[kor].push(eng);
    });
  });

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
  const [filteredGames, setFilteredGames] = useState<SportGame[]>([]);
  const [selectedGames, setSelectedGames] = useState<SportGame[]>([]);

  // 추천 목록 조회
  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getSportRecommendations({ page, limit });
      setRecommendations(result.data);
      setTotal(result.meta.total || 0);
    } catch (err) {
      console.error("Error fetching sport recommendations:", err);
      setError("스포츠 종목 추천 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  // 스포츠 게임 목록 조회
  const fetchSportGames = useCallback(async () => {
    try {
      // 서버에서 모든 데이터를 가져옴 (검색어는 클라이언트에서만 처리)
      const result = await getSportGames({});
      setSportGames(result.data);

      // 검색어가 있을 경우에만 클라이언트 측에서 필터링
      if (searchQuery.trim()) {
        filterGamesBySearchTerm(result.data, searchQuery.trim());
      } else {
        setFilteredGames(result.data);
      }
    } catch (err) {
      console.error("Error fetching sport games:", err);
    }
  }, [searchQuery]);

  // 검색어에 따른 게임 필터링 함수
  const filterGamesBySearchTerm = (games: SportGame[], query: string) => {
    console.log("Filtering games with query:", query);
    console.log("Total games before filter:", games.length);

    const normalizedQuery = query.toLowerCase();

    // 검색어에 해당하는 다른 언어 키워드 가져오기
    let alternativeTerms: string[] = [];

    // 영문 검색어인 경우 한글 동의어 추가
    if (sportMapping[normalizedQuery]) {
      alternativeTerms = sportMapping[normalizedQuery];
    }
    // 한글 검색어인 경우 영문 동의어 추가
    else if (korToEngMapping[normalizedQuery]) {
      alternativeTerms = korToEngMapping[normalizedQuery];
    }

    // 모든 검색어 (원본 + 동의어)
    const allSearchTerms = [normalizedQuery, ...alternativeTerms];
    console.log("Searching for terms:", allSearchTerms);

    const filtered = games.filter((game) => {
      if (!game) return false;

      // 게임 데이터의 모든 필드를 소문자로 변환하여 검색
      const sportLower = (game.sport || "").toLowerCase();
      const leagueLower = (game.league || "").toLowerCase();
      const matchNameLower = (game.matchName || "").toLowerCase();
      const homeTeamLower = (game.homeTeam || "").toLowerCase();
      const awayTeamLower = (game.awayTeam || "").toLowerCase();

      // 디버깅 정보: 체크 대상 필드
      if (process.env.NODE_ENV === "development") {
        if (
          sportLower.includes(normalizedQuery) ||
          leagueLower.includes(normalizedQuery) ||
          matchNameLower.includes(normalizedQuery) ||
          homeTeamLower.includes(normalizedQuery) ||
          awayTeamLower.includes(normalizedQuery)
        ) {
          console.log("Match found:", game);
        }
      }

      // 어떤 검색어라도 일치하면 포함
      return allSearchTerms.some(
        (term) =>
          sportLower.includes(term) ||
          leagueLower.includes(term) ||
          matchNameLower.includes(term) ||
          homeTeamLower.includes(term) ||
          awayTeamLower.includes(term)
      );
    });

    console.log("Filtered games count:", filtered.length);
    setFilteredGames(filtered);
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    fetchRecommendations();
    fetchSportGames(); // 초기 로드 시 전체 데이터 가져오기
  }, [fetchRecommendations, fetchSportGames]);

  // 검색어 변경 시 게임 데이터 필터링
  useEffect(() => {
    // 이미 데이터가 있는 경우 로컬 필터링만 수행
    if (sportGames.length > 0) {
      if (searchQuery.trim()) {
        filterGamesBySearchTerm(sportGames, searchQuery.trim());
      } else {
        setFilteredGames(sportGames);
      }
    }
  }, [searchQuery]);

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
    setModalType("edit");
    setCurrentRecommendation(recommendation);

    // ISO 형식의 날짜를 input datetime-local 형식으로 변환
    const formatDateForInput = (dateString: string) => {
      if (!dateString) return "";
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    try {
      // 상세 정보 가져오기
      const detailData = await getSportRecommendationById(recommendation.id);

      // 서버에서 반환된 games 배열 사용
      if (detailData.games && Array.isArray(detailData.games)) {
        setSelectedGames(detailData.games);

        // 게임 ID 배열 생성
        const gameIds = detailData.games.map((game) => game.id);

        setFormData({
          title: detailData.title,
          sportGameIds: gameIds,
          startTime: formatDateForInput(detailData.startTime),
          endTime: formatDateForInput(detailData.endTime),
          isPublic: detailData.isPublic,
          displayOrder: detailData.displayOrder,
        });
      } else {
        // 서버에서 games 배열이 없는 경우, 기존 방식 사용
        const gameIds = detailData.sportGameIds || [detailData.sportGameId];
        const games = sportGames.filter((g) => gameIds.includes(g.id));
        setSelectedGames(games);

        setFormData({
          title: detailData.title,
          sportGameIds: gameIds,
          startTime: formatDateForInput(detailData.startTime),
          endTime: formatDateForInput(detailData.endTime),
          isPublic: detailData.isPublic,
          displayOrder: detailData.displayOrder,
        });
      }
    } catch (err) {
      console.error("Error loading recommendation details:", err);
      // 기본 데이터로 폴백
      const gameIds = recommendation.sportGameIds || [recommendation.sportGameId];
      const games = sportGames.filter((g) => gameIds.includes(g.id));
      setSelectedGames(games);

      setFormData({
        title: recommendation.title,
        sportGameIds: gameIds,
        startTime: formatDateForInput(recommendation.startTime),
        endTime: formatDateForInput(recommendation.endTime),
        isPublic: recommendation.isPublic,
        displayOrder: recommendation.displayOrder,
      });
    }

    setShowModal(true);
  };

  // 추천 삭제
  const handleDeleteRecommendation = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    setLoading(true);

    try {
      const success = await deleteSportRecommendation(id);
      if (success) {
        setSuccess("스포츠 종목 추천이 삭제되었습니다.");
        fetchRecommendations();
      } else {
        setError("스포츠 종목 추천 삭제에 실패했습니다.");
      }
    } catch (err) {
      console.error("Error deleting sport recommendation:", err);
      setError("스포츠 종목 추천 삭제 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 폼 입력값 변경 처리
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: ["number", "radio", "select-one"].includes(type) ? parseInt(value) : value,
    }));
  };

  // 추천 저장 (추가 또는 수정)
  const handleSaveRecommendation = async () => {
    // 유효성 검사
    if (!formData.title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }

    if (formData.sportGameIds.length === 0) {
      setError("스포츠 게임을 최소 하나 이상 선택해주세요.");
      return;
    }

    if (!formData.startTime || !formData.endTime) {
      setError("시작일과 종료일을 설정해주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 주의: 서버 API가 단일 sportGameId만 지원하는 경우 아래 주석 부분으로 변경해야 합니다.
      // 현재는 sportGameIds 배열을 전달하는 형태로 구현되어 있습니다.

      /*
      // 서버가 단일 ID만 지원하는 경우
      const firstGameId = formData.sportGameIds[0] || 0;
      const dataToSend = {
        ...formData,
        sportGameId: firstGameId
      };
      */

      let result;
      if (modalType === "add") {
        result = await createSportRecommendation(formData);
        setSuccess("새 스포츠 종목 추천이 등록되었습니다.");
      } else if (currentRecommendation) {
        result = await updateSportRecommendation(currentRecommendation.id, formData);
        setSuccess("스포츠 종목 추천이 수정되었습니다.");
      }

      setShowModal(false);
      fetchRecommendations();
    } catch (err) {
      console.error("Error saving sport recommendation:", err);
      setError("스포츠 종목 추천 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 게임 정보 가져오기
  const getGameInfo = (gameId: number) => {
    const game = sportGames.find((g) => g.id === gameId);
    return game || null;
  };

  // 게임 선택/해제 토글
  const handleToggleGame = (game: SportGame) => {
    setSelectedGames((prev) => {
      // 이미 선택된 게임인지 확인
      const isSelected = prev.some((g) => g.id === game.id);

      // 선택된 게임 목록 업데이트
      const newSelectedGames = isSelected ? prev.filter((g) => g.id !== game.id) : [...prev, game];

      // formData의 sportGameIds도 함께 업데이트
      setFormData((prevForm) => ({
        ...prevForm,
        sportGameIds: newSelectedGames.map((g) => g.id),
      }));

      return newSelectedGames;
    });
  };

  // 선택된 게임 제거
  const handleRemoveSelectedGame = (gameId: number) => {
    setSelectedGames((prev) => {
      const newSelectedGames = prev.filter((g) => g.id !== gameId);

      // formData의 sportGameIds도 함께 업데이트
      setFormData((prevForm) => ({
        ...prevForm,
        sportGameIds: newSelectedGames.map((g) => g.id),
      }));

      return newSelectedGames;
    });
  };

  // 게임 위로 이동
  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;

    const newRecommendations = [...recommendations];

    // 현재 선택된 추천과 위의 추천
    const currentRecommendation = newRecommendations[index];
    const targetRecommendation = newRecommendations[index - 1];

    // displayOrder 값 교환
    const currentDisplayOrder = currentRecommendation.displayOrder;
    const targetDisplayOrder = targetRecommendation.displayOrder;

    // displayOrder 값 교환
    currentRecommendation.displayOrder = targetDisplayOrder;
    targetRecommendation.displayOrder = currentDisplayOrder;

    // 배열 내 위치 교환
    newRecommendations[index] = targetRecommendation;
    newRecommendations[index - 1] = currentRecommendation;

    try {
      // 로컬 상태 먼저 업데이트
      setRecommendations(newRecommendations);

      // API를 통해 각 추천 개별적으로 업데이트
      await updateSportRecommendation(currentRecommendation.id, {
        displayOrder: currentRecommendation.displayOrder,
      });

      await updateSportRecommendation(targetRecommendation.id, {
        displayOrder: targetRecommendation.displayOrder,
      });

      // API 호출이 성공한 후에만 서버에서 최신 데이터를 가져옴
      fetchRecommendations();
      setSuccess("추천 순서가 변경되었습니다.");
    } catch (err) {
      // 에러 발생 시 원래 순서로 되돌림
      fetchRecommendations();
      setError("추천 순서 변경 중 오류가 발생했습니다.");
      console.error("Error updating recommendation order:", err);
    }
  };

  // 게임 아래로 이동
  const handleMoveDown = async (index: number) => {
    if (index >= recommendations.length - 1) return;

    const newRecommendations = [...recommendations];

    // 현재 선택된 추천과 아래 추천
    const currentRecommendation = newRecommendations[index];
    const targetRecommendation = newRecommendations[index + 1];

    // displayOrder 값 교환
    const currentDisplayOrder = currentRecommendation.displayOrder;
    const targetDisplayOrder = targetRecommendation.displayOrder;

    // displayOrder 값 교환
    currentRecommendation.displayOrder = targetDisplayOrder;
    targetRecommendation.displayOrder = currentDisplayOrder;

    // 배열 내 위치 교환
    newRecommendations[index] = targetRecommendation;
    newRecommendations[index + 1] = currentRecommendation;

    try {
      // 로컬 상태 먼저 업데이트
      setRecommendations(newRecommendations);

      // API를 통해 각 추천 개별적으로 업데이트
      await updateSportRecommendation(currentRecommendation.id, {
        displayOrder: currentRecommendation.displayOrder,
      });

      await updateSportRecommendation(targetRecommendation.id, {
        displayOrder: targetRecommendation.displayOrder,
      });

      // API 호출이 성공한 후에만 서버에서 최신 데이터를 가져옴
      fetchRecommendations();
      setSuccess("추천 순서가 변경되었습니다.");
    } catch (err) {
      // 에러 발생 시 원래 순서로 되돌림
      fetchRecommendations();
      setError("추천 순서 변경 중 오류가 발생했습니다.");
      console.error("Error updating recommendation order:", err);
    }
  };

  // 등록 경기 개수 렌더링 함수
  const renderGameCount = (gameIds: number[]) => {
    if (!gameIds || gameIds.length === 0) return "0개의 경기";
    return `${gameIds.length}개의 경기`;
  };

  // 데이터 테이블 컬럼 정의
  const columns = [
    {
      header: "제목",
      accessor: "title",
    },
    {
      header: "등록 경기",
      accessor: (item: SportRecommendation) => {
        // 서버에서 반환된 games 배열 사용
        if (item.games && Array.isArray(item.games)) {
          const count = item.games.length;
          return count + "개의 경기";
        }

        // 기존 방식 (대체)
        const gameIds = item.sportGameIds || [item.sportGameId];
        return gameIds.length + "개의 경기";
      },
    },
    {
      header: "기간",
      accessor: "startTime",
      cell: (value: string, row: SportRecommendation) => (
        <span>
          {formatDate(row.startTime)} ~ {formatDate(row.endTime)}
        </span>
      ),
    },
    {
      header: "공개 상태",
      accessor: "isPublic",
      cell: (value: number, row: SportRecommendation) => {
        if (!value) {
          return (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              비공개
            </span>
          );
        }

        // 현재 시간과 시작일/종료일 비교
        const now = new Date();
        const startTime = row.startTime ? new Date(row.startTime) : null;
        const endTime = row.endTime ? new Date(row.endTime) : null;

        // 공개 상태 결정
        let status = "공개";
        let colorClass = "bg-green-100 text-green-800";

        if (startTime && now < startTime) {
          status = "공개 전";
          colorClass = "bg-gray-100 text-gray-800";
        } else if (endTime && now > endTime) {
          status = "공개 종료";
          colorClass = "bg-gray-100 text-gray-800";
        }

        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
            {status}
          </span>
        );
      },
    },
    {
      header: "관리",
      accessor: "id",
      cell: (value: number, row: SportRecommendation, index: number) => (
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
            disabled={index === recommendations.length - 1}
          />
          <ActionButton
            label="수정"
            action="edit"
            size="sm"
            onClick={() => handleEditRecommendation(row)}
          />
          <ActionButton
            label="삭제"
            action="delete"
            size="sm"
            onClick={() => handleDeleteRecommendation(value)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="mb-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">스포츠 종목 추천 관리</h1>
        <p className="text-sm text-gray-600">
          메인에 노출될 스포츠 게임 추천을 관리하고 공개 여부를 설정할 수 있습니다.
        </p>
      </div>

      {(error || success) && (
        <div className="mb-4">
          <Alert
            type={error ? "error" : "success"}
            message={error || success || ""}
            onClose={() => {
              setError(null);
              setSuccess(null);
            }}
          />
        </div>
      )}

      <div className="flex justify-end mb-4">
        <Button onClick={handleAddRecommendation}>
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
            <span>새 게임 추천 추가</span>
          </div>
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          columns={columns}
          data={recommendations}
          loading={loading}
          emptyMessage="등록된 스포츠 게임 추천이 없습니다."
        />
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalType === "add" ? "새 게임 추천 추가" : "게임 추천 수정"}
        size="lg"
        footer={
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              취소
            </Button>
            <Button onClick={handleSaveRecommendation}>저장</Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* 1. 제목 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="예: 이번 주 주목할 경기"
            />
          </div>

          {/* 2. 선택된 스포츠 게임 표시 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              선택된 스포츠 게임 ({selectedGames.length})
            </label>
            <div
              className="border border-gray-300 rounded-md p-3"
              style={{ maxHeight: "150px", overflowY: "auto" }}
            >
              {selectedGames.length > 0 ? (
                <div className="space-y-2">
                  {selectedGames.map((game) => (
                    <div key={game.id} className="flex justify-between items-center border-b pb-2">
                      <div className="font-medium">{game.matchName}</div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSelectedGame(game.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-20 text-gray-500">
                  아래에서 스포츠 게임을 선택해주세요
                </div>
              )}
            </div>
          </div>

          {/* 3. 스포츠 게임 선택 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">스포츠 게임 선택</label>
              <div className="relative w-64">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="게임 검색 (팀명, 리그, 종목, 경기명)"
                  className="p-2 w-full border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div
              className="border border-gray-300 rounded-md p-3"
              style={{ maxHeight: "300px", overflowY: "auto" }}
            >
              {filteredGames.length > 0 ? (
                <div className="space-y-2">
                  {filteredGames.map((game) => (
                    <div
                      key={game.id}
                      className={`p-2 border rounded-md cursor-pointer ${
                        selectedGames.some((g) => g.id === game.id)
                          ? "bg-blue-50 border-blue-300"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                      onClick={() => handleToggleGame(game)}
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          name={`game-${game.id}`}
                          checked={selectedGames.some((g) => g.id === game.id)}
                          onChange={() => handleToggleGame(game)}
                          className="h-4 w-4 text-blue-600 mr-2 rounded"
                        />
                        <div>
                          <div className="font-medium">{game.matchName}</div>
                          <div className="text-sm">
                            {game.homeTeam} vs {game.awayTeam}
                          </div>
                          <div className="text-xs text-gray-500">
                            {game.league} ({game.sport}) | {formatDate(game.dateTime)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-6 text-gray-500">
                  {searchQuery.trim()
                    ? "검색 결과가 없습니다. 팀명, 리그, 종목 또는 경기명으로 검색해 보세요."
                    : "게임 목록을 불러오는 중입니다..."}
                </div>
              )}
            </div>
          </div>

          {/* 4. 기간 설정 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
              <input
                type="datetime-local"
                name="startTime"
                value={formData.startTime}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
              <input
                type="datetime-local"
                name="endTime"
                value={formData.endTime}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          {/* 5. 공개여부 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">공개여부</label>
            <div className="flex space-x-4">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="visibility-public"
                  name="isPublic"
                  value="1"
                  checked={formData.isPublic === 1}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="visibility-public" className="ml-2 text-sm text-gray-700">
                  공개
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="visibility-private"
                  name="isPublic"
                  value="0"
                  checked={formData.isPublic === 0}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="visibility-private" className="ml-2 text-sm text-gray-700">
                  비공개
                </label>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
