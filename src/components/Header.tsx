import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { UserCircleIcon } from "@heroicons/react/24/outline";
import { Bars3Icon } from "@heroicons/react/24/outline";

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex items-center justify-between h-16 px-4">
        <div className="flex items-center">
          <button
            className="p-1 mr-3 rounded-md text-gray-500 hover:text-gray-900 lg:hidden"
            onClick={toggleSidebar}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Gamblescan Admin</h1>
        </div>

        <div className="flex items-center">
          <div className="relative">
            <div
              className="flex items-center cursor-pointer"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <UserCircleIcon className="h-8 w-8 text-gray-500" />
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-900">{user?.nickname || "관리자"}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                <button
                  onClick={logout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
