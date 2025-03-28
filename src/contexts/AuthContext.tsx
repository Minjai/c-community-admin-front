import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";

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
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");

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

        // 로컬 스토리지에 인증 정보 저장
        localStorage.setItem("user", JSON.stringify(userData));

        // 토큰이 있는 경우 저장
        if (response.data.token) {
          localStorage.setItem("token", response.data.token);
          localStorage.setItem("refreshToken", response.data.refreshToken);
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

    // 로컬 스토리지에서 인증 정보 제거
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");

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
    // 로컬 스토리지에서 사용자 정보를 확인
    const checkAuth = async () => {
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      if (!storedUser || !token) {
        navigate("/login");
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
