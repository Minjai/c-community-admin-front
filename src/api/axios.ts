import axios from "axios";

const instance = axios.create({
  baseURL: "http://localhost:3000/api",
  // baseURL: "https://localhost:5173",
  responseType: "json",
  withCredentials: true,
});

// 요청 인터셉터 추가
instance.interceptors.request.use(
  (config) => {
    // 로컬 스토리지에서 토큰 가져오기
    const token = localStorage.getItem("token");

    // 토큰이 있으면 헤더에 추가
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
instance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error("API 오류 상태:", error.response?.status);
    console.error("API 오류 데이터:", error.response?.data);
    return Promise.reject(error);
  }
);

export default instance;
