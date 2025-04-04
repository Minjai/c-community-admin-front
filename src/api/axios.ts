import axios from "axios";

// 어드민 로컬 스토리지 키 (일반 사용자와 구분)
const ADMIN_USER_KEY = "admin_user";
const ADMIN_TOKEN_KEY = "admin_token";
const ADMIN_REFRESH_TOKEN_KEY = "admin_refreshToken";

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

// 요청 인터셉터 추가
instance.interceptors.request.use(
  (config) => {
    // 개발 중 디버깅을 위한 요청 로그
    console.log("API 요청:", config.url, config.method);

    // 관리자 API 요청인지 확인 (URL에 '/admin/' 포함 여부로 판단)
    const isAdminRequest = config.url?.includes("/admin/");

    // 어드민 페이지인지 확인 (URL에 따라 관리자/일반 사용자 토큰 적용)
    const isAdminRoute =
      window.location.pathname.includes("/community") ||
      window.location.pathname.includes("/guidelines") ||
      window.location.pathname.includes("/users") ||
      window.location.hostname.includes("admin");

    console.log("어드민 경로 확인:", isAdminRoute, "어드민 요청 확인:", isAdminRequest);

    // 어드민 토큰 확인
    let token = localStorage.getItem(ADMIN_TOKEN_KEY);

    // 어드민 API 요청이거나 어드민 경로인 경우 어드민 토큰 사용
    if ((isAdminRequest || isAdminRoute) && token) {
      console.log("어드민 토큰 사용:", token.substring(0, 10) + "...");
    }
    // 어드민 토큰이 없거나 일반 요청인 경우 일반 토큰 사용
    else {
      const userToken = localStorage.getItem("token");
      if (userToken) {
        token = userToken;
        console.log("일반 사용자 토큰 사용:", userToken.substring(0, 10) + "...");
      } else if (isAdminRequest) {
        // 어드민 API를 호출하는데 토큰이 없는 경우
        console.warn("어드민 API 호출에 필요한 토큰이 없습니다");
      }
    }

    // 토큰이 있으면 헤더에 추가
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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

      // 어드민 API 요청인지 확인
      const isAdminRequest = error.config?.url?.includes("/admin/");

      // 어드민 페이지인지 확인
      const isAdminRoute =
        window.location.pathname.includes("/community") ||
        window.location.pathname.includes("/guidelines") ||
        window.location.pathname.includes("/users") ||
        window.location.hostname.includes("admin");

      if (isAdminRequest || isAdminRoute) {
        // 어드민 로컬 스토리지에서 인증 정보 제거
        localStorage.removeItem(ADMIN_USER_KEY);
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        localStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY);

        // 어드민 로그인 페이지로 리다이렉트
        if (window.location.pathname !== "/admin/login") {
          alert("관리자 인증이 필요합니다. 다시 로그인해주세요.");
          window.location.href = "/admin/login";
        }
      } else {
        // 일반 사용자 로컬 스토리지에서 인증 정보 제거
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
      }

      // 오류 객체에 인증 만료 플래그 추가
      error.isAuthError = true;
    }

    // 권한 부족(403) 오류인 경우 처리
    if (error.response && error.response.status === 403) {
      console.log("권한 부족: 요청한 리소스에 대한 접근 권한이 없습니다.");

      // 어드민 API 요청인지 확인
      const isAdminRequest = error.config?.url?.includes("/admin/");

      if (isAdminRequest) {
        alert("관리자 권한이 필요합니다. 다시 로그인해주세요.");

        // 어드민 로컬 스토리지에서 인증 정보 제거
        localStorage.removeItem(ADMIN_USER_KEY);
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        localStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY);

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
