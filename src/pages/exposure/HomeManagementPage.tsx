import React, { useState, useEffect, ReactNode, useRef } from "react";
import axios from "@/api/axios";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import Alert from "@/components/Alert";
import { formatDate } from "@/utils/dateUtils";
import LoadingOverlay from "@/components/LoadingOverlay";
import Modal from "@/components/Modal";
import Input from "@/components/forms/Input";
import SearchInput from "@/components/SearchInput";
import ActionButton from "@/components/ActionButton";
import { getSportRecommendations } from "@/api";
import { toast } from "react-hot-toast";
import { DragManager } from "../data/components/drag/DragManager";

interface HomeTemplate {
  id: number;
  name: string;
  type: "FORUMS" | "CRYPTO_TRANSFER" | "SPORTS_MATCHES" | "CASINO_GAMES";
  description?: string;
}

interface CasinoRecommendation {
  id: number;
  title: string;
  isMainDisplay: boolean;
  games: any[];
  startDate: string;
  endDate: string;
  isPublic: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface SportRecommendation {
  id: number;
  title: string;
  description?: string;
  isPublic: number;
  displayOrder: number;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
}

interface SelectedItem {
  id: number;
  title: string;
  type: string;
}

interface HomeSection {
  id: number;
  title: string;
  type: string;
  isPublic: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  selectedItems?: SelectedItem[];
}

interface Column {
  header: string | ReactNode;
  accessor: keyof HomeSection;
  className?: string;
  cell?: (value: any, row: HomeSection, index: number) => ReactNode;
}

const HomeManagementPage: React.FC = () => {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [sectionTypes, setSectionTypes] = useState<string[]>([]);
  const [casinoRecommendations, setCasinoRecommendations] = useState<CasinoRecommendation[]>([]);
  const [sportRecommendations, setSportRecommendations] = useState<SportRecommendation[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [currentSection, setCurrentSection] = useState<HomeSection | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState<string>("");

  // 아코디언 상태 추가
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    casino: false,
    sports: false,
  });

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);

  // 선택된 섹션 ID 상태
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // 전체 선택 상태 계산
  const isAllSelected = sections.length > 0 && selectedIds.size === sections.length;

  // 드래그 앤 드롭 관리자
  const dragManagerRef = useRef<DragManager | null>(null);

  const fetchSections = async (page: number = 1, limit: number = pageSize, search?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/admin/home/sections`, {
        params: {
          page,
          limit,
          sortBy: "createdAt",
          sortOrder: "desc",
          ...(search && { title: search }),
        },
      });

      if (response.data) {
        // API 응답의 selectedItems 구조를 프론트엔드 형식으로 변환
        const transformedSections = (response.data.sections || []).map((section: any) => {
          let selectedItems: SelectedItem[] = [];

          if (section.selectedItems) {
            // items 배열이 있으면 사용, 없으면 객체의 키들을 배열로 변환
            if (section.selectedItems.items && Array.isArray(section.selectedItems.items)) {
              selectedItems = section.selectedItems.items.map((item: any) => ({
                id: item.id,
                title: item.title,
                type: item.type,
              }));
            } else if (typeof section.selectedItems === "object") {
              // 객체의 키들을 배열로 변환 (type 필드 제외)
              selectedItems = Object.keys(section.selectedItems)
                .filter((key) => key !== "type" && key !== "items")
                .map((key) => {
                  const item = section.selectedItems[key];
                  return {
                    id: item.id,
                    title: item.title,
                    type: item.type,
                  };
                });
            }
          }

          return {
            ...section,
            selectedItems,
          };
        });

        // 등록일시 기준으로 내림차순 정렬 (최신순)
        const sortedSections = transformedSections.sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA; // 내림차순 (최신이 위로)
        });

        setSections(sortedSections);
        setTotalItems(response.data.total || 0);
        setTotalPages(response.data.totalPages || 0);
        setCurrentPage(response.data.currentPage || 1);
        setSelectedIds(new Set());
      } else {
        throw new Error("섹션 목록을 불러오는데 실패했습니다.");
      }
    } catch (err: any) {
      console.error("Error fetching sections:", err);
      setError("섹션 목록을 불러오는 중 오류가 발생했습니다.");
      setSections([]);
      setTotalItems(0);
      setTotalPages(0);
      setCurrentPage(1);
      setSelectedIds(new Set());
    } finally {
      setLoading(false);
    }
  };

  const fetchSectionTypes = async () => {
    try {
      const response = await axios.get("/admin/home/section-types");
      if (response.data) {
        setSectionTypes(response.data);
      }
    } catch (err) {
      console.error("Error fetching section types:", err);
      setError("섹션 타입 목록을 불러오는데 실패했습니다.");
    }
  };

  const fetchCasinoRecommendations = async () => {
    try {
      const response = await axios.get("/casino-recommends");
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        const transformedRecommendations = response.data.data.map((item: any) => ({
          id: item.id,
          title: item.title,
          isMainDisplay: item.isMainDisplay === 1 || item.isMainDisplay === true,
          games: item.games || [],
          startDate: item.startDate || item.start_date || "",
          endDate: item.endDate || item.end_date || "",
          isPublic: item.isPublic === 1 || item.isPublic === true ? 1 : 0,
          displayOrder: item.displayOrder || item.position || 0,
          createdAt: item.createdAt || item.created_at || new Date().toISOString(),
          updatedAt:
            item.updatedAt || item.updated_at || item.createdAt || new Date().toISOString(),
        }));
        setCasinoRecommendations(transformedRecommendations);
      }
    } catch (err) {
      console.error("Error fetching casino recommendations:", err);
    }
  };

  const fetchSportRecommendations = async () => {
    try {
      const result = await getSportRecommendations({});
      if (result.data) {
        const transformedRecommendations = result.data.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description || "",
          isPublic: item.isPublic === 1 || item.isPublic === true ? 1 : 0,
          displayOrder: item.displayOrder || 0,
          startTime: item.startTime || "",
          endTime: item.endTime || "",
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString(),
        }));
        setSportRecommendations(transformedRecommendations);
      }
    } catch (err) {
      console.error("Error fetching sport recommendations:", err);
    }
  };

  useEffect(() => {
    fetchSections(currentPage);
    fetchSectionTypes();
  }, [currentPage]);

  useEffect(() => {
    if (showModal) {
      fetchCasinoRecommendations();
      fetchSportRecommendations();
    }
  }, [showModal]);

  useEffect(() => {
    if (selectedItems.length > 0) {
      dragManagerRef.current = new DragManager((from, to) => {
        const tempSelectedItems = [...selectedItems];
        const items = [...tempSelectedItems.slice(0, from), ...tempSelectedItems.slice(from + 1)];
        const newItems = [...items.slice(0, to), selectedItems[from], ...items.slice(to)];
        setSelectedItems(newItems);
      });
    }
  }, [selectedItems]);

  const handleSearch = (value: string) => {
    fetchSections(1, pageSize, value).then(() => {
      setSelectedIds(new Set());
    });
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      fetchSections(page, pageSize);
    }
  };

  const handleAdd = () => {
    setModalError(null);
    setCurrentSection({
      id: 0,
      title: "",
      type: "FORUMS",
      isPublic: true,
      displayOrder: 0,
      createdAt: "",
      updatedAt: "",
      selectedItems: [],
    });
    setSelectedItems([]);
    setShowModal(true);
    setIsEditing(false);
  };

  const handleEdit = (section: HomeSection) => {
    setModalError(null);
    setCurrentSection(section);

    // 기존 선택된 항목들을 로드
    if (section.selectedItems && section.selectedItems.length > 0) {
      setSelectedItems(section.selectedItems);
    } else {
      // API에서 데이터가 제대로 변환되지 않은 경우 기본값 설정
      setSelectedItems([]);
    }

    setShowModal(true);
    setIsEditing(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentSection(null);
    setSelectedItems([]);
    setModalError(null);
  };

  const handleSaveSection = async () => {
    if (!currentSection) return;

    try {
      if (!currentSection.title) {
        setModalError("제목은 필수 항목입니다.");
        return;
      }

      setIsSaving(true);
      setModalError(null);

      const dataToSend = {
        title: currentSection.title,
        type: getTypeFromSelectedItems() || "FORUMS",
        isPublic: currentSection.isPublic,
        selectedItems: selectedItems,
      };

      if (isEditing && currentSection.id) {
        // 수정 시: 공개로 변경하는 경우 자동으로 기존 공개 섹션을 비공개로 처리
        if (currentSection.isPublic) {
          const otherPublicSection = sections.find(
            (section) => section.id !== currentSection.id && section.isPublic
          );
          if (otherPublicSection) {
            // 기존 공개 섹션을 비공개로 변경
            try {
              await axios.put(`/admin/home/sections/${otherPublicSection.id}`, {
                ...otherPublicSection,
                isPublic: false,
              });
            } catch (err) {
              console.error("기존 공개 섹션 비공개 처리 중 오류:", err);
            }
          }
        }
        await axios.put(`/admin/home/sections/${currentSection.id}`, dataToSend);
      } else {
        // 추가 시: 새로운 섹션을 공개로 생성하는 경우 자동으로 기존 공개 섹션을 비공개로 처리
        if (currentSection.isPublic) {
          const publicSection = sections.find((section) => section.isPublic);
          if (publicSection) {
            // 기존 공개 섹션을 비공개로 변경
            try {
              await axios.put(`/admin/home/sections/${publicSection.id}`, {
                ...publicSection,
                isPublic: false,
              });
            } catch (err) {
              console.error("기존 공개 섹션 비공개 처리 중 오류:", err);
            }
          }
        }
        await axios.post("/admin/home/sections", dataToSend);
      }

      setShowModal(false);
      fetchSections(currentPage);
      toast.success(isEditing ? "섹션이 수정되었습니다." : "새 섹션이 추가되었습니다.");
    } catch (err: any) {
      console.error("Error saving section:", err);
      setModalError(err.response?.data?.message || "섹션 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const sectionToDelete = sections.find((s) => s.id === id);
    if (
      !sectionToDelete ||
      !confirm(`정말로 이 섹션을 삭제하시겠습니까?\n\n제목: ${sectionToDelete.title}`)
    ) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await axios.delete(`/admin/home/sections/${id}`);
      if (response.data?.message) {
        setSelectedIds((prev) => {
          const newSelected = new Set(prev);
          newSelected.delete(id);
          return newSelected;
        });
        fetchSections(currentPage);
      } else {
        throw new Error("삭제 중 오류가 발생했습니다.");
      }
    } catch (err) {
      console.error("Error deleting section:", err);
      setError("섹션 삭제 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    if (
      selectedIds.size === 0 ||
      !confirm(`선택된 ${selectedIds.size}개의 섹션을 정말로 삭제하시겠습니까?`)
    ) {
      return;
    }

    setIsSaving(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => axios.delete(`/admin/home/sections/${id}`))
      );
      setSelectedIds(new Set());
      fetchSections(currentPage);
    } catch (err) {
      console.error("Error deleting sections:", err);
      setError("선택된 섹션 삭제 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedIds(new Set(sections.map((section) => section.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  };

  const handleItemSelect = (item: any, type: string) => {
    const itemWithType = { ...item, type };
    const isSelected = selectedItems.some(
      (selected) => selected.id === item.id && selected.type === type
    );

    if (isSelected) {
      setSelectedItems(
        selectedItems.filter((selected) => !(selected.id === item.id && selected.type === type))
      );
    } else {
      setSelectedItems([...selectedItems, itemWithType]);
    }
  };

  const handleRemoveSelectedItem = (itemId: number, type: string) => {
    setSelectedItems(selectedItems.filter((item) => !(item.id === itemId && item.type === type)));
  };

  const toggleSection = (sectionType: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionType]: !prev[sectionType],
    }));
  };

  const getTypeFromSelectedItems = () => {
    if (selectedItems.length === 0) return null;

    // 선택된 첫 번째 항목의 타입을 반환
    return selectedItems[0].type;
  };

  const columns: Column[] = [
    {
      header: (
        <input
          type="checkbox"
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          checked={isAllSelected}
          onChange={handleSelectAll}
          disabled={loading || sections.length === 0}
        />
      ),
      accessor: "id",
      cell: (value: any, row: HomeSection) => (
        <input
          type="checkbox"
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          checked={selectedIds.has(row.id)}
          onChange={() => handleSelect(row.id)}
          disabled={loading}
        />
      ),
      className: "w-[30px]",
    },
    {
      header: "제목",
      accessor: "title",
      cell: (value: string, row: HomeSection) => (
        <div
          className="max-w-md truncate text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          title={value}
          onClick={() => handleEdit(row)}
        >
          {value}
        </div>
      ),
      className: "w-80",
    },
    {
      header: "등록일시",
      accessor: "createdAt",
      cell: (value: string) => {
        return value ? formatDate(value) : "-";
      },
    },
    {
      header: "공개여부",
      accessor: "isPublic",
      cell: (value: boolean) => (
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
      accessor: "id",
      cell: (value: any, row: HomeSection) => (
        <div className="flex space-x-1">
          <ActionButton label="수정" action="edit" size="sm" onClick={() => handleEdit(row)} />
          <ActionButton
            label="삭제"
            action="delete"
            size="sm"
            onClick={() => handleDelete(row.id)}
          />
        </div>
      ),
    },
  ];

  const renderTemplateContent = () => {
    return (
      <div className="space-y-2">
        {/* 카지노 게임 추천 */}
        <div className="border rounded-lg">
          <div
            className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
            onClick={() => toggleSection("casino")}
          >
            <div className="font-medium">카지노 게임 추천</div>
            <svg
              className={`w-5 h-5 transform transition-transform ${
                expandedSections.casino ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
          {expandedSections.casino && (
            <div className="border-t max-h-[300px] overflow-y-auto">
              {casinoRecommendations.map((recommendation) => (
                <div
                  key={`casino-${recommendation.id}`}
                  className="flex items-center p-3 border-b hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    id={`casino-${recommendation.id}`}
                    checked={selectedItems.some(
                      (item) => item.id === recommendation.id && item.type === "CASINO_GAMES"
                    )}
                    onChange={() => handleItemSelect(recommendation, "CASINO_GAMES")}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor={`casino-${recommendation.id}`}
                    className="ml-3 flex-1 cursor-pointer"
                  >
                    <div className="font-medium">{recommendation.title}</div>
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 스포츠 종목 추천 */}
        <div className="border rounded-lg">
          <div
            className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
            onClick={() => toggleSection("sports")}
          >
            <div className="font-medium">스포츠 종목 추천</div>
            <svg
              className={`w-5 h-5 transform transition-transform ${
                expandedSections.sports ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
          {expandedSections.sports && (
            <div className="border-t max-h-[300px] overflow-y-auto">
              {sportRecommendations.map((recommendation) => (
                <div
                  key={`sports-${recommendation.id}`}
                  className="flex items-center p-3 border-b hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    id={`sports-${recommendation.id}`}
                    checked={selectedItems.some(
                      (item) => item.id === recommendation.id && item.type === "SPORTS_MATCHES"
                    )}
                    onChange={() => handleItemSelect(recommendation, "SPORTS_MATCHES")}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor={`sports-${recommendation.id}`}
                    className="ml-3 flex-1 cursor-pointer"
                  >
                    <div className="font-medium">{recommendation.title}</div>
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Forums */}
        <div className="flex items-center p-3 border rounded-lg hover:bg-gray-50">
          <input
            type="checkbox"
            id="forum-item"
            checked={selectedItems.some((item) => item.type === "FORUMS")}
            onChange={() => handleItemSelect({ id: 1, title: "Forums" }, "FORUMS")}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="forum-item" className="ml-3 flex-1 cursor-pointer">
            <div className="font-medium">Forums</div>
          </label>
        </div>

        {/* Crypto Transfer */}
        <div className="flex items-center p-3 border rounded-lg hover:bg-gray-50">
          <input
            type="checkbox"
            id="crypto-item"
            checked={selectedItems.some((item) => item.type === "CRYPTO_TRANSFER")}
            onChange={() =>
              handleItemSelect({ id: 1, title: "Crypto Transfer" }, "CRYPTO_TRANSFER")
            }
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="crypto-item" className="ml-3 flex-1 cursor-pointer">
            <div className="font-medium">Crypto Transfer</div>
          </label>
        </div>
      </div>
    );
  };

  // 드래그 이벤트 핸들러
  const handleDragStart = (index: number) => {
    if (!dragManagerRef.current) return;
    dragManagerRef.current.startDrag(index);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    if (!dragManagerRef.current) return;
    dragManagerRef.current.drop(index);
  };

  const renderSelectedItems = () => {
    return (
      <div className="border rounded-lg p-4 min-h-[400px] max-h-[500px] overflow-y-auto">
        {selectedItems.length === 0 ? (
          <div className="text-center text-gray-500 py-8">선택된 항목이 없습니다.</div>
        ) : (
          <div className="space-y-2">
            {selectedItems.map((item, index) => (
              <div
                key={`${item.type}-${item.id}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded border hover:bg-gray-100"
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
                style={{ cursor: "grab" }}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-500">{index + 1}</span>
                  <div>
                    <div className="font-medium">{item.title}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveSelectedItem(item.id, item.type)}
                  className="text-red-500 hover:text-red-700 p-1"
                  disabled={isSaving}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">홈 화면 관리</h1>
        <SearchInput
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          onSearch={handleSearch}
        />
        <div className="flex space-x-2">
          <Button
            onClick={handleBulkDelete}
            variant="danger"
            disabled={selectedIds.size === 0 || loading}
          >
            {`선택 삭제 (${selectedIds.size})`}
          </Button>
          <Button onClick={handleAdd} disabled={loading}>
            홈 화면 추가
          </Button>
        </div>
      </div>

      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />
      )}

      <LoadingOverlay isLoading={loading} />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          columns={columns}
          data={sections}
          loading={loading}
          emptyMessage="등록된 섹션이 없습니다."
          pagination={{
            currentPage,
            pageSize,
            totalItems,
            onPageChange: handlePageChange,
          }}
        />
      </div>

      {currentSection && (
        <Modal
          isOpen={showModal}
          onClose={handleCloseModal}
          title={isEditing ? "홈 화면 수정" : "홈 화면 추가"}
          size="xl"
        >
          {modalError && (
            <div className="mb-4">
              <Alert type="error" message={modalError} onClose={() => setModalError(null)} />
            </div>
          )}

          <div className="flex justify-between items-center pt-2 pb-4 border-b border-gray-200 mb-6">
            <div className="flex space-x-2">
              <Button onClick={handleSaveSection} disabled={isSaving}>
                {isSaving ? "저장 중..." : isEditing ? "저장" : "추가"}
              </Button>
              <Button variant="outline" onClick={handleCloseModal} disabled={isSaving}>
                취소
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={currentSection.isPublic}
                onChange={(e) =>
                  setCurrentSection({
                    ...currentSection,
                    isPublic: e.target.checked,
                  })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isSaving}
              />
              <label htmlFor="isPublic" className="text-sm font-medium text-gray-700">
                공개 여부
              </label>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">제목</label>
              <Input
                value={currentSection.title}
                onChange={(e) =>
                  setCurrentSection({
                    ...currentSection,
                    title: e.target.value,
                  })
                }
                placeholder="제목을 입력하세요"
                disabled={isSaving}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 홈 화면 편성 */}
              <div>
                <h3 className="text-lg font-medium mb-4">홈 화면 편성</h3>
                <div className="border rounded-lg p-4 min-h-[400px] max-h-[500px] overflow-y-auto">
                  {renderTemplateContent()}
                </div>
              </div>

              {/* 선택된 홈 화면 항목 */}
              <div>
                <h3 className="text-lg font-medium mb-4">선택된 홈 화면 항목</h3>
                {renderSelectedItems()}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default HomeManagementPage;
