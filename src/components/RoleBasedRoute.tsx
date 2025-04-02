import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // 로그인되지 않은 경우 로그인 페이지로 리다이렉트
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 로그인한 사용자는 모두 접근 허용
  return <>{children}</>;
};

export default RoleBasedRoute;
