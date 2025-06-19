import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const menuItems = [
    {
      title: "노출 배너 관리",
      subItems: [
        { name: "메인 배너 관리", path: "/banners/main" },
        { name: "업체 배너 관리", path: "/banners/company" },
        { name: "하단 배너 관리", path: "/banners/bottom" },
        { name: "미니 배너 관리", path: "/banners/mini" },
      ],
    },
    {
      title: "가이드라인 관리",
      subItems: [
        { name: "카지노", path: "/guidelines/casino" },
        { name: "스포츠", path: "/guidelines/sports" },
        { name: "암호화폐", path: "/guidelines/crypto" },
      ],
    },
    {
      title: "데이터 관리",
      subItems: [
        { name: "카지노 게임 관리", path: "/data/casino-games" },
        { name: "카지노 게임 추천", path: "/data/casino-recommendations" },
        { name: "스포츠 종목 관리", path: "/data/sports" },
        { name: "스포츠 종목 추천", path: "/data/sports-recommendations" },
      ],
    },
    {
      title: "리뷰 업체 관리",
      subItems: [{ name: "카지노 업체 관리", path: "/reviews/casino" }],
    },
    {
      title: "뉴스 관리",
      subItems: [
        { name: "카지노 뉴스", path: "/news/casino/list" },
        { name: "스포츠 뉴스", path: "/news/sports/list" },
      ],
    },
    {
      title: "커뮤니티 관리",
      subItems: [
        { name: "공지사항 관리", path: "/community/notices" },
        { name: "게시물 관리", path: "/community/posts" },
      ],
    },
    {
      title: "회원 정보 관리",
      subItems: [
        { name: "회원 정보 관리", path: "/users/info" },
        { name: "관리자 계정 관리", path: "/users/admin" },
      ],
    },
    {
      title: "회원 문의 관리",
      subItems: [{ name: "1:1 문의 관리", path: "/users/inquiries" }],
    },
    {
      title: "기타 관리",
      subItems: [
        { name: "회원 등급 관리", path: "/settings/user-levels" },
        { name: "송금 배너 관리", path: "/settings/transfer-banners" },
        // { name: "사이트 메뉴 관리", path: "/settings/site-menu" }, // Hide Site Menu Management
        // { name: "사이트 약관 관리", path: "/settings/terms" },     // Hide Site Terms Management
        { name: "하단 푸터 관리", path: "/settings/footer" },
      ],
    },
  ];

  // 현재 경로에 따라 활성 메뉴 설정
  useEffect(() => {
    const currentPath = location.pathname;

    for (const menuItem of menuItems) {
      for (const subItem of menuItem.subItems) {
        if (currentPath === subItem.path) {
          setActiveMenu(menuItem.title);
          break;
        }
      }
    }
  }, [location.pathname]);

  // 메뉴 토글 함수
  const toggleMenu = (title: string) => {
    if (activeMenu === title) {
      setActiveMenu(null);
    } else {
      setActiveMenu(title);
    }
  };

  return (
    <>
      {/* 모바일 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* 사이드바 */}
      <div
        className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-gray-800 text-white transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:z-auto
      `}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700">
          <Link to="/" className="text-xl font-bold">
            Gamblescan Admin
          </Link>
          <button
            className="p-1 rounded-md text-gray-400 hover:text-white lg:hidden"
            onClick={toggleSidebar}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100vh-4rem)]">
          <div className="px-4 py-3 border-b border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
                  {user?.nickname?.charAt(0) || "A"}
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">{user?.nickname || "관리자"}</p>
                <p className="text-xs text-gray-400">{user?.email || "admin@gamblescan.com"}</p>
              </div>
            </div>
            <div className="mt-3">
              <button onClick={logout} className="text-sm text-gray-400 hover:text-white">
                로그아웃
              </button>
            </div>
          </div>

          <nav className="mt-4">
            {menuItems.map((item, index) => (
              <div key={index} className="mb-1">
                <button
                  className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                  onClick={() => toggleMenu(item.title)}
                >
                  <span>{item.title}</span>
                  <svg
                    className={`h-4 w-4 transition-transform ${
                      activeMenu === item.title ? "transform rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                <div
                  className={`transition-all duration-200 ${
                    activeMenu === item.title ? "max-h-96" : "max-h-0 overflow-hidden"
                  }`}
                >
                  <ul className="bg-gray-900 py-1">
                    {item.subItems.map((subItem, subIndex) => (
                      <li key={subIndex}>
                        <Link
                          to={subItem.path}
                          className={`flex items-center pl-10 pr-4 py-2 text-sm ${
                            location.pathname === subItem.path
                              ? "bg-gray-700 text-white"
                              : "text-gray-300 hover:bg-gray-700 hover:text-white"
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            toggleSidebar();

                            if (location.pathname !== subItem.path) {
                              window.location.href = subItem.path;
                            }
                          }}
                        >
                          {subItem.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
