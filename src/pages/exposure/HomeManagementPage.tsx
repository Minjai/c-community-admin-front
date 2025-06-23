import React, { useState, useEffect, ReactNode } from "react";
import axios from "@/api/axios";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import Alert from "@/components/Alert";
import { formatDate } from "@/utils/dateUtils";
import LoadingOverlay from "@/components/LoadingOverlay";
import Modal from "@/components/Modal";
import Input from "@/components/forms/Input";
import SearchInput from "@/components/SearchInput";

interface HomeTemplate {
  id: number;
  name: string;
  type: "forum" | "crypto" | "sports" | "casino";
  description?: string;
}

interface CasinoCategory {
  id: number;
  title: string;
  isPublic: number;
  subCategories: {
    id: number;
    title: string;
    isPublic: number;
  }[];
}

interface HomeSection {
  id: number;
  title: string;
  isPublic: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  templateId: number;
  template: HomeTemplate;
  selectedItems: any[]; // API 응답에 따라 타입 구체화 필요
}

interface Column {
  header: string | ReactNode;
  accessor: keyof HomeSection | ((item: HomeSection) => ReactNode);
  className?: string;
  cell?: (value: any, row: HomeSection, index: number) => ReactNode;
}

const HomeManagementPage: React.FC = () => {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [templates, setTemplates] = useState<HomeTemplate[]>([]);
  const [casinoCategories, setCasinoCategories] = useState<CasinoCategory[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [currentSection, setCurrentSection] = useState<HomeSection | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState<string>("");

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);

  // 선택된 섹션 ID 상태
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const fetchSections = async (page: number = 1, limit: number = pageSize, search?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/admin/home/sections`, {
        params: {
          page,
          limit,
          ...(search && { title: search }),
        },
      });

      if (response.data) {
        setSections(response.data.sections || []);
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

  const fetchTemplates = async () => {
    try {
      const response = await axios.get("/admin/home/section-templates");
      if (response.data) {
        setTemplates(response.data);
      }
    } catch (err) {
      console.error("Error fetching templates:", err);
      setError("템플릿 목록을 불러오는데 실패했습니다.");
    }
  };

  const fetchCasinoCategories = async () => {
    try {
      const response = await axios.get("/casino-filter/categories");
      if (response.data) {
        setCasinoCategories(response.data);
      }
    } catch (err) {
      console.error("Error fetching casino categories:", err);
    }
  };

  useEffect(() => {
    fetchSections(currentPage);
    fetchTemplates();
  }, [currentPage]);

  useEffect(() => {
    if (currentSection?.template?.type === "casino") {
      fetchCasinoCategories();
    }
  }, [currentSection?.template?.type]);

  const handleSearch = (type: string, value: string) => {
    if (type === "title") {
      fetchSections(1, pageSize, value).then(() => {
        setSelectedIds(new Set());
      });
    }
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
      isPublic: 1,
      displayOrder: 0,
      createdAt: "",
      updatedAt: "",
      templateId: 0,
      template: { id: 0, name: "", type: "forum" },
      selectedItems: [],
    });
    setShowModal(true);
    setIsEditing(false);
  };

  const handleEdit = (section: HomeSection) => {
    setModalError(null);
    setCurrentSection(section);
    setShowModal(true);
    setIsEditing(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentSection(null);
    setModalError(null);
  };

  const handleSaveSection = async () => {
    if (!currentSection) return;

    setIsSaving(true);
    setModalError(null);

    try {
      const data = {
        title: currentSection.title,
        isPublic: currentSection.isPublic,
        templateId: currentSection.templateId,
        selectedItems: currentSection.template?.type === "casino" ? selectedCategoryIds : [],
      };

      let response;
      if (isEditing) {
        response = await axios.put(`/admin/home/sections/${currentSection.id}`, data);
      } else {
        response = await axios.post("/admin/home/sections", data);
      }

      if (response.data) {
        handleCloseModal();
        fetchSections(currentPage);
      } else {
        throw new Error(
          response.data?.message || `섹션 ${isEditing ? "수정" : "추가"} 중 오류가 발생했습니다.`
        );
      }
    } catch (err) {
      console.error("Error saving section:", err);
      setModalError(`섹션 ${isEditing ? "수정" : "추가"} 중 오류가 발생했습니다.`);
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
      if (response.data?.success) {
        setSelectedIds((prev) => {
          const newSelected = new Set(prev);
          newSelected.delete(id);
          return newSelected;
        });
        fetchSections(currentPage);
      } else {
        throw new Error(response.data?.message || "삭제 중 오류가 발생했습니다.");
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

  const isAllSelected = sections.length > 0 && selectedIds.size === sections.length;

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
      accessor: (item: HomeSection) => (
        <input
          type="checkbox"
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          checked={selectedIds.has(item.id)}
          onChange={() => handleSelect(item.id)}
          disabled={loading}
        />
      ),
      className: "w-[30px]",
    },
    {
      header: "제목",
      accessor: "title",
    },
    {
      header: "순서",
      accessor: "displayOrder",
    },
    {
      header: "공개여부",
      accessor: "isPublic",
      cell: (value: number) => (value === 1 ? "공개" : "비공개"),
    },
    {
      header: "등록일시",
      accessor: "createdAt",
      cell: (value: string) => formatDate(value),
    },
    {
      header: "관리",
      accessor: (item: HomeSection) => (
        <div className="flex gap-2">
          <Button onClick={() => handleEdit(item)} className="px-2 py-1 text-sm">
            수정
          </Button>
          <Button
            onClick={() => handleDelete(item.id)}
            className="px-2 py-1 text-sm bg-red-500 hover:bg-red-600"
          >
            삭제
          </Button>
        </div>
      ),
    },
  ];

  const renderTemplateSelectionUI = () => {
    if (!currentSection) return null;

    switch (currentSection.template?.type) {
      case "casino":
        return (
          <div className="space-y-4">
            <h4 className="font-medium">카테고리 선택</h4>
            <div className="max-h-[400px] overflow-y-auto">
              {casinoCategories.map((category) => (
                <div key={category.id} className="mb-4">
                  <div className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id={`category-${category.id}`}
                      checked={selectedCategoryIds.includes(category.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCategoryIds([...selectedCategoryIds, category.id]);
                        } else {
                          setSelectedCategoryIds(
                            selectedCategoryIds.filter((id) => id !== category.id)
                          );
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`category-${category.id}`} className="ml-2 font-medium">
                      {category.title}
                    </label>
                  </div>
                  <div className="ml-6 space-y-2">
                    {category.subCategories.map((sub) => (
                      <div key={sub.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`sub-${sub.id}`}
                          checked={selectedCategoryIds.includes(sub.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategoryIds([...selectedCategoryIds, sub.id]);
                            } else {
                              setSelectedCategoryIds(
                                selectedCategoryIds.filter((id) => id !== sub.id)
                              );
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`sub-${sub.id}`} className="ml-2">
                          {sub.title}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "sports":
        // 스포츠 카테고리 선택 UI 구현 필요
        return <div>스포츠 카테고리 선택 UI</div>;

      default:
        return null;
    }
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
          size="lg"
        >
          {modalError && (
            <div className="mb-4">
              <Alert type="error" message={modalError} onClose={() => setModalError(null)} />
            </div>
          )}

          <div className="flex justify-between items-center pt-2 pb-4 border-b border-gray-200 mb-4">
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
                checked={currentSection.isPublic === 1}
                onChange={(e) =>
                  setCurrentSection({
                    ...currentSection,
                    isPublic: e.target.checked ? 1 : 0,
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

          <div className="space-y-4">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-medium mb-4">홈 화면 템플릿</h3>
                <div className="border rounded-lg p-4 min-h-[200px]">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-2 mb-2 rounded cursor-pointer ${
                        currentSection?.templateId === template.id
                          ? "bg-blue-100"
                          : "hover:bg-gray-100"
                      }`}
                      onClick={() =>
                        setCurrentSection(
                          currentSection
                            ? { ...currentSection, templateId: template.id, template }
                            : null
                        )
                      }
                    >
                      <div className="font-medium">{template.name}</div>
                      {template.description && (
                        <div className="text-sm text-gray-600">{template.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">템플릿 설정</h3>
                <div className="border rounded-lg p-4 min-h-[200px]">
                  {renderTemplateSelectionUI()}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default HomeManagementPage;
