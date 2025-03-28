import axios from "axios";
import { Banner } from "../types";
import { authService } from "./authService";

// API 기본 URL 설정
const API_BASE_URL = "http://localhost:3000"; // 서버 URL 설정

// axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 요청 인터셉터 추가 - 모든 요청에 인증 토큰 추가
apiClient.interceptors.request.use(
  (config) => {
    const token = authService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 배너 API 서비스
const BannerApiService = {
  // 메인 배너 목록 조회
  getMainBanners: async (): Promise<Banner[]> => {
    try {
      const response = await apiClient.get("/api/banner/main");
      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "메인 배너 조회에 실패했습니다.");
    } catch (error) {
      console.error("메인 배너 조회 오류:", error);
      throw error;
    }
  },

  // 업체 배너 목록 조회
  getCompanyBanners: async (): Promise<Banner[]> => {
    try {
      const response = await apiClient.get("/api/banner/company");
      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "업체 배너 조회에 실패했습니다.");
    } catch (error) {
      console.error("업체 배너 조회 오류:", error);
      throw error;
    }
  },

  // 하단 배너 목록 조회
  getBottomBanners: async (): Promise<Banner[]> => {
    try {
      const response = await apiClient.get("/api/banner/bottom");
      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "하단 배너 조회에 실패했습니다.");
    } catch (error) {
      console.error("하단 배너 조회 오류:", error);
      throw error;
    }
  },

  // 미니 배너 목록 조회
  getMiniBanners: async (): Promise<Banner[]> => {
    try {
      const response = await apiClient.get("/api/banner/mini");
      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "미니 배너 조회에 실패했습니다.");
    } catch (error) {
      console.error("미니 배너 조회 오류:", error);
      throw error;
    }
  },

  // 메인 배너 생성
  createMainBanner: async (bannerData: any, pcImage: File, mobileImage: File): Promise<Banner> => {
    const formData = new FormData();

    // 텍스트 데이터 추가
    Object.keys(bannerData).forEach((key) => {
      if (bannerData[key] !== undefined && bannerData[key] !== null) {
        // position 값은 문자열로 변환하여 전송
        if (key === "position") {
          formData.append(key, String(bannerData[key]));
        } else {
          formData.append(key, bannerData[key]);
        }
      }
    });

    // 이미지 파일 추가
    formData.append("pUrl", pcImage);
    formData.append("mUrl", mobileImage);

    try {
      const response = await apiClient.post("/api/banner/main", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "메인 배너 생성에 실패했습니다.");
    } catch (error) {
      console.error("메인 배너 생성 오류:", error);
      throw error;
    }
  },

  // 업체 배너 생성
  createCompanyBanner: async (
    bannerData: any,
    pcImage: File,
    mobileImage: File
  ): Promise<Banner> => {
    const formData = new FormData();

    // 텍스트 데이터 추가
    Object.keys(bannerData).forEach((key) => {
      if (bannerData[key] !== undefined && bannerData[key] !== null) {
        formData.append(key, bannerData[key]);
      }
    });

    // 이미지 파일 추가
    formData.append("pUrl", pcImage);
    formData.append("mUrl", mobileImage);

    try {
      // Authorization 헤더는 인터셉터에서 자동으로 추가됨
      const response = await apiClient.post("/api/banner/company", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "업체 배너 생성에 실패했습니다.");
    } catch (error) {
      console.error("업체 배너 생성 오류:", error);
      throw error;
    }
  },

  // 메인 배너 수정
  updateMainBanner: async (
    id: number,
    bannerData: any,
    pcImage?: File | null,
    mobileImage?: File | null
  ): Promise<Banner> => {
    try {
      const formData = new FormData();

      // 텍스트 데이터 추가
      Object.keys(bannerData).forEach((key) => {
        if (bannerData[key] !== undefined && bannerData[key] !== null) {
          // position 값은 문자열로 변환하여 전송
          if (key === "position") {
            formData.append(key, String(bannerData[key]));
          } else {
            formData.append(key, bannerData[key]);
          }
        }
      });

      // 이미지 파일이 있으면 추가 - null 체크와 빈 파일 체크 추가
      if (pcImage && pcImage instanceof File && pcImage.size > 0) {
        formData.append("pUrl", pcImage);
      }

      if (mobileImage && mobileImage instanceof File && mobileImage.size > 0) {
        formData.append("mUrl", mobileImage);
      }

      console.log(`Sending PATCH request to /api/banner/main/${id}`, {
        data: Object.fromEntries(formData.entries()),
        hasImages: { pc: !!pcImage, mobile: !!mobileImage },
      });

      // PATCH 요청 사용
      const response = await apiClient.put(`/api/banner/main/${id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data && response.data.success) {
        return response.data.data;
      }

      console.error("API Error response:", response.data);
      throw new Error(response.data.message || "메인 배너 수정에 실패했습니다.");
    } catch (error) {
      console.error("메인 배너 수정 오류:", error);
      throw error;
    }
  },

  // 업체 배너 수정
  updateCompanyBanner: async (
    id: number,
    bannerData: any,
    pcImage?: File | null,
    mobileImage?: File | null
  ): Promise<Banner> => {
    const formData = new FormData();

    // 텍스트 데이터 추가
    Object.keys(bannerData).forEach((key) => {
      if (bannerData[key] !== undefined && bannerData[key] !== null) {
        formData.append(key, bannerData[key]);
      }
    });

    // 이미지 파일이 있으면 추가
    if (pcImage) {
      formData.append("pUrl", pcImage);
    }

    if (mobileImage) {
      formData.append("mUrl", mobileImage);
    }

    try {
      // Authorization 헤더는 인터셉터에서 자동으로 추가됨
      const response = await apiClient.put(`/api/banner/company/${id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "업체 배너 수정에 실패했습니다.");
    } catch (error) {
      console.error("업체 배너 수정 오류:", error);
      throw error;
    }
  },

  // 메인 배너 삭제
  deleteMainBanner: async (id: number): Promise<void> => {
    try {
      const response = await apiClient.delete(`/api/banner/main/${id}`);
      if (response.data && !response.data.success) {
        throw new Error(response.data.message || "메인 배너 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("메인 배너 삭제 오류:", error);
      throw error;
    }
  },

  // 업체 배너 삭제
  deleteCompanyBanner: async (id: number): Promise<void> => {
    try {
      const response = await apiClient.delete(`/api/banner/company/${id}`);
      if (response.data && !response.data.success) {
        throw new Error(response.data.message || "업체 배너 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("업체 배너 삭제 오류:", error);
      throw error;
    }
  },
};

export default BannerApiService;
