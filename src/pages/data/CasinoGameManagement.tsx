import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "@/api/axios";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import ActionButton from "@/components/ActionButton";
import Modal from "@/components/Modal";
import Input from "@/components/forms/Input";
import TextEditor from "@/components/forms/TextEditor";
import FileUpload from "@/components/forms/FileUpload";
import Alert from "@/components/Alert";
import { formatDate, formatDateForDisplay } from "@/utils/dateUtils";
import { extractDataArray } from "../../api/util";
import LoadingOverlay from "@/components/LoadingOverlay";

// 카지노 게임 타입 정의
interface CasinoGame {
  id: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  isPublic: number;
  position: number;
  createdAt: string;
  updatedAt: string;
}

const CasinoGameManagement = () => {
  const [games, setGames] = useState<CasinoGame[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // 모달 관련 상태
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentGame, setCurrentGame] = useState<CasinoGame | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // 페이지네이션 상태 추가
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10); // 페이지당 항목 수
  const [totalItems, setTotalItems] = useState<number>(0); // totalItems 상태 추가

  // 게임 데이터 상태
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [isPublic, setIsPublic] = useState<number>(1);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  // 선택된 게임 ID 상태 추가
  const [selectedGameIds, setSelectedGameIds] = useState<number[]>([]);

  // 게임 목록 조회 (페이지네이션 적용)
  const fetchGames = async (page: number = currentPage, limit: number = pageSize) => {
    setLoading(true);

    try {
      const response = await axios.get("/casino", {
        params: {
          page: page,
          limit: limit,
        },
      });

      // API 응답 구조에 따라 데이터 및 페이지네이션 정보 추출
      if (response.data && response.data.success) {
        const gameData = response.data.data || [];
        const paginationData = response.data.pagination || {};

        // 서버 응답 데이터를 클라이언트 형식으로 변환
        const transformedGames = gameData.map((game: any) => {
          return {
            id: game.id,
            title: game.title,
            description: game.content || game.description || "",
            thumbnailUrl: game.imageUrl || game.thumbnailUrl || "",
            isPublic: game.isPublic === 1 || game.isPublic === true ? 1 : 0,
            position: game.displayOrder || game.position || 0,
            createdAt: game.createdAt || new Date().toISOString(),
            updatedAt: game.updatedAt || game.createdAt || new Date().toISOString(),
          };
        });

        // 게임 이름을 기준으로 오름차순 정렬 (숫자 포함 자연 정렬) - 이전 상태로 복구
        const sortedGames = [...transformedGames].sort((a, b) => {
          const titleA = a.title || "";
          const titleB = b.title || "";
          return titleA.localeCompare(titleB, undefined, { numeric: true, sensitivity: "base" });
        });

        setGames(sortedGames);

        // 페이지네이션 상태 업데이트
        setCurrentPage(paginationData.currentPage || 1);
        setTotalPages(paginationData.totalPages || 1);
        setPageSize(paginationData.pageSize || limit);
        setTotalItems(paginationData.totalItems || 0); // totalItems 상태 업데이트
      } else {
        setGames([]);
        setAlertMessage({
          type: "error",
          message: response.data.message || "게임 목록을 불러오는데 실패했습니다.",
        });
        setCurrentPage(1);
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Error fetching casino games:", err);
      setAlertMessage({ type: "error", message: "게임 목록을 불러오는데 실패했습니다." });
      setGames([]);
      setCurrentPage(1);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // 페이지 변경 핸들러 (CompanyBannerPage 기준)
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      fetchGames(page, pageSize); // pageSize 전달 추가
    }
  };

  useEffect(() => {
    fetchGames(1); // 컴포넌트 마운트 시 첫 페이지 데이터 로드
  }, []);

  // Effect to populate modal fields and open modal when editing a game
  useEffect(() => {
    // Only run when currentGame is set for editing
    if (isEditing && currentGame) {
      console.log(
        "[CasinoGameManagement useEffect] currentGame.description:",
        currentGame.description
      );
      setTitle(currentGame.title || "");
      setDescription(currentGame.description || "");
      setIsPublic(currentGame.isPublic === 1 ? 1 : 0);
      setThumbnailFile(null);
      setThumbnailPreview(currentGame.thumbnailUrl || null);

      // Reset errors
      setModalError(null);

      // Now open the modal after states are set
      setShowModal(true);
    }
  }, [currentGame, isEditing]); // Run when currentGame or isEditing changes

  // 모달 닫기
  const handleCloseModal = () => {
    setShowModal(false);
    // Reset editing state when modal closes
    setIsEditing(false);
    setCurrentGame(null); // Also clear currentGame
  };

  // 게임 추가 모달 열기
  const handleAddGame = () => {
    setIsEditing(false); // Explicitly set isEditing to false
    setCurrentGame(null); // Clear currentGame
    // Reset form fields
    setTitle("");
    setDescription("");
    setIsPublic(1);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setModalError(null);
    setShowModal(true); // Open modal directly for adding new game
  };

  // 게임 수정 모달 열기
  const handleEditGame = (game: CasinoGame) => {
    setIsEditing(true); // Indicate editing mode
    setCurrentGame(game); // Set the game data, triggering the useEffect
    // Other state settings and setShowModal(true) moved to useEffect
  };

  // 게임 삭제
  const handleDeleteGame = async (id: number) => {
    if (!window.confirm("정말로 이 게임을 삭제하시겠습니까?")) {
      return;
    }

    try {
      setLoading(true); // 로딩 시작
      await axios.delete(`/casino/${id}`);
      setAlertMessage({ type: "success", message: "게임이 삭제되었습니다." });
      fetchGames(); // 목록 새로고침
      setSelectedGameIds((prev) => prev.filter((gameId) => gameId !== id)); // 삭제된 ID를 선택 목록에서 제거
    } catch (err) {
      console.error("Error deleting game:", err);
      setAlertMessage({ type: "error", message: "게임 삭제 중 오류가 발생했습니다." });
    } finally {
      setLoading(false); // 로딩 종료
    }
  };

  // 선택된 게임 일괄 삭제
  const handleBulkDelete = async () => {
    if (selectedGameIds.length === 0) {
      setAlertMessage({ type: "info", message: "삭제할 게임을 선택해주세요." });
      return;
    }
    if (!window.confirm(`선택된 ${selectedGameIds.length}개의 게임을 정말 삭제하시겠습니까?`))
      return;

    try {
      setLoading(true); // 로딩 시작
      const deletePromises = selectedGameIds.map((id) => axios.delete(`/casino/${id}`));
      await Promise.allSettled(deletePromises);

      setAlertMessage({
        type: "success",
        message: `${selectedGameIds.length}개의 게임이 삭제되었습니다.`,
      });
      fetchGames(); // 목록 새로고침
      setSelectedGameIds([]); // 선택 초기화
    } catch (error: any) {
      console.error("게임 일괄 삭제 중 오류 발생:", error);
      setAlertMessage({
        type: "error",
        message: "게임 삭제 중 일부 오류가 발생했습니다. 목록을 확인해주세요.",
      });
      // 오류 발생 시에도 목록 새로고침 및 선택 초기화
      fetchGames();
      setSelectedGameIds([]);
    } finally {
      setLoading(false); // 로딩 종료
    }
  };

  // 개별 게임 선택/해제
  const handleSelectGame = (id: number) => {
    setSelectedGameIds((prevSelected) => {
      if (prevSelected.includes(id)) {
        return prevSelected.filter((gameId) => gameId !== id);
      } else {
        return [...prevSelected, id];
      }
    });
  };

  // 현재 페이지의 모든 게임 선택/해제
  const handleSelectAllGames = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const currentPageGameIds = games.map((game) => game.id);
      setSelectedGameIds(currentPageGameIds);
    } else {
      setSelectedGameIds([]);
    }
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

  // 게임 저장 처리
  const handleSaveGame = async () => {
    setModalError(null);

    if (!title.trim()) {
      setModalError("게임 제목을 입력해주세요.");
      return;
    }
    if (!description.trim()) {
      setModalError("게임 설명을 입력해주세요.");
      return;
    }
    if (!isEditing && !thumbnailFile) {
      setModalError("게임 썸네일 이미지를 업로드해주세요.");
      return;
    }

    setAlertMessage(null);

    try {
      setSaving(true);

      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("content", description);

      formData.append("isPublic", isPublic.toString());

      if (thumbnailFile) {
        formData.append("image", thumbnailFile);
      }

      if (!isEditing) {
        if (!thumbnailFile) {
          setModalError("새 게임에는 썸네일 이미지가 필수입니다.");
          setSaving(false);
          return;
        }
        const response = await axios.post("/casino", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (response.status === 201 || response.status === 200) {
          setAlertMessage({ type: "success", message: "게임이 성공적으로 추가되었습니다." });
          setShowModal(false);
          fetchGames();
        }
      } else if (currentGame) {
        const response = await axios.put(`/casino/${currentGame.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (response.status === 200) {
          setAlertMessage({ type: "success", message: "게임 정보가 수정되었습니다." });
          setShowModal(false);
          fetchGames();
        }
      }
    } catch (err: any) {
      console.error("Error saving game:", err);
      const errorMessage = err.response?.data?.message || "게임 저장 중 오류가 발생했습니다.";
      setModalError(errorMessage);
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

  // DataTable 컬럼 정의
  const columns = [
    // 체크박스 컬럼 추가
    {
      header: (
        <input
          type="checkbox"
          className="form-checkbox h-4 w-4 text-blue-600"
          onChange={handleSelectAllGames}
          checked={
            games.length > 0 &&
            selectedGameIds.length === games.length &&
            games.every((game) => selectedGameIds.includes(game.id))
          }
          ref={(input) => {
            if (input) {
              // 일부만 선택되었을 때 indeterminate 상태로 설정
              const someSelected =
                selectedGameIds.length > 0 &&
                selectedGameIds.length < games.length &&
                games.some((game) => selectedGameIds.includes(game.id));
              input.indeterminate = someSelected;
            }
          }}
          disabled={loading || games.length === 0} // 로딩 중이거나 데이터가 없을 때 비활성화
        />
      ),
      accessor: "id" as keyof CasinoGame,
      cell: (id: number) => (
        <input
          type="checkbox"
          className="form-checkbox h-4 w-4 text-blue-600"
          checked={selectedGameIds.includes(id)}
          onChange={() => handleSelectGame(id)}
        />
      ),
      className: "w-px px-4", // 컬럼 너비 및 패딩 조정
    },
    {
      header: "게임 제목",
      accessor: "title" as keyof CasinoGame,
      cell: (value: string, row: CasinoGame) => (
        <span
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          onClick={() => handleEditGame(row)}
        >
          {value}
        </span>
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
      header: "등록일자",
      accessor: "createdAt" as keyof CasinoGame,
      cell: (value: string) => formatDateForDisplay(value),
    },
    {
      header: "공개 여부",
      accessor: "isPublic" as keyof CasinoGame,
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
      accessor: "id" as keyof CasinoGame,
      cell: (value: number, row: CasinoGame, index: number) => (
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

  // 모달 내용 렌더링 함수
  const renderModalContent = () => {
    return (
      <div className="space-y-4">
        {modalError && (
          <div className="mb-4">
            <Alert type="error" message={modalError} onClose={() => setModalError(null)} />
          </div>
        )}

        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
          <div className="flex space-x-2">
            <Button variant="primary" onClick={handleSaveGame} disabled={saving}>
              {saving ? "저장 중..." : isEditing ? "수정" : "등록"}
            </Button>
            <Button variant="secondary" onClick={handleCloseModal} disabled={saving}>
              취소
            </Button>
          </div>

          <div className="flex items-center space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="1"
                checked={isPublic === 1}
                onChange={() => setIsPublic(1)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                disabled={saving}
              />
              <span className="ml-2 text-sm text-gray-900">공개</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="0"
                checked={isPublic === 0}
                onChange={() => setIsPublic(0)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                disabled={saving}
              />
              <span className="ml-2 text-sm text-gray-900">비공개</span>
            </label>
          </div>
        </div>

        <Input
          label="게임 제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={saving}
        />

        <FileUpload
          label="썸네일"
          onChange={handleThumbnailUpload}
          preview={true}
          value={thumbnailPreview || undefined}
          helperText="권장 크기: 150x200px, 최대 2MB"
          accept="image/jpeg, image/png"
          required={!isEditing}
          disabled={saving}
        />

        <div>
          <label className="label">게임 설명</label>
          <TextEditor content={description} setContent={setDescription} height="200px" />
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">카지노 게임 관리</h1>
        <div className="flex space-x-2">
          <Button
            onClick={handleBulkDelete}
            variant="danger"
            disabled={selectedGameIds.length === 0 || loading || saving}
          >
            {`선택 삭제 (${selectedGameIds.length})`}
          </Button>
          <Button onClick={handleAddGame} variant="primary" disabled={loading || saving}>
            게임 추가
          </Button>
        </div>
      </div>

      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
          className="mb-4"
        />
      )}

      <LoadingOverlay isLoading={loading || saving} />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          columns={columns}
          data={games}
          loading={loading}
          emptyMessage="등록된 게임이 없습니다."
          pagination={{
            currentPage: currentPage,
            pageSize: pageSize,
            totalItems: totalItems,
            onPageChange: handlePageChange,
          }}
        />
      </div>
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={isEditing ? "카지노 게임 수정" : "새 카지노 게임 추가"}
        size="xl"
      >
        {renderModalContent()}
      </Modal>
    </div>
  );
};

export default CasinoGameManagement;
