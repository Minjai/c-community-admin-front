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
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isMoving, setIsMoving] = useState<boolean>(false);

  // 초기 상태 설정
  const initialCompanyState: Partial<CasinoCompany> = {
    companyName: "",
    description: "",
    imageUrl: "",
    isPublic: 1,
    displayOrder: 0,
    linkUrl1: "",
    linkUrl2: "",
    rating: 0,
  };

  // 카지노 업체 목록 조회
  const fetchCompanies = async () => {
    setLoading(true);
    setError(null);

    try {
      // CasinoCompanyApiService 서비스를 사용하여 API 호출
      const response = await CasinoCompanyApiService.getCasinoCompanies();
      console.log("카지노 업체 응답 구조:", response);

      if (response && Array.isArray(response)) {
        console.log("추출된 업체 데이터:", response);

        // 서버 응답을 컴포넌트에서 사용하는 형식으로 변환
        const transformedCompanies = response.map((company: any) => ({
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

        // displayOrder 기준으로 내림차순 정렬 (높은 값이 위로)
        const sortedCompanies = [...transformedCompanies].sort(
          (a, b) => (b.displayOrder || 0) - (a.displayOrder || 0)
        );

        setCompanies(sortedCompanies);
      } else {
        console.log("적절한 업체 데이터를 찾지 못했습니다.");
        setCompanies([]);
        setError("카지노 업체 목록을 불러오는데 실패했습니다.");
      }
    } catch (err) {
      console.error("Error fetching casino companies:", err);
      setError("카지노 업체 목록을 불러오는데 실패했습니다.");
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // 이미지 파일 처리 함수
  const handleFile = (file: File) => {
    setImageFile(file);
    // 이미지 미리보기 URL 생성
    const fileUrl = URL.createObjectURL(file);
    setPreviewUrl(fileUrl);
  };

  // 파일 선택 처리
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // 드래그 이벤트 처리
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // 드롭 이벤트 처리
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // 버튼 클릭 시 파일 선택 열기
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // 업체 추가 모달 열기
  const handleAddCompany = () => {
    setCurrentCompany({
      id: 0,
      companyName: "",
      description: "",
      imageUrl: "",
      isPublic: 1,
      displayOrder: companies.length + 1,
      linkUrl1: "",
      linkUrl2: "",
      rating: 0,
      createdAt: new Date().toISOString(),
    });
    setImageFile(null);
    setShowModal(true);
    setIsEditing(false);
    setPreviewUrl(null);
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

    // 이미지 URL이 있으면 미리보기 설정
    if (company.imageUrl) {
      setPreviewUrl(company.imageUrl);
    } else {
      setPreviewUrl(null);
    }
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

  // 업체 삭제 처리
  const handleDeleteCompany = async (id: number) => {
    if (!window.confirm("정말 이 업체를 삭제하시겠습니까?")) {
      return;
    }

    try {
      await CasinoCompanyApiService.deleteCasinoCompany(id);
      setAlertMessage({ type: "success", message: "업체가 삭제되었습니다." });
      fetchCompanies();
    } catch (error) {
      console.error("Error deleting casino company:", error);
      setAlertMessage({ type: "error", message: "업체 삭제 중 오류가 발생했습니다." });
    }
  };

  // 업체 순서 변경 (위로 이동)
  const handleMoveUp = async (company: CasinoCompany, index: number) => {
    if (index <= 0) return; // 이미 첫 번째 항목인 경우

    try {
      setIsMoving(true);
      // 현재 업체와 이전 업체의 displayOrder 값을 서로 교환
      const prevCompany = companies[index - 1];
      const currentDisplayOrder = company.displayOrder;
      const prevDisplayOrder = prevCompany.displayOrder;

      await CasinoCompanyApiService.updateCasinoCompany(
        company.id,
        { ...company, displayOrder: prevDisplayOrder },
        undefined
      );

      await CasinoCompanyApiService.updateCasinoCompany(
        prevCompany.id,
        { ...prevCompany, displayOrder: currentDisplayOrder },
        undefined
      );

      fetchCompanies();
    } catch (error) {
      console.error("Error moving company up:", error);
      setAlertMessage({ type: "error", message: "순서 변경 중 오류가 발생했습니다." });
    } finally {
      setIsMoving(false);
    }
  };

  // 업체 순서 변경 (아래로 이동)
  const handleMoveDown = async (company: CasinoCompany, index: number) => {
    if (index >= companies.length - 1) return; // 이미 마지막 항목인 경우

    try {
      setIsMoving(true);
      // 현재 업체와 다음 업체의 displayOrder 값을 서로 교환
      const nextCompany = companies[index + 1];
      const currentDisplayOrder = company.displayOrder;
      const nextDisplayOrder = nextCompany.displayOrder;

      await CasinoCompanyApiService.updateCasinoCompany(
        company.id,
        { ...company, displayOrder: nextDisplayOrder },
        undefined
      );

      await CasinoCompanyApiService.updateCasinoCompany(
        nextCompany.id,
        { ...nextCompany, displayOrder: currentDisplayOrder },
        undefined
      );

      fetchCompanies();
    } catch (error) {
      console.error("Error moving company down:", error);
      setAlertMessage({ type: "error", message: "순서 변경 중 오류가 발생했습니다." });
    } finally {
      setIsMoving(false);
    }
  };

  // 데이터 테이블 컬럼 정의
  const columns = [
    // 1. 업체 명 (Moved to first)
    {
      header: "업체 명",
      accessor: "companyName" as keyof CasinoCompany,
      cell: (value: string, row: CasinoCompany) => (
        <span
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer block max-w-xs truncate" // Apply blue style and click handler
          onClick={() => handleEditCompany(row)} // Call edit handler on click
          title={value}
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
    // 3. 평점
    {
      header: "평점",
      accessor: "rating" as keyof CasinoCompany,
      cell: (value: number) => value?.toFixed(1) ?? "0.0",
      size: 80,
    },
    // 4. 상태 (표시 여부)
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
    // 5. 등록일자
    {
      header: "등록일자",
      accessor: "createdAt" as keyof CasinoCompany,
      cell: (value: string) => formatDate(value),
    },
    // 6. 관리
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
        <Button onClick={handleAddCompany} variant="primary">
          업체 추가
        </Button>
      </div>

      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
          className="mb-4"
        />
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <DataTable data={companies} columns={columns} />
      )}

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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">업체 이미지</label>
              <div
                className={`mt-1 border-2 border-dashed rounded-md h-64 flex flex-col items-center justify-center cursor-pointer relative ${
                  dragActive ? "border-indigo-500 bg-indigo-50" : "border-gray-300"
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={handleButtonClick}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {previewUrl || (isEditing && currentCompany.imageUrl) ? (
                  <div className="w-full h-full relative">
                    <img
                      src={previewUrl || currentCompany.imageUrl}
                      alt="업체 이미지 미리보기"
                      className="object-contain w-full h-full p-2"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black bg-opacity-50">
                      <span className="text-white text-sm">클릭하여 이미지 변경</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="text-center mt-4">
                      <p className="text-sm text-gray-600">이미지를 드래그하여 업로드하거나</p>
                      <p className="text-sm text-gray-500">클릭하여 선택하세요</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">PNG, JPG, GIF 형식 지원</p>
                  </>
                )}
              </div>
              {isEditing && !previewUrl && currentCompany.imageUrl && (
                <p className="mt-1 text-xs text-gray-500">
                  이미지를 변경하지 않으면 기존 이미지가 유지됩니다.
                </p>
              )}
            </div>

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
