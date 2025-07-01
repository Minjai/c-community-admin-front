import axios from "../api/axios";
import { CasinoCompany, CompanyReview, ApiResponse, PaginatedData } from "../types";
import { extractDataArray } from "../api/util";

// .env에서 카지노 정보 URL 접두사 가져오기
const CASINO_INFO_URL_PREFIX =
  import.meta.env.VITE_CASINO_INFO_URL_PREFIX || "www.casinoguru-en.com/";

// 접두사 제거 유틸리티 함수
const removeUrlPrefix = (url: string | undefined): string | undefined => {
  if (!url) return url;
  return url.startsWith(CASINO_INFO_URL_PREFIX) ? url.replace(CASINO_INFO_URL_PREFIX, "") : url;
};

// 단일 회사 객체에서 접두사 제거
const processCompanyData = (company: CasinoCompany): CasinoCompany => {
  if (company.linkUrl2) {
    company.linkUrl2 = removeUrlPrefix(company.linkUrl2);
  }
  return company;
};

// 카지노 업체 API 서비스
const CasinoCompanyApiService = {
  // 카지노 업체 목록 조회 (페이지네이션 추가)
  getCasinoCompanies: async (
    page: number = 1,
    limit: number = 10,
    searchValue: string = ""
  ): Promise<ApiResponse<PaginatedData<CasinoCompany>>> => {
    try {
      const params: any = { page, limit };

      if (searchValue && searchValue.trim()) {
        params.search = searchValue.trim();
      }

      const response = await axios.get("/companies", {
        params,
      });

      // API 응답이 ApiResponse<PaginatedData<CasinoCompany>> 형태를 준수한다고 가정하고 그대로 반환
      // 데이터 유효성 검사 강화
      if (
        response.data &&
        response.data.success &&
        response.data.data &&
        Array.isArray(response.data.data.items) &&
        typeof response.data.data.total === "number" &&
        typeof response.data.data.page === "number" &&
        typeof response.data.data.limit === "number" &&
        typeof response.data.data.totalPages === "number"
      ) {
        // linkUrl2 처리 (optional)
        response.data.data.items = response.data.data.items.map(processCompanyData);
        return response.data as ApiResponse<PaginatedData<CasinoCompany>>; // Type assertion
      } else {
        // 예상된 구조가 아닐 경우 에러 또는 기본값 처리
        console.warn("API 응답이 예상된 구조와 다릅니다:", response.data);
        // 기본 페이지네이션 구조를 포함한 빈 응답 반환
        return {
          success: false,
          message: response.data?.message || "데이터 형식이 올바르지 않습니다.",
          data: {
            items: [],
            total: 0,
            page: 1,
            limit: limit,
            totalPages: 1,
          },
        };
      }
    } catch (error) {
      console.error("카지노 업체 조회 오류:", error);
      // 에러 발생 시에도 기본 페이지네이션 구조 반환
      return {
        success: false,
        message: "카지노 업체 조회 중 오류가 발생했습니다.",
        data: {
          items: [],
          total: 0,
          page: 1,
          limit: limit,
          totalPages: 1,
        },
      };
    }
  },

  // 카지노 업체 상세 조회
  getCasinoCompanyById: async (id: number): Promise<CasinoCompany> => {
    try {
      const response = await axios.get(`/companies/${id}`);
      if (response.data && response.data.success) {
        // 회사 객체의 linkUrl2에서 접두사 제거
        return processCompanyData(response.data.data);
      }
      throw new Error(response.data.message || "카지노 업체 상세 조회에 실패했습니다.");
    } catch (error) {
      console.error("카지노 업체 상세 조회 오류:", error);
      throw error;
    }
  },

  // 카지노 업체 생성
  createCasinoCompany: async (
    companyData: Partial<CasinoCompany>,
    imageFile: File
  ): Promise<CasinoCompany> => {
    const formData = new FormData();

    // 텍스트 데이터 추가
    if (companyData.companyName) formData.append("companyName", companyData.companyName);
    if (companyData.description) formData.append("description", companyData.description);
    if (companyData.linkUrl1) formData.append("linkUrl1", companyData.linkUrl1);

    // linkUrl2에는 접두사를 붙여서 전송 (빈 문자열 체크 추가)
    if (companyData.linkUrl2 && companyData.linkUrl2.trim() !== "") {
      let fullUrl = companyData.linkUrl2;
      // 이미 접두사가 있는 경우 중복 방지
      if (!fullUrl.startsWith(CASINO_INFO_URL_PREFIX)) {
        fullUrl = CASINO_INFO_URL_PREFIX + fullUrl;
      }
      formData.append("linkUrl2", fullUrl);
    } else {
      // 빈 링크로 전송하여 서버에서 undefined 오류 방지
      formData.append("linkUrl2", "");
    }

    // boolean과 number 값은 문자열로 변환
    if (companyData.isPublic !== undefined)
      formData.append("isPublic", String(companyData.isPublic));
    if (companyData.displayOrder !== undefined)
      formData.append("displayOrder", String(companyData.displayOrder));

    // 이미지 파일 추가
    formData.append("image", imageFile);

    try {
      const response = await axios.post("/companies", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "카지노 업체 생성에 실패했습니다.");
    } catch (error) {
      console.error("카지노 업체 생성 오류:", error);
      throw error;
    }
  },

  // 카지노 업체 수정
  updateCasinoCompany: async (
    id: number,
    companyData: Partial<CasinoCompany>,
    imageFile?: File
  ): Promise<CasinoCompany> => {
    try {
      const formData = new FormData();

      // 텍스트 데이터 추가
      if (companyData.companyName) formData.append("companyName", companyData.companyName);
      if (companyData.description) formData.append("description", companyData.description);
      if (companyData.linkUrl1) formData.append("linkUrl1", companyData.linkUrl1);

      // linkUrl2에는 접두사를 붙여서 전송 (빈 문자열 체크 추가)
      if (companyData.linkUrl2 && companyData.linkUrl2.trim() !== "") {
        let fullUrl = companyData.linkUrl2;
        // 이미 접두사가 있는 경우 중복 방지
        if (!fullUrl.startsWith(CASINO_INFO_URL_PREFIX)) {
          fullUrl = CASINO_INFO_URL_PREFIX + fullUrl;
        }
        formData.append("linkUrl2", fullUrl);
      } else {
        // 빈 링크로 전송하여 서버에서 undefined 오류 방지
        formData.append("linkUrl2", "");
      }

      // boolean과 number 값은 문자열로 변환
      if (companyData.isPublic !== undefined)
        formData.append("isPublic", String(companyData.isPublic));
      if (companyData.displayOrder !== undefined)
        formData.append("displayOrder", String(companyData.displayOrder));

      // 이미지 파일이 있는 경우에만 추가
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const response = await axios.put(`/companies/${id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "카지노 업체 수정에 실패했습니다.");
    } catch (error) {
      console.error("카지노 업체 수정 오류:", error);
      throw error;
    }
  },

  // --- NEW: Update Display Order Only ---
  updateDisplayOrder: async (id: number, displayOrder: number): Promise<void> => {
    try {
      const response = await axios.patch(`/companies/${id}/display-order`, {
        displayOrder: displayOrder, // Send only displayOrder in JSON body
      });

      if (response.data && !response.data.success) {
        // Handle server-side errors indicated in the response body
        throw new Error(
          response.data.message || "카지노 업체 순서 변경(displayOrder)에 실패했습니다."
        );
      }

      // No specific data expected on success for PATCH in this case, return void
    } catch (error) {
      console.error(`카지노 업체 순서 변경 오류 (ID: ${id}, Order: ${displayOrder}):`, error);
      // Re-throw the error to be caught by the calling function (handleMoveUp/Down)
      throw error;
    }
  },
  // --- END: Update Display Order Only ---

  // 카지노 업체 삭제
  deleteCasinoCompany: async (id: number): Promise<void> => {
    try {
      const response = await axios.delete(`/companies/${id}`);
      if (response.data && !response.data.success) {
        throw new Error(response.data.message || "카지노 업체 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("카지노 업체 삭제 오류:", error);
      throw error;
    }
  },

  // 카지노 업체 일괄 삭제 (쿼리 파라미터 사용, 기본 경로)
  /* // 이 함수는 더 이상 사용되지 않으므로 주석 처리 또는 삭제합니다.
  bulkDeleteCasinoCompanies: async (ids: number[]): Promise<void> => {
    if (ids.length === 0) return; // 삭제할 ID가 없으면 요청 보내지 않음
    try {
      // ID 배열을 쉼표로 구분된 문자열로 변환
      const idsString = ids.join(',');
      const response = await axios.delete("/companies", { // 경로를 "/companies/bulk"에서 "/companies"로 수정
        params: { ids: idsString }, // 쿼리 파라미터로 ID 목록 전달 (e.g., ?ids=1,2,3)
      });
      if (response.data && !response.data.success) {
        throw new Error(response.data.message || "카지노 업체 일괄 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("카지노 업체 일괄 삭제 오류:", error);
      throw error;
    }
  },
  */

  // 업체별 리뷰 조회
  getCompanyReviews: async (companyId: number): Promise<CompanyReview[]> => {
    try {
      const response = await axios.get(`/company-reviews/company/${companyId}`);
      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "업체 리뷰 조회에 실패했습니다.");
    } catch (error) {
      console.error("업체 리뷰 조회 오류:", error);
      throw error;
    }
  },
};

export default CasinoCompanyApiService;
