import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, ProtectedRoute } from "./contexts/AuthContext";
import { NavigationService } from "./services/NavigationService";
import MainLayout from "./layouts/MainLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import MainBannerPage from "./pages/banners/MainBannerPage";
import CompanyBannerPage from "./pages/banners/CompanyBannerPage";
import BottomBannerPage from "./pages/banners/BottomBannerPage";
import MiniBannerPage from "./pages/banners/MiniBannerPage";
import RoleBasedRoute from "./components/RoleBasedRoute";
import PostManagement from "./pages/community/PostManagement";
import PostDetail from "./pages/community/PostManagementDetail";
import GuidelineManagement from "./pages/guidelines/GuidelineManagement";
import GuidelineDetail from "./pages/guidelines/GuidelineDetail.tsx";
import CasinoGuidelineManagement from "./pages/guidelines/CasinoGuidelineManagement";
import SportsGuidelineManagement from "./pages/guidelines/SportsGuidelineManagement";
import CryptoGuidelineManagement from "./pages/guidelines/CryptoGuidelineManagement";
import NoticeManagement from "./pages/notice/NoticeManagement";
import NoticeDetail from "./pages/notice/NoticeDetail";
import CasinoCompanyPage from "./pages/reviews/CasinoCompanyPage";
import CasinoGameManagement from "./pages/data/CasinoGameManagement";
import CasinoRecommendationManagement from "./pages/data/CasinoRecommendationManagement";
import SportsManagement from "./pages/data/SportsManagement";
import SportRecommendationsManagement from "./pages/data/SportRecommendationsManagement";
import UserManagement from "./pages/users/UserManagement";
import UserRankManagement from "./pages/users/UserRankManagement";
import AdminManagement from "./pages/users/AdminManagement";
import NewsManagementListPage from "./pages/news/NewsManagementListPage";
import RemittanceBannerPage from "./pages/remittance/RemittanceBannerPage";

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
              <Route
                path="dashboard"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <DashboardPage />
                  </RoleBasedRoute>
                }
              />

              {/* 배너 관리 */}
              <Route
                path="banners/main"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <MainBannerPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="banners/company"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <CompanyBannerPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="banners/bottom"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <BottomBannerPage />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="banners/mini"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <MiniBannerPage />
                  </RoleBasedRoute>
                }
              />

              {/* 가이드라인 관리 */}
              <Route
                path="guidelines/casino"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <CasinoGuidelineManagement />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="guidelines/casino/:id"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <GuidelineDetail boardId={3} />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="guidelines/sports"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <SportsGuidelineManagement />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="guidelines/sports/:id"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <GuidelineDetail boardId={4} />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="guidelines/crypto"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <CryptoGuidelineManagement />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="guidelines/crypto/:id"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <GuidelineDetail boardId={5} />
                  </RoleBasedRoute>
                }
              />

              {/* 데이터 관리 */}
              <Route
                path="data/casino-games"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <CasinoGameManagement />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="data/casino-recommendations"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <CasinoRecommendationManagement />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="data/sports"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <SportsManagement />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="data/sports-recommendations"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <SportRecommendationsManagement />
                  </RoleBasedRoute>
                }
              />

              {/* 리뷰 업체 관리 - 관리자 권한 필요 */}
              <Route
                path="reviews/casino"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <CasinoCompanyPage />
                  </RoleBasedRoute>
                }
              />

              {/* 뉴스 관리 */}
              <Route
                path="news/list"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <NewsManagementListPage />
                  </RoleBasedRoute>
                }
              />

              {/* 커뮤니티 관리 */}
              <Route
                path="community/notices"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <NoticeManagement />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="notice/:id"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <NoticeDetail />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="notice"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <NoticeManagement />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="community/posts"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <PostManagement />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="community/posts/:id"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <PostDetail />
                  </RoleBasedRoute>
                }
              />

              {/* 회원 정보 관리 - 관리자 권한 필요 */}
              <Route
                path="users/info"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <UserManagement />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="users/admin"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <AdminManagement />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <UserManagement />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/user-ranks"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <UserRankManagement />
                  </RoleBasedRoute>
                }
              />

              {/* 기타 관리 - 관리자 권한 필요 */}
              <Route
                path="settings/user-levels"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <UserRankManagement />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="settings/transfer-banners"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                    <RemittanceBannerPage />
                  </RoleBasedRoute>
                }
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
