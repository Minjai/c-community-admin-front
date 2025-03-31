import axios from "../api/axios";
import { CasinoCompany, CompanyReview, ApiResponse } from "../types";

// 카지노 업체 API 서비스
const CasinoCompanyApiService = {
  // 카지노 업체 목록 조회
  getCasinoCompanies: async (): Promise<CasinoCompany[]> => {
    try {
      const response = await axios.get("/companies");
      if (response.data && response.data.success) {
        return response.data.data;
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
        return response.data.data;
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
    if (companyData.linkUrl2) formData.append("linkUrl2", companyData.linkUrl2);

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
      if (companyData.linkUrl2) formData.append("linkUrl2", companyData.linkUrl2);

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
