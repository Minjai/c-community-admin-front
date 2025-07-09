import React, { useState, useEffect, useRef } from "react";
import CasinoCompanyApiService from "../../services/CasinoCompanyApiService";
import { CasinoCompany, CompanyReview } from "../../types";
import DataTable from "../../components/DataTable";
import Button from "../../components/Button";
import ActionButton from "../../components/ActionButton";
import Modal from "../../components/Modal";
import Input from "../../components/forms/Input";
import FileUpload from "../../components/forms/FileUpload";
import Alert from "../../components/Alert";
import SearchInput from "../../components/SearchInput";
import { formatDate } from "../../utils/dateUtils";
import axios from "@/api/axios";
import { extractDataArray } from "../../api/util";
import LoadingOverlay from "../../components/LoadingOverlay";
import { ApiResponse, PaginatedData } from "../../types"; // Import ApiResponse and PaginatedData

// .env에서 카지노 정보 URL 접두사 가져오기
const CASINO_INFO_URL_PREFIX =
  import.meta.env.VITE_CASINO_INFO_URL_PREFIX || "www.casinoguru-en.com/";

const PAGE_SIZE = 30;

const CasinoCompanyPage: React.FC = () => {
  const [companies, setCompanies] = useState<CasinoCompany[]>([]);
  const [originalCompanies, setOriginalCompanies] = useState<CasinoCompany[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [currentCompany, setCurrentCompany] = useState<Partial<CasinoCompany> | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isMoving, setIsMoving] = useState<boolean>(false);

  // 선택된 업체 ID 상태 추가
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>([]);

  // 댓글 관리 모달 상태 추가
  const [showCommentModal, setShowCommentModal] = useState<boolean>(false);
  const [selectedCompanyForComment, setSelectedCompanyForComment] = useState<CasinoCompany | null>(
    null
  );
  const [companyReviews, setCompanyReviews] = useState<CompanyReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  // 댓글 개수 상태 추가
  const [reviewCounts, setReviewCounts] = useState<Record<number, number>>({});

  // 댓글 수정 모달 상태 추가
  const [showEditReviewModal, setShowEditReviewModal] = useState<boolean>(false);
  const [selectedReview, setSelectedReview] = useState<CompanyReview | null>(null);
  const [editReviewData, setEditReviewData] = useState<{ content: string; rating: number }>({
    content: "",
    rating: 0,
  });
  const [isEditingReview, setIsEditingReview] = useState<boolean>(false);

  // 페이지네이션 상태 추가
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE);
  const [totalItems, setTotalItems] = useState<number>(0);

  // 검색 value 상태
  const [searchValue, setSearchValue] = useState<string>("");

  // 초기 상태 설정
  const initialCompanyState: Partial<CasinoCompany> = {
    companyName: "",
    description: "",
    imageUrl: "",
    isPublic: 1,
    displayOrder: totalItems + 1, // 전체 아이템 수 + 1로 displayOrder 설정
    linkUrl1: "",
    linkUrl2: "",
    rating: 0,
  };

  // 검색 핸들러
  const handleSearch = (value: string) => {
    fetchCompanies(currentPage, pageSize, value);
  };

  // 카지노 업체 목록 조회 (검색 파라미터 추가)
  const fetchCompanies = async (
    page: number = currentPage,
    limit: number = pageSize,
    searchValue: string = ""
  ) => {
    setLoading(true);
    setError(null);
    const currentSelected = [...selectedCompanyIds];
    try {
      const response: ApiResponse<PaginatedData<CasinoCompany>> =
        await CasinoCompanyApiService.getCasinoCompanies(page, limit, searchValue);
      if (response && response.success && response.data) {
        const {
          items,
          total,
          page: currentPageFromApi,
          limit: pageSizeFromApi,
          totalPages: totalPagesFromApi,
        } = response.data;
        if (Array.isArray(items)) {
          // displayOrder 오름차순, 같으면 createdAt 내림차순
          const sortedCompanies = items.sort((a, b) => {
            if ((a.displayOrder || 0) !== (b.displayOrder || 0)) {
              return (a.displayOrder || 0) - (b.displayOrder || 0);
            }
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
          });
          setCompanies(sortedCompanies);
          setOriginalCompanies(sortedCompanies.map((c) => ({ ...c })));
          setTotalItems(total);
          if (page === currentPage) setCurrentPage(currentPageFromApi);
          setPageSize(pageSizeFromApi);
          setTotalPages(totalPagesFromApi);
          setSelectedCompanyIds(
            currentSelected.filter((id) => sortedCompanies.some((comp) => comp.id === id))
          );

          // 서버에서 제공하는 댓글 개수 사용
          const countsMap: Record<number, number> = {};
          sortedCompanies.forEach((company) => {
            countsMap[company.id] = (company as any).reviewCount || 0;
          });
          setReviewCounts(countsMap);
        } else {
          setCompanies([]);
          setOriginalCompanies([]);
          setSelectedCompanyIds([]);
          setError("카지노 업체 목록 형식이 올바르지 않습니다.");
          setTotalItems(0);
          setCurrentPage(1);
          setPageSize(limit);
          setTotalPages(1);
        }
      } else {
        setCompanies([]);
        setOriginalCompanies([]);
        setSelectedCompanyIds([]);
        setError(response?.message || "카지노 업체 목록을 불러오는데 실패했습니다.");
        setTotalItems(0);
        setCurrentPage(1);
        setPageSize(limit);
        setTotalPages(1);
      }
    } catch (err) {
      setError("카지노 업체 목록을 불러오는데 실패했습니다.");
      setCompanies([]);
      setOriginalCompanies([]);
      setSelectedCompanyIds([]);
      setTotalItems(0);
      setCurrentPage(1);
      setPageSize(limit);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies(currentPage, PAGE_SIZE, searchValue); // 컴포넌트 마운트 시 첫 페이지 데이터 로드
  }, []); // 컴포넌트 마운트 시에만 실행

  // 페이지 변경 핸들러 추가
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page); // 먼저 currentPage 상태를 업데이트
      fetchCompanies(page, PAGE_SIZE, searchValue); // 새 페이지 데이터 요청
    }
  };

  // 파일 처리 함수 (FileUpload의 onChange 콜백으로 사용)
  // 파일 객체만 상태에 저장하고, 미리보기 관리는 FileUpload에 위임
  const handleFileChange = (file: File | null) => {
    if (file) {
      // 파일 형식 검증 로직 (FileUpload 내부에서도 수행되지만, 추가 검증 필요 시 여기에 구현)
      const acceptedTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"];
      const acceptedExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();

      if (!acceptedTypes.includes(file.type) || !acceptedExtensions.includes(fileExtension)) {
        // FileUpload 내부에서 alert가 이미 발생하므로 여기서는 중복 제거 가능
        // alert(...);
        setImageFile(null);
        return; // 검증 실패 시 파일 상태 업데이트 안 함
      }
      setImageFile(file);
    } else {
      // 파일 선택 취소 시
      setImageFile(null);
    }
  };

  // 업체 추가 모달 열기
  const handleAddCompany = () => {
    setCurrentCompany({
      id: 0,
      companyName: "",
      description: "",
      imageUrl: "",
      isPublic: 1,
      displayOrder: 0, // 새 업체는 항상 0번 순서
      linkUrl1: "",
      linkUrl2: "",
      rating: 0,
      createdAt: new Date().toISOString(),
    });
    setImageFile(null);
    setShowModal(true);
    setIsEditing(false);
    setSelectedCompanyIds([]);
  };

  // 업체 수정 모달 열기
  const handleEditCompany = (company: CasinoCompany) => {
    // isPublic을 number 타입으로 통일
    const processedCompany = {
      ...company,
      isPublic:
        typeof company.isPublic === "boolean" ? (company.isPublic ? 1 : 0) : company.isPublic,
    };

    setCurrentCompany(processedCompany);
    setIsEditing(true);
    setShowModal(true);
    setSelectedCompanyIds([]);
    setImageFile(null); // Reset image file on edit modal open
  };

  // 업체 저장 전 URL 처리 함수
  const processUrls = (company: Partial<CasinoCompany>): Partial<CasinoCompany> => {
    let processedCompany = { ...company };

    // 업체 정보 URL에서 접두사 제거 후 저장 (이미 접두사가 있는 경우 중복 방지)
    if (processedCompany.linkUrl2 && processedCompany.linkUrl2.startsWith(CASINO_INFO_URL_PREFIX)) {
      processedCompany.linkUrl2 = processedCompany.linkUrl2.replace(CASINO_INFO_URL_PREFIX, "");
    }

    return processedCompany;
  };

  // 업체 저장 (추가 또는 수정)
  const handleSaveCompany = async () => {
    if (!currentCompany) return;
    setError(null);
    setAlertMessage(null);
    try {
      setIsSaving(true);
      if (!currentCompany.companyName || !currentCompany.description) {
        setError("업체명과 업체소개는 필수 항목입니다.");
        setIsSaving(false);
        return;
      }
      if (!isEditing) {
        // 기존 업체 displayOrder는 건드리지 않음, 새 업체는 displayOrder: 0
      }
      // URL 처리
      const processedCompany = processUrls(currentCompany);

      if (isEditing && processedCompany.id) {
        // 수정 모드일 때
        try {
          await CasinoCompanyApiService.updateCasinoCompany(
            processedCompany.id,
            {
              companyName: processedCompany.companyName,
              description: processedCompany.description,
              linkUrl1: processedCompany.linkUrl1,
              linkUrl2: processedCompany.linkUrl2,
              isPublic: processedCompany.isPublic,
              displayOrder: processedCompany.displayOrder,
            },
            imageFile || undefined
          );
          setAlertMessage({ type: "success", message: "업체 정보가 수정되었습니다." }); // Use alertMessage for page level success
          setShowModal(false); // Close modal on success
          fetchCompanies(); // Refresh list
        } catch (err) {
          console.error("Error updating casino company:", err);
          setError("업체 정보 수정 중 오류가 발생했습니다."); // Use setError for modal alert
        }
      } else {
        // 추가 모드일 때 (imageFile이 반드시 있어야 함)
        if (!imageFile) {
          setError("업체 이미지가 필요합니다."); // Use setError for modal alert
          setIsSaving(false); // Stop saving process
          return;
        }

        try {
          await CasinoCompanyApiService.createCasinoCompany(
            {
              companyName: processedCompany.companyName,
              description: processedCompany.description,
              linkUrl1: processedCompany.linkUrl1,
              linkUrl2: processedCompany.linkUrl2,
              isPublic: processedCompany.isPublic,
              displayOrder: processedCompany.displayOrder,
            },
            imageFile
          );
          setAlertMessage({ type: "success", message: "새로운 업체가 추가되었습니다." }); // Use alertMessage for page level success
          setShowModal(false); // Close modal on success
          fetchCompanies(); // Refresh list
        } catch (err) {
          console.error("Error creating casino company:", err);
          setError("업체 추가 중 오류가 발생했습니다."); // Use setError for modal alert
        }
      }
    } catch (error) {
      console.error("Error saving casino company:", error);
      setError("업체 정보 저장 중 오류가 발생했습니다."); // Use setError for modal alert
    } finally {
      setIsSaving(false);
    }
  };

  // 업체 삭제 (개별)
  const handleDeleteCompany = async (id: number) => {
    if (!window.confirm("정말로 이 업체를 삭제하시겠습니까?")) return;
    setLoading(true); // Use main loading state
    setError(null);
    setAlertMessage(null);

    try {
      await CasinoCompanyApiService.deleteCasinoCompany(id);
      setAlertMessage({ type: "success", message: "업체가 삭제되었습니다." });
      // Remove from selection if it was selected
      setSelectedCompanyIds((prev) => prev.filter((compId) => compId !== id));
      // Fetch current page again after delete
      fetchCompanies(currentPage, PAGE_SIZE);
    } catch (err: any) {
      console.error("Error deleting casino company:", err);
      const message = err.response?.data?.message || "업체 삭제 중 오류가 발생했습니다.";
      setError(message); // Set error for Alert component
      setAlertMessage({ type: "error", message });
      // Attempt to refresh anyway, might resolve inconsistent state
      fetchCompanies(currentPage, PAGE_SIZE);
    } finally {
      setLoading(false);
    }
  };

  // 일괄 삭제 핸들러 (개별 삭제 반복 호출)
  const handleBulkDelete = async () => {
    if (selectedCompanyIds.length === 0) {
      setAlertMessage({ type: "error", message: "삭제할 업체를 선택해주세요." });
      return;
    }
    if (!window.confirm(`선택된 ${selectedCompanyIds.length}개의 업체를 정말 삭제하시겠습니까?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setAlertMessage(null);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // 선택된 각 ID에 대해 개별 삭제 함수 호출
    for (const id of selectedCompanyIds) {
      try {
        // 개별 삭제 API 호출 (서비스 함수 직접 호출)
        await CasinoCompanyApiService.deleteCasinoCompany(id);
        successCount++;
      } catch (err: any) {
        errorCount++;
        const message = err.message || `업체(ID: ${id}) 삭제 중 오류 발생`;
        errors.push(message);
        console.error(`Error deleting company ${id}:`, err);
      }
    }

    setSelectedCompanyIds([]); // 완료 후 선택 해제
    setLoading(false);

    // 결과 메시지 설정
    if (errorCount === 0) {
      setAlertMessage({
        type: "success",
        message: `${successCount}개의 업체가 성공적으로 삭제되었습니다.`,
      });
    } else if (successCount === 0) {
      setAlertMessage({
        type: "error",
        message: `선택된 업체를 삭제하는 중 오류가 발생했습니다. (${errors.join(", ")})`,
      });
      setError(`선택된 업체를 삭제하는 중 오류가 발생했습니다.`); // 페이지 상단 에러 표시용
    } else {
      setAlertMessage({
        type: "error", // 부분 성공도 에러로 표시 (혹은 warning)
        message: `${successCount}개 삭제 성공, ${errorCount}개 삭제 실패. (${errors.join(", ")})`,
      });
      setError(`${errorCount}개 업체 삭제 실패.`); // 페이지 상단 에러 표시용
    }

    // 목록 새로고침 (삭제 성공/실패 여부와 관계없이 최신 상태 반영)
    fetchCompanies(currentPage, PAGE_SIZE);
  };

  // 개별 선택 핸들러 추가
  const handleSelectCompany = (id: number) => {
    setSelectedCompanyIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((compId) => compId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // 전체 선택 핸들러 추가
  const handleSelectAllCompanies = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedCompanyIds(companies.map((comp) => comp.id));
    } else {
      setSelectedCompanyIds([]);
    }
  };

  // 댓글 관리 모달 열기 핸들러 추가
  const handleOpenCommentModal = async (company: CasinoCompany) => {
    setSelectedCompanyForComment(company);
    setShowCommentModal(true);
    setReviewsLoading(true);
    setReviewsError(null);

    try {
      const reviews = await CasinoCompanyApiService.getCompanyReviews(company.id);
      setCompanyReviews(reviews);
    } catch (error) {
      console.error("댓글 조회 오류:", error);
      setReviewsError("댓글 목록을 불러오는데 실패했습니다.");
      setCompanyReviews([]);

      // 오류 시 댓글 개수 0으로 설정
      setReviewCounts((prev) => ({
        ...prev,
        [company.id]: 0,
      }));
    } finally {
      setReviewsLoading(false);
    }
  };

  // 댓글 관리 모달 닫기 핸들러 추가
  const handleCloseCommentModal = () => {
    setShowCommentModal(false);
    setSelectedCompanyForComment(null);
    setCompanyReviews([]);
    setReviewsError(null);
  };

  // 댓글 삭제 핸들러 추가
  const handleDeleteReview = async (reviewId: number) => {
    if (!window.confirm("정말로 이 댓글을 삭제하시겠습니까?")) return;

    try {
      await CasinoCompanyApiService.deleteCompanyReview(reviewId);
      setCompanyReviews((prev) => prev.filter((review) => review.id !== reviewId));

      setAlertMessage({ type: "success", message: "댓글이 삭제되었습니다." });
    } catch (error) {
      console.error("댓글 삭제 오류:", error);
      setAlertMessage({ type: "error", message: "댓글 삭제 중 오류가 발생했습니다." });
    }
  };

  // 댓글 수정 모달 열기 핸들러
  const handleEditReview = (review: CompanyReview) => {
    setSelectedReview(review);
    setEditReviewData({
      content: review.content,
      rating: review.rating,
    });
    setShowEditReviewModal(true);
  };

  // 댓글 수정 모달 닫기 핸들러
  const handleCloseEditReviewModal = () => {
    setShowEditReviewModal(false);
    setSelectedReview(null);
    setEditReviewData({ content: "", rating: 0 });
  };

  // 댓글 수정 저장 핸들러
  const handleSaveReviewEdit = async () => {
    if (!selectedReview) return;

    if (!editReviewData.content.trim()) {
      setAlertMessage({ type: "error", message: "댓글 내용을 입력해주세요." });
      return;
    }

    setIsEditingReview(true);
    try {
      const updatedReview = await CasinoCompanyApiService.updateCompanyReview(
        selectedReview.id,
        editReviewData
      );

      // 댓글 목록 업데이트
      setCompanyReviews((prev) =>
        prev.map((review) => (review.id === selectedReview.id ? updatedReview : review))
      );

      setAlertMessage({ type: "success", message: "댓글이 수정되었습니다." });
      handleCloseEditReviewModal();
    } catch (error) {
      console.error("댓글 수정 오류:", error);
      setAlertMessage({ type: "error", message: "댓글 수정 중 오류가 발생했습니다." });
    } finally {
      setIsEditingReview(false);
    }
  };

  // displayOrder 입력값 변경 핸들러
  const handleDisplayOrderInputChange = (index: number, newOrder: number) => {
    setCompanies((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], displayOrder: newOrder };
      return updated;
    });
  };

  // displayOrder 일괄 저장 핸들러
  const handleBulkDisplayOrderSave = async () => {
    setLoading(true);
    try {
      const changed = companies.filter((comp) => {
        const original = originalCompanies.find((o) => o.id === comp.id);
        return original && comp.displayOrder !== original.displayOrder;
      });
      if (changed.length === 0) {
        setLoading(false);
        return;
      }
      await Promise.all(
        changed.map((comp) =>
          CasinoCompanyApiService.updateDisplayOrder(comp.id, comp.displayOrder)
        )
      );
      fetchCompanies(currentPage, PAGE_SIZE);
    } catch (err) {
      // do nothing
    } finally {
      setLoading(false);
    }
  };

  // 업체 정보 필드의 UI 처리
  const renderCasinoInfoField = () => {
    const companyInfoPath = currentCompany?.linkUrl2 || "";

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">업체 정보</label>
        <div className="flex items-center">
          <span className="bg-gray-100 px-3 py-2 text-gray-500 border border-r-0 border-gray-300 rounded-l-md">
            {CASINO_INFO_URL_PREFIX}
          </span>
          <input
            type="text"
            value={companyInfoPath}
            onChange={(e) => setCurrentCompany({ ...currentCompany!, linkUrl2: e.target.value })}
            placeholder="업체 고유 경로 입력"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          전체 URL: {CASINO_INFO_URL_PREFIX}
          {companyInfoPath}
        </p>
      </div>
    );
  };

  // 데이터 테이블 컬럼 정의
  const columns = [
    {
      header: (
        <input
          type="checkbox"
          className="form-checkbox h-4 w-4 text-blue-600"
          onChange={handleSelectAllCompanies}
          checked={companies.length > 0 && selectedCompanyIds.length === companies.length}
          ref={(input) => {
            if (input) {
              input.indeterminate =
                selectedCompanyIds.length > 0 && selectedCompanyIds.length < companies.length;
            }
          }}
          disabled={loading || companies.length === 0}
        />
      ),
      accessor: "id" as keyof CasinoCompany,
      cell: (value: unknown, row: CasinoCompany, index: number) => (
        <input
          type="checkbox"
          className="form-checkbox h-4 w-4 text-blue-600"
          checked={selectedCompanyIds.includes(row.id)}
          onChange={() => handleSelectCompany(row.id)}
          disabled={loading || isMoving || isSaving}
        />
      ),
      className: "w-px px-4",
    },
    {
      header: "업체명",
      accessor: "companyName" as keyof CasinoCompany,
      cell: (value: unknown, row: CasinoCompany, index: number) => (
        <span
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          onClick={() => handleEditCompany(row)}
        >
          {value as string}
        </span>
      ),
    },
    {
      header: "로고 이미지",
      accessor: "imageUrl" as keyof CasinoCompany,
      cell: (value: unknown) =>
        value ? (
          <img src={value as string} alt="로고" className="h-10 w-auto object-contain" />
        ) : (
          <span>이미지 없음</span>
        ),
      size: 120,
    },
    {
      header: "상태",
      accessor: "isPublic" as keyof CasinoCompany,
      cell: (value: unknown) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            value === 1 || value === true
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {value === 1 || value === true ? "공개" : "비공개"}
        </span>
      ),
      size: 80,
    },
    {
      header: "등록일자",
      accessor: "createdAt" as keyof CasinoCompany,
      cell: (value: unknown) => formatDate(value as string),
    },
    // 순서 컬럼: 관리 컬럼 왼쪽, 등록일자 다음
    {
      header: "순서",
      accessor: "displayOrder" as keyof CasinoCompany,
      cell: (value: unknown, row: CasinoCompany, index: number) => (
        <input
          type="number"
          min={1}
          className="w-16 text-center border rounded"
          value={value as number}
          onChange={(e) => handleDisplayOrderInputChange(index, Number(e.target.value))}
          disabled={loading || isMoving || isSaving}
        />
      ),
      className: "w-20 text-center",
    },
    {
      header: "관리",
      accessor: "id" as keyof CasinoCompany,
      cell: (value: unknown, row: CasinoCompany, index: number) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleOpenCommentModal(row)}
            className="inline-flex items-center justify-center px-3 py-1 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md focus:outline-none transition-colors w-28"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            댓글 ({reviewCounts[row.id] || 0})
          </button>
          <ActionButton
            label="수정"
            action="edit"
            size="sm"
            onClick={() => handleEditCompany(row)}
          />
          <ActionButton
            label="삭제"
            action="delete"
            size="sm"
            onClick={() => handleDeleteCompany(row.id)}
          />
        </div>
      ),
      size: 250,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">카지노 업체 관리</h1>
        <SearchInput
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          onSearch={handleSearch}
        />
        <div className="flex space-x-2">
          <Button
            onClick={handleBulkDisplayOrderSave}
            variant="primary"
            disabled={loading || isSaving || isMoving}
          >
            순서 저장
          </Button>
          <Button
            onClick={handleBulkDelete}
            variant="danger"
            disabled={selectedCompanyIds.length === 0 || loading || isSaving || isMoving}
          >
            {`선택 삭제 (${selectedCompanyIds.length})`}
          </Button>
          <Button
            onClick={handleAddCompany}
            variant="primary"
            disabled={loading || isSaving || isMoving}
          >
            업체 추가
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

      {error && !alertMessage && (
        <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />
      )}

      {/* Wrap the loading indicator and DataTable inside the styled div */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={companies}
            loading={loading} // Pass loading state to DataTable as well if needed internally
            emptyMessage={
              searchValue ? "검색된 결과가 없습니다." : "등록된 카지노 업체가 없습니다."
            }
            pagination={{
              currentPage,
              pageSize: PAGE_SIZE,
              totalItems,
              onPageChange: handlePageChange,
            }}
          />
        )}
      </div>

      {/* 로딩 오버레이 */}
      <LoadingOverlay isLoading={loading || isSaving || isMoving} />

      {/* 업체 추가/수정 모달 */}
      {showModal && currentCompany && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={isEditing ? "업체 정보 수정" : "새 업체 추가"}
          size="xl"
        >
          {/* Modal Error Alert (Above controls) */}
          {error && (
            <div className="my-4">
              <Alert type="error" message={error} onClose={() => setError(null)} />
            </div>
          )}

          {/* Top Control Area */}
          <div className="flex justify-between items-center pt-2 pb-4 border-b border-gray-200 mb-6">
            {/* Buttons (Left) */}
            <div className="flex space-x-3">
              <Button onClick={handleSaveCompany} variant="primary">
                {isEditing ? "저장" : "등록"}
              </Button>
              <Button onClick={() => setShowModal(false)} variant="secondary">
                취소
              </Button>
            </div>
            {/* Public Toggle Checkbox (Right) */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPublic-modal"
                checked={currentCompany?.isPublic === 1}
                onChange={(e) =>
                  setCurrentCompany(
                    currentCompany
                      ? {
                          ...currentCompany,
                          isPublic: e.target.checked ? 1 : 0,
                        }
                      : null
                  )
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isPublic-modal" className="ml-2 block text-sm text-gray-900">
                공개 여부
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="업체명"
              value={currentCompany.companyName || ""}
              onChange={(e) =>
                setCurrentCompany({ ...currentCompany, companyName: e.target.value })
              }
              required
            />

            <FileUpload label="업로드" onChange={handleFileChange} />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">업체소개</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={currentCompany.description || ""}
                onChange={(e) =>
                  setCurrentCompany({ ...currentCompany, description: e.target.value })
                }
                rows={4}
                required
              />
            </div>

            <Input
              label="업체 링크"
              value={currentCompany.linkUrl1 || ""}
              onChange={(e) => setCurrentCompany({ ...currentCompany, linkUrl1: e.target.value })}
              placeholder="https://"
            />

            {renderCasinoInfoField()}
          </div>
        </Modal>
      )}

      {/* 댓글 관리 모달 */}
      {showCommentModal && selectedCompanyForComment && (
        <Modal
          isOpen={showCommentModal}
          onClose={handleCloseCommentModal}
          title={`${selectedCompanyForComment.companyName} - 댓글 관리`}
          size="xl"
        >
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">업체 정보</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">업체명:</span>{" "}
                  {selectedCompanyForComment.companyName}
                </div>
                <div>
                  <span className="font-medium">상태:</span>{" "}
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedCompanyForComment.isPublic === 1
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {selectedCompanyForComment.isPublic === 1 ? "공개" : "비공개"}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium text-gray-900">댓글 목록</h4>
                <div className="text-sm text-gray-500">총 {companyReviews.length}개의 댓글</div>
              </div>

              {reviewsError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-600 text-sm">{reviewsError}</p>
                </div>
              )}

              {reviewsLoading ? (
                <div className="bg-gray-50 p-8 rounded-lg text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-gray-500">댓글 목록을 불러오는 중...</p>
                </div>
              ) : companyReviews.length === 0 ? (
                <div className="bg-gray-50 p-8 rounded-lg text-center">
                  <div className="text-gray-500 mb-2">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-500">아직 댓글이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-2 sticky top-0 bg-white py-1">
                    댓글 목록 ({companyReviews.length}개)
                  </div>
                  {companyReviews.map((review) => (
                    <div key={review.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm text-gray-900">
                            {review.user?.nickname || "익명"}
                          </span>
                          <div className="flex items-center space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating ? "text-yellow-400" : "text-gray-300"
                                }`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span className="text-sm text-gray-500">({review.rating})</span>
                        </div>
                        <div className="text-xs text-gray-500">{formatDate(review.createdAt)}</div>
                      </div>
                      <div className="flex justify-between items-start">
                        <p className="text-gray-700 text-sm flex-1 break-words overflow-hidden">
                          {review.content}
                        </p>
                        <div className="flex flex-col space-y-1 ml-4 flex-shrink-0">
                          <ActionButton
                            label="수정"
                            action="edit"
                            size="sm"
                            onClick={() => handleEditReview(review)}
                          />
                          <ActionButton
                            label="삭제"
                            action="delete"
                            size="sm"
                            onClick={() => handleDeleteReview(review.id)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button onClick={handleCloseCommentModal} variant="secondary">
                닫기
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 댓글 수정 모달 */}
      {showEditReviewModal && selectedReview && (
        <Modal
          isOpen={showEditReviewModal}
          onClose={handleCloseEditReviewModal}
          title="댓글 수정"
          size="lg"
        >
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">댓글 정보</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">작성자:</span>{" "}
                  {selectedReview.user?.nickname || "익명"}
                </div>
                <div>
                  <span className="font-medium">작성일:</span>{" "}
                  {formatDate(selectedReview.createdAt)}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">평점</label>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setEditReviewData((prev) => ({ ...prev, rating }))}
                    className={`p-1 rounded ${
                      editReviewData.rating >= rating ? "text-yellow-400" : "text-gray-300"
                    } hover:text-yellow-400`}
                  >
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-500">({editReviewData.rating}/5)</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">댓글 내용</label>
              <textarea
                value={editReviewData.content}
                onChange={(e) =>
                  setEditReviewData((prev) => ({ ...prev, content: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                rows={4}
                placeholder="댓글 내용을 입력하세요"
                style={{ wordWrap: "break-word", overflowWrap: "break-word" }}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button onClick={handleCloseEditReviewModal} variant="secondary">
                취소
              </Button>
              <Button onClick={handleSaveReviewEdit} variant="primary" disabled={isEditingReview}>
                {isEditingReview ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CasinoCompanyPage;
