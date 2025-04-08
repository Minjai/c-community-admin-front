import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import axios, { saveToken, removeToken, getToken, isAdminPort } from "../api/axios";

// 로컬 스토리지 키는 axios에서 직접 관리하도록 변경
// 기존 로컬 스토리지 키 참조는 유지 (기존 코드 호환성)
const ADMIN_USER_KEY = "admin_user";
const ADMIN_TOKEN_KEY = "admin_token";
const ADMIN_REFRESH_TOKEN_KEY = "admin_refreshToken";
const USER_DATA_KEY = "user";

interface User {
  id: number;
  nickname?: string;
  email?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // 로컬 스토리지에서 인증 정보 복원
    const restoreAuth = () => {
      // 포트 기반으로 키 참조 (직접 참조 대신 axios의 getToken 사용)
      let storedUser;
      const token = getToken();

      if (isAdminPort()) {
        storedUser = localStorage.getItem(ADMIN_USER_KEY);
      } else {
        storedUser = localStorage.getItem(USER_DATA_KEY);
      }

      if (storedUser && token) {
        setUser(JSON.parse(storedUser));
      } else {
        // 인증 정보가 없으면 로그아웃 상태로 설정
        setUser(null);
      }
    };

    restoreAuth();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // 올바른 API 경로 사용
      const response = await axios.post("/account/login", { email, password });
      console.log("로그인 응답:", response.data);

      // 응답 구조 확인 및 처리
      if (response.data && response.data.message === "로그인 성공") {
        // role 체크 - admin이 아니면 로그인 실패로 처리
        if (response.data.role !== "admin") {
          setError("관리자 계정이 아닙니다. 관리자 권한이 필요합니다.");
          setIsLoading(false);
          return;
        }

        const userData = {
          id: response.data.userId,
          nickname: response.data.nickname || "관리자계정",
          email: email,
          role: response.data.role || "admin",
        };

        setUser(userData);

        // 포트 기반으로 토큰 저장 (새로운 유틸리티 함수 사용)
        if (response.data.token) {
          // 새 토큰 저장 유틸리티 사용
          saveToken(response.data.token, response.data.refreshToken || "", userData);
        }

        navigate("/banners/main");
      } else {
        // 서버에서 받은 자세한 오류 메시지 사용
        setError(response.data.details || "이메일 또는 비밀번호가 올바르지 않습니다.");
      }
    } catch (err: any) {
      console.log("로그인 에러:", err);

      // 서버에서 받은 details 값 확인
      const serverDetails = err.response?.data?.details;
      const serverMessage = err.response?.data?.message;

      // details 값이 있으면 그것을 사용, 없으면 message 사용, 둘 다 없으면 기본 메시지 사용
      const errorMessage =
        serverDetails || serverMessage || "로그인 중 오류가 발생했습니다. 다시 시도해주세요.";

      setError(errorMessage);
      console.error("Login error details:", serverDetails);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);

    // 새 토큰 제거 유틸리티 사용
    removeToken();

    navigate("/login");
  };

  const value = {
    user,
    isLoading,
    error,
    login: handleLogin,
    logout: handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};

export const ProtectedRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // 포트 기반으로 적절한 토큰 확인
    const checkAuth = async () => {
      const token = getToken();
      let storedUser;

      if (isAdminPort()) {
        storedUser = localStorage.getItem(ADMIN_USER_KEY);
      } else {
        storedUser = localStorage.getItem(USER_DATA_KEY);
      }

      if (!storedUser || !token) {
        // 포트에 따라 적절한 로그인 페이지로 리다이렉트
        if (isAdminPort()) {
          navigate("/login");
        } else {
          navigate("/login"); // 일반 사용자 로그인 페이지
        }
      }

      setIsCheckingAuth(false);
    };

    checkAuth();
  }, [navigate]);

  // 인증 확인 중에는 로딩 상태 표시
  if (isCheckingAuth) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return user ? <>{children}</> : null;
};
