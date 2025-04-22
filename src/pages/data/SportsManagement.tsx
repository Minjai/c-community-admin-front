import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  const [allCategories, setAllCategories] = useState<SportCategory[]>([]);
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
    // 이 useEffect는 삭제하고 아래 fetchSportCategories 호출을 포함한 useEffect 하나로 통합합니다.
    // fetchSportCategories();
  }, []);

  const fetchSportCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    // const currentSelected = [...selectedCategoryIds]; // 페이지 변경 시 선택 초기화되므로 주석 처리

    try {
      // 페이지네이션 없이 전체 데이터 요청
      const fetchedAllCategories: SportCategory[] = await getAllSportCategoriesAdmin(); // API가 배열을 반환한다고 가정

      const processedData = fetchedAllCategories.map((category: SportCategory) => ({
        ...category,
        displayName: category.displayName || getKoreanSportName(category.sportName),
      }));
      const sortedData = processedData.sort(
        (a: SportCategory, b: SportCategory) => (a.displayOrder || 0) - (b.displayOrder || 0) // 타입 명시
      );

      // 전체 데이터를 상태에 저장
      setAllCategories(sortedData);
      setTotalItems(sortedData.length);
      setTotalPages(Math.ceil(sortedData.length / pageSize));
      setCurrentPage(1); // 데이터 로드 시 첫 페이지로
      setSelectedCategoryIds([]); // 데이터 로드 시 선택 초기화
    } catch (err: any) {
      console.error("Error fetching sport categories:", err);
      setError("스포츠 카테고리를 불러오는 중 오류가 발생했습니다.");
      setSuccess(null);
      setAllCategories([]); // 에러 시 전체 데이터 초기화
      setTotalItems(0);
      setTotalPages(0);
      setCurrentPage(1);
      setSelectedCategoryIds([]);
    } finally {
      setLoading(false);
    }
  }, [pageSize]); // pageSize 의존성 추가 (옵션)

  // 현재 페이지 데이터 계산
  const paginatedCategories = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return allCategories.slice(startIndex, endIndex);
  }, [allCategories, currentPage, pageSize]);

  useEffect(() => {
    fetchSportCategories(); // 컴포넌트 마운트 시 데이터 로드
  }, [fetchSportCategories]); // fetchSportCategories 의존성 추가

  // 페이지 변경 핸들러 수정
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page); // 현재 페이지만 업데이트
      setSelectedCategoryIds([]); // 페이지 변경 시 선택 초기화
    }
  };

  const handleAddCategory = () => {
    setModalType("add");
    setFormData({
      sportName: "",
      displayName: "",
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

      // 전체 목록에서 삭제된 항목 제거 후 상태 업데이트
      const newAllCategories = allCategories.filter((cat) => cat.id !== id);
      setAllCategories(newAllCategories);

      // 페이지네이션 상태 재계산
      const newTotalItems = newAllCategories.length;
      const newTotalPages = Math.ceil(newTotalItems / pageSize);
      setTotalItems(newTotalItems);
      setTotalPages(newTotalPages);

      // 현재 페이지 조정
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      } else if (newTotalItems === 0) {
        setCurrentPage(1);
      }

      setSelectedCategoryIds((prev) => prev.filter((catId) => catId !== id)); // 선택 해제
    } catch (err) {
      const apiError =
        (err as any)?.response?.data?.message || "스포츠 카테고리 삭제 중 오류가 발생했습니다.";
      setError(apiError);
      console.error("Error deleting sport category:", err);
      fetchSportCategories(); // 에러 시 다시 로드
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!selectedSport) {
      setError("종목 경기를 선택해주세요.");
      return;
    }
    if (!formData.displayName?.trim()) {
      setError("노출 명칭을 입력해주세요.");
      return;
    }

    // payload 생성 시 icon 제거
    const payload = {
      sportName: getEnglishSportCode(selectedSport),
      displayName: formData.displayName.trim(),
      isPublic: formData.isPublic,
      displayOrder:
        modalType === "edit" && currentCategory?.displayOrder !== undefined
          ? currentCategory.displayOrder
          : allCategories.length > 0
          ? Math.max(...allCategories.map((c) => c.displayOrder || 0)) + 1
          : 0,
    };

    // finalPayload 타입 정의에서 icon 관련 내용 제거됨 (Omit에 icon 추가 불필요)
    const finalPayload: Omit<SportCategory, "id" | "createdAt" | "updatedAt" | "icon"> = payload;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (modalType === "edit" && currentCategory) {
        // update 시 payload 타입에 icon 없으므로 Omit 불필요
        await updateSportCategory(currentCategory.id, finalPayload);
      } else {
        // create 시에도 payload 타입에 icon 없음
        await createSportCategory(finalPayload as SportCategory);
      }
      setSuccess(
        modalType === "edit"
          ? "스포츠 카테고리가 업데이트되었습니다."
          : "스포츠 카테고리가 추가되었습니다."
      );
      setShowModal(false);
      fetchSportCategories();
    } catch (err) {
      const apiError =
        (err as any)?.response?.data?.message || "스포츠 카테고리 저장 중 오류가 발생했습니다.";
      setError(apiError);
      console.error("Error saving sport category:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked ? 1 : 0 }));
    } else if (name === "isPublic") {
      setFormData((prev) => ({ ...prev, isPublic: parseInt(value, 10) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSportSelect = (sport: string) => {
    setSelectedSport(sport);
  };

  const handleMoveUp = async (index: number) => {
    const actualIndex = (currentPage - 1) * pageSize + index;
    if (actualIndex <= 0) return;

    // 순서 바꿀 대상 카테고리
    const currentCategory = allCategories[actualIndex];
    const targetCategory = allCategories[actualIndex - 1];

    // 교환될 displayOrder 값
    const currentDisplayOrder = currentCategory.displayOrder;
    const targetDisplayOrder = targetCategory.displayOrder;

    setLoading(true);
    try {
      // 개별 updateSportCategory API 호출 (Promise.all로 병렬 처리)
      await Promise.all([
        updateSportCategory(currentCategory.id, { displayOrder: targetDisplayOrder }),
        updateSportCategory(targetCategory.id, { displayOrder: currentDisplayOrder }),
      ]);

      // 상태 직접 업데이트
      const newAllCategories = [...allCategories];
      const temp = newAllCategories[actualIndex];
      newAllCategories[actualIndex] = newAllCategories[actualIndex - 1];
      newAllCategories[actualIndex - 1] = temp;
      // displayOrder 값도 실제 스왑
      newAllCategories[actualIndex].displayOrder = targetDisplayOrder;
      newAllCategories[actualIndex - 1].displayOrder = currentDisplayOrder;
      // 정렬 다시 적용 (API 응답 대신 로컬에서 정렬)
      newAllCategories.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

      setAllCategories(newAllCategories);
      setSuccess("순서가 변경되었습니다.");
      setError(null);
    } catch (err) {
      console.error("Error moving category up:", err);
      setError("순서 변경 중 오류가 발생했습니다.");
      fetchSportCategories(); // 에러 시 다시 로드
    } finally {
      setLoading(false);
    }
  };

  const handleMoveDown = async (index: number) => {
    const actualIndex = (currentPage - 1) * pageSize + index;
    if (actualIndex >= allCategories.length - 1) return;

    // 순서 바꿀 대상 카테고리
    const currentCategory = allCategories[actualIndex];
    const targetCategory = allCategories[actualIndex + 1];

    // 교환될 displayOrder 값
    const currentDisplayOrder = currentCategory.displayOrder;
    const targetDisplayOrder = targetCategory.displayOrder;

    setLoading(true);
    try {
      // 개별 updateSportCategory API 호출 (Promise.all로 병렬 처리)
      await Promise.all([
        updateSportCategory(currentCategory.id, { displayOrder: targetDisplayOrder }),
        updateSportCategory(targetCategory.id, { displayOrder: currentDisplayOrder }),
      ]);

      // 상태 직접 업데이트
      const newAllCategories = [...allCategories];
      const temp = newAllCategories[actualIndex];
      newAllCategories[actualIndex] = newAllCategories[actualIndex + 1];
      newAllCategories[actualIndex + 1] = temp;
      // displayOrder 값도 실제 스왑
      newAllCategories[actualIndex].displayOrder = targetDisplayOrder;
      newAllCategories[actualIndex + 1].displayOrder = currentDisplayOrder;
      // 정렬 다시 적용 (API 응답 대신 로컬에서 정렬)
      newAllCategories.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

      setAllCategories(newAllCategories);
      setSuccess("순서가 변경되었습니다.");
      setError(null);
    } catch (err) {
      console.error("Error moving category down:", err);
      setError("순서 변경 중 오류가 발생했습니다.");
      fetchSportCategories(); // 에러 시 다시 로드
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCategoryIds.length === 0) {
      setError("삭제할 카테고리를 선택해주세요.");
      return;
    }
    if (!confirm(`선택된 ${selectedCategoryIds.length}개의 카테고리를 정말 삭제하시겠습니까?`))
      return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      for (const id of selectedCategoryIds) {
        await deleteSportCategory(id);
      }

      setSuccess(`${selectedCategoryIds.length}개의 카테고리가 삭제되었습니다.`);

      const newAllCategories = allCategories.filter((cat) => !selectedCategoryIds.includes(cat.id));
      setAllCategories(newAllCategories);

      const newTotalItems = newAllCategories.length;
      const newTotalPages = Math.ceil(newTotalItems / pageSize);
      setTotalItems(newTotalItems);
      setTotalPages(newTotalPages);

      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      } else if (newTotalItems === 0) {
        setCurrentPage(1);
      }

      setSelectedCategoryIds([]);
    } catch (err) {
      const apiError =
        (err as any)?.response?.data?.message || "카테고리 일괄 삭제 중 오류가 발생했습니다.";
      setError(apiError);
      console.error("Error bulk deleting categories:", err);
      fetchSportCategories();
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCategory = (id: number) => {
    setSelectedCategoryIds((prevSelected) => {
      if (prevSelected.includes(id)) {
        return prevSelected.filter((catId) => catId !== id);
      } else {
        return [...prevSelected, id];
      }
    });
  };

  const handleSelectAllCategories = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const currentPageCategoryIds = paginatedCategories.map((cat) => cat.id);
      setSelectedCategoryIds(currentPageCategoryIds);
    } else {
      setSelectedCategoryIds([]);
    }
  };

  // 테이블 컬럼 정의 (useMemo 사용)
  const columns = useMemo(
    () => [
      {
        header: (
          <input
            type="checkbox"
            className="form-checkbox h-4 w-4 text-blue-600"
            onChange={handleSelectAllCategories}
            checked={
              paginatedCategories.length > 0 &&
              selectedCategoryIds.length === paginatedCategories.length &&
              paginatedCategories.every((cat) => selectedCategoryIds.includes(cat.id))
            }
            ref={(input) => {
              if (input) {
                const someSelected =
                  selectedCategoryIds.length > 0 &&
                  selectedCategoryIds.length < paginatedCategories.length &&
                  paginatedCategories.some((cat) => selectedCategoryIds.includes(cat.id));
                input.indeterminate = someSelected;
              }
            }}
            disabled={loading || paginatedCategories.length === 0}
          />
        ),
        accessor: "id" as keyof SportCategory,
        cell: (id: number) => (
          <input
            type="checkbox"
            className="form-checkbox h-4 w-4 text-blue-600"
            checked={selectedCategoryIds.includes(id)}
            onChange={() => handleSelectCategory(id)}
          />
        ),
        className: "w-px px-4",
      },
      {
        header: "표시 이름",
        accessor: "displayName" as keyof SportCategory,
        cell: (displayName: string, row: SportCategory) => (
          <button
            type="button"
            className="text-blue-600 hover:text-blue-800 hover:underline focus:outline-none"
            onClick={() => handleEditCategory(row)}
          >
            {displayName}
          </button>
        ),
      },
      {
        header: "종목 명",
        accessor: "sportName" as keyof SportCategory,
        cell: (sportName: string) => getKoreanSportName(sportName),
      },
      {
        header: "공개 여부",
        accessor: "isPublic" as keyof SportCategory,
        cell: (isPublic: number) => (
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
              isPublic === 1 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {isPublic === 1 ? "공개" : "비공개"}
          </span>
        ),
        className: "text-center",
      },
      {
        header: "생성일",
        accessor: "createdAt" as keyof SportCategory,
        cell: (date: string) => formatDate(date),
      },
      {
        header: "수정일",
        accessor: "updatedAt" as keyof SportCategory,
        cell: (date: string) => formatDate(date),
      },
      {
        header: "관리",
        accessor: "id" as keyof SportCategory,
        cell: (id: number, row: SportCategory, index: number) => (
          <div className="flex space-x-1 justify-center">
            <ActionButton
              label="위로"
              action="up"
              size="sm"
              onClick={() => handleMoveUp(index)}
              disabled={(currentPage - 1) * pageSize + index <= 0}
            />
            <ActionButton
              label="아래로"
              action="down"
              size="sm"
              onClick={() => handleMoveDown(index)}
              disabled={(currentPage - 1) * pageSize + index >= allCategories.length - 1}
            />
            <ActionButton
              label="수정"
              action="edit"
              size="sm"
              onClick={() => handleEditCategory(row)}
            />
            <ActionButton
              label="삭제"
              action="delete"
              size="sm"
              onClick={() => handleDeleteCategory(id)}
            />
          </div>
        ),
        className: "text-center",
      },
    ],
    [loading, paginatedCategories, selectedCategoryIds, currentPage, pageSize, allCategories.length]
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">스포츠 종목 관리</h1>

      {/* 알림 메시지 */}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      <LoadingOverlay isLoading={loading} />

      {/* 상단 버튼 영역 */}
      <div className="flex justify-end space-x-2 mb-4">
        <Button
          onClick={handleBulkDelete}
          variant="danger"
          disabled={selectedCategoryIds.length === 0 || loading}
        >
          {`선택 삭제 (${selectedCategoryIds.length})`}
        </Button>
        <Button onClick={handleAddCategory} disabled={loading}>
          카테고리 추가
        </Button>
      </div>

      {/* 데이터 테이블 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          columns={columns}
          data={paginatedCategories}
          loading={loading}
          emptyMessage="등록된 스포츠 카테고리가 없습니다."
          pagination={{
            currentPage: currentPage,
            pageSize: pageSize,
            totalItems: totalItems,
            onPageChange: handlePageChange,
          }}
        />
      </div>

      {/* 모달 */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalType === "add" ? "새 카테고리 추가" : "카테고리 수정"}
      >
        <div>
          {/* 1. 최상단 라인: 버튼(좌) + 공개여부 체크박스(우) */}
          <div className="flex justify-between items-center border-b pb-4 mb-4">
            {/* 왼쪽: 저장/취소 버튼 */}
            <div className="flex space-x-2">
              <Button onClick={handleSaveCategory} disabled={loading}>
                {loading ? "저장 중..." : "저장"}
              </Button>
              <Button variant="secondary" onClick={() => setShowModal(false)} disabled={loading}>
                취소
              </Button>
            </div>
            {/* 오른쪽: 공개 여부 체크박스 */}
            <div className="flex items-center">
              <input
                id="isPublicCheckbox"
                type="checkbox"
                name="isPublic"
                checked={formData.isPublic === 1}
                onChange={handleChange}
                className="form-checkbox h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                disabled={loading}
              />
              <label
                htmlFor="isPublicCheckbox"
                className="ml-2 block text-sm font-medium text-gray-700"
              >
                공개
              </label>
            </div>
          </div>

          {/* 2. 표시 이름 (기존 필드 순서 유지) */}
          <div className="mt-4">
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
              표시 이름
            </label>
            <input
              type="text"
              name="displayName"
              id="displayName"
              value={formData.displayName}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>

          {/* 3. 종목 경기 선택 (기존 필드 순서 유지) */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">종목 경기</label>
            <div className="mt-1 grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-60 overflow-y-auto p-2 border rounded-md">
              {sportOptions.map((sport) => (
                <label key={sport} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    value={sport}
                    checked={selectedSport === sport}
                    onChange={(e) => handleSportSelect(e.target.value)}
                    className="form-checkbox h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    disabled={loading}
                  />
                  <span className="ml-2 text-sm text-gray-700">{sport}</span>
                </label>
              ))}
            </div>
            {/* 에러 메시지 */}
            {!selectedSport && modalType === "add" && (
              <p className="mt-1 text-xs text-red-600">종목을 선택해주세요.</p>
            )}
          </div>

          {/* 모달 내 에러 메시지 */}
          {error && (
            <Alert type="error" message={error} onClose={() => setError(null)} className="mt-4" />
          )}
        </div>
      </Modal>
    </div>
  );
}
