import axios from "axios";

// 환경 변수에서 API URL 가져오기
const API_URL = import.meta.env.VITE_API_BASE_URL;

// 어드민 로컬 스토리지 키 (일반 사용자와 구분)
const ADMIN_USER_KEY = "admin_user";
const ADMIN_TOKEN_KEY = "admin_token";
const ADMIN_REFRESH_TOKEN_KEY = "admin_refreshToken";

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

      //console.log("로그인 요청 URL:", loginUrl); // 디버깅용 로그

      const response = await axios.post(loginUrl, credentials);
      if (response.data.success) {
        // 로그인 성공 시 어드민 전용 스토리지에 토큰 저장
        localStorage.setItem(ADMIN_TOKEN_KEY, response.data.token);
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(response.data.user));

        // 만약 기존 사용자 토큰이 있다면 제거 (충돌 방지)
        localStorage.removeItem("token");
        localStorage.removeItem("user");
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
    // 어드민 로컬 스토리지에서 인증 정보 제거
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
    localStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY);
  },

  getCurrentUser() {
    // 어드민 사용자 정보 가져오기
    const userStr = localStorage.getItem(ADMIN_USER_KEY);
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  },

  getToken() {
    // 어드민 토큰 가져오기
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  },
};
