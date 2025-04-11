import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import axios, {
  saveToken,
  removeToken,
  isAdminPort,
  getToken,
  handleAdminLogin,
  getAdminUser,
  checkIsAdminLoggedIn,
} from "../api/axios";

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
      // 어드민 인증 정보 확인
      if (isAdminPort() && checkIsAdminLoggedIn()) {
        const adminUserData = getAdminUser();
        if (adminUserData) {
          setUser(adminUserData);
          return;
        }
      }

      // 기존 방식으로 인증 정보 확인 (fallback)
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
      // axios.ts의 handleAdminLogin 함수 활용
      const userData = await handleAdminLogin(email, password);
      setUser(userData);
      navigate("/banners/main");
    } catch (err: any) {
      // handleAdminLogin에서 reject된 Error 객체의 message 사용
      const errorMessage = err.message;

      // 에러 메시지가 있으면 해당 메시지를 사용, 없으면 일반 메시지 사용
      if (errorMessage) {
        setError(errorMessage);
      } else {
        setError("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
      }
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
