import axios from "axios";

// API 기본 URL 설정
const BASE_URL = "http://localhost:3000/api";

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

    // 로컬 스토리지에서 토큰 가져오기
    const token = localStorage.getItem("token");

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

      // 로컬 스토리지에서 인증 정보 제거
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");

      // 로그인 페이지로 리다이렉트
      window.location.href = "/login";
      return Promise.reject(new Error("인증 정보가 만료되었습니다. 다시 로그인해주세요."));
    }

    console.error("API 오류 상태:", error.response?.status);
    console.error("API 오류 데이터:", error.response?.data);
    return Promise.reject(error);
  }
);

export default instance;
