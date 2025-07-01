import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  getAllSportCategoriesAdmin,
  createSportCategory,
  updateSportCategory,
  deleteSportCategory,
  getManualRegistrationDetail,
} from "@/api";
import { SportCategory } from "@/types";
import Alert from "@/components/Alert";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import ActionButton from "@/components/ActionButton";
import DataTable from "@/components/DataTable";
import { formatDate } from "@/utils/dateUtils";
import LoadingOverlay from "@/components/LoadingOverlay";
import Input from "@/components/forms/Input";
import Select from "@/components/forms/Select";
import SearchInput from "@components/SearchInput.tsx";
import DatePicker from "@/components/forms/DatePicker";
import FileUpload from "@/components/forms/FileUpload";
import { DragManager } from "./components/drag/DragManager";
import axios from "axios";

// 스포츠 이름 매핑 객체 추가
const sportNameMapping: Record<string, string> = {
  e스포츠: "ESPORTS",
  겨울스포츠: "WINTER_SPORTS",
  경마: "HORSE_RACING",
  골프: "GOLF",
  권투: "BOXING",
  넷볼: "NETBALL",
  농구: "BASKETBALL",
  다트: "DARTS",
  럭비: "RUGBY",
  "럭비 리그": "RUGBY_LEAGUE",
  모터스포츠: "MOTORSPORTS",
  배드민턴: "BADMINTON",
  밴디: "BANDY",
  "비치 발리볼": "BEACH_VOLLEYBALL",
  "비치 사커": "BEACH_SOCCER",
  뻬사발로: "PESAPALLO",
  사이클: "CYCLING",
  수구: "WATER_POLO",
  스누커: "SNOOKER",
  야구: "BASEBALL",
  "이종 격투기": "MMA",
  카바디: "KABADDI",
  탁구: "TABLE_TENNIS",
  풋살: "FUTSAL",
  플로어볼: "FLOORBALL",
  "필드 하키": "FIELD_HOCKEY",
  핸드볼: "HANDBALL",
  "호주식 축구": "AUSTRALIAN_FOOTBALL",
  "미식 축구": "AMERICAN_FOOTBALL",
  크리켓: "CRICKET",
  축구: "FOOTBALL",
  테니스: "TENNIS",
};

// 역방향 매핑 생성 (영문 코드 -> 한글 이름)
const reverseSportNameMapping: { [key: string]: string } = {};
Object.entries(sportNameMapping).forEach(([koreanName, englishCode]) => {
  reverseSportNameMapping[englishCode] = koreanName;
});

// 한글 이름을 영문 코드로 변환하는 함수 (공백 방지)
const getEnglishSportCode = (koreanName: string): string => {
  const key = koreanName.trim();
  return sportNameMapping[key] || key;
};

// 영문 코드를 한글 이름으로 변환하는 함수 (공백 방지)
const getKoreanSportName = (englishCode: string): string => {
  const key = englishCode.trim();
  return reverseSportNameMapping[key] || key;
};

// displayOrder 최대값+1 계산 함수
const getNextDisplayOrder = (allCategories: SportCategory[]) => {
  if (!allCategories || allCategories.length === 0) return 1;
  return Math.max(...allCategories.map((cat) => cat.displayOrder || 0)) + 1;
};

// displayOrder 교환 함수
const swapDisplayOrder = async (catA: SportCategory, catB: SportCategory) => {
  const tempOrder = catA.displayOrder;
  await updateSportCategory(catA.id, { ...catA, displayOrder: catB.displayOrder });
  await updateSportCategory(catB.id, { ...catB, displayOrder: tempOrder });
};

const PAGE_SIZE = 30;

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
  displayName: string;
  selectedGames: SportGameDetail[];
  isPublic: number;
}

export default function SportsManagement() {
  // allCategories 제거, categories는 현재 페이지 데이터만 저장
  const [categories, setCategories] = useState<SportCategory[]>([]);
  const [originalCategories, setOriginalCategories] = useState<SportCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);

  // 검색 value 상태
  const [searchValue, setSearchValue] = useState<string>("");

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
    "축구",
    "야구",
    "농구",
    "미식 축구",
    "아이스 하키",
    "골프",
    "테니스",
    "크리켓",
    "럭비 유니온",
    "럭비 리그",
    "배구",
    "핸드볼",
    "복싱",
    "MMA",
    "모터 스포츠",
    "E스포츠",
    "스누커",
    "다트",
    "경마",
    "올림픽",
    "풋살",
    "탁구",
  ];

  // 선택된 종목 경기
  const [selectedSport, setSelectedSport] = useState<string>("");

  // 수동 등록 관련 상태
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState<ManualRegistrationForm>({
    displayName: "",
    selectedGames: [],
    isPublic: 1,
  });
  const [currentGameDetail, setCurrentGameDetail] = useState<SportGameDetail>({
    home: "",
    away: "",
    league: "",
    time: "",
  });
  const [gameDetailError, setGameDetailError] = useState<string | null>(null);

  // 드래그 앤 드롭 관련 상태
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleSearch = (value: string) => {
    console.log("SportsManagement: 검색 핸들러 호출됨, 검색어:", value);
    fetchSportCategories(1, PAGE_SIZE, value);
  };

  // fetchSportCategories: 서버 측 페이지네이션 적용
  const fetchSportCategories = useCallback(
    async (page: number, limit: number, searchValue: string = "") => {
      setLoading(true);
      setError(null);
      try {
        const response = await getAllSportCategoriesAdmin(page, limit, searchValue);
        console.log("Fetched categories:", response.data);
        const fetchedCategories = response.data || [];
        const pagination: any = response.pagination || {
          totalItems: 0,
          totalPages: 0,
          currentPage: page,
          pageSize: limit,
        };
        const processedData = fetchedCategories.map((category: SportCategory) => ({
          ...category,
          displayName: category.displayName || getKoreanSportName(category.sportName),
        }));
        // displayOrder 오름차순, 같으면 createdAt 내림차순
        const sortedData = processedData.sort((a: SportCategory, b: SportCategory) => {
          if ((a.displayOrder || 0) !== (b.displayOrder || 0)) {
            return (a.displayOrder || 0) - (b.displayOrder || 0);
          }
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        setCategories(sortedData);
        setOriginalCategories(sortedData.map((cat) => ({ ...cat })));
        setTotalItems(pagination.totalItems);
        setTotalPages(pagination.totalPages);
        setCurrentPage(pagination.currentPage);
        setPageSize(pagination.pageSize);
        setSelectedCategoryIds([]);
      } catch (err: any) {
        setError("스포츠 카테고리를 불러오는 중 오류가 발생했습니다.");
        setCategories([]);
        setOriginalCategories([]);
        setTotalItems(0);
        setTotalPages(0);
        setCurrentPage(1);
        setSelectedCategoryIds([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // useEffect: currentPage, pageSize 변경 시 데이터 로드
  useEffect(() => {
    // 컴포넌트 마운트 시 또는 페이지/사이즈 변경 시 호출
    fetchSportCategories(currentPage, pageSize);
  }, [fetchSportCategories, currentPage, pageSize]); // currentPage, pageSize 의존성 추가

  // handlePageChange: setCurrentPage 호출 -> useEffect 트리거 (CompanyBannerPage 기준 로직으로 직접 fetch 호출)
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      // setCurrentPage(page); // 상태 변경 -> useEffect가 fetch 호출 (이전 방식)
      fetchSportCategories(page, pageSize); // 직접 fetch 호출 (CompanyBannerPage 방식)
    }
  };

  // handleAddCategory: 새 항목 추가 시 displayOrder=1, 기존 항목 +1
  const handleAddCategory = () => {
    setModalType("add");
    setFormData({
      displayName: "",
      isPublic: 1,
    });
    setSelectedSport("");
    setShowModal(true);
  };

  // handleEditCategory: 수동 등록된 데이터인지 확인 (category가 "sport"이면 수동 등록)
  const handleEditCategory = async (category: SportCategory) => {
    // 수동 등록된 데이터인지 확인 (category가 "sport"이면 수동 등록)
    const isManualRegistration = category.category === "sport";

    if (isManualRegistration) {
      // 수동 등록된 데이터는 수동 등록 모달로 편집
      setLoading(true);
      try {
        // 서버에서 상세 데이터 가져오기
        const detailData = await getManualRegistrationDetail(category.id);

        setManualForm({
          displayName: category.displayName || "",
          selectedGames: (detailData?.games || []).map((game: any, index: number) => ({
            id: game.id || Date.now() + index,
            home: game.homeTeam || game.home || "",
            away: game.awayTeam || game.away || "",
            league: game.league || "",
            time: game.dateTime || game.time || "",
            icon: game.iconUrl || game.icon || "", // iconUrl을 icon으로 매핑
          })),
          isPublic: category.isPublic,
        });
        setCurrentCategory(category); // 편집 모드로 설정
        setShowManualModal(true);
      } catch (error: any) {
        setError(error.response?.data?.message || "상세 데이터를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    } else {
      // 일반 카테고리는 기존 모달로 편집
      setModalType("edit");
      setCurrentCategory(category);
      setFormData({
        displayName: category.displayName || getKoreanSportName(category.sportName),
        isPublic: category.isPublic,
      });
      setSelectedSport(getKoreanSportName(category.sportName));
      setShowModal(true);
    }
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

  // handleSaveCategory: 새 항목 추가 시 displayOrder=1, 기존 항목 +1
  const handleSaveCategory = async () => {
    if (!selectedSport) {
      setError("종목 경기를 선택해주세요.");
      return;
    }
    if (!formData.displayName?.trim()) {
      setError("노출 명칭을 입력해주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      let displayOrder: number;
      if (modalType === "add") {
        displayOrder = 0;
      } else {
        displayOrder = currentCategory?.displayOrder ?? 1;
      }
      const payload = {
        sportName: sportNameMapping[selectedSport.trim()] || selectedSport.trim(),
        displayName: formData.displayName.trim(),
        category: "goalserve", // 카테고리 추가는 goalserve
        isPublic: formData.isPublic,
        displayOrder,
      };
      const finalPayload: Omit<SportCategory, "id" | "createdAt" | "updatedAt" | "icon"> = payload;
      if (modalType === "edit" && currentCategory) {
        await updateSportCategory(currentCategory.id, finalPayload);
      } else {
        await createSportCategory(finalPayload as SportCategory);
      }
      setSuccess(
        modalType === "edit"
          ? "스포츠 카테고리가 업데이트되었습니다."
          : "스포츠 카테고리가 추가되었습니다."
      );
      setShowModal(false);
      fetchSportCategories(currentPage, PAGE_SIZE);
    } catch (error: any) {
      setError(error.response?.data?.message || "저장 중 오류가 발생했습니다.");
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

  // displayOrder 입력값 변경 핸들러
  const handleDisplayOrderInputChange = (index: number, newOrder: number) => {
    setCategories((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], displayOrder: newOrder };
      return updated;
    });
  };

  // displayOrder 일괄 저장 핸들러
  const handleBulkDisplayOrderSave = async () => {
    setLoading(true);
    try {
      const changed = categories.filter((cat) => {
        const original = originalCategories.find((o) => o.id === cat.id);
        return original && cat.displayOrder !== original.displayOrder;
      });
      if (changed.length === 0) {
        setLoading(false);
        return;
      }
      await Promise.all(
        changed.map((cat) => updateSportCategory(cat.id, { displayOrder: cat.displayOrder }))
      );
      fetchSportCategories(currentPage, PAGE_SIZE);
    } catch (err) {
      // do nothing
    } finally {
      setLoading(false);
    }
  };

  // 테이블 컬럼 정의: displayOrder 직접 입력, 위/아래 버튼 제거
  const columns = useMemo(
    () => [
      {
        header: (
          <input
            type="checkbox"
            className="form-checkbox h-4 w-4 text-blue-600"
            onChange={handleSelectAllCategories}
            checked={
              categories.length > 0 &&
              selectedCategoryIds.length === categories.length &&
              categories.every((cat) => selectedCategoryIds.includes(cat.id))
            }
            ref={(input) => {
              if (input) {
                const someSelected =
                  selectedCategoryIds.length > 0 &&
                  selectedCategoryIds.length < categories.length &&
                  categories.some((cat) => selectedCategoryIds.includes(cat.id));
                (input as HTMLInputElement).indeterminate = someSelected;
              }
            }}
            disabled={loading || categories.length === 0}
          />
        ),
        accessor: "id" as keyof SportCategory,
        cell: (value: unknown, row: SportCategory) => (
          <input
            type="checkbox"
            className="form-checkbox h-4 w-4 text-blue-600"
            checked={selectedCategoryIds.includes(row.id)}
            onChange={() => handleSelectCategory(row.id)}
          />
        ),
        className: "w-px px-4",
      },
      {
        header: "표시 이름",
        accessor: "displayName" as keyof SportCategory,
        cell: (value: unknown, row: SportCategory) => (
          <button
            type="button"
            className="text-blue-600 hover:text-blue-800 hover:underline focus:outline-none"
            onClick={() => handleEditCategory(row)}
          >
            {row.displayName}
          </button>
        ),
      },
      {
        header: "종목 명",
        accessor: "sportName" as keyof SportCategory,
        cell: (value: unknown) => getKoreanSportName(value as string),
      },
      {
        header: "공개 여부",
        accessor: "isPublic" as keyof SportCategory,
        cell: (value: unknown) => (
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
              value === 1 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {value === 1 ? "공개" : "비공개"}
          </span>
        ),
        className: "text-center",
      },
      {
        header: "생성일",
        accessor: "createdAt" as keyof SportCategory,
        cell: (value: unknown) => formatDate(value as string),
      },
      {
        header: "수정일",
        accessor: "updatedAt" as keyof SportCategory,
        cell: (value: unknown) => formatDate(value as string),
      },
      {
        header: "순서",
        accessor: "displayOrder" as keyof SportCategory,
        cell: (value: unknown, row: SportCategory, index: number) => (
          <input
            type="number"
            min={1}
            className="w-16 text-center border rounded"
            value={value as number}
            onChange={(e) => handleDisplayOrderInputChange(index, Number(e.target.value))}
            disabled={loading}
          />
        ),
        className: "w-20 text-center",
      },
      {
        header: "관리",
        accessor: "id" as keyof SportCategory,
        cell: (value: unknown, row: SportCategory) => (
          <div className="flex space-x-1 justify-center">
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
              onClick={() => handleDeleteCategory(row.id)}
            />
          </div>
        ),
        className: "text-center",
      },
    ],
    [loading, categories, selectedCategoryIds, currentPage, pageSize, totalPages]
  );

  // 수동 등록 모달 열기
  const handleOpenManualModal = () => {
    setShowManualModal(true);
    setManualForm({
      displayName: "",
      selectedGames: [],
      isPublic: 1,
    });
    setCurrentGameDetail({
      home: "",
      away: "",
      league: "",
      time: "",
      icon: "",
    });
    setGameDetailError(null);
    setCurrentCategory(null); // 새로 생성 모드로 초기화
  };

  // 수동 등록 모달 닫기
  const handleCloseManualModal = () => {
    setShowManualModal(false);
    setGameDetailError(null);
  };

  // 게임 상세 정보 입력 핸들러
  const handleGameDetailChange = (field: keyof SportGameDetail, value: string) => {
    setCurrentGameDetail((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 게임 상세 정보를 선택된 게임 목록에 추가하는 핸들러
  const handleAddGameDetail = () => {
    if (
      !currentGameDetail.home ||
      !currentGameDetail.away ||
      !currentGameDetail.league ||
      !currentGameDetail.time
    ) {
      setGameDetailError("모든 필드를 입력해주세요.");
      return;
    }

    // 새로운 게임 객체 생성
    const newGame = {
      id: Date.now(), // 임시 ID
      ...currentGameDetail,
      displayOrder: manualForm.selectedGames.length + 1,
    };

    // 선택된 게임 목록에 추가
    setManualForm((prev) => ({
      ...prev,
      selectedGames: [...prev.selectedGames, newGame],
    }));

    // 입력 필드 초기화
    setCurrentGameDetail({
      home: "",
      away: "",
      league: "",
      time: "",
      icon: "",
    });
    setGameDetailError(null);
  };

  // 게임 상세 정보 삭제
  const handleRemoveGameDetail = (id: number) => {
    setManualForm((prev) => ({
      ...prev,
      selectedGames: prev.selectedGames.filter((game) => game.id !== id),
    }));
  };

  // 드래그 시작
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  // 드롭
  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;

    const items = Array.from(manualForm.selectedGames);
    const [reorderedItem] = items.splice(draggedIndex, 1);
    items.splice(index, 0, reorderedItem);

    setManualForm((prev) => ({
      ...prev,
      selectedGames: items,
    }));
    setDraggedIndex(null);
  };

  // 최종 저장 핸들러
  const handleSaveManualRegistration = async () => {
    if (!manualForm.displayName) {
      setGameDetailError("표시 이름을 입력해주세요.");
      return;
    }
    if (manualForm.selectedGames.length === 0) {
      setGameDetailError("최소 한 개의 스포츠 경기를 등록해주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // 디버깅: 실제 데이터 확인
      console.log("manualForm.selectedGames:", manualForm.selectedGames);

      const categoryData = {
        displayName: manualForm.displayName,
        sportName: manualForm.displayName, // 표시이름을 스포츠 네임으로 사용
        category: "sport", // 수동 등록은 sport
        isPublic: manualForm.isPublic,
        games: manualForm.selectedGames.map((game) => {
          console.log("Processing game:", game); // 각 게임 객체 확인
          return {
            home: game.home,
            away: game.away,
            league: game.league,
            time: game.time,
            icon: game.icon || "", // 원래대로 복원
          };
        }),
      };

      console.log("Final categoryData:", categoryData); // 최종 데이터 확인

      let response;
      // 편집 모드인지 확인 (currentCategory가 있고 category가 sport이면 편집)
      if (currentCategory && currentCategory.category === "sport") {
        response = await updateSportCategory(currentCategory.id, categoryData);
      } else {
        response = await createSportCategory(categoryData);
      }

      if (response) {
        // 성공 시 모달 닫고 목록 새로고침
        handleCloseManualModal();
        fetchSportCategories(currentPage, pageSize);
        setSuccess(currentCategory ? "수동 등록이 수정되었습니다." : "수동 등록이 완료되었습니다.");
        setCurrentCategory(null); // 편집 모드 초기화
      } else {
        setError("저장 중 오류가 발생했습니다.");
      }
    } catch (error: any) {
      setError(error.response?.data?.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">스포츠 종목 관리</h1>
        <SearchInput
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          onSearch={handleSearch}
        />
        <div className="flex space-x-2">
          <Button onClick={handleOpenManualModal} disabled={loading}>
            수동 등록
          </Button>
          <Button onClick={handleBulkDisplayOrderSave} disabled={loading}>
            순서 저장
          </Button>
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
      </div>

      {/* 알림 메시지 */}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      <LoadingOverlay isLoading={loading} />

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
        size="xl"
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
                checked={Boolean(formData.isPublic === 1)}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">종목 선택</label>
            <div className="mt-1 grid grid-cols-3 sm:grid-cols-4 gap-2 p-2 border rounded-md">
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

      {/* 수동 등록 모달 */}
      <Modal
        isOpen={showManualModal}
        onClose={handleCloseManualModal}
        title={currentCategory ? "스포츠 게임 수동 등록 수정" : "스포츠 게임 수동 등록"}
        size="xl"
      >
        <div className="max-h-[80vh] overflow-y-auto space-y-6">
          {/* 1. 최상단 라인: 버튼(좌) + 공개여부 체크박스(우) */}
          <div className="flex justify-between items-center border-b pb-4">
            {/* 왼쪽: 저장/취소 버튼 */}
            <div className="flex space-x-2">
              <Button onClick={handleSaveManualRegistration} disabled={loading}>
                {loading ? "저장 중..." : "저장"}
              </Button>
              <Button variant="secondary" onClick={handleCloseManualModal} disabled={loading}>
                취소
              </Button>
            </div>
            {/* 오른쪽: 공개 여부 체크박스 */}
            <div className="flex items-center">
              <input
                id="isPublicCheckbox"
                type="checkbox"
                checked={Boolean(manualForm.isPublic === 1)}
                onChange={(e) =>
                  setManualForm((prev) => ({ ...prev, isPublic: e.target.checked ? 1 : 0 }))
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

          {/* 2. 표시 이름 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">표시 이름</label>
            <Input
              type="text"
              value={manualForm.displayName}
              onChange={(e) => setManualForm((prev) => ({ ...prev, displayName: e.target.value }))}
              placeholder="표시 이름을 입력하세요"
              disabled={loading}
            />
          </div>

          {/* 3. 선택된 스포츠 게임 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              선택된 스포츠 게임
            </label>
            <div className="border rounded-lg p-4 min-h-[100px] bg-gray-50">
              <div className="space-y-2">
                {manualForm.selectedGames.map((game, index) => (
                  <div
                    key={game.id}
                    className="flex items-center bg-white p-3 rounded border"
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDrop(index);
                    }}
                  >
                    <div className="flex items-center space-x-3 flex-1">
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
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* 텍스트 정보 */}
                      <div className="flex-1">
                        <div className="font-medium">
                          {game.home} vs {game.away}
                        </div>
                        <div className="text-sm text-gray-500">
                          {game.league} | {formatDate(game.time)}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveGameDetail(game.id!)}
                      className="ml-4 text-red-600 hover:text-red-800"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4. 스포츠 게임 상세 */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium mb-4">스포츠 게임 상세</h3>
            <div className="space-y-4">
              {/* Home */}
              <div className="flex items-center">
                <label className="block text-sm font-medium text-gray-700 w-24">Home</label>
                <div className="flex-1">
                  <Input
                    type="text"
                    value={currentGameDetail.home}
                    onChange={(e) => handleGameDetailChange("home", e.target.value)}
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
                    value={currentGameDetail.away}
                    onChange={(e) => handleGameDetailChange("away", e.target.value)}
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
                    value={currentGameDetail.league}
                    onChange={(e) => handleGameDetailChange("league", e.target.value)}
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
                    value={currentGameDetail.time}
                    onChange={(e) => handleGameDetailChange("time", e.target.value)}
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
                          handleGameDetailChange("icon", reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      } else {
                        handleGameDetailChange("icon", "");
                      }
                    }}
                    accept="image/*"
                    disabled={loading}
                    initialPreview={currentGameDetail.icon}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-center">
              <Button
                onClick={handleAddGameDetail}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white px-12 py-2.5 rounded-md w-2/3 text-lg font-medium"
              >
                스포츠 경기 등록
              </Button>
            </div>
          </div>

          {gameDetailError && (
            <Alert
              type="error"
              message={gameDetailError}
              onClose={() => setGameDetailError(null)}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}
