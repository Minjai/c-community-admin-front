import React, { useState, useEffect, useRef } from "react";
import DataTable from "../../components/DataTable";
import Button from "../../components/Button";
import ActionButton from "../../components/ActionButton";
import Modal from "../../components/Modal";
import Input from "../../components/forms/Input";
import Select from "../../components/forms/Select";
import DatePicker from "../../components/forms/DatePicker";
import Alert from "../../components/Alert";
import SearchInput from "../../components/SearchInput";
import { formatDate } from "../../utils/dateUtils";
import LoadingOverlay from "../../components/LoadingOverlay";
import axios from "../../api/axios";
import { CasinoCompany } from "../../types";
import { DragManager } from "../data/components/drag/DragManager";

interface CasinoFilterCategory {
  id: number;
  title: string;
  isPublic: number;
  startDate: string;
  endDate: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  subCategories?: CasinoFilterSubCategory[];
  _count?: {
    subCategories: number;
  };
}

interface CasinoFilterSubCategory {
  id: number;
  categoryId: number;
  title: string;
  isPublic: number;
  startDate: string;
  endDate: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: number;
    title: string;
  };
}

const PAGE_SIZE = 30;

const CasinoFilterPage: React.FC = () => {
  const [categories, setCategories] = useState<CasinoFilterCategory[]>([]);
  const [originalCategories, setOriginalCategories] = useState<CasinoFilterCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [currentCategory, setCurrentCategory] = useState<Partial<CasinoFilterCategory> | null>(
    null
  );
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState<string>("");

  // 선택된 대분류 ID 상태
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);

  // 선택된 소분류 ID 상태
  const [selectedSubCategoryIds, setSelectedSubCategoryIds] = useState<number[]>([]);

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE);
  const [totalItems, setTotalItems] = useState<number>(0);

  // 소분류 모달 상태
  const [showSubCategoryModal, setShowSubCategoryModal] = useState<boolean>(false);
  const [currentSubCategory, setCurrentSubCategory] =
    useState<Partial<CasinoFilterSubCategory> | null>(null);
  const [parentCategory, setParentCategory] = useState<CasinoFilterCategory | null>(null);
  const [casinoCompanies, setCasinoCompanies] = useState<CasinoCompany[]>([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>([]);
  const [companySearchQuery, setCompanySearchQuery] = useState<string>("");
  const [filteredCompanies, setFilteredCompanies] = useState<CasinoCompany[]>([]);
  const [isEditingSubCategory, setIsEditingSubCategory] = useState<boolean>(false);

  // 드래그 매니저 초기화
  const dragManagerRef = useRef<DragManager | null>(null);

  useEffect(() => {
    dragManagerRef.current = new DragManager((from: number, to: number) => {
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= selectedCompanyIds.length ||
        to >= selectedCompanyIds.length
      )
        return;
      const newSelectedCompanyIds = [...selectedCompanyIds];
      const [movedItem] = newSelectedCompanyIds.splice(from, 1);
      newSelectedCompanyIds.splice(to, 0, movedItem);
      setSelectedCompanyIds(newSelectedCompanyIds);
    });
  }, [selectedCompanyIds]);

  // 초기 상태 설정
  const initialCategoryState: Partial<CasinoFilterCategory> = {
    title: "",
    isPublic: 1,
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    displayOrder: 0,
  };

  // 검색 핸들러
  const handleSearch = (value: string) => {
    fetchCategories(1, pageSize, value);
  };

  // 대분류 목록 조회 (소분류 포함, 검색 파라미터 추가)
  const fetchCategories = async (
    page: number = currentPage,
    limit: number = pageSize,
    searchValue: string = ""
  ) => {
    setLoading(true);
    setError(null);
    const currentSelected = [...selectedCategoryIds];
    try {
      const params: any = { page, limit };

      if (searchValue.trim()) {
        params.search = searchValue;
      }

      const response = await axios.get(`/casino-filters/categories`, { params });

      if (response.data && response.data.success) {
        const {
          items,
          total,
          page: currentPageFromApi,
          limit: pageSizeFromApi,
          totalPages: totalPagesFromApi,
        } = response.data.data;

        if (Array.isArray(items)) {
          // displayOrder 오름차순, 같으면 createdAt 내림차순
          const sortedCategories = items.sort((a, b) => {
            if ((a.displayOrder || 0) !== (b.displayOrder || 0)) {
              return (a.displayOrder || 0) - (b.displayOrder || 0);
            }
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
          });

          // 각 대분류의 소분류 조회
          const categoriesWithSubCategories = await Promise.all(
            sortedCategories.map(async (category) => {
              try {
                const subResponse = await axios.get(`/casino-filters/sub-categories`, {
                  params: { categoryId: category.id, page: 1, limit: 100 },
                });

                if (subResponse.data && subResponse.data.success) {
                  const subCategories = subResponse.data.data.items || [];
                  // 소분류 기본 정보만 추출하고 연결된 카지노 업체 정보는 제외
                  const cleanSubCategories = subCategories.map((sub: any) => ({
                    id: sub.id,
                    categoryId: sub.categoryId,
                    title: sub.title,
                    isPublic: sub.isPublic,
                    startDate: sub.startDate,
                    endDate: sub.endDate,
                    displayOrder: sub.displayOrder,
                    createdAt: sub.createdAt,
                    updatedAt: sub.updatedAt,
                  }));

                  // 소분류도 displayOrder로 정렬
                  const sortedSubCategories = cleanSubCategories.sort(
                    (a: CasinoFilterSubCategory, b: CasinoFilterSubCategory) => {
                      if ((a.displayOrder || 0) !== (b.displayOrder || 0)) {
                        return (a.displayOrder || 0) - (b.displayOrder || 0);
                      }
                      return (
                        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
                      );
                    }
                  );
                  return { ...category, subCategories: sortedSubCategories };
                }
                return { ...category, subCategories: [] };
              } catch (err) {
                console.error(`소분류 조회 오류 (categoryId: ${category.id}):`, err);
                return { ...category, subCategories: [] };
              }
            })
          );

          setCategories(categoriesWithSubCategories);
          setOriginalCategories(categoriesWithSubCategories.map((c) => ({ ...c })));
          setTotalItems(total);
          if (page === currentPage) setCurrentPage(currentPageFromApi);
          setPageSize(pageSizeFromApi);
          setTotalPages(totalPagesFromApi);
          setSelectedCategoryIds(
            currentSelected.filter((id) => categoriesWithSubCategories.some((cat) => cat.id === id))
          );
        } else {
          setCategories([]);
          setOriginalCategories([]);
          setSelectedCategoryIds([]);
          setError("대분류 목록 형식이 올바르지 않습니다.");
          setTotalItems(0);
          setCurrentPage(1);
          setPageSize(limit);
          setTotalPages(1);
        }
      } else {
        setCategories([]);
        setOriginalCategories([]);
        setSelectedCategoryIds([]);
        setError(response.data?.message || "대분류 목록을 불러오는데 실패했습니다.");
        setTotalItems(0);
        setCurrentPage(1);
        setPageSize(limit);
        setTotalPages(1);
      }
    } catch (err) {
      console.error("대분류 조회 오류:", err);
      setError("대분류 목록을 불러오는데 실패했습니다.");
      setCategories([]);
      setOriginalCategories([]);
      setSelectedCategoryIds([]);
      setTotalItems(0);
      setCurrentPage(1);
      setPageSize(limit);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories(currentPage, PAGE_SIZE);
  }, []);

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
      fetchCategories(page, PAGE_SIZE, searchValue);
    }
  };

  // 대분류 추가 모달 열기
  const handleAddCategory = () => {
    setCurrentCategory(initialCategoryState);
    setShowModal(true);
    setIsEditing(false);
    setSelectedCategoryIds([]);
  };

  // 대분류 수정 모달 열기
  const handleEditCategory = (category: CasinoFilterCategory) => {
    setCurrentCategory(category);
    setIsEditing(true);
    setShowModal(true);
    setSelectedCategoryIds([]);
  };

  // 대분류 저장 (추가 또는 수정)
  const handleSaveCategory = async () => {
    if (!currentCategory) return;
    setError(null);
    setAlertMessage(null);

    try {
      setIsSaving(true);

      if (!currentCategory.title) {
        setError("대분류 제목은 필수 항목입니다.");
        return;
      }

      const categoryData = {
        title: currentCategory.title,
        isPublic: currentCategory.isPublic,
        startDate: currentCategory.startDate || null,
        endDate: currentCategory.endDate || null,
        displayOrder: currentCategory.displayOrder || 0,
      };

      if (isEditing && currentCategory.id) {
        // 수정 모드
        await axios.put(`/casino-filters/categories/${currentCategory.id}`, categoryData);
        setAlertMessage({ type: "success", message: "대분류가 수정되었습니다." });
      } else {
        // 추가 모드
        await axios.post(`/casino-filters/categories`, categoryData);
        setAlertMessage({ type: "success", message: "새 대분류가 추가되었습니다." });
      }

      setShowModal(false);
      fetchCategories();
    } catch (err) {
      console.error("대분류 저장 오류:", err);
      setError("대분류 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // 대분류 삭제
  const handleDeleteCategory = async (id: number) => {
    if (!confirm("정말로 이 대분류를 삭제하시겠습니까? 관련된 소분류도 함께 삭제됩니다.")) {
      return;
    }

    try {
      await axios.delete(`/casino-filters/categories/${id}`);
      setAlertMessage({ type: "success", message: "대분류가 삭제되었습니다." });
      fetchCategories();
    } catch (err) {
      console.error("대분류 삭제 오류:", err);
      setAlertMessage({ type: "error", message: "대분류 삭제 중 오류가 발생했습니다." });
    }
  };

  // 일괄 삭제
  const handleBulkDelete = async () => {
    const totalSelected = selectedCategoryIds.length + selectedSubCategoryIds.length;

    if (totalSelected === 0) {
      alert("삭제할 항목을 선택해주세요.");
      return;
    }

    let confirmMessage = "";
    if (selectedCategoryIds.length > 0 && selectedSubCategoryIds.length > 0) {
      confirmMessage = `선택한 ${selectedCategoryIds.length}개의 대분류와 ${selectedSubCategoryIds.length}개의 소분류를 삭제하시겠습니까?`;
    } else if (selectedCategoryIds.length > 0) {
      confirmMessage = `선택한 ${selectedCategoryIds.length}개의 대분류를 삭제하시겠습니까?`;
    } else {
      confirmMessage = `선택한 ${selectedSubCategoryIds.length}개의 소분류를 삭제하시겠습니까?`;
    }

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // 대분류 삭제
      if (selectedCategoryIds.length > 0) {
        await Promise.all(
          selectedCategoryIds.map((id) => axios.delete(`/casino-filters/categories/${id}`))
        );
      }

      // 소분류 삭제
      if (selectedSubCategoryIds.length > 0) {
        await Promise.all(
          selectedSubCategoryIds.map((id) => axios.delete(`/casino-filters/sub-categories/${id}`))
        );
      }

      setAlertMessage({
        type: "success",
        message: `${totalSelected}개의 항목이 삭제되었습니다.`,
      });
      setSelectedCategoryIds([]);
      setSelectedSubCategoryIds([]);
      fetchCategories();
    } catch (err) {
      console.error("일괄 삭제 오류:", err);
      setAlertMessage({ type: "error", message: "삭제 중 오류가 발생했습니다." });
    }
  };

  // 대분류 선택
  const handleSelectCategory = (id: number) => {
    const category = categories.find((cat) => cat.id === id);
    const subCategoryIds = category?.subCategories?.map((sub) => sub.id) || [];

    setSelectedCategoryIds((prev) => {
      if (prev.includes(id)) {
        // 대분류 선택 해제 시 해당 소분류들도 선택 해제
        setSelectedSubCategoryIds((prevSub) =>
          prevSub.filter((subId) => !subCategoryIds.includes(subId))
        );
        return prev.filter((categoryId) => categoryId !== id);
      } else {
        // 대분류 선택 시 해당 소분류들도 모두 선택
        setSelectedSubCategoryIds((prevSub) => [...new Set([...prevSub, ...subCategoryIds])]);
        return [...prev, id];
      }
    });
  };

  // 전체 선택
  const handleSelectAllCategories = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedCategoryIds(categories.map((category) => category.id));
      // 모든 소분류도 선택
      const allSubCategoryIds: number[] = [];
      categories.forEach((category) => {
        if (category.subCategories) {
          allSubCategoryIds.push(...category.subCategories.map((sub) => sub.id));
        }
      });
      setSelectedSubCategoryIds(allSubCategoryIds);
    } else {
      setSelectedCategoryIds([]);
      setSelectedSubCategoryIds([]);
    }
  };

  // 소분류 선택
  const handleSelectSubCategory = (id: number) => {
    setSelectedSubCategoryIds((prev) => {
      if (prev.includes(id)) {
        // 소분류 선택 해제
        return prev.filter((subCategoryId) => subCategoryId !== id);
      } else {
        // 소분류 선택
        return [...prev, id];
      }
    });
  };

  // displayOrder 입력값 변경 핸들러 (대분류)
  const handleDisplayOrderInputChange = (index: number, newOrder: number) => {
    setCategories((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], displayOrder: newOrder };
      return updated;
    });
  };

  // displayOrder 입력값 변경 핸들러 (소분류)
  const handleSubCategoryDisplayOrderInputChange = (subCategoryId: number, newOrder: number) => {
    setCategories((prev) => {
      return prev.map((category) => {
        if (category.subCategories) {
          return {
            ...category,
            subCategories: category.subCategories.map((subCategory) =>
              subCategory.id === subCategoryId
                ? { ...subCategory, displayOrder: newOrder }
                : subCategory
            ),
          };
        }
        return category;
      });
    });
  };

  // 순서 저장
  const handleDisplayOrderSave = async () => {
    try {
      // 변경된 대분류 찾기
      const changedCategories = categories.filter((cat) => {
        const original = originalCategories.find((o) => o.id === cat.id);
        return original && cat.displayOrder !== original.displayOrder;
      });

      // 변경된 소분류 찾기
      const changedSubCategories: Array<{ id: number; displayOrder: number }> = [];
      categories.forEach((category) => {
        const originalCategory = originalCategories.find((o) => o.id === category.id);
        if (category.subCategories && originalCategory?.subCategories) {
          category.subCategories.forEach((subCategory) => {
            const originalSubCategory = originalCategory.subCategories?.find(
              (o) => o.id === subCategory.id
            );
            if (
              originalSubCategory &&
              subCategory.displayOrder !== originalSubCategory.displayOrder
            ) {
              changedSubCategories.push({
                id: subCategory.id,
                displayOrder: subCategory.displayOrder,
              });
            }
          });
        }
      });

      if (changedCategories.length === 0 && changedSubCategories.length === 0) {
        setAlertMessage({ type: "success", message: "변경된 순서가 없습니다." });
        return;
      }

      // 대분류 순서 업데이트
      if (changedCategories.length > 0) {
        await Promise.all(
          changedCategories.map((cat) =>
            axios.patch(`/casino-filters/categories/${cat.id}/display-order`, {
              displayOrder: cat.displayOrder,
            })
          )
        );
      }

      // 소분류 순서 업데이트
      if (changedSubCategories.length > 0) {
        await Promise.all(
          changedSubCategories.map((subCat) =>
            axios.patch(`/casino-filters/sub-categories/${subCat.id}/display-order`, {
              displayOrder: subCat.displayOrder,
            })
          )
        );
      }

      const totalChanged = changedCategories.length + changedSubCategories.length;
      setAlertMessage({
        type: "success",
        message: `${totalChanged}개 항목의 순서가 저장되었습니다.`,
      });
      fetchCategories();
    } catch (err) {
      console.error("순서 저장 오류:", err);
      setAlertMessage({ type: "error", message: "순서 저장 중 오류가 발생했습니다." });
    }
  };

  // 대분류 추가 (오른쪽 상단 버튼에서 사용)
  const handleAddMainCategory = () => {
    handleAddCategory();
  };

  // 카지노 업체 목록 조회

  // 업체 검색 필터링
  useEffect(() => {
    if (!companySearchQuery.trim()) {
      setFilteredCompanies(casinoCompanies);
    } else {
      const filtered = casinoCompanies.filter((company) =>
        company.companyName.toLowerCase().includes(companySearchQuery.toLowerCase())
      );
      setFilteredCompanies(filtered);
    }
  }, [companySearchQuery, casinoCompanies]);

  // 소분류 추가 모달 열기
  const handleAddSubCategory = async (category: CasinoFilterCategory) => {
    // 먼저 카지노 업체 목록을 로드
    try {
      const companiesResponse = await axios.get("/companies", {
        params: { page: 1, limit: 1000 },
      });

      if (companiesResponse.data && companiesResponse.data.success) {
        const companies = companiesResponse.data.data.items || [];
        setCasinoCompanies(companies);
        setFilteredCompanies(companies);
      }
    } catch (err) {
      console.error("카지노 업체 조회 오류:", err);
    }

    setParentCategory(category);
    setCurrentSubCategory({
      categoryId: category.id,
      title: "",
      isPublic: 1,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
      displayOrder: 0,
    });
    setSelectedCompanyIds([]);
    setCompanySearchQuery("");
    setIsEditingSubCategory(false);
    setShowSubCategoryModal(true);
  };

  // 소분류 저장 (추가 또는 수정)
  const handleSaveSubCategory = async () => {
    if (!currentSubCategory || !parentCategory) return;

    setError(null);
    setAlertMessage(null);

    try {
      setIsSaving(true);

      if (!currentSubCategory.title) {
        setError("소분류 제목은 필수 항목입니다.");
        return;
      }

      if (selectedCompanyIds.length === 0) {
        setError("카지노 업체 확인해주세요.");
        return;
      }

      const subCategoryData = {
        categoryId: parentCategory.id,
        title: currentSubCategory.title,
        isPublic: currentSubCategory.isPublic,
        startDate: currentSubCategory.startDate || null,
        endDate: currentSubCategory.endDate || null,
        displayOrder: currentSubCategory.displayOrder || 0,
      };

      let response;
      let subCategoryId;

      if (isEditingSubCategory && currentSubCategory.id) {
        // 수정
        response = await axios.put(
          `/casino-filters/sub-categories/${currentSubCategory.id}`,
          subCategoryData
        );
        subCategoryId = currentSubCategory.id;
      } else {
        // 추가
        response = await axios.post("/casino-filters/sub-categories", subCategoryData);
        subCategoryId = response.data.data?.id;
      }

      if (response.data.success && subCategoryId) {
        // 기존 매핑 조회 (수정 모드인 경우)
        let existingCompanyIds: number[] = [];
        if (isEditingSubCategory) {
          try {
            const existingResponse = await axios.get(
              `/casino-filters/sub-categories/${subCategoryId}`
            );
            if (existingResponse.data.success) {
              existingCompanyIds = existingResponse.data.data.companies
                ? existingResponse.data.data.companies.map((mapping: any) => mapping.company.id)
                : [];
            }
          } catch (err) {
            console.error("기존 매핑 조회 오류:", err);
          }
        }

        // 기존 매핑 모두 삭제 후 새로운 순서로 재생성
        try {
          // 기존 매핑 삭제
          for (const companyId of existingCompanyIds) {
            try {
              await axios.delete(`/casino-filters/mappings/${companyId}/${subCategoryId}`);
            } catch (err) {
              console.error(`매핑 삭제 오류 (companyId: ${companyId}):`, err);
            }
          }
        } catch (err) {
          console.error("기존 매핑 삭제 오류:", err);
        }

        // 새로운 순서로 매핑 추가
        for (let i = 0; i < selectedCompanyIds.length; i++) {
          const companyId = selectedCompanyIds[i];
          const displayOrder = i + 1;
          try {
            await axios.post("/casino-filters/mappings", {
              companyId,
              subCategoryId,
              displayOrder: displayOrder, // 순서 정보 추가
            });
          } catch (err) {
            console.error(`매핑 추가 오류 (companyId: ${companyId}):`, err);
          }
        }

        setAlertMessage({
          type: "success",
          message: isEditingSubCategory ? "소분류가 수정되었습니다." : "소분류가 추가되었습니다.",
        });
        setShowSubCategoryModal(false);
        fetchCategories(); // 목록 새로고침
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          (isEditingSubCategory ? "소분류 수정에 실패했습니다." : "소분류 추가에 실패했습니다.")
      );
    } finally {
      setIsSaving(false);
    }
  };

  // 카지노 업체 선택/해제
  const handleToggleCompany = (company: CasinoCompany) => {
    setSelectedCompanyIds((prev) => {
      if (prev.includes(company.id)) {
        return prev.filter((id) => id !== company.id);
      } else {
        return [...prev, company.id];
      }
    });
  };

  // 선택된 카지노 업체 제거
  const handleRemoveSelectedCompany = (companyId: number) => {
    setSelectedCompanyIds((prev) => prev.filter((id) => id !== companyId));
  };

  // 계층 구조 데이터 생성 (대분류 + 소분류만, 카지노 업체 아이템 제외)
  const getHierarchicalData = () => {
    const hierarchicalData: Array<
      CasinoFilterCategory | (CasinoFilterSubCategory & { isSubCategory: true })
    > = [];

    categories.forEach((category) => {
      // 대분류 추가 (연결된 소분류/카지노 업체 정보 제외)
      const cleanCategory = {
        id: category.id,
        title: category.title,
        isPublic: category.isPublic,
        startDate: category.startDate,
        endDate: category.endDate,
        displayOrder: category.displayOrder,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      };
      hierarchicalData.push(cleanCategory);

      // 소분류만 추가 (연결된 카지노 업체들은 완전히 제외)
      if (category.subCategories && category.subCategories.length > 0) {
        category.subCategories.forEach((subCategory) => {
          // 소분류 기본 정보만 추가
          const cleanSubCategory = {
            id: subCategory.id,
            categoryId: subCategory.categoryId,
            title: subCategory.title,
            isPublic: subCategory.isPublic,
            startDate: subCategory.startDate,
            endDate: subCategory.endDate,
            displayOrder: subCategory.displayOrder,
            createdAt: subCategory.createdAt,
            updatedAt: subCategory.updatedAt,
            isSubCategory: true as const,
          };
          hierarchicalData.push(cleanSubCategory);
        });
      }
    });

    return hierarchicalData;
  };

  // 소분류 수정 모달 열기
  const handleEditSubCategory = async (subCategory: CasinoFilterSubCategory) => {
    try {
      // 먼저 카지노 업체 목록을 로드
      const companiesResponse = await axios.get("/companies", {
        params: { page: 1, limit: 1000 },
      });

      if (companiesResponse.data && companiesResponse.data.success) {
        const companies = companiesResponse.data.data.items || [];
        setCasinoCompanies(companies);
        setFilteredCompanies(companies);
      }

      // 소분류 상세 정보 조회 (카지노 업체 정보 포함)
      const response = await axios.get(`/casino-filters/sub-categories/${subCategory.id}`);

      if (response.data && response.data.success) {
        const subCategoryData = response.data.data;

        // 부모 대분류 찾기
        const parent = categories.find((cat) => cat.id === subCategory.categoryId);
        setParentCategory(parent || null);

        setCurrentSubCategory({
          id: subCategoryData.id,
          categoryId: subCategoryData.categoryId,
          title: subCategoryData.title,
          isPublic: subCategoryData.isPublic,
          displayOrder: subCategoryData.displayOrder,
          startDate: subCategoryData.startDate
            ? subCategoryData.startDate.split("T")[0]
            : new Date().toISOString().split("T")[0],
          endDate: subCategoryData.endDate
            ? subCategoryData.endDate.split("T")[0]
            : new Date().toISOString().split("T")[0],
        });

        // 연결된 카지노 업체 ID들 추출 (순서 정보 포함)
        const connectedCompanyIds = subCategoryData.companies
          ? subCategoryData.companies
              .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0))
              .map((mapping: any) => mapping.company.id)
          : [];

        console.log("연결된 카지노 업체 IDs (순서 포함):", connectedCompanyIds); // 디버깅용

        setSelectedCompanyIds(connectedCompanyIds);
        setCompanySearchQuery("");
        setIsEditingSubCategory(true);
        setShowSubCategoryModal(true);
      }
    } catch (err) {
      console.error("소분류 상세 조회 오류:", err);
      setAlertMessage({
        type: "error",
        message: "소분류 정보를 불러오는데 실패했습니다.",
      });
    }
  };

  // 소분류 삭제 핸들러
  const handleDeleteSubCategory = async (id: number) => {
    if (!window.confirm("정말로 이 소분류를 삭제하시겠습니까?")) return;

    try {
      const response = await axios.delete(`/casino-filters/sub-categories/${id}`);

      if (response.data.success) {
        setAlertMessage({
          type: "success",
          message: "소분류가 삭제되었습니다.",
        });
        fetchCategories(); // 목록 새로고침
      }
    } catch (err: any) {
      setAlertMessage({
        type: "error",
        message: err.response?.data?.message || "소분류 삭제에 실패했습니다.",
      });
    }
  };

  // 테이블 컬럼 정의
  const columns = [
    {
      header: (
        <input
          type="checkbox"
          checked={
            categories.length > 0 &&
            selectedCategoryIds.length === categories.length &&
            selectedSubCategoryIds.length ===
              categories.reduce((total, cat) => total + (cat.subCategories?.length || 0), 0)
          }
          onChange={handleSelectAllCategories}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      ),
      accessor: "id" as keyof (CasinoFilterCategory | CasinoFilterSubCategory),
      cell: (value: any, row: any) => {
        if (row.isSubCategory) {
          // 소분류: 체크박스 표시
          return (
            <input
              type="checkbox"
              checked={selectedSubCategoryIds.includes(row.id)}
              onChange={() => handleSelectSubCategory(row.id)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          );
        } else {
          // 대분류: 체크박스 표시
          return (
            <input
              type="checkbox"
              checked={selectedCategoryIds.includes(row.id)}
              onChange={() => handleSelectCategory(row.id)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          );
        }
      },
    },
    {
      header: "대분류/소분류",
      accessor: "title" as keyof (CasinoFilterCategory | CasinoFilterSubCategory),
      className: "w-60",
      cell: (value: string, row: any) => {
        if (row.isSubCategory) {
          // 소분류: 들여쓰기와 └ 기호, 클릭 가능한 파란 글씨
          return (
            <div className="flex items-center pl-6">
              <span className="text-gray-400 mr-2">└</span>
              <div
                className="max-w-xs truncate text-blue-600 hover:text-blue-800 cursor-pointer"
                title={value}
                onClick={() => handleEditSubCategory(row)}
              >
                {value}
              </div>
            </div>
          );
        } else {
          // 대분류: 굵은 글씨, 클릭 가능한 파란 글씨
          return (
            <div
              className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer max-w-xs truncate"
              title={value}
              onClick={() => handleEditCategory(row)}
            >
              {value}
            </div>
          );
        }
      },
    },
    {
      header: "공개여부",
      accessor: "isPublic" as keyof (CasinoFilterCategory | CasinoFilterSubCategory),
      cell: (value: number) => (
        <span
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            value ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {value ? "공개" : "비공개"}
        </span>
      ),
    },
    {
      header: "시작일시",
      accessor: "startDate" as keyof (CasinoFilterCategory | CasinoFilterSubCategory),
      cell: (value: string) => <div className="text-sm">{value ? formatDate(value) : "-"}</div>,
    },
    {
      header: "종료일시",
      accessor: "endDate" as keyof (CasinoFilterCategory | CasinoFilterSubCategory),
      cell: (value: string) => <div className="text-sm">{value ? formatDate(value) : "-"}</div>,
    },
    {
      header: "순서",
      accessor: "displayOrder" as keyof (CasinoFilterCategory | CasinoFilterSubCategory),
      cell: (value: number, row: any, index: number) => (
        <input
          type="number"
          min={0}
          className="w-16 border rounded px-2 py-1 text-center"
          value={value}
          onChange={(e) => {
            const newOrder = Number(e.target.value);
            if (row.isSubCategory) {
              // 소분류 순서 변경
              handleSubCategoryDisplayOrderInputChange(row.id, newOrder);
            } else {
              // 대분류 순서 변경
              handleDisplayOrderInputChange(index, newOrder);
            }
          }}
          disabled={loading}
        />
      ),
      className: "w-20 text-center",
    },
    {
      header: "관리",
      accessor: "id" as keyof (CasinoFilterCategory | CasinoFilterSubCategory),
      cell: (id: number, row: any) => {
        if (row.isSubCategory) {
          // 소분류: 투명 버튼 + 수정, 삭제 (열 맞춤용)
          return (
            <div className="flex space-x-1">
              <button
                className="px-2 py-1 text-sm font-medium rounded-md opacity-0 pointer-events-none"
                disabled
              >
                추가
              </button>
              <ActionButton
                action="edit"
                label="수정"
                size="sm"
                onClick={() => handleEditSubCategory(row)}
              />
              <ActionButton
                action="delete"
                label="삭제"
                size="sm"
                onClick={() => handleDeleteSubCategory(id)}
              />
            </div>
          );
        } else {
          // 대분류: 추가, 수정, 삭제
          return (
            <div className="flex space-x-1">
              <ActionButton
                action="add"
                label="추가"
                size="sm"
                onClick={() => handleAddSubCategory(row)}
              />
              <ActionButton
                action="edit"
                label="수정"
                size="sm"
                onClick={() => handleEditCategory(row)}
              />
              <ActionButton
                action="delete"
                label="삭제"
                size="sm"
                onClick={() => handleDeleteCategory(id)}
              />
            </div>
          );
        }
      },
    },
  ] as any;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">카지노 필터 관리</h1>
        <SearchInput
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          onSearch={handleSearch}
        />
        <div className="flex space-x-3">
          <Button onClick={handleDisplayOrderSave} variant="primary">
            순서 저장
          </Button>
          <Button onClick={handleBulkDelete} variant="danger">
            선택 삭제{" "}
            {selectedCategoryIds.length + selectedSubCategoryIds.length > 0 &&
              `(${selectedCategoryIds.length + selectedSubCategoryIds.length})`}
          </Button>
          <Button onClick={handleAddMainCategory} variant="secondary">
            대분류 추가
          </Button>
        </div>
      </div>

      {/* 알림 메시지 */}
      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
          className="mb-4"
        />
      )}

      {/* 데이터 테이블 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          columns={columns}
          data={getHierarchicalData()}
          loading={loading}
          pagination={{
            currentPage: currentPage,
            pageSize: pageSize,
            totalItems: totalItems,
            onPageChange: handlePageChange,
          }}
          emptyMessage={searchValue ? "검색된 결과가 없습니다." : "등록된 대분류가 없습니다."}
          rowClassName={(row: any) => {
            if (row.isSubCategory) {
              // 소분류: 기본 스타일
              return "hover:bg-gray-50 border-b border-gray-100";
            } else {
              // 대분류: 연한 초록색 배경
              return "bg-green-50 hover:bg-green-100 border-b border-gray-100";
            }
          }}
        />
      </div>

      {/* 대분류 추가/수정 모달 */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setError(null);
        }}
        title={isEditing ? "대분류 수정" : "대분류 추가"}
        size="lg"
      >
        <div className="space-y-6">
          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          {/* 상단: 버튼과 공개여부 */}
          <div className="flex justify-between items-center">
            <div className="flex space-x-3">
              <Button onClick={handleSaveCategory} variant="primary" disabled={isSaving}>
                {isSaving ? "저장 중..." : isEditing ? "수정" : "추가"}
              </Button>
              <Button
                onClick={() => {
                  setShowModal(false);
                  setError(null);
                }}
                variant="secondary"
              >
                취소
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">공개여부</label>
              <input
                type="checkbox"
                checked={currentCategory?.isPublic === 1}
                onChange={(e) =>
                  setCurrentCategory((prev) => ({
                    ...prev,
                    isPublic: e.target.checked ? 1 : 0,
                  }))
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-600">
                {currentCategory?.isPublic === 1 ? "공개" : "비공개"}
              </span>
            </div>
          </div>

          {/* 구분선 */}
          <hr className="border-gray-200" />

          {/* 대분류 제목 */}
          <div>
            <label className="label">대분류 제목</label>
            <textarea
              value={currentCategory?.title || ""}
              onChange={(e) =>
                setCurrentCategory((prev) => ({
                  ...prev,
                  title: e.target.value,
                }))
              }
              placeholder="대분류 제목을 입력하세요"
              required
              className="input w-full min-h-[2.5rem] resize-y"
              rows={3}
            />
          </div>

          {/* 시작일시와 종료일시 */}
          <div className="grid grid-cols-2 gap-6">
            <DatePicker
              label="시작일시"
              value={currentCategory?.startDate || ""}
              onChange={(date) =>
                setCurrentCategory((prev) => ({
                  ...prev,
                  startDate: date,
                }))
              }
            />
            <DatePicker
              label="종료일시"
              value={currentCategory?.endDate || ""}
              onChange={(date) =>
                setCurrentCategory((prev) => ({
                  ...prev,
                  endDate: date,
                }))
              }
            />
          </div>
        </div>
      </Modal>

      {/* 소분류 추가 모달 */}
      <Modal
        isOpen={showSubCategoryModal}
        onClose={() => {
          setShowSubCategoryModal(false);
          setError(null);
        }}
        title={isEditingSubCategory ? "소분류 수정" : "소분류 추가"}
        size="xl"
      >
        <div className="space-y-6">
          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          {/* 상단: 버튼과 공개여부 */}
          <div className="flex justify-between items-center">
            <div className="flex space-x-3">
              <Button onClick={handleSaveSubCategory} variant="primary" disabled={isSaving}>
                {isSaving ? "저장 중..." : isEditingSubCategory ? "수정" : "추가"}
              </Button>
              <Button
                onClick={() => {
                  setShowSubCategoryModal(false);
                  setError(null);
                }}
                variant="secondary"
              >
                취소
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">공개여부</label>
              <input
                type="checkbox"
                checked={currentSubCategory?.isPublic === 1}
                onChange={(e) =>
                  setCurrentSubCategory((prev) => ({
                    ...prev,
                    isPublic: e.target.checked ? 1 : 0,
                  }))
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-600">
                {currentSubCategory?.isPublic === 1 ? "공개" : "비공개"}
              </span>
            </div>
          </div>

          {/* 구분선 */}
          <hr className="border-gray-200" />

          {/* 대분류 제목 표시 */}
          <div>
            <label className="text-sm font-medium text-gray-700">대분류 제목</label>
            <div className="mt-1 p-2 bg-gray-50 border border-gray-300 rounded-md text-gray-600 break-words">
              {parentCategory?.title}
            </div>
          </div>

          {/* 소분류 제목 */}
          <div>
            <label className="label">소분류 제목</label>
            <input
              type="text"
              value={currentSubCategory?.title || ""}
              onChange={(e) =>
                setCurrentSubCategory((prev) => ({
                  ...prev,
                  title: e.target.value,
                }))
              }
              placeholder="소분류 제목을 입력하세요"
              required
              className="input w-full"
            />
          </div>

          {/* 선택된 카지노 업체 */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              선택된 카지노 ({selectedCompanyIds.length})
            </label>
            <div
              className="mt-1 border border-gray-300 rounded-md p-3 bg-gray-50"
              style={{ minHeight: "100px", maxHeight: "200px", overflowY: "auto" }}
            >
              {selectedCompanyIds.length > 0 ? (
                <div className="space-y-2">
                  {selectedCompanyIds.map((companyId, index) => {
                    const company = casinoCompanies.find((c) => c.id === companyId);
                    if (!company) return null;
                    return (
                      <div
                        key={`${company.id}-${index}`}
                        className="flex justify-between items-center border-b pb-2 last:border-b-0 cursor-move hover:bg-gray-100 transition-colors"
                        draggable
                        onDragStart={() => {
                          if (!dragManagerRef.current) return;
                          dragManagerRef.current.startDrag(index);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                        }}
                        onDrop={() => {
                          if (!dragManagerRef.current) return;
                          dragManagerRef.current.drop(index);
                        }}
                      >
                        <div className="flex items-center flex-1">
                          <div>
                            <div className="font-medium text-sm">{company.companyName}</div>
                            <div className="text-xs text-gray-500">
                              평점: {company.rating || 0}/5
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSelectedCompany(company.id)}
                          className="text-red-500 hover:text-red-700 text-xs p-1 ml-2"
                          disabled={isSaving}
                        >
                          삭제
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  아래 목록에서 카지노 업체를 선택해주세요.
                </div>
              )}
            </div>
          </div>

          {/* 카지노 업체 검색 및 선택 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">카지노 업체 검색</label>
              <input
                type="text"
                value={companySearchQuery}
                onChange={(e) => setCompanySearchQuery(e.target.value)}
                placeholder="카지노 업체 명 검색"
                className="border border-gray-300 rounded-md px-3 py-1 text-sm w-64"
                disabled={isSaving}
              />
            </div>
            <div
              className="border border-gray-300 rounded-md p-3"
              style={{ maxHeight: "150px", overflowY: "auto" }}
            >
              {filteredCompanies.length > 0 ? (
                <div className="space-y-2">
                  {filteredCompanies.map((company) => (
                    <div
                      key={company.id}
                      className={`p-2 border rounded-md cursor-pointer flex items-start ${
                        selectedCompanyIds.includes(company.id)
                          ? "bg-blue-50 border-blue-300"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                      onClick={() => !isSaving && handleToggleCompany(company)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCompanyIds.includes(company.id)}
                        onChange={() => {}}
                        onClick={(e) => {
                          e.stopPropagation();
                          !isSaving && handleToggleCompany(company);
                        }}
                        className="h-4 w-4 text-blue-600 mr-3 mt-1 rounded focus:ring-blue-500"
                        disabled={isSaving}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{company.companyName}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          평점: {company.rating || 0}/5 |{company.isPublic ? " 공개" : " 비공개"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-6 text-gray-500">
                  {companySearchQuery.trim()
                    ? "검색 결과가 없습니다."
                    : "등록된 카지노 업체가 없습니다."}
                </div>
              )}
            </div>
          </div>

          {/* 시작일시와 종료일시 */}
          <div className="grid grid-cols-2 gap-6">
            <DatePicker
              label="시작일시"
              value={currentSubCategory?.startDate || ""}
              onChange={(date) =>
                setCurrentSubCategory((prev) => ({
                  ...prev,
                  startDate: date,
                }))
              }
            />
            <DatePicker
              label="종료일시"
              value={currentSubCategory?.endDate || ""}
              onChange={(date) =>
                setCurrentSubCategory((prev) => ({
                  ...prev,
                  endDate: date,
                }))
              }
            />
          </div>
        </div>
      </Modal>

      {/* 로딩 오버레이 */}
      <LoadingOverlay isLoading={loading} />
    </div>
  );
};

export default CasinoFilterPage;
