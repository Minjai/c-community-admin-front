import axios from "axios";

// 환경 변수에서 API URL 가져오기
const API_URL = import.meta.env.VITE_API_BASE_URL;

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: number;
    username: string;
    role: string;
  };
  message?: string;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      // URL에서 "/api"를 제거하여 admin 엔드포인트에 직접 접근
      // VITE_API_BASE_URL이 이미 http://localhost:3000/api이므로 중복을 제거
      const loginUrl = `${API_URL.replace("/api", "")}/admin/login`;

      console.log("로그인 요청 URL:", loginUrl); // 디버깅용 로그

      const response = await axios.post(loginUrl, credentials);
      if (response.data.success) {
        // 로그인 성공 시 토큰을 localStorage에 저장
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || "로그인 중 오류가 발생했습니다.",
      };
    }
  },

  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  getCurrentUser() {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  },

  getToken() {
    return localStorage.getItem("token");
  },
};
