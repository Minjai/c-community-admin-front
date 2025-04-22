import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  getAllSportCategoriesAdmin,
  createSportCategory,
  updateSportCategory,
  deleteSportCategory,
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
  // allCategories 제거, categories는 현재 페이지 데이터만 저장
  const [categories, setCategories] = useState<SportCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);

  // 페이지네이션 상태 (서버 데이터 기반)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);

  // 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"add" | "edit">("add");
  const [currentCategory, setCurrentCategory] = useState<SportCategory | null>(null);
  // formData 타입 유지
  const [formData, setFormData] = useState({
    displayName: "",
    isPublic: 1,
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

  // fetchSportCategories: 서버 측 페이지네이션 적용
  const fetchSportCategories = useCallback(async (page: number, limit: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await getAllSportCategoriesAdmin(page, limit);
      const fetchedCategories = response.data || [];
      // pagination 타입을 any로 사용
      const pagination: any = response.pagination || {
        totalItems: 0,
        totalPages: 0,
        currentPage: page,
        pageSize: limit,
      };

      // displayName 처리
      const processedData = fetchedCategories.map((category: SportCategory) => ({
        ...category,
        displayName: category.displayName || getKoreanSportName(category.sportName),
      }));
      // 서버 정렬이 없다면 클라이언트 정렬 유지 (필요 시 서버 정렬 파라미터 추가)
      const sortedData = processedData.sort(
        (a: SportCategory, b: SportCategory) => (a.displayOrder || 0) - (b.displayOrder || 0)
      );

      setCategories(sortedData); // 현재 페이지 데이터 설정
      setTotalItems(pagination.totalItems);
      setTotalPages(pagination.totalPages);
      setCurrentPage(pagination.currentPage); // API 응답 기준으로 현재 페이지 설정
      setPageSize(pagination.pageSize);
      setSelectedCategoryIds([]); // 페이지 변경 시 선택 초기화
    } catch (err: any) {
      console.error("Error fetching sport categories:", err);
      setError("스포츠 카테고리를 불러오는 중 오류가 발생했습니다.");
      setCategories([]);
      setTotalItems(0);
      setTotalPages(0);
      setCurrentPage(1); // 에러 시 1페이지로?
      setSelectedCategoryIds([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // page, limit는 호출 시 받으므로 의존성 배열에서 제거

  // useEffect: currentPage, pageSize 변경 시 데이터 로드
  useEffect(() => {
    // 컴포넌트 마운트 시 또는 페이지/사이즈 변경 시 호출
    fetchSportCategories(currentPage, pageSize);
  }, [fetchSportCategories, currentPage, pageSize]); // currentPage, pageSize 의존성 추가

  // handlePageChange: setCurrentPage 호출 -> useEffect 트리거
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page); // 상태 변경 -> useEffect가 fetch 호출
      // setSelectedCategoryIds([]); // fetch 완료 후 초기화됨
    }
  };

  // handleAddCategory: formData 타입 유지
  const handleAddCategory = () => {
    setModalType("add");
    setFormData({
      displayName: "",
      isPublic: 1,
    });
    setSelectedSport("");
    setShowModal(true);
  };

  // handleEditCategory: formData 타입 유지
  const handleEditCategory = (category: SportCategory) => {
    setModalType("edit");
    setCurrentCategory(category);
    setFormData({
      displayName: category.displayName || getKoreanSportName(category.sportName),
      isPublic: category.isPublic,
    });
    setSelectedSport(getKoreanSportName(category.sportName));
    setShowModal(true);
  };

  // handleDeleteCategory: 삭제 후 페이지 조정 및 데이터 리프레시
  const handleDeleteCategory = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteSportCategory(id);
      setSuccess("스포츠 카테고리가 삭제되었습니다.");
      setSelectedCategoryIds((prev) => prev.filter((catId) => catId !== id));

      // 삭제 후 페이지 조정 로직 (서버 페이지네이션 기준)
      const newTotalItems = totalItems - 1;
      const newTotalPages = Math.ceil(newTotalItems / pageSize);
      // 현재 페이지에 아이템이 하나만 있었고, 그게 삭제되었으며, 첫 페이지가 아니라면 이전 페이지로
      if (categories.length === 1 && currentPage > 1 && currentPage > newTotalPages) {
        setCurrentPage(currentPage - 1); // 상태 변경 -> useEffect가 fetch 호출
      } else {
        // 그 외에는 현재 페이지 (또는 조정된 마지막 페이지) 데이터 새로고침
        // 현재 페이지가 마지막 페이지보다 크면 조정된 마지막 페이지로, 아니면 현재 페이지 유지
        const pageToFetch = Math.min(currentPage, newTotalPages || 1);
        fetchSportCategories(pageToFetch, pageSize);
      }
    } catch (err) {
      const apiError = (err as any)?.response?.data?.message || "카테고리 삭제 중 오류 발생";
      setError(apiError);
      console.error("Error deleting sport category:", err);
      fetchSportCategories(currentPage, pageSize); // 실패 시 현재 페이지 리프레시
    } finally {
      setLoading(false);
    }
  };

  // handleSaveCategory: displayOrder 계산 제거 (서버 처리 가정), 현재 페이지 리프레시
  const handleSaveCategory = async () => {
    if (!selectedSport) {
      setError("종목 경기를 선택해주세요.");
      return;
    }
    if (!formData.displayName?.trim()) {
      setError("노출 명칭을 입력해주세요.");
      return;
    }

    // payload에서 displayOrder 제거 (추가 시 서버 처리 가정)
    const payload = {
      sportName: getEnglishSportCode(selectedSport),
      displayName: formData.displayName.trim(),
      isPublic: formData.isPublic,
      ...(modalType === "edit" &&
        currentCategory?.displayOrder !== undefined && {
          displayOrder: currentCategory.displayOrder, // 수정 시에만 포함
        }),
    };
    // 타입 조정
    const finalPayload: Omit<
      SportCategory,
      "id" | "createdAt" | "updatedAt" | "icon" | "displayOrder" // displayOrder는 선택적으로 포함될 수 있음
    > & { displayOrder?: number } = payload;

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (modalType === "edit" && currentCategory) {
        await updateSportCategory(currentCategory.id, finalPayload);
      } else {
        // create 시 displayOrder 없이 전달 (서버에서 자동 할당 가정)
        await createSportCategory(finalPayload as SportCategory);
      }
      setSuccess(
        modalType === "edit"
          ? "스포츠 카테고리가 업데이트되었습니다."
          : "스포츠 카테고리가 추가되었습니다."
      );
      setShowModal(false);
      // 저장 후 현재 페이지 리프레시
      fetchSportCategories(currentPage, pageSize);
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

  // handleMoveUp/Down: 서버 API 필요 (현재는 임시 로직, 서버 API 구현 후 수정 필요)
  // 서버 페이지네이션 하에서는 순서 변경 후 현재 페이지를 리프레시해야 함
  const handleMoveUp = async (index: number) => {
    if (index <= 0 && currentPage === 1) return;
    const currentItem = categories[index]; // 현재 페이지 기준 아이템
    console.warn("handleMoveUp requires server-side displayOrder update API.");
    setLoading(true);
    try {
      // 실제 API 호출 필요: await updateDisplayOrderAPI(currentItem.id, 'up');
      // 예시: 서버에서 순서 변경 처리 후, 성공하면 현재 페이지 리프레시
      await new Promise((res) => setTimeout(res, 300)); // 임시 API 호출 흉내
      setSuccess("순서 변경 요청됨 (서버 API 구현 필요).");
      fetchSportCategories(currentPage, pageSize); // 현재 페이지 리프레시
    } catch (err) {
      const apiError = (err as any)?.response?.data?.message || "순서 변경 중 오류";
      setError(apiError);
    } finally {
      setLoading(false);
    }
  };
  const handleMoveDown = async (index: number) => {
    if (index >= categories.length - 1 && currentPage === totalPages) return;
    const currentItem = categories[index]; // 현재 페이지 기준 아이템
    console.warn("handleMoveDown requires server-side displayOrder update API.");
    setLoading(true);
    try {
      // 실제 API 호출 필요: await updateDisplayOrderAPI(currentItem.id, 'down');
      await new Promise((res) => setTimeout(res, 300)); // 임시 API 호출 흉내
      setSuccess("순서 변경 요청됨 (서버 API 구현 필요).");
      fetchSportCategories(currentPage, pageSize); // 현재 페이지 리프레시
    } catch (err) {
      const apiError = (err as any)?.response?.data?.message || "순서 변경 중 오류";
      setError(apiError);
    } finally {
      setLoading(false);
    }
  };

  // handleBulkDelete: 서버 측 페이지네이션 로직 적용
  const handleBulkDelete = async () => {
    if (
      selectedCategoryIds.length === 0 ||
      !confirm("정말 선택한 카테고리를 모두 삭제하시겠습니까?")
    )
      return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      // Bulk delete API 또는 개별 delete 반복
      for (const id of selectedCategoryIds) {
        await deleteSportCategory(id);
      }
      setSuccess(`${selectedCategoryIds.length}개의 카테고리가 삭제되었습니다.`);

      // 페이지 조정 로직 (서버 페이지네이션 기준)
      const deletedCount = selectedCategoryIds.length;
      const remainingItemsOnPage = categories.length - deletedCount;
      const newTotalItems = totalItems - deletedCount;
      const newTotalPages = Math.ceil(newTotalItems / pageSize);

      setSelectedCategoryIds([]); // 선택 초기화

      // 삭제 후 현재 페이지에 남은 아이템이 없으면 이전 페이지로 이동 (첫 페이지 제외)
      if (remainingItemsOnPage <= 0 && currentPage > 1 && currentPage > newTotalPages) {
        setCurrentPage(currentPage - 1); // 상태 변경 -> useEffect가 fetch 호출
      } else {
        // 그 외에는 현재 페이지 (또는 조정된 마지막 페이지) 데이터 새로고침
        const pageToFetch = Math.min(currentPage, newTotalPages || 1);
        fetchSportCategories(pageToFetch, pageSize);
      }
    } catch (err) {
      const apiError = (err as any)?.response?.data?.message || "선택 삭제 중 오류 발생";
      setError(apiError);
      console.error("Error bulk deleting categories:", err);
      fetchSportCategories(currentPage, pageSize); // 실패 시 현재 페이지 리프레시
    } finally {
      setLoading(false);
    }
  };

  // handleSelectCategory 함수 정의 (동일)
  const handleSelectCategory = (id: number) => {
    setSelectedCategoryIds((prevSelected) => {
      if (prevSelected.includes(id)) {
        return prevSelected.filter((catId) => catId !== id);
      } else {
        return [...prevSelected, id];
      }
    });
  };

  // handleSelectAllCategories: 현재 페이지 기준 (categories 사용)
  const handleSelectAllCategories = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const currentPageCategoryIds = categories.map((cat) => cat.id); // categories 사용
      setSelectedCategoryIds(currentPageCategoryIds);
    } else {
      setSelectedCategoryIds([]);
    }
  };

  // 테이블 컬럼 정의: 서버 페이지네이션 기준 (categories 사용)
  const columns = useMemo(
    () => [
      {
        header: (
          <input
            type="checkbox"
            className="form-checkbox h-4 w-4 text-blue-600"
            onChange={handleSelectAllCategories}
            checked={
              categories.length > 0 && // categories 사용
              selectedCategoryIds.length === categories.length &&
              categories.every((cat) => selectedCategoryIds.includes(cat.id))
            }
            ref={(input) => {
              if (input) {
                const someSelected =
                  selectedCategoryIds.length > 0 &&
                  selectedCategoryIds.length < categories.length && // categories 사용
                  categories.some((cat) => selectedCategoryIds.includes(cat.id));
                input.indeterminate = someSelected;
              }
            }}
            disabled={loading || categories.length === 0} // categories 사용
          />
        ),
        accessor: "id" as keyof SportCategory,
        // cell에서 handleSelectCategory 사용 (동일)
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
              onClick={() => handleMoveUp(index)} // index는 현재 페이지 기준
              // 서버 페이지네이션 하에서는 정확한 비활성화 어려움 (서버 API 구현 필요)
              disabled={index <= 0 && currentPage === 1}
            />
            <ActionButton
              label="아래로"
              action="down"
              size="sm"
              onClick={() => handleMoveDown(index)} // index는 현재 페이지 기준
              // 서버 페이지네이션 하에서는 정확한 비활성화 어려움 (서버 API 구현 필요)
              disabled={index >= categories.length - 1 && currentPage === totalPages}
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
    // 의존성 배열: categories, totalPages 등 서버 데이터 의존성 추가
    [loading, categories, selectedCategoryIds, currentPage, pageSize, totalPages]
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

      {/* 데이터 테이블: data={categories}, pagination props 전달 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          columns={columns}
          data={categories} // categories 전달
          loading={loading}
          emptyMessage="등록된 스포츠 카테고리가 없습니다."
          // pagination prop에 서버 데이터 및 핸들러 전달
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
