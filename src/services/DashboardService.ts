import axios from "axios";
import { authService } from "./authService";

// API 기본 URL 설정
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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

// 응답 인터셉터 추가
apiClient.interceptors.response.use(
  (response) => {
    return response; // 성공적인 응답 처리
  },
  (error) => {
    // 토큰 만료 또는 인증 오류(401)가 발생한 경우 로그인 페이지로 리다이렉트
    if (error.response && error.response.status === 401) {
      console.log("인증 오류: 인증 정보가 만료되었거나 유효하지 않습니다.");

      // 로컬 스토리지에서 인증 정보 제거
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");

      // 로그인 페이지로 리다이렉트
      window.location.href = "/login";
      return Promise.reject(new Error("인증 정보가 만료되었습니다. 다시 로그인해주세요."));
    }

    return Promise.reject(error);
  }
);

// 대시보드 API 서비스
const DashboardService = {
  // 대시보드 통계 데이터 조회
  getDashboardStats: async () => {
    try {
      const response = await apiClient.get("/dashboard/stats");
      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "대시보드 통계 조회에 실패했습니다.");
    } catch (error) {
      console.error("대시보드 통계 조회 오류:", error);
      throw error;
    }
  },
};

export default DashboardService;
