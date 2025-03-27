import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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

  // 사용자 역할이 허용된 역할 목록에 포함되어 있는지 확인
  if (!allowedRoles.includes(user.role)) {
    // 권한이 없는 경우 대시보드로 리다이렉트
    return <Navigate to="/dashboard" replace />;
  }

  // 권한이 있는 경우 자식 컴포넌트 렌더링
  return <>{children}</>;
};

export default RoleBasedRoute;
