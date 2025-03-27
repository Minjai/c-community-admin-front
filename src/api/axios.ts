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
    // 토큰 만료 오류(401)가 발생한 경우 자동으로 리프레시 토큰 사용 시도
    if (error.response && error.response.status === 401) {
      const refreshToken = localStorage.getItem("refreshToken");

      // 리프레시 토큰이 있을 경우 자동 갱신 시도
      if (refreshToken) {
        // 여기에 토큰 갱신 로직 추가할 수 있음
        console.log("토큰 만료, 리프레시 토큰으로 재인증 필요");
      }
    }

    console.error("API 오류 상태:", error.response?.status);
    console.error("API 오류 데이터:", error.response?.data);
    return Promise.reject(error);
  }
);

export default instance;
