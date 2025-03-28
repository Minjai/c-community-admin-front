import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, ProtectedRoute } from "./contexts/AuthContext";
import { NavigationService } from "./services/NavigationService";
import MainLayout from "./layouts/MainLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import MainBannerPage from "./pages/banners/MainBannerPage";
import CompanyBannerPage from "./pages/banners/CompanyBannerPage";
import RoleBasedRoute from "./components/RoleBasedRoute";
import PostManagement from "./pages/community/PostManagement";
import PostDetail from "./pages/community/PostManagementDetail";
import GuidelineManagement from "./pages/guidelines/GuidelineManagement";
import GuidelineDetail from "./pages/guidelines/GuidelineDetail.tsx";

// 추후 구현할 페이지들을 위한 임시 컴포넌트
const NotImplemented = ({ pageName }: { pageName: string }) => (
  <div className="flex flex-col items-center justify-center h-64">
    <h2 className="text-2xl font-semibold text-gray-900 mb-4">{pageName}</h2>
    <p className="text-gray-600">이 페이지는 아직 구현되지 않았습니다.</p>
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <NavigationService>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/banners/main" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />

              {/* 배너 관리 */}
              <Route path="banners/main" element={<MainBannerPage />} />
              <Route path="banners/company" element={<CompanyBannerPage />} />
              <Route path="banners/bottom" element={<NotImplemented pageName="하단 배너 관리" />} />
              <Route path="banners/mini" element={<NotImplemented pageName="미니 배너 관리" />} />

              {/* 가이드라인 관리 */}
              <Route path="guidelines/casino" element={<GuidelineManagement boardId={3} />} />
              <Route path="guidelines/casino/:id" element={<GuidelineDetail boardId={3} />} />
              <Route path="guidelines/sports" element={<GuidelineManagement boardId={4} />} />
              <Route path="guidelines/sports/:id" element={<GuidelineDetail boardId={4} />} />
              <Route path="guidelines/crypto" element={<GuidelineManagement boardId={5} />} />
              <Route path="guidelines/crypto/:id" element={<GuidelineDetail boardId={5} />} />

              {/* 데이터 관리 */}
              <Route
                path="data/casino-games"
                element={<NotImplemented pageName="카지노 게임 관리" />}
              />
              <Route
                path="data/casino-recommendations"
                element={<NotImplemented pageName="카지노 게임 추천" />}
              />
              <Route path="data/sports" element={<NotImplemented pageName="스포츠 종목 관리" />} />
              <Route
                path="data/sports-recommendations"
                element={<NotImplemented pageName="스포츠 종목 추천" />}
              />

              {/* 리뷰 업체 관리 - 관리자 권한 필요 */}
              <Route
                path="reviews/casino"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <NotImplemented pageName="카지노 업체 관리" />
                  </RoleBasedRoute>
                }
              />

              {/* 커뮤니티 관리 */}
              <Route
                path="community/notices"
                element={<NotImplemented pageName="공지사항 관리" />}
              />
              <Route path="community/posts" element={<PostManagement />} />
              <Route path="community/posts/:id" element={<PostDetail />} />

              {/* 회원 정보 관리 - 관리자 권한 필요 */}
              <Route
                path="users/info"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <NotImplemented pageName="회원 정보 관리" />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="users/admin"
                element={
                  <RoleBasedRoute allowedRoles={["superadmin"]}>
                    <NotImplemented pageName="관리자 계정 관리" />
                  </RoleBasedRoute>
                }
              />

              {/* 기타 관리 - 관리자 권한 필요 */}
              <Route
                path="settings/user-levels"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <NotImplemented pageName="회원 등급 관리" />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="settings/transfer-banners"
                element={<NotImplemented pageName="송금 배너 관리" />}
              />
              <Route
                path="settings/site-menu"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <NotImplemented pageName="사이트 메뉴 관리" />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="settings/terms"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <NotImplemented pageName="사이트 약관 관리" />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="settings/footer"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <NotImplemented pageName="하단 푸터 관리" />
                  </RoleBasedRoute>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/banners/main" replace />} />
          </Routes>
        </NavigationService>
      </AuthProvider>
    </Router>
  );
}

export default App;
