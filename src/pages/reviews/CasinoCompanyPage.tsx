import React, { useState, useEffect, useRef } from "react";
import CasinoCompanyApiService from "../../services/CasinoCompanyApiService";
import { CasinoCompany } from "../../types";
import DataTable from "../../components/DataTable";
import Button from "../../components/Button";
import ActionButton from "../../components/ActionButton";
import Modal from "../../components/Modal";
import Input from "../../components/forms/Input";
import FileUpload from "../../components/forms/FileUpload";
import Alert from "../../components/Alert";
import { formatDate } from "../../utils/dateUtils";
import axios from "@/api/axios";
import { extractDataArray } from "../../api/util";
import LoadingOverlay from "../../components/LoadingOverlay";
import { ApiResponse, PaginatedData } from "../../types"; // Import ApiResponse and PaginatedData

// .env에서 카지노 정보 URL 접두사 가져오기
const CASINO_INFO_URL_PREFIX =
  import.meta.env.VITE_CASINO_INFO_URL_PREFIX || "www.casinoguru-en.com/";

const CasinoCompanyPage: React.FC = () => {
  const [companies, setCompanies] = useState<CasinoCompany[]>([]);
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

  // 페이지네이션 상태 추가
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);

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

  // 카지노 업체 목록 조회 (페이지네이션 적용)
  const fetchCompanies = async (page: number = currentPage, limit: number = pageSize) => {
    setLoading(true);
    setError(null);
    const currentSelected = [...selectedCompanyIds]; // Keep selection

    try {
      // CasinoCompanyApiService 서비스를 사용하여 API 호출 (page, limit 전달)
      // 응답 타입을 ApiResponse<PaginatedData<CasinoCompany>>로 수정
      const response: ApiResponse<PaginatedData<CasinoCompany>> =
        await CasinoCompanyApiService.getCasinoCompanies(page, limit);
      console.log("카지노 업체 응답 구조:", response);

      // API 응답 구조 확인 및 데이터 처리 (제공된 구조 기반)
      if (response && response.success && response.data) {
        const {
          items,
          total,
          page: currentPageFromApi,
          limit: pageSizeFromApi,
          totalPages: totalPagesFromApi,
        } = response.data;

        console.log("추출된 업체 데이터:", items);

        if (Array.isArray(items)) {
          // 서버 응답을 컴포넌트에서 사용하는 형식으로 변환
          const transformedCompanies = items.map((company: any) => ({
            id: company.id,
            companyName: company.companyName || company.name || "",
            description: company.description || company.content || "",
            imageUrl: company.imageUrl || company.logoUrl || company.logo || "",
            linkUrl1: company.linkUrl1 || company.website || "",
            linkUrl2: company.linkUrl2 || "",
            rating: Number(company.rating || 0),
            isPublic: company.isPublic === 1 || company.isPublic === true ? 1 : 0,
            displayOrder: company.displayOrder || company.position || 0,
            createdAt: company.createdAt || new Date().toISOString(),
            updatedAt: company.updatedAt || company.createdAt || new Date().toISOString(),
          })) as CasinoCompany[];

          // 서버에서 정렬된 순서대로 데이터를 제공한다고 가정하고, 클라이언트 측 정렬 제거
          setCompanies(transformedCompanies);

          // 페이지네이션 정보 업데이트
          setTotalItems(total);
          // 명시적으로 호출된 경우 페이지 번호를 다시 설정하지 않음
          if (page === currentPage) {
            setCurrentPage(currentPageFromApi);
          }
          setPageSize(pageSizeFromApi);
          setTotalPages(totalPagesFromApi);

          // Restore selection
          setSelectedCompanyIds(
            currentSelected.filter((id) => transformedCompanies.some((comp) => comp.id === id))
          );
        } else {
          console.log("items 데이터가 배열 형식이 아닙니다.");
          setCompanies([]);
          setSelectedCompanyIds([]); // Clear selection
          setError("카지노 업체 목록 형식이 올바르지 않습니다.");
          // 페이지네이션 상태 초기화
          setTotalItems(0);
          setCurrentPage(1);
          setPageSize(limit); // 요청한 limit 값으로 설정
          setTotalPages(1);
        }
      } else {
        console.log("적절한 업체 데이터를 찾지 못했습니다.");
        setCompanies([]);
        setSelectedCompanyIds([]); // Clear selection
        setError(response?.message || "카지노 업체 목록을 불러오는데 실패했습니다.");
        // 페이지네이션 상태 초기화
        setTotalItems(0);
        setCurrentPage(1);
        setPageSize(limit); // 요청한 limit 값으로 설정
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Error fetching casino companies:", err);
      setError("카지노 업체 목록을 불러오는데 실패했습니다.");
      setCompanies([]);
      setSelectedCompanyIds([]); // Clear selection
      // 페이지네이션 상태 초기화
      setTotalItems(0);
      setCurrentPage(1);
      setPageSize(limit); // 요청한 limit 값으로 설정
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies(currentPage, pageSize); // 컴포넌트 마운트 시 첫 페이지 데이터 로드
  }, []); // 컴포넌트 마운트 시에만 실행

  // 페이지 변경 핸들러 추가
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page); // 먼저 currentPage 상태를 업데이트
      fetchCompanies(page, pageSize); // 새 페이지 데이터 요청
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
      displayOrder: totalItems + 1, // 전체 아이템 수 + 1로 displayOrder 설정
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

    // Clear modal error first
    setError(null);
    // Clear alert message at the beginning
    setAlertMessage(null);

    try {
      setIsSaving(true);
      // 필수 필드 검증
      if (!currentCompany.companyName || !currentCompany.description) {
        setError("업체명과 업체소개는 필수 항목입니다."); // Use setError for modal alert
        setIsSaving(false); // Stop saving process
        return;
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
      fetchCompanies(currentPage, pageSize);
    } catch (err: any) {
      console.error("Error deleting casino company:", err);
      const message = err.response?.data?.message || "업체 삭제 중 오류가 발생했습니다.";
      setError(message); // Set error for Alert component
      setAlertMessage({ type: "error", message });
      // Attempt to refresh anyway, might resolve inconsistent state
      fetchCompanies(currentPage, pageSize);
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
    fetchCompanies(currentPage, pageSize);
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

  // 업체 순서 변경 (위로 이동)
  const handleMoveUp = async (company: CasinoCompany, index: number) => {
    if (index <= 0 || isMoving) return;

    const prevCompany = companies[index - 1];
    if (!prevCompany) return;

    const currentDisplayOrder = company.displayOrder;
    const prevDisplayOrder = prevCompany.displayOrder;

    if (currentDisplayOrder === prevDisplayOrder) {
      console.warn("Attempted to move up, but display orders are the same.");
      // fetchCompanies(); // No need to fetch if nothing changed
      return;
    }

    setIsMoving(true);
    try {
      // Call the API to update displayOrder for both companies
      await CasinoCompanyApiService.updateDisplayOrder(company.id, prevDisplayOrder);
      await CasinoCompanyApiService.updateDisplayOrder(prevCompany.id, currentDisplayOrder);

      // Fetch data again to get the correct order from the server
      await fetchCompanies(currentPage, pageSize); // Refetch current page
      setAlertMessage({ type: "success", message: "순서가 변경되었습니다." });
    } catch (error) {
      console.error("Error moving company up:", error);
      setAlertMessage({ type: "error", message: "순서 변경 중 오류가 발생했습니다." });
      // Fetch data even on error to try and sync state
      fetchCompanies(currentPage, pageSize);
    } finally {
      setIsMoving(false);
    }
  };

  // 업체 순서 변경 (아래로 이동)
  const handleMoveDown = async (company: CasinoCompany, index: number) => {
    if (index >= companies.length - 1 || isMoving) return;

    const nextCompany = companies[index + 1];
    if (!nextCompany) return;

    const currentDisplayOrder = company.displayOrder;
    const nextDisplayOrder = nextCompany.displayOrder;

    if (currentDisplayOrder === nextDisplayOrder) {
      console.warn("Attempted to move down, but display orders are the same.");
      // fetchCompanies(); // No need to fetch if nothing changed
      return;
    }

    setIsMoving(true);
    try {
      // Call the API to update displayOrder for both companies
      await CasinoCompanyApiService.updateDisplayOrder(company.id, nextDisplayOrder);
      await CasinoCompanyApiService.updateDisplayOrder(nextCompany.id, currentDisplayOrder);

      // Fetch data again to get the correct order from the server
      await fetchCompanies(currentPage, pageSize); // Refetch current page
      setAlertMessage({ type: "success", message: "순서가 변경되었습니다." });
    } catch (error) {
      console.error("Error moving company down:", error);
      setAlertMessage({ type: "error", message: "순서 변경 중 오류가 발생했습니다." });
      // Fetch data even on error to try and sync state
      fetchCompanies(currentPage, pageSize);
    } finally {
      setIsMoving(false);
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
      cell: (id: number) => (
        <input
          type="checkbox"
          className="form-checkbox h-4 w-4 text-blue-600"
          checked={selectedCompanyIds.includes(id)}
          onChange={() => handleSelectCompany(id)}
          disabled={loading || isMoving || isSaving}
        />
      ),
      className: "w-px px-4",
    },
    {
      header: "업체명",
      accessor: "companyName" as keyof CasinoCompany,
      cell: (value: string, row: CasinoCompany) => (
        <span
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          onClick={() => handleEditCompany(row)}
        >
          {value}
        </span>
      ),
    },
    // 2. 로고 이미지 (Moved to second)
    {
      header: "로고 이미지",
      accessor: "imageUrl" as keyof CasinoCompany,
      cell: (value: string) =>
        value ? (
          <img src={value} alt="로고" className="h-10 w-auto object-contain" />
        ) : (
          <span>이미지 없음</span>
        ),
      size: 120,
    },
    // 3. 상태 (표시 여부)
    {
      header: "상태",
      accessor: "isPublic" as keyof CasinoCompany,
      cell: (value: number | boolean) => (
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
    // 4. 등록일자
    {
      header: "등록일자",
      accessor: "createdAt" as keyof CasinoCompany,
      cell: (value: string) => formatDate(value),
    },
    // 5. 관리
    {
      header: "관리",
      accessor: "id" as keyof CasinoCompany, // Assuming 'id' is the accessor for actions
      cell: (value: any, row: CasinoCompany, index: number) => (
        <div className="flex space-x-2">
          <ActionButton
            label="위로"
            action="up"
            size="sm"
            onClick={() => handleMoveUp(row, index)}
            disabled={isMoving || index === 0}
          />
          <ActionButton
            label="아래로"
            action="down"
            size="sm"
            onClick={() => handleMoveDown(row, index)}
            disabled={isMoving || index === companies.length - 1}
          />
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
      size: 200, // Adjust size as needed
    },
  ];

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

  return (
    <div className="w-full px-8 py-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">카지노 업체 관리</h1>
        <div className="flex space-x-2">
          <Button
            variant="danger"
            onClick={handleBulkDelete}
            disabled={selectedCompanyIds.length === 0 || loading || isSaving || isMoving}
          >
            {`선택 삭제 (${selectedCompanyIds.length})`}
          </Button>
          <Button
            variant="primary"
            onClick={handleAddCompany}
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
            emptyMessage="등록된 카지노 업체가 없습니다."
            pagination={{
              currentPage,
              pageSize,
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

            <FileUpload
              label="업체 이미지"
              onChange={handleFileChange}
              value={currentCompany?.imageUrl || undefined}
              accept=".png,.jpg,.jpeg,.gif,.webp,image/png,image/jpeg,image/gif,image/webp"
              required={!isEditing}
            />

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
    </div>
  );
};

export default CasinoCompanyPage;
