import axios from "../api/axios";
import { CasinoCompany, CompanyReview, ApiResponse } from "../types";

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
  // 카지노 업체 목록 조회
  getCasinoCompanies: async (): Promise<CasinoCompany[]> => {
    try {
      const response = await axios.get("/companies");
      if (response.data && response.data.success) {
        // 각 회사 객체의 linkUrl2에서 접두사 제거
        const companies = response.data.data;
        return companies.map((company) => processCompanyData(company));
      }
      throw new Error(response.data.message || "카지노 업체 조회에 실패했습니다.");
    } catch (error) {
      console.error("카지노 업체 조회 오류:", error);
      throw error;
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

    // linkUrl2에는 접두사를 붙여서 전송
    if (companyData.linkUrl2) {
      let fullUrl = companyData.linkUrl2;
      // 이미 접두사가 있는 경우 중복 방지
      if (!fullUrl.startsWith(CASINO_INFO_URL_PREFIX)) {
        fullUrl = CASINO_INFO_URL_PREFIX + fullUrl;
      }
      formData.append("linkUrl2", fullUrl);
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

      // linkUrl2에는 접두사를 붙여서 전송
      if (companyData.linkUrl2) {
        let fullUrl = companyData.linkUrl2;
        // 이미 접두사가 있는 경우 중복 방지
        if (!fullUrl.startsWith(CASINO_INFO_URL_PREFIX)) {
          fullUrl = CASINO_INFO_URL_PREFIX + fullUrl;
        }
        formData.append("linkUrl2", fullUrl);
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
