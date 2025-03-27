import React from 'react';
import { useNavigate } from 'react-router-dom';

interface NavigationServiceProps {
  children: React.ReactNode;
}

// 네비게이션 컨텍스트 생성
export const NavigationContext = React.createContext<{
  navigateTo: (path: string) => void;
  goBack: () => void;
  openInNewTab: (path: string) => void;
}>({
  navigateTo: () => {},
  goBack: () => {},
  openInNewTab: () => {},
});

// 네비게이션 서비스 컴포넌트
export const NavigationService: React.FC<NavigationServiceProps> = ({ children }) => {
  const navigate = useNavigate();

  // 페이지 이동 함수
  const navigateTo = (path: string) => {
    navigate(path);
  };

  // 뒤로 가기 함수
  const goBack = () => {
    navigate(-1);
  };

  // 새 탭에서 열기 함수
  const openInNewTab = (path: string) => {
    window.open(path, '_blank');
  };

  return (
    <NavigationContext.Provider value={{ navigateTo, goBack, openInNewTab }}>
      {children}
    </NavigationContext.Provider>
  );
};

// 네비게이션 훅
export const useNavigation = () => {
  const context = React.useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationService');
  }
  return context;
};
