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

  const fetchSportCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getAllSportCategoriesAdmin();
      // 서버에서 받은 데이터의 영문 코드를 한글 이름으로 변환하여 표시
      const processedData = data.map((category) => ({
        ...category,
        displayName: category.displayName || getKoreanSportName(category.sportName),
      }));

      // displayOrder 기준으로 내림차순 정렬 (높은 값이 위에 표시)
      const sortedData = processedData.sort(
        (a, b) => (b.displayOrder || 0) - (a.displayOrder || 0)
      );
      setCategories(sortedData);
    } catch (err: any) {
      console.error("Error fetching sport categories:", err);
      setError("스포츠 카테고리를 불러오는 중 오류가 발생했습니다.");
      // 토스트 대신 성공 메시지 상태 업데이트
      setSuccess(null);
    } finally {
      setLoading(false);
    }
  }, []);

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
      sportName: getKoreanSportName(category.sportName),
      displayName: getKoreanSportName(category.sportName),
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
      // API Call
      await deleteSportCategory(id);

      // If the above line doesn't throw an error, assume success
      setSuccess("스포츠 카테고리가 삭제되었습니다.");
      fetchSportCategories(); // Reload list after successful deletion
    } catch (err) {
      // Set a more generic error or try to extract from the error object
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

    setLoading(true);
    setError(null); // Clear modal error before saving
    setSuccess(null); // Clear success message before saving

    try {
      if (modalType === "add") {
        await createSportCategory({
          ...formData,
          sportName: getEnglishSportCode(selectedSport),
          displayName: selectedSport,
          displayOrder:
            categories.length > 0 ? Math.max(...categories.map((c) => c.displayOrder)) + 1 : 1,
        });

        setSuccess("새 스포츠 카테고리가 추가되었습니다.");
        setShowModal(false);
        // 추가 후 목록 다시 불러오기
        fetchSportCategories();
      } else if (currentCategory) {
        await updateSportCategory(currentCategory.id, {
          ...formData,
          sportName: getEnglishSportCode(selectedSport),
          displayName: selectedSport,
        });

        setSuccess("스포츠 카테고리가 업데이트되었습니다.");
        setShowModal(false);
        // 수정 후 목록 다시 불러오기
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

    setFormData((prev) => ({
      ...prev,
      [name]: type === "radio" ? parseInt(value) : value,
    }));
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

  // 데이터 테이블 컬럼 정의
  const columns = [
    {
      header: "종목명",
      accessor: "sportName" as keyof SportCategory,
      cell: (value: string, row: SportCategory) => getKoreanSportName(value),
    },
    {
      header: "표시 이름",
      accessor: "displayName" as keyof SportCategory,
      cell: (value: string, row: SportCategory) => value || getKoreanSportName(row.sportName),
    },
    {
      header: "등록일자",
      accessor: "createdAt" as keyof SportCategory,
      cell: (value: string) => formatDate(value),
    },
    {
      header: "공개여부",
      accessor: "isPublic" as keyof SportCategory,
      cell: (value: number) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            value ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {value ? "공개" : "비공개"}
        </span>
      ),
    },
    {
      header: "관리",
      accessor: "id" as keyof SportCategory,
      cell: (value: number, row: SportCategory, index: number) => (
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
            disabled={index === categories.length - 1}
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
            onClick={() => handleDeleteCategory(row.id)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="mb-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">스포츠 종목 관리</h1>
        <p className="text-sm text-gray-600">
          스포츠 종목을 관리하고 공개 여부를 설정할 수 있습니다.
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
        <Button onClick={handleAddCategory}>
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
            <span>새 종목 추가</span>
          </div>
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          columns={columns}
          data={categories}
          loading={loading}
          emptyMessage="등록된 스포츠 종목이 없습니다."
        />
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalType === "add" ? "종목 추가" : "종목 수정"}
      >
        {/* Modal Error Alert (Above controls) */}
        {error && (
          <div className="mb-4">
            <Alert type="error" message={error} onClose={() => setError(null)} />
          </div>
        )}

        {/* Top Control Area */}
        <div className="flex justify-between items-center pt-2 pb-4 border-b border-gray-200 mb-4">
          {/* Buttons (Left) */}
          <div className="flex space-x-2">
            <Button variant="primary" onClick={handleSaveCategory}>
              {modalType === "add" ? "등록" : "저장"}
            </Button>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              취소
            </Button>
          </div>
          {/* Public Toggle (Right) */}
          <div className="flex space-x-5">
            <div className="flex items-center">
              <input
                type="radio"
                id="visibility-public-modal"
                name="isPublicModal"
                value="1"
                checked={formData.isPublic === 1}
                onChange={handleChange} // Assuming handleChange handles radio correctly by name
                className="form-radio h-4 w-4 text-blue-600"
              />
              <label htmlFor="visibility-public-modal" className="ml-2 text-sm">
                공개
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="radio"
                id="visibility-private-modal"
                name="isPublicModal"
                value="0"
                checked={formData.isPublic === 0}
                onChange={handleChange} // Assuming handleChange handles radio correctly by name
                className="form-radio h-4 w-4 text-blue-600"
              />
              <label htmlFor="visibility-private-modal" className="ml-2 text-sm">
                비공개
              </label>
            </div>
          </div>
        </div>

        {/* Form content */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">스포츠 종목명</label>
            <input
              type="text"
              name="sportName"
              value={formData.sportName}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="종목명 입력"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">종목 경기 편성</label>
            <div className="grid grid-cols-4 gap-3">
              {sportOptions.map((sport) => (
                <div key={sport} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`sport-${sport}`}
                    checked={selectedSport === sport}
                    onChange={() => handleSportSelect(sport)}
                    className="form-checkbox h-4 w-4 text-blue-600 mr-2"
                  />
                  <label htmlFor={`sport-${sport}`} className="text-sm">
                    {sport}
                  </label>
                </div>
              ))}
              <div className="col-span-4 text-xs text-gray-500 mt-1">※ flashscore 기준 종목</div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
