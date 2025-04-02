import React, { useState, useEffect, useRef } from "react";
import axios from "@/api/axios";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import ActionButton from "@/components/ActionButton";
import Modal from "@/components/Modal";
import Input from "@/components/forms/Input";
import Alert from "@/components/Alert";
import { formatDate } from "@/utils/dateUtils";

// 카지노 게임 추천 타입 정의
interface CasinoRecommendation {
  id: number;
  title: string;
  isMainFeatured: boolean;
  games: string[];
  gameIds?: number[];
  startDate: string;
  endDate: string;
  isPublic: boolean | number;
  position: number;
  createdAt: string;
  updatedAt: string;
}

interface CasinoGame {
  id: number;
  title: string;
  // 다른 필드들...
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
  const [currentRecommendation, setCurrentRecommendation] = useState<CasinoRecommendation | null>(
    null
  );

  // 추천 게임 관련 상태
  const [title, setTitle] = useState<string>("");
  const [isMainFeatured, setIsMainFeatured] = useState<boolean>(false);
  const [availableGames, setAvailableGames] = useState<CasinoGame[]>([]);
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [selectedGameIds, setSelectedGameIds] = useState<number[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [publicSettings, setPublicSettings] = useState<"public" | "private">("public");
  const [saving, setSaving] = useState<boolean>(false);

  // 검색 필터링 상태
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredGames, setFilteredGames] = useState<CasinoGame[]>([]);

  // 게임 선택 상태 관리
  const selectedListRef = useRef<HTMLDivElement>(null);

  // 공개 설정 상태 관리
  useEffect(() => {
    setIsPublic(publicSettings === "public");
  }, [publicSettings]);

  // 게임 추천 목록 조회
  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      // 올바른 API 경로로 수정
      const response = await axios.get("/casino-recommends", {
        headers: {
          Accept: "application/json",
        },
      });

      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        // position 기준으로 정렬
        const sortedRecommendations = [...response.data.data].sort(
          (a, b) => (a.position || 0) - (b.position || 0)
        );
        setRecommendations(sortedRecommendations);
      } else {
        setRecommendations([]);
        setError("게임 추천 목록을 불러오는데 실패했습니다.");
      }
    } catch (err: any) {
      console.error("Error fetching casino recommendations:", err);

      // 인증 오류 처리
      if (err.response?.status === 401 || err.response?.status === 403 || err.isAuthError) {
        setError("인증 정보가 만료되었습니다. 다시 로그인해주세요.");

        // 3초 후 로그인 페이지로 이동
        setTimeout(() => {
          window.location.href = "/login";
        }, 3000);
        return;
      }

      setError("게임 추천 목록을 불러오는데 실패했습니다.");
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  // 가능한 게임 목록 가져오기
  const fetchAvailableGames = async () => {
    try {
      // 올바른 API 경로로 수정
      const response = await axios.get("/casino", {
        headers: {
          Accept: "application/json",
        },
      });

      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        setAvailableGames(response.data.data);
        setFilteredGames(response.data.data);
      } else {
        setAvailableGames([]);
        setFilteredGames([]);
        setError("게임 목록을 불러오는데 실패했습니다.");
      }
    } catch (err: any) {
      console.error("Error fetching available games:", err);

      // 인증 오류 처리
      if (err.response?.status === 401 || err.response?.status === 403 || err.isAuthError) {
        setError("인증 정보가 만료되었습니다. 다시 로그인해주세요.");

        // 3초 후 로그인 페이지로 이동
        setTimeout(() => {
          window.location.href = "/login";
        }, 3000);
        return;
      }

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
    setCurrentRecommendation(null);
    // 초기화
    setTitle("");
    setIsMainFeatured(false);
    setSelectedGames([]);
    setSelectedGameIds([]);

    // 현재 시각을 기본 시작 시간으로 설정
    const now = new Date();
    setStartDate(now.toISOString().substring(0, 16));

    // 기본 종료 시간: 1주일 후
    const weekLater = new Date();
    weekLater.setDate(weekLater.getDate() + 7);
    setEndDate(weekLater.toISOString().substring(0, 16));

    setIsPublic(true);
    setPublicSettings("public");
    setIsEditing(false);
    setShowModal(true);
  };

  // 게임 추천 수정 모달 열기
  const handleEditRecommendation = (recommendation: CasinoRecommendation) => {
    setCurrentRecommendation(recommendation);
    setTitle(recommendation.title || "");
    setIsMainFeatured(recommendation.isMainFeatured || false);
    setSelectedGames(recommendation.games || []);
    setSelectedGameIds(recommendation.gameIds || []);

    // 날짜 형식 변환
    if (recommendation.startDate) {
      const startDate = new Date(recommendation.startDate);
      setStartDate(startDate.toISOString().substring(0, 16));
    }

    if (recommendation.endDate) {
      const endDate = new Date(recommendation.endDate);
      setEndDate(endDate.toISOString().substring(0, 16));
    }

    setIsPublic(recommendation.isPublic === true || recommendation.isPublic === 1);
    setPublicSettings(
      recommendation.isPublic === true || recommendation.isPublic === 1 ? "public" : "private"
    );
    setIsEditing(true);
    setShowModal(true);
  };

  // 게임 추천 삭제
  const handleDeleteRecommendation = async (id: number) => {
    if (!window.confirm("정말로 이 게임 추천을 삭제하시겠습니까?")) {
      return;
    }

    try {
      // 올바른 API 경로로 수정
      await axios.delete(`/casino-recommends/${id}`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      setAlertMessage({ type: "success", message: "게임 추천이 삭제되었습니다." });
      fetchRecommendations(); // 목록 새로고침
    } catch (err: any) {
      console.error("Error deleting recommendation:", err);
      console.log("Error details:", {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
      });

      // 인증 오류 처리
      if (err.response?.status === 401 || err.response?.status === 403 || err.isAuthError) {
        setAlertMessage({
          type: "error",
          message: "로그인이 필요하거나 접근 권한이 없습니다.",
        });

        // 3초 후에 로그인 페이지로 리다이렉트
        setTimeout(() => {
          window.location.href = "/login";
        }, 3000);

        return;
      }

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
      const newPosition = recommendationAbove.position;
      const oldPosition = recommendationToMove.position;

      // FormData 사용
      const formData1 = new FormData();
      formData1.append("position", newPosition.toString());

      const formData2 = new FormData();
      formData2.append("position", oldPosition.toString());

      // 올바른 API 경로로 수정
      await axios.patch(`/casino-recommends/${recommendationToMove.id}`, formData1, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      await axios.patch(`/casino-recommends/${recommendationAbove.id}`, formData2, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setAlertMessage({ type: "success", message: "게임 추천 순서가 변경되었습니다." });
      fetchRecommendations(); // 목록 새로고침
    } catch (err: any) {
      console.error("Error moving recommendation up:", err);

      // 인증 오류 처리
      if (err.response?.status === 401 || err.response?.status === 403 || err.isAuthError) {
        setAlertMessage({
          type: "error",
          message: "로그인이 필요하거나 접근 권한이 없습니다.",
        });

        // 3초 후에 로그인 페이지로 리다이렉트
        setTimeout(() => {
          window.location.href = "/login";
        }, 3000);

        return;
      }

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
      const newPosition = recommendationBelow.position;
      const oldPosition = recommendationToMove.position;

      // FormData 사용
      const formData1 = new FormData();
      formData1.append("position", newPosition.toString());

      const formData2 = new FormData();
      formData2.append("position", oldPosition.toString());

      // 올바른 API 경로로 수정
      await axios.patch(`/casino-recommends/${recommendationToMove.id}`, formData1, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      await axios.patch(`/casino-recommends/${recommendationBelow.id}`, formData2, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setAlertMessage({ type: "success", message: "게임 추천 순서가 변경되었습니다." });
      fetchRecommendations(); // 목록 새로고침
    } catch (err: any) {
      console.error("Error moving recommendation down:", err);

      // 인증 오류 처리
      if (err.response?.status === 401 || err.response?.status === 403 || err.isAuthError) {
        setAlertMessage({
          type: "error",
          message: "로그인이 필요하거나 접근 권한이 없습니다.",
        });

        // 3초 후에 로그인 페이지로 리다이렉트
        setTimeout(() => {
          window.location.href = "/login";
        }, 3000);

        return;
      }

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
    if (!title.trim()) {
      setAlertMessage({ type: "error", message: "카테고리 타이틀을 입력해주세요." });
      return;
    }

    if (selectedGames.length === 0) {
      setAlertMessage({ type: "error", message: "하나 이상의 게임을 선택해주세요." });
      return;
    }

    if (!startDate || !endDate) {
      setAlertMessage({ type: "error", message: "노출 기간을 설정해주세요." });
      return;
    }

    try {
      setSaving(true);

      // FormData 형식으로 변경
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("startDate", startDate);
      formData.append("endDate", endDate);
      formData.append("isPublic", isPublic ? "1" : "0");

      // 각 게임 ID를 개별적으로 추가 (서버 요구사항에 따라 방식 선택)
      selectedGameIds.forEach((gameId, index) => {
        formData.append(`gameIds[${index}]`, gameId.toString());
      });

      // FormData 내용 디버깅용 로그
      console.log("FormData contents:");
      for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
      }

      if (!isEditing) {
        // 새 추천 생성
        const response = await axios.post("/casino-recommends", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        console.log("Response:", response);
        setAlertMessage({ type: "success", message: "게임 추천이 성공적으로 추가되었습니다." });
      } else if (currentRecommendation) {
        // 기존 추천 수정
        const response = await axios.put(
          `/casino-recommends/${currentRecommendation.id}`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        console.log("Response:", response);
        setAlertMessage({ type: "success", message: "게임 추천 정보가 수정되었습니다." });
      }

      // 성공 후 모달 닫기 및 목록 새로고침
      setShowModal(false);
      fetchRecommendations();
    } catch (err: any) {
      console.error("Error saving recommendation:", err);
      console.log("Error response:", err.response);
      console.log("Error details:", {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        headers: err.response?.headers,
      });

      // 인증 오류 처리
      if (err.response?.status === 401 || err.response?.status === 403 || err.isAuthError) {
        // 토큰 재확인
        const token = localStorage.getItem("token");
        console.log("Current token:", token ? "존재함" : "없음");

        setAlertMessage({
          type: "error",
          message: "로그인이 필요하거나 접근 권한이 없습니다. 다시 로그인해주세요.",
        });

        // 3초 후에 로그인 페이지로 리다이렉트 (사용자에게 메시지를 볼 시간을 줌)
        setTimeout(() => {
          window.location.href = "/login"; // React Router의 navigate 대신 직접적인 리다이렉트 사용
        }, 3000);

        return; // 인증 오류 처리 후 함수 종료
      }

      // 서버에서 응답한 에러 메시지가 있으면 표시
      const errorMessage =
        err.response?.data?.message ||
        (!isEditing
          ? "게임 추천 추가 중 오류가 발생했습니다."
          : "게임 추천 정보 수정 중 오류가 발생했습니다.");

      setAlertMessage({
        type: "error",
        message: errorMessage,
      });
    } finally {
      setSaving(false);
    }
  };

  // DataTable 컬럼 정의
  const columns = [
    {
      header: "순서",
      accessor: "position" as keyof CasinoRecommendation,
      cell: (value: any, row: CasinoRecommendation, index: number) => (
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
              disabled={index === recommendations.length - 1}
              className={`p-1 ${
                index === recommendations.length - 1
                  ? "text-gray-300"
                  : "text-blue-500 hover:text-blue-700"
              }`}
            >
              ▼
            </button>
          </div>
        </div>
      ),
    },
    {
      header: "타이틀",
      accessor: "title" as keyof CasinoRecommendation,
    },
    {
      header: "메인 노출",
      accessor: "isMainFeatured" as keyof CasinoRecommendation,
      cell: (value: boolean) => (
        <span
          className={`px-2 py-1 rounded text-xs ${
            value ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
          }`}
        >
          {value ? "노출" : "미노출"}
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
      accessor: "id" as keyof CasinoRecommendation,
      cell: (value: number, row: CasinoRecommendation) => (
        <div className="flex items-center space-x-2">
          <ActionButton
            label="수정"
            onClick={() => handleEditRecommendation(row)}
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

      {/* 게임 추천 추가/수정 모달 */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={isEditing ? "게임 추천 수정" : "새 게임 추천 추가"}
        size="xl"
      >
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
              id="isMainFeatured"
              checked={isMainFeatured}
              onChange={(e) => setIsMainFeatured(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isMainFeatured" className="ml-2 block text-sm text-gray-900">
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

          {/* 공개 여부 */}
          <div>
            <h3 className="text-lg font-medium mb-2">공개 여부</h3>
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
            <Button
              type="button"
              variant="primary"
              onClick={handleSaveRecommendation}
              disabled={saving}
            >
              {saving ? "저장 중..." : isEditing ? "수정" : "등록"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CasinoRecommendationManagement;
