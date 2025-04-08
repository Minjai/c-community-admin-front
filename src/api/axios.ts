import axios from "axios";

// 현재 포트 번호 확인 (어드민/유저 구분)
const getCurrentPort = () => {
  return window.location.port;
};

// 어드민 포트 번호 (실제 환경에 맞게 수정 필요)
const ADMIN_PORT = import.meta.env.VITE_ADMIN_PORT || "3000";

// 현재 포트가 어드민 포트인지 확인
export const isAdminPort = () => {
  return getCurrentPort() === ADMIN_PORT;
};

// 로컬 스토리지 접두사 (포트 기반 구분)
const STORAGE_PREFIX = isAdminPort() ? "admin_" : "user_";

// 어드민 로컬 스토리지 키 (일반 사용자와 구분)
const ADMIN_USER_KEY = `${STORAGE_PREFIX}user`;
const ADMIN_TOKEN_KEY = `${STORAGE_PREFIX}token`;
const ADMIN_REFRESH_TOKEN_KEY = `${STORAGE_PREFIX}refreshToken`;

// 일반 사용자 로컬 스토리지 키
const USER_TOKEN_KEY = "token"; // 기존 호환성 유지
const USER_REFRESH_TOKEN_KEY = "refreshToken"; // 기존 호환성 유지
const USER_DATA_KEY = "user"; // 기존 호환성 유지

// API 기본 URL 설정
//if build, change to production server
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Axios 인스턴스 생성
const instance = axios.create({
  baseURL: BASE_URL,
  responseType: "json",
  withCredentials: true, // 쿠키 사용 시 필요
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// 토큰 저장 함수 (키 구분)
export const saveToken = (token: string, refreshToken: string, userData: any) => {
  if (isAdminPort()) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    localStorage.setItem(ADMIN_REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(userData));
    console.log("어드민 토큰 저장됨:", ADMIN_TOKEN_KEY);
  } else {
    localStorage.setItem(USER_TOKEN_KEY, token);
    localStorage.setItem(USER_REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    console.log("유저 토큰 저장됨:", USER_TOKEN_KEY);
  }
};

// 토큰 가져오기 함수 (키 구분)
export const getToken = () => {
  if (isAdminPort()) {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } else {
    return localStorage.getItem(USER_TOKEN_KEY);
  }
};

// 토큰 제거 함수 (키 구분)
export const removeToken = () => {
  if (isAdminPort()) {
    localStorage.removeItem(ADMIN_USER_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY);
    console.log("어드민 토큰 제거됨");
  } else {
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.removeItem(USER_TOKEN_KEY);
    localStorage.removeItem(USER_REFRESH_TOKEN_KEY);
    console.log("유저 토큰 제거됨");
  }
};

// 요청 인터셉터 추가
instance.interceptors.request.use(
  (config) => {
    // 개발 중 디버깅을 위한 요청 로그
    console.log("API 요청:", config.url, config.method);

    // 관리자 API 요청인지 확인 (URL에 '/admin/' 포함 여부로 판단)
    const isAdminRequest = config.url?.includes("/admin/");

    // 현재 사용 중인 포트 기반으로 어드민 여부 확인
    const currentIsAdmin = isAdminPort();

    console.log(
      "현재 포트:",
      getCurrentPort(),
      "어드민 포트 여부:",
      currentIsAdmin,
      "어드민 요청 여부:",
      isAdminRequest
    );

    // 토큰 선택 - 현재 포트에 맞는 토큰 사용
    let token = getToken();

    if (token) {
      console.log(
        `${currentIsAdmin ? "어드민" : "유저"} 토큰 사용:`,
        token.substring(0, 10) + "..."
      );
      config.headers.Authorization = `Bearer ${token}`;
    } else if (isAdminRequest && currentIsAdmin) {
      console.warn("어드민 API 호출에 필요한 토큰이 없습니다");
    } else if (!isAdminRequest && !currentIsAdmin) {
      console.warn("API 호출에 필요한 토큰이 없습니다");
    }

    return config;
  },
  (error) => {
    console.error("요청 인터셉터 오류:", error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터 추가
instance.interceptors.response.use(
  (response) => {
    // 개발 중 디버깅을 위한 응답 로그
    console.log("API 응답:", response.status, response.config.url);
    return response;
  },
  (error) => {
    // 토큰 만료 오류(401)가 발생한 경우 처리
    if (error.response && error.response.status === 401) {
      console.log("인증 오류: 인증 정보가 만료되었거나 유효하지 않습니다.");

      // 인증 오류 시 토큰 제거 및 리다이렉트
      removeToken();

      // 현재 포트에 따라 리다이렉트 처리
      if (isAdminPort()) {
        // 어드민 로그인 페이지로 리다이렉트
        if (window.location.pathname !== "/admin/login") {
          alert("관리자 인증이 필요합니다. 다시 로그인해주세요.");
          window.location.href = "/admin/login";
        }
      } else {
        // 일반 사용자 로그인 페이지로 리다이렉트
        if (window.location.pathname !== "/login") {
          alert("로그인이 필요합니다. 다시 로그인해주세요.");
          window.location.href = "/login";
        }
      }

      // 오류 객체에 인증 만료 플래그 추가
      error.isAuthError = true;
    }

    // 권한 부족(403) 오류인 경우 처리
    if (error.response && error.response.status === 403) {
      console.log("권한 부족: 요청한 리소스에 대한 접근 권한이 없습니다.");

      // 어드민 API 요청인지 확인
      const isAdminRequest = error.config?.url?.includes("/admin/");

      // 현재 포트에 따른 처리
      if (isAdminRequest && isAdminPort()) {
        alert("관리자 권한이 필요합니다. 다시 로그인해주세요.");
        removeToken();

        // 어드민 로그인 페이지로 리다이렉트
        if (window.location.pathname !== "/admin/login") {
          window.location.href = "/admin/login";
        }
      }
    }

    console.error("API 오류 상태:", error.response?.status);
    console.error("API 오류 데이터:", error.response?.data);
    return Promise.reject(error);
  }
);

export default instance;
