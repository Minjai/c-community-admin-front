import React, { useState, useEffect, useRef } from "react";
import axios from "@/api/axios";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import ActionButton from "@/components/ActionButton";
import Modal from "@/components/Modal";
import Input from "@/components/forms/Input";
import Alert from "@/components/Alert";
import { formatDate } from "@/utils/dateUtils";
import { SportGame, SportRecommendation } from "@/types";
import { extractDataArray } from "@/api/util";

const SportRecommendationsManagement = () => {
  const [recommendations, setRecommendations] = useState<SportRecommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // 페이지네이션 상태
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // 모달 관련 상태
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentRecommendation, setCurrentRecommendation] = useState<SportRecommendation | null>(
    null
  );
  const [saving, setSaving] = useState<boolean>(false);

  // 폼 데이터
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    isPublic: 1,
  });

  // 스포츠 경기 관련 상태
  const [availableSportGames, setAvailableSportGames] = useState<SportGame[]>([]);
  const [selectedSportGames, setSelectedSportGames] = useState<number[]>([]);
  const [selectedSportGameDetails, setSelectedSportGameDetails] = useState<SportGame[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredSportGames, setFilteredSportGames] = useState<SportGame[]>([]);
  const [showSportGameSelector, setShowSportGameSelector] = useState<boolean>(false);

  // 추천 목록 조회
  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      // 실제 API 엔드포인트로 수정 필요
      const response = await axios.get("/api/sports/recommendations", {
        params: { page, limit },
      });

      if (response.data && response.data.success) {
        setRecommendations(response.data.data || []);
        setTotal(response.data.meta?.total || 0);
        setTotalPages(response.data.meta?.totalPages || 1);
      } else {
        setRecommendations([]);
        setError("스포츠 추천 목록을 불러오는데 실패했습니다.");
      }
    } catch (err) {
      console.error("Error fetching sport recommendations:", err);
      // 개발 중이므로 샘플 데이터 사용
      const sampleData = [
        {
          id: 1,
          title: "이번 주 축구 추천 경기",
          description: "유럽 리그 주요 경기 모음",
          isPublic: 1,
          position: 100,
          startDate: "2023-04-01T00:00:00",
          endDate: "2023-04-30T23:59:59",
          sportGames: [1, 2, 3],
          createdAt: "2023-03-15T10:00:00",
          updatedAt: "2023-03-15T10:00:00",
        },
        {
          id: 2,
          title: "NBA 하이라이트 경기",
          description: "농구 팬을 위한 추천 경기",
          isPublic: 1,
          position: 90,
          startDate: "2023-04-05T00:00:00",
          endDate: "2023-05-05T23:59:59",
          sportGames: [4, 5, 6],
          createdAt: "2023-03-20T14:30:00",
          updatedAt: "2023-03-20T14:30:00",
        },
      ];
      setRecommendations(sampleData);
      setTotal(sampleData.length);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // 사용 가능한 스포츠 경기 목록 가져오기
  const fetchAvailableSportGames = async () => {
    try {
      const response = await axios.get("/api/sports/admin/games", {
        params: { limit: 100 },
      });

      if (response.data && response.data.success) {
        setAvailableSportGames(response.data.data || []);
        setFilteredSportGames(response.data.data || []);
      } else {
        setAvailableSportGames([]);
        setFilteredSportGames([]);
      }
    } catch (err) {
      console.error("Error fetching available sport games:", err);
      // 개발 중이므로 샘플 데이터 사용
      const sampleData = [
        {
          id: 1,
          sport: "FOOTBALL",
          league: "Premier League",
          matchName: "Arsenal vs Liverpool",
          homeTeam: "Arsenal",
          awayTeam: "Liverpool",
          dateTime: "2023-04-15T19:30:00",
        },
        {
          id: 2,
          sport: "FOOTBALL",
          league: "La Liga",
          matchName: "Barcelona vs Real Madrid",
          homeTeam: "Barcelona",
          awayTeam: "Real Madrid",
          dateTime: "2023-04-16T20:00:00",
        },
        {
          id: 3,
          sport: "FOOTBALL",
          league: "Bundesliga",
          matchName: "Bayern Munich vs Dortmund",
          homeTeam: "Bayern Munich",
          awayTeam: "Dortmund",
          dateTime: "2023-04-17T18:30:00",
        },
        {
          id: 4,
          sport: "BASKETBALL",
          league: "NBA",
          matchName: "Lakers vs Warriors",
          homeTeam: "LA Lakers",
          awayTeam: "Golden State Warriors",
          dateTime: "2023-04-18T19:00:00",
        },
        {
          id: 5,
          sport: "BASKETBALL",
          league: "NBA",
          matchName: "Celtics vs Nets",
          homeTeam: "Boston Celtics",
          awayTeam: "Brooklyn Nets",
          dateTime: "2023-04-19T18:00:00",
        },
      ];
      setAvailableSportGames(sampleData);
      setFilteredSportGames(sampleData);
    }
  };

  // 선택된 경기의 세부 정보 가져오기
  const fetchSelectedSportGameDetails = async (ids: number[]) => {
    if (ids.length === 0) {
      setSelectedSportGameDetails([]);
      return;
    }

    try {
      // 실제 API에서는 벌크로 게임 정보를 가져오는 엔드포인트 사용
      // 샘플 구현에서는 availableSportGames에서 필터링
      const details = availableSportGames.filter((game) => ids.includes(game.id));
      setSelectedSportGameDetails(details);
    } catch (err) {
      console.error("Error fetching selected sport game details:", err);
      setSelectedSportGameDetails([]);
    }
  };

  useEffect(() => {
    fetchRecommendations();
    fetchAvailableSportGames();
  }, [page, limit]);

  // 검색어로 게임 필터링
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredSportGames(availableSportGames);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = availableSportGames.filter(
        (game) =>
          game.matchName.toLowerCase().includes(query) ||
          game.homeTeam.toLowerCase().includes(query) ||
          game.awayTeam.toLowerCase().includes(query) ||
          game.league.toLowerCase().includes(query) ||
          game.sport.toLowerCase().includes(query)
      );
      setFilteredSportGames(filtered);
    }
  }, [searchQuery, availableSportGames]);

  // 선택된 게임 세부 정보 업데이트
  useEffect(() => {
    fetchSelectedSportGameDetails(selectedSportGames);
  }, [selectedSportGames]);

  // 모달 닫기
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedSportGames([]);
    setSelectedSportGameDetails([]);
    setShowSportGameSelector(false);
  };

  // 추천 추가 모달 열기
  const handleAddRecommendation = () => {
    // 초기화
    const now = new Date();
    const weekLater = new Date();
    weekLater.setDate(now.getDate() + 7);

    setCurrentRecommendation(null);
    setFormData({
      title: "",
      description: "",
      startDate:
        now.toISOString().split("T")[0] + "T" + now.toTimeString().split(" ")[0].substring(0, 5),
      endDate:
        weekLater.toISOString().split("T")[0] +
        "T" +
        weekLater.toTimeString().split(" ")[0].substring(0, 5),
      isPublic: 1,
    });
    setSelectedSportGames([]);
    setSelectedSportGameDetails([]);
    setIsEditing(false);
    setShowModal(true);
  };

  // 추천 수정 모달 열기
  const handleEditRecommendation = (recommendation: SportRecommendation) => {
    setCurrentRecommendation(recommendation);

    setFormData({
      title: recommendation.title || "",
      description: recommendation.description || "",
      startDate: formatDateForInput(recommendation.startDate),
      endDate: formatDateForInput(recommendation.endDate),
      isPublic: recommendation.isPublic,
    });

    // 선택된 게임 설정
    const gameIds =
      Array.isArray(recommendation.sportGames) && typeof recommendation.sportGames[0] === "number"
        ? (recommendation.sportGames as number[])
        : recommendation.sportGameIds || [];

    setSelectedSportGames(gameIds);
    setIsEditing(true);
    setShowModal(true);
  };

  // input datetime-local용 날짜 포맷
  const formatDateForInput = (dateString: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().substring(0, 16);
  };

  // 추천 삭제
  const handleDeleteRecommendation = async (id: number) => {
    if (!window.confirm("정말로 이 추천을 삭제하시겠습니까?")) {
      return;
    }

    try {
      // 실제 API 엔드포인트 사용
      // const response = await axios.delete(`/api/sports/recommendations/${id}`);
      // if (response.data && response.data.success) {
      //   setAlertMessage({ type: "success", message: "추천이 성공적으로 삭제되었습니다." });
      //   fetchRecommendations();
      // } else {
      //   setAlertMessage({ type: "error", message: "추천 삭제 중 오류가 발생했습니다." });
      // }

      // 개발 중이므로 성공 응답 가정
      setAlertMessage({ type: "success", message: "추천이 성공적으로 삭제되었습니다." });
      setRecommendations((prev) => prev.filter((rec) => rec.id !== id));
    } catch (err) {
      console.error("Error deleting recommendation:", err);
      setAlertMessage({ type: "error", message: "추천 삭제 중 오류가 발생했습니다." });
    }
  };

  // 폼 입력 핸들러
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 스포츠 게임 선택/해제
  const handleSportGameToggle = (game: SportGame) => {
    setSelectedSportGames((prev) => {
      if (prev.includes(game.id)) {
        return prev.filter((id) => id !== game.id);
      } else {
        return [...prev, game.id];
      }
    });
  };

  // 선택한 게임 제거
  const handleRemoveSportGame = (gameId: number) => {
    setSelectedSportGames((prev) => prev.filter((id) => id !== gameId));
  };

  // 추천 저장
  const handleSaveRecommendation = async () => {
    if (!formData.title.trim()) {
      setAlertMessage({ type: "error", message: "제목을 입력해주세요." });
      return;
    }

    if (selectedSportGames.length === 0) {
      setAlertMessage({ type: "error", message: "하나 이상의 스포츠 경기를 선택해주세요." });
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      setAlertMessage({ type: "error", message: "시작일과 종료일을 모두 입력해주세요." });
      return;
    }

    try {
      setSaving(true);

      const recommendationData = {
        ...formData,
        sportGameIds: selectedSportGames,
      };

      if (!isEditing) {
        // 새 추천 생성
        // const response = await axios.post("/api/sports/recommendations", recommendationData);
        // if (response.data && response.data.success) {
        //   setAlertMessage({ type: "success", message: "추천이 성공적으로 추가되었습니다." });
        //   fetchRecommendations();
        // } else {
        //   setAlertMessage({ type: "error", message: "추천 추가 중 오류가 발생했습니다." });
        // }

        // 개발 중이므로 성공 응답 가정
        const newRecommendation: SportRecommendation = {
          id: Date.now(), // 임시 ID
          ...formData,
          sportGames: selectedSportGames,
          position: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setRecommendations((prev) => [newRecommendation, ...prev]);
        setAlertMessage({ type: "success", message: "추천이 성공적으로 추가되었습니다." });
      } else if (currentRecommendation) {
        // 기존 추천 수정
        // const response = await axios.put(`/api/sports/recommendations/${currentRecommendation.id}`, recommendationData);
        // if (response.data && response.data.success) {
        //   setAlertMessage({ type: "success", message: "추천이 성공적으로 수정되었습니다." });
        //   fetchRecommendations();
        // } else {
        //   setAlertMessage({ type: "error", message: "추천 수정 중 오류가 발생했습니다." });
        // }

        // 개발 중이므로 성공 응답 가정
        const updatedRecommendation: SportRecommendation = {
          ...currentRecommendation,
          ...formData,
          sportGames: selectedSportGames,
          updatedAt: new Date().toISOString(),
        };
        setRecommendations((prev) =>
          prev.map((rec) => (rec.id === currentRecommendation.id ? updatedRecommendation : rec))
        );
        setAlertMessage({ type: "success", message: "추천이 성공적으로 수정되었습니다." });
      }

      handleCloseModal();
    } catch (err) {
      console.error("Error saving recommendation:", err);
      setAlertMessage({
        type: "error",
        message: !isEditing
          ? "추천 추가 중 오류가 발생했습니다."
          : "추천 수정 중 오류가 발생했습니다.",
      });
    } finally {
      setSaving(false);
    }
  };

  // 데이터 테이블 컬럼 정의
  const columns = [
    {
      header: "ID",
      accessor: "id",
      className: "w-16",
    },
    {
      header: "제목",
      accessor: "title",
    },
    {
      header: "설명",
      accessor: "description",
      cell: (value: string) => <div className="max-w-md truncate">{value || "-"}</div>,
    },
    {
      header: "경기 수",
      accessor: (rec: SportRecommendation) => {
        const games = Array.isArray(rec.sportGames) ? rec.sportGames.length : 0;
        return <span>{games} 경기</span>;
      },
      className: "w-24 text-center",
    },
    {
      header: "기간",
      accessor: (rec: SportRecommendation) => (
        <div>
          {formatDate(rec.startDate, "YYYY.MM.DD")} ~ <br />
          {formatDate(rec.endDate, "YYYY.MM.DD")}
        </div>
      ),
      className: "w-44",
    },
    {
      header: "상태",
      accessor: (rec: SportRecommendation) => {
        const now = new Date();
        const start = new Date(rec.startDate);
        const end = new Date(rec.endDate);
        let status = "";
        let colorClass = "";

        if (now < start) {
          status = "예정";
          colorClass = "bg-blue-100 text-blue-800";
        } else if (now > end) {
          status = "종료";
          colorClass = "bg-gray-100 text-gray-800";
        } else {
          status = "진행중";
          colorClass = "bg-green-100 text-green-800";
        }

        return <span className={`px-2 py-1 rounded text-xs ${colorClass}`}>{status}</span>;
      },
      className: "w-24 text-center",
    },
    {
      header: "공개",
      accessor: (rec: SportRecommendation) => (
        <span
          className={`px-2 py-1 rounded text-xs ${
            rec.isPublic ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {rec.isPublic ? "공개" : "비공개"}
        </span>
      ),
      className: "w-20 text-center",
    },
    {
      header: "등록일",
      accessor: (rec: SportRecommendation) => formatDate(rec.createdAt || "", "YYYY.MM.DD"),
      className: "w-28",
    },
    {
      header: "관리",
      accessor: (rec: SportRecommendation) => (
        <div className="flex space-x-2">
          <ActionButton type="edit" onClick={() => handleEditRecommendation(rec)} />
          <ActionButton type="delete" onClick={() => handleDeleteRecommendation(rec.id)} />
        </div>
      ),
      className: "w-24",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">스포츠 종목 추천 관리</h1>
        <p className="text-sm text-gray-600">메인 페이지에 노출될 스포츠 종목 추천을 관리합니다.</p>
      </div>

      {alertMessage && (
        <div className="mb-4">
          <Alert
            type={alertMessage.type}
            message={alertMessage.message}
            onClose={() => setAlertMessage(null)}
          />
        </div>
      )}

      {/* 작업 버튼 */}
      <div className="flex justify-end mb-4">
        <Button type="primary" onClick={handleAddRecommendation}>
          추천 추가
        </Button>
      </div>

      {/* 데이터 테이블 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          columns={columns}
          data={recommendations}
          loading={loading}
          emptyMessage="스포츠 추천 데이터가 없습니다."
          pagination={{
            currentPage: page,
            pageSize: limit,
            totalItems: total,
            onPageChange: setPage,
          }}
        />
      </div>

      {/* 추천 추가/수정 모달 */}
      <Modal
        isOpen={showModal}
        title={isEditing ? "스포츠 추천 수정" : "새 스포츠 추천 추가"}
        onClose={handleCloseModal}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
            <Input
              type="text"
              name="title"
              placeholder="추천 제목 입력"
              value={formData.title}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
            <textarea
              name="description"
              placeholder="추천 설명 입력"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
              <Input
                type="datetime-local"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
              <Input
                type="datetime-local"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">공개 여부</label>
            <select
              name="isPublic"
              value={formData.isPublic}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>공개</option>
              <option value={0}>비공개</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">
                선택된 경기 ({selectedSportGames.length})
              </label>
              <button
                type="button"
                onClick={() => setShowSportGameSelector(!showSportGameSelector)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showSportGameSelector ? "접기" : "경기 선택"}
              </button>
            </div>

            {/* 선택된 경기 목록 */}
            <div className="border border-gray-300 rounded-md p-2 max-h-48 overflow-y-auto">
              {selectedSportGameDetails.length > 0 ? (
                <div className="space-y-2">
                  {selectedSportGameDetails.map((game) => (
                    <div key={game.id} className="flex justify-between items-center border-b pb-2">
                      <div className="flex-1">
                        <div className="font-medium">{game.matchName}</div>
                        <div className="text-sm text-gray-600">
                          {game.homeTeam} vs {game.awayTeam} |{" "}
                          {formatDate(game.dateTime, "YYYY.MM.DD HH:mm")}
                        </div>
                        <div className="text-xs text-gray-500">
                          {game.league} ({game.sport})
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSportGame(game.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-center py-4">
                  선택된 경기가 없습니다. 경기를 선택해주세요.
                </div>
              )}
            </div>
          </div>

          {/* 경기 선택기 */}
          {showSportGameSelector && (
            <div className="border border-gray-300 rounded-md p-3">
              <div className="mb-3">
                <Input
                  type="text"
                  placeholder="경기 검색 (팀명, 리그, 종목 등)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="max-h-64 overflow-y-auto">
                {filteredSportGames.length > 0 ? (
                  <div className="space-y-2">
                    {filteredSportGames.map((game) => (
                      <div
                        key={game.id}
                        className={`p-2 border rounded-md cursor-pointer ${
                          selectedSportGames.includes(game.id)
                            ? "bg-blue-50 border-blue-300"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                        onClick={() => handleSportGameToggle(game)}
                      >
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedSportGames.includes(game.id)}
                            onChange={() => {}}
                            className="h-4 w-4 text-blue-600 mr-2"
                          />
                          <div className="flex-1">
                            <div className="font-medium">{game.matchName}</div>
                            <div className="text-sm">
                              {game.homeTeam} vs {game.awayTeam} |{" "}
                              {formatDate(game.dateTime, "YYYY.MM.DD HH:mm")}
                            </div>
                            <div className="text-xs text-gray-500">
                              {game.league} ({game.sport})
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-center py-4">검색 결과가 없습니다.</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Button type="secondary" onClick={handleCloseModal}>
            취소
          </Button>
          <Button type="primary" onClick={handleSaveRecommendation} disabled={saving}>
            {saving ? "저장 중..." : isEditing ? "수정" : "추가"}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default SportRecommendationsManagement;
