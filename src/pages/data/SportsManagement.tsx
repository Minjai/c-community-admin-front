import React, { useEffect, useState, useCallback } from "react";
import {
  getAllSportCategoriesAdmin,
  createSportCategory,
  updateSportCategory,
  deleteSportCategory,
  bulkUpdateSportCategories,
} from "@/api";
import { SportCategory } from "@/types";
import Alert from "@/components/Alert";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import ActionButton from "@/components/ActionButton";
import DataTable from "@/components/DataTable";
import { formatDate } from "@/utils/dateUtils";
import LoadingOverlay from "@/components/LoadingOverlay";

// 스포츠 이름 매핑 객체 추가
const sportNameMapping: Record<string, string> = {
  // 기본 매핑 (이미 우리가 사용하는 것)
  축구: "FOOTBALL",
  테니스: "TENNIS",
  농구: "BASKETBALL",
  "미식 축구": "AMERICAN_FOOTBALL",
  하키: "HOCKEY",
  배구: "VOLLEYBALL",
  크리켓: "CRICKET",

  // 추가 매핑
  e스포츠: "ESPORTS",
  겨울스포츠: "WINTER_SPORTS",
  경마: "HORSE_RACING",
  골프: "GOLF",
  권투: "BOXING",
  넷볼: "NETBALL",
  다트: "DARTS",
  럭비: "RUGBY",
  "럭비 리그": "RUGBY_LEAGUE",
  모터스포츠: "MOTORSPORTS",
  배드민턴: "BADMINTON",
  밴디: "BANDY",
  "비치 발리볼": "BEACH_VOLLEYBALL",
  "비치 사커": "BEACH_SOCCER",
  빼시발로: "PESAPALLO",
  사이클: "CYCLING",
  수구: "WATER_POLO",
  스누커: "SNOOKER",
  야구: "BASEBALL",
  "이종 격투기": "MMA",
  카바디: "KABADDI",
  탁구: "TABLE_TENNIS",
  풋살: "FUTSAL",
  풀로어볼: "FLOORBALL",
  "필드 하키": "FIELD_HOCKEY",
  핸드볼: "HANDBALL",
  "호주식 축구": "AUSTRALIAN_FOOTBALL",
};

// 역방향 매핑 생성 (영문 코드 -> 한글 이름)
const reverseSportNameMapping: { [key: string]: string } = {};
Object.entries(sportNameMapping).forEach(([koreanName, englishCode]) => {
  reverseSportNameMapping[englishCode] = koreanName;
});

// 한글 이름을 영문 코드로 변환하는 함수
const getEnglishSportCode = (koreanName: string): string => {
  return sportNameMapping[koreanName] || koreanName;
};

// 영문 코드를 한글 이름으로 변환하는 함수
const getKoreanSportName = (englishCode: string): string => {
  return reverseSportNameMapping[englishCode] || englishCode;
};

export default function SportsManagement() {
  const [categories, setCategories] = useState<SportCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 선택된 카테고리 ID 상태 추가
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);

  // 페이지네이션 상태 추가
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0); // 초기값 0
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);

  // 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"add" | "edit">("add");
  const [currentCategory, setCurrentCategory] = useState<SportCategory | null>(null);
  const [formData, setFormData] = useState({
    sportName: "",
    displayName: "",
    icon: "",
    isPublic: 1, // 기본값 공개
  });

  // 종목 경기 편성 옵션들
  const sportOptions = [
    "e스포츠",
    "겨울스포츠",
    "경마",
    "골프",
    "권투",
    "넷볼",
    "농구",
    "다트",
    "럭비",
    "레이싱",
    "배구",
    "배드민턴",
    "밴디",
    "비치 발리볼",
    "사이클",
    "스누커",
    "수구",
    "아이스 하키",
    "야구",
    "축구",
    "테니스",
    "카바디",
    "크리켓",
    "탁구",
    "하키",
    "핸드볼",
    "호주식 축구",
  ];

  // 선택된 종목 경기
  const [selectedSport, setSelectedSport] = useState<string>("");

  useEffect(() => {
    fetchSportCategories();
  }, []);

  const fetchSportCategories = useCallback(async (page: number = 1, limit: number = 10) => {
    setLoading(true);
    setError(null);
    // const currentSelected = [...selectedCategoryIds]; // 페이지 변경 시 선택 초기화되므로 주석 처리

    try {
      // 페이지네이션 없이 전체 데이터 요청
      const allCategories: SportCategory[] = await getAllSportCategoriesAdmin(); // API가 배열을 반환한다고 가정

      const processedData = allCategories.map((category: SportCategory) => ({
        ...category,
        displayName: category.displayName || getKoreanSportName(category.sportName),
      }));
      const sortedData = processedData.sort(
        (a: SportCategory, b: SportCategory) => (a.displayOrder || 0) - (b.displayOrder || 0) // 타입 명시
      );

      // 클라이언트 측 페이지네이션 처리
      const total = sortedData.length;
      const pages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedData = sortedData.slice(startIndex, endIndex);

      setCategories(paginatedData);
      setTotalItems(total);
      setTotalPages(pages);
      setCurrentPage(page);
      setPageSize(limit);
      setSelectedCategoryIds([]); // 페이지 변경 시 선택 상태 초기화
    } catch (err: any) {
      console.error("Error fetching sport categories:", err);
      setError("스포츠 카테고리를 불러오는 중 오류가 발생했습니다.");
      setSuccess(null);
      setCategories([]);
      setTotalItems(0);
      setTotalPages(0);
      setCurrentPage(1);
      setPageSize(limit);
      setSelectedCategoryIds([]);
    } finally {
      setLoading(false);
    }
  }, []); // pageSize는 변경될 수 있으므로 의존성 배열에서 제거 (또는 필요시 추가)

  useEffect(() => {
    fetchSportCategories(); // 첫 페이지 로드
  }, []);

  // 페이지 변경 핸들러 추가
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      fetchSportCategories(page, pageSize);
    }
  };

  const handleAddCategory = () => {
    setModalType("add");
    setFormData({
      sportName: "",
      displayName: "",
      icon: "",
      isPublic: 1,
    });
    setSelectedSport("");
    setShowModal(true);
  };

  const handleEditCategory = (category: SportCategory) => {
    setModalType("edit");
    setCurrentCategory(category);
    setFormData({
      sportName: category.displayName || getKoreanSportName(category.sportName),
      displayName: category.displayName || getKoreanSportName(category.sportName),
      icon: category.icon || "",
      isPublic: category.isPublic,
    });
    setSelectedSport(getKoreanSportName(category.sportName));
    setShowModal(true);
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    setLoading(true);
    setError(null);
    setSuccess(null); // Clear previous success message

    try {
      await deleteSportCategory(id);
      setSuccess("스포츠 카테고리가 삭제되었습니다.");
      // Remove deleted ID from selection state
      setSelectedCategoryIds((prev) => prev.filter((catId) => catId !== id));
      fetchSportCategories(); // Reload list after successful deletion
    } catch (err) {
      const apiError =
        (err as any)?.response?.data?.message || "스포츠 카테고리 삭제 중 오류가 발생했습니다.";
      setError(apiError);
      console.error("Error deleting sport category:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!selectedSport) {
      setError("종목 경기를 선택해주세요.");
      return;
    }

    // Check if the custom display name is entered
    if (!formData.sportName.trim()) {
      setError("스포츠 종목명을 입력해주세요."); // Or perhaps a more specific name like "표시 이름"
      return;
    }

    setLoading(true);
    setError(null); // Clear modal error before saving
    setSuccess(null); // Clear success message before saving

    try {
      if (modalType === "add") {
        await createSportCategory({
          // sportName still uses the English code from the selection
          sportName: getEnglishSportCode(selectedSport),
          // displayName now uses the value from the text input
          displayName: formData.sportName.trim(),
          isPublic: formData.isPublic,
          icon: formData.icon, // Assuming icon is handled if needed
          displayOrder:
            categories.length > 0 ? Math.max(...categories.map((c) => c.displayOrder || 0)) + 1 : 1,
        });

        setSuccess("새 스포츠 카테고리가 추가되었습니다.");
        setShowModal(false);
        fetchSportCategories();
      } else if (currentCategory) {
        await updateSportCategory(currentCategory.id, {
          // sportName still uses the English code from the selection
          sportName: getEnglishSportCode(selectedSport),
          // displayName now uses the value from the text input
          displayName: formData.sportName.trim(),
          isPublic: formData.isPublic,
          icon: formData.icon, // Assuming icon is handled if needed
          // displayOrder is handled by move up/down functions, not typically in edit save
        });

        setSuccess("스포츠 카테고리가 업데이트되었습니다.");
        setShowModal(false);
        fetchSportCategories();
      }
    } catch (err) {
      setError(
        modalType === "add" ? "카테고리 추가에 실패했습니다." : "카테고리 수정에 실패했습니다."
      );
      console.error("Error saving sport category:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;

    // Special handling for radio buttons based on name
    if (name === "isPublicModal") {
      setFormData((prev) => ({
        ...prev,
        isPublic: parseInt(value),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSportSelect = (sport: string) => {
    setSelectedSport(sport);
  };

  // 순서 변경 - 위로 이동
  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;

    const newCategories = [...categories];

    // 현재 카테고리와 위의 카테고리
    const currentCategory = newCategories[index];
    const targetCategory = newCategories[index - 1];

    // displayOrder 값 교환
    const currentDisplayOrder = currentCategory.displayOrder;
    const targetDisplayOrder = targetCategory.displayOrder;

    // displayOrder 값 교환
    currentCategory.displayOrder = targetDisplayOrder;
    targetCategory.displayOrder = currentDisplayOrder;

    // 배열 내 위치 교환
    newCategories[index] = targetCategory;
    newCategories[index - 1] = currentCategory;

    try {
      // 로컬 상태 먼저 업데이트
      setCategories(newCategories);

      // API를 통해 카테고리 업데이트
      await updateSportCategory(currentCategory.id, {
        displayOrder: currentCategory.displayOrder,
      });

      await updateSportCategory(targetCategory.id, {
        displayOrder: targetCategory.displayOrder,
      });

      // 변경 성공 메시지
      setSuccess("카테고리 순서가 변경되었습니다.");

      // 서버에서 최신 데이터 다시 불러오기
      fetchSportCategories();
    } catch (err) {
      console.error("Error updating category order:", err);
      setError("카테고리 순서 변경 중 오류가 발생했습니다.");
      // 오류 발생 시 원래 순서로 복구
      fetchSportCategories();
    }
  };

  // 순서 변경 - 아래로 이동
  const handleMoveDown = async (index: number) => {
    if (index >= categories.length - 1) return;

    const newCategories = [...categories];

    // 현재 카테고리와 아래 카테고리
    const currentCategory = newCategories[index];
    const targetCategory = newCategories[index + 1];

    // displayOrder 값 교환
    const currentDisplayOrder = currentCategory.displayOrder;
    const targetDisplayOrder = targetCategory.displayOrder;

    // displayOrder 값 교환
    currentCategory.displayOrder = targetDisplayOrder;
    targetCategory.displayOrder = currentDisplayOrder;

    // 배열 내 위치 교환
    newCategories[index] = targetCategory;
    newCategories[index + 1] = currentCategory;

    try {
      // 로컬 상태 먼저 업데이트
      setCategories(newCategories);

      // API를 통해 카테고리 업데이트
      await updateSportCategory(currentCategory.id, {
        displayOrder: currentCategory.displayOrder,
      });

      await updateSportCategory(targetCategory.id, {
        displayOrder: targetCategory.displayOrder,
      });

      // 변경 성공 메시지
      setSuccess("카테고리 순서가 변경되었습니다.");

      // 서버에서 최신 데이터 다시 불러오기
      fetchSportCategories();
    } catch (err) {
      console.error("Error updating category order:", err);
      setError("카테고리 순서 변경 중 오류가 발생했습니다.");
      // 오류 발생 시 원래 순서로 복구
      fetchSportCategories();
    }
  };

  // 일괄 삭제 핸들러 추가
  const handleBulkDelete = async () => {
    if (selectedCategoryIds.length === 0) {
      setError("삭제할 종목을 선택해주세요."); // Use setError for user feedback
      return;
    }
    if (!confirm(`선택된 ${selectedCategoryIds.length}개의 종목을 정말 삭제하시겠습니까?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const deletePromises = selectedCategoryIds.map((id) => deleteSportCategory(id));
      const results = await Promise.allSettled(deletePromises);

      const failedDeletes = results.filter((result) => result.status === "rejected");

      if (failedDeletes.length > 0) {
        console.error("일부 종목 삭제 실패:", failedDeletes);
        setError(`일부 종목 삭제에 실패했습니다. (${failedDeletes.length}개)`);
        setSuccess(null);
      } else {
        setSuccess(`${selectedCategoryIds.length}개의 종목이 삭제되었습니다.`);
        setError(null);
      }
      setSelectedCategoryIds([]); // Clear selection regardless of partial failure
      fetchSportCategories(); // Reload list
    } catch (err) {
      console.error("Error during bulk delete:", err);
      setError("일괄 삭제 중 오류가 발생했습니다.");
      setSuccess(null);
      // Attempt to refresh and clear selection even on general error
      setSelectedCategoryIds([]);
      fetchSportCategories();
    } finally {
      setLoading(false);
    }
  };

  // 개별 선택 핸들러 추가
  const handleSelectCategory = (id: number) => {
    setSelectedCategoryIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((catId) => catId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // 전체 선택 핸들러 추가
  const handleSelectAllCategories = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedCategoryIds(categories.map((cat) => cat.id));
    } else {
      setSelectedCategoryIds([]);
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
          onChange={handleSelectAllCategories}
          checked={categories.length > 0 && selectedCategoryIds.length === categories.length}
          ref={(input) => {
            if (input) {
              input.indeterminate =
                selectedCategoryIds.length > 0 && selectedCategoryIds.length < categories.length;
            }
          }}
          disabled={loading || categories.length === 0}
        />
      ),
      accessor: "id" as keyof SportCategory,
      cell: (id: number) => (
        <input
          type="checkbox"
          className="form-checkbox h-4 w-4 text-blue-600"
          checked={selectedCategoryIds.includes(id)}
          onChange={() => handleSelectCategory(id)}
          disabled={loading}
        />
      ),
      className: "w-px px-4",
    },
    {
      header: "종목명", // Original sport name (mapped to Korean)
      accessor: "sportName" as keyof SportCategory,
      cell: (value: string, row: SportCategory) => {
        const koreanSportName = getKoreanSportName(value);
        return (
          <span
            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer block max-w-xs truncate"
            onClick={() => handleEditCategory(row)}
            title={koreanSportName}
          >
            {koreanSportName}
          </span>
        );
      },
    },
    {
      header: "표시 이름", // User-defined display name
      accessor: "displayName" as keyof SportCategory,
      // Display the value directly, fallback handled in fetch
      cell: (value: string, row: SportCategory) => value || getKoreanSportName(row.sportName),
    },
    {
      header: "공개 여부", // Consistent header name
      accessor: "isPublic" as keyof SportCategory,
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
      header: "등록일자", // Consistent header name
      accessor: "createdAt" as keyof SportCategory,
      cell: (value: string) => formatDate(value),
    },
    {
      header: "관리",
      accessor: "id" as keyof SportCategory,
      cell: (id: number, row: SportCategory, index: number) => (
        <div className="flex items-center space-x-1">
          <ActionButton
            label="위"
            action="up"
            size="sm"
            onClick={() => handleMoveUp(index)}
            disabled={index === 0 || loading}
          />
          <ActionButton
            label="아래"
            action="down"
            size="sm"
            onClick={() => handleMoveDown(index)}
            disabled={index === categories.length - 1 || loading}
          />
          <ActionButton
            label="수정"
            action="edit"
            size="sm"
            color="blue"
            onClick={() => handleEditCategory(row)}
            disabled={loading}
          />
          <ActionButton
            label="삭제"
            action="delete"
            size="sm"
            color="red"
            onClick={() => handleDeleteCategory(id)}
            disabled={loading}
          />
        </div>
      ),
    },
  ];

  return (
    // Use padding for overall spacing
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">스포츠 종목 관리</h1>

      <div className="flex justify-between items-center mb-4">
        {/* Title placeholder to push buttons right */}
        <div></div>
        <div className="flex space-x-2">
          {" "}
          {/* Button group on the right */}
          {/* 선택 삭제 버튼 추가 */}
          <Button
            variant="danger"
            onClick={handleBulkDelete}
            disabled={selectedCategoryIds.length === 0 || loading}
          >
            {`선택 삭제 (${selectedCategoryIds.length})`}
          </Button>
          <Button variant="primary" onClick={handleAddCategory} disabled={loading}>
            종목 추가
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

      {/* DataTable */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          columns={columns}
          data={categories}
          loading={false} // Disable DataTable's internal loading, using Overlay instead
          emptyMessage="등록된 스포츠 종목이 없습니다."
          pagination={{
            currentPage: currentPage,
            pageSize: pageSize,
            totalItems: totalItems,
            onPageChange: handlePageChange,
          }}
        />
      </div>

      {/* Modal for Add/Edit */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalType === "add" ? "새 스포츠 종목 추가" : "스포츠 종목 수정"}
      >
        {/* Modal Content */}
        <div className="space-y-4">
          {/* Modal Error Alert */}
          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          {/* Form fields ... */}
          <div>
            <label htmlFor="sportSelect" className="label">
              종목 경기 선택
            </label>
            <select
              id="sportSelect"
              value={selectedSport}
              onChange={(e) => handleSportSelect(e.target.value)}
              className="input"
              disabled={loading}
            >
              <option value="" disabled>
                -- 종목 선택 --
              </option>
              {sportOptions.map((sport) => (
                <option key={sport} value={sport}>
                  {sport}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="sportName" className="label">
              스포츠 종목명 (표시 이름)
            </label>
            <input
              type="text"
              id="sportName"
              name="sportName"
              value={formData.sportName}
              onChange={handleChange}
              className="input"
              placeholder="예: 축구, 농구"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="iconUrl" className="label">
              아이콘 URL (선택 사항)
            </label>
            <input
              type="text"
              id="iconUrl"
              name="icon"
              value={formData.icon}
              onChange={handleChange}
              className="input"
              placeholder="http://example.com/icon.png"
              disabled={loading}
            />
          </div>

          <div>
            <label className="label">공개 여부</label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="isPublic" // Corrected name to match state/handler
                  value={1}
                  checked={formData.isPublic === 1}
                  onChange={handleChange}
                  className="form-radio"
                  disabled={loading}
                />
                <span className="ml-2">공개</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="isPublic" // Corrected name to match state/handler
                  value={0}
                  checked={formData.isPublic === 0}
                  onChange={handleChange}
                  className="form-radio"
                  disabled={loading}
                />
                <span className="ml-2">비공개</span>
              </label>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={loading}>
              취소
            </Button>
            <Button variant="primary" onClick={handleSaveCategory} disabled={loading}>
              {loading ? "저장 중..." : modalType === "add" ? "추가" : "저장"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
