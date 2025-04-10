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

// 어드민 인증용 키 (포트와 관계없이 항상 별도로 저장)
const ADMIN_USER_DATA_KEY = "adminUserData";
const ADMIN_IS_LOGGED_IN_KEY = "adminIsLoggedIn";

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

// 어드민 인증 관련 함수들
export const checkIsAdminLoggedIn = () => {
  return localStorage.getItem(ADMIN_IS_LOGGED_IN_KEY) === "true";
};

export const getAdminUser = () => {
  const adminJson = localStorage.getItem(ADMIN_USER_DATA_KEY);
  if (adminJson) {
    try {
      return JSON.parse(adminJson);
    } catch (e) {
      console.error("Failed to parse admin data:", e);
    }
  }
  return null;
};

export const setAdminLoggedIn = (adminData: any) => {
  localStorage.setItem(ADMIN_USER_DATA_KEY, JSON.stringify(adminData));
  localStorage.setItem(ADMIN_IS_LOGGED_IN_KEY, "true");
};

export const adminLogout = () => {
  localStorage.removeItem(ADMIN_USER_DATA_KEY);
  localStorage.removeItem(ADMIN_IS_LOGGED_IN_KEY);

  // 기존 어드민 토큰도 함께 제거
  localStorage.removeItem(ADMIN_USER_KEY);
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY);
};

// 어드민 로그인 처리 함수
export const handleAdminLogin = (email: string, password: string) => {
  return new Promise<any>((resolve, reject) => {
    if (!email || !password) {
      reject(new Error("이메일과 비밀번호를 모두 입력해주세요."));
      return;
    }

    // 로그인 API 호출
    instance
      .post("/admin/login", {
        email: email,
        password: password,
      })
      .then((response) => {
        const data = response.data;

        // 어드민 권한 확인
        if (data.role !== "admin" && data.role !== "superadmin") {
          reject(new Error("관리자 권한이 없습니다."));
          return;
        }

        // 어드민 데이터 저장
        const adminData = {
          id: data.userId,
          nickname: data.nickname,
          role: data.role,
          userType: "admin",
        };

        // 토큰 저장
        if (data.token) {
          saveToken(data.token, data.refreshToken || "", adminData);
        }

        // 어드민 전용 저장소에 저장
        setAdminLoggedIn(adminData);
        console.log("어드민 로그인 성공:", adminData);

        // 성공 응답
        resolve(adminData);
      })
      .catch((error) => {
        console.error("로그인 실패:", error);

        // 서버에서 반환한 상세 오류 메시지 사용
        const errorMessage =
          error.response?.data?.details ||
          error.response?.data?.error ||
          error.response?.data?.message ||
          "로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.";

        reject(new Error(errorMessage));
      });
  });
};

// 어드민 권한 검사 함수
export const requireAdminAuth = (redirectPath = "/admin/login") => {
  if (!checkIsAdminLoggedIn()) {
    // 권한 부족 메시지 표시
    alert("관리자 권한이 필요합니다. 로그인 페이지로 이동합니다.");

    // 로그인 페이지로 리다이렉트
    window.location.href = redirectPath;
    return false;
  }
  return true;
};

// 토큰 저장 함수 (키 구분) - 어드민 인증 추가
export const saveToken = (token: string, refreshToken: string, userData: any) => {
  if (isAdminPort()) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    localStorage.setItem(ADMIN_REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(userData));

    // 어드민 인증 정보도 함께 저장
    setAdminLoggedIn(userData);

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

// 토큰 제거 함수 (키 구분) - 어드민 인증 추가
export const removeToken = () => {
  if (isAdminPort()) {
    // 어드민 인증 정보도 함께 제거
    adminLogout();
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

      // 서버에서 받은 오류 메시지가 있으면 사용
      const errorMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        "요청한 리소스에 대한 접근 권한이 없습니다.";

      // 권한 부족 시 토큰 제거
      removeToken();

      // 오류 객체에 권한 부족 플래그 추가
      error.isPermissionError = true;

      // 현재 포트에 따라 메시지 및 리다이렉트 처리
      if (isAdminPort()) {
        // 어드민 로그인 페이지로 리다이렉트
        alert(`권한 부족: 관리자만 접근할 수 있습니다.`);

        // 현재 경로가 로그인 페이지가 아닐 경우에만 리다이렉트
        if (window.location.pathname !== "/admin/login" && window.location.pathname !== "/login") {
          window.location.href = "/admin/login";
        }
      } else {
        // 일반 사용자 로그인 페이지로 리다이렉트
        alert(`권한 부족: ${errorMessage}`);

        // 현재 경로가 로그인 페이지가 아닐 경우에만 리다이렉트
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }

    console.error("API 오류 상태:", error.response?.status);
    console.error("API 오류 데이터:", error.response?.data);
    return Promise.reject(error);
  }
);

export default instance;
