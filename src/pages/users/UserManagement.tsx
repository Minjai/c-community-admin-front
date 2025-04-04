import React, { useState, useEffect } from "react";
import axios from "@/api/axios";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import ActionButton from "@/components/ActionButton";
import Modal from "@/components/Modal";
import Input from "@/components/forms/Input";
import Alert from "@/components/Alert";
import { formatDate } from "@/utils/dateUtils";
import UserDetail from "./UserDetail";
import BulkPointModal from "./BulkPointModal";

// 회원 타입 정의
interface UserRank {
  rankId: number;
  rankName: string;
  image: string;
}

interface User {
  id: number;
  email: string;
  nickname: string;
  score: number;
  createdAt: string;
  status: string;
  rank: UserRank;
}

interface UserResponse {
  users: User[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // 모달 관련 상태
  const [showModal, setShowModal] = useState<boolean>(false);
  const [pointAmount, setPointAmount] = useState<number>(0);
  const [pointReason, setPointReason] = useState<string>("");
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [allSelected, setAllSelected] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // 회원 수정 모달 상태
  const [showUserDetailModal, setShowUserDetailModal] = useState<boolean>(false);
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(undefined);

  // 회원 목록 조회
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get("/admin/users");
      console.log("회원 정보 API 응답:", response.data);

      if (response.data) {
        // 서버 응답 구조에 따라 데이터 추출
        // 1. 응답이 { users, totalCount, currentPage, totalPages } 형식인 경우
        if (response.data.users && Array.isArray(response.data.users)) {
          const data = response.data;
          setUsers(data.users);
          setTotalCount(data.totalCount || data.users.length);
          setCurrentPage(data.currentPage || 1);
          setTotalPages(data.totalPages || Math.ceil((data.totalCount || data.users.length) / 10));
        }
        // 2. 응답이 배열인 경우
        else if (Array.isArray(response.data)) {
          setUsers(response.data);
          setTotalCount(response.data.length);
          setCurrentPage(1);
          setTotalPages(Math.ceil(response.data.length / 10));
        }
        // 3. 응답이 { data: users[] } 형식인 경우
        else if (response.data.data && Array.isArray(response.data.data)) {
          const users = response.data.data;
          setUsers(users);
          setTotalCount(users.length);
          setCurrentPage(1);
          setTotalPages(Math.ceil(users.length / 10));
        }
        // 응답 구조가 예상과 다른 경우
        else {
          console.error("회원 불러오기 실패: 응답 형식이 예상과 다릅니다", response.data);
          setUsers([]);
          setError("회원 데이터 형식이 올바르지 않습니다.");
        }
      } else {
        setUsers([]);
        setError("회원 데이터 형식이 올바르지 않습니다.");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("회원 목록을 불러오는데 실패했습니다.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 체크박스 토글 핸들러
  const handleToggleSelect = (userId: number) => {
    setSelectedUsers((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // 전체 선택 토글 핸들러
  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map((user) => user.id));
    }
    setAllSelected(!allSelected);
  };

  // 상태에 따른 색상
  const getStatusClassName = (status: string) => {
    switch (status) {
      case "온라인":
        return "bg-green-100 text-green-800";
      case "오프라인":
        return "bg-gray-100 text-gray-800";
      case "정지":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // 포인트 지급 모달 열기
  const handleOpenPointModal = () => {
    if (selectedUsers.length === 0) {
      setAlertMessage({
        type: "error",
        message: "포인트를 지급할 회원을 선택해주세요.",
      });
      return;
    }
    setShowModal(true);
  };

  // 포인트 일괄 지급 처리
  const handleBulkPointDistribution = async () => {
    if (pointAmount <= 0) {
      setAlertMessage({
        type: "error",
        message: "유효한 포인트 금액을 입력해주세요.",
      });
      return;
    }

    if (pointReason.trim() === "") {
      setAlertMessage({
        type: "error",
        message: "포인트 지급 사유를 입력해주세요.",
      });
      return;
    }

    try {
      setSaving(true);

      await axios.post("/admin/users/bulk-points", {
        userIds: selectedUsers,
        amount: pointAmount,
        reason: pointReason,
      });

      setShowModal(false);
      setSelectedUsers([]);
      setAllSelected(false);
      setAlertMessage({
        type: "success",
        message: `${selectedUsers.length}명의 회원에게 ${pointAmount}P가 지급되었습니다.`,
      });

      // 회원 목록 새로고침
      fetchUsers();
    } catch (err) {
      console.error("Error distributing points:", err);
      setAlertMessage({
        type: "error",
        message: "포인트 지급 중 오류가 발생했습니다.",
      });
    } finally {
      setSaving(false);
    }
  };

  // 회원 삭제 처리
  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm("정말로 이 회원을 삭제하시겠습니까?")) {
      return;
    }

    try {
      await axios.delete(`/admin/account/${userId}`);

      setAlertMessage({
        type: "success",
        message: "회원이 성공적으로 삭제되었습니다.",
      });

      // 회원 목록 새로고침
      fetchUsers();
    } catch (err) {
      console.error("Error deleting user:", err);
      setAlertMessage({
        type: "error",
        message: "회원 삭제 중 오류가 발생했습니다.",
      });
    }
  };

  // 회원 수정 처리
  const handleEditUser = (userId: number) => {
    setSelectedUserId(userId);
    setShowUserDetailModal(true);
  };

  // DataTable 컬럼 정의
  const columns = [
    {
      header: "선택",
      accessor: "id" as keyof User,
      cell: (value: number) => (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={selectedUsers.includes(value)}
            onChange={() => handleToggleSelect(value)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>
      ),
    },
    {
      header: "닉네임",
      accessor: "nickname" as keyof User,
      cell: (value: string, row: User) => (
        <span
          className="text-blue-600 cursor-pointer hover:underline"
          onClick={() => handleEditUser(row.id)}
        >
          {value}
        </span>
      ),
    },
    {
      header: "이메일",
      accessor: "email" as keyof User,
    },
    {
      header: "등급",
      accessor: "rank" as keyof User,
      cell: (value: UserRank | null) => (
        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
          {value?.rankName || "등급 없음"}
        </span>
      ),
    },
    {
      header: "포인트",
      accessor: "score" as keyof User,
      cell: (value: number) => `${value.toLocaleString()}P`,
    },
    {
      header: "가입일자",
      accessor: "createdAt" as keyof User,
      cell: (value: string) => formatDate(value),
    },
    {
      header: "상태",
      accessor: "status" as keyof User,
      cell: (value: string) => {
        const className = getStatusClassName(value);
        return <span className={`px-2 py-1 rounded text-xs ${className}`}>{value}</span>;
      },
    },
    {
      header: "관리",
      accessor: "id" as keyof User,
      cell: (value: number) => (
        <div className="flex items-center space-x-2">
          <ActionButton
            label="수정"
            onClick={() => handleEditUser(value)}
            color="blue"
            action="edit"
          />
          <ActionButton
            label="삭제"
            onClick={() => handleDeleteUser(value)}
            color="red"
            action="delete"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">회원 정보 관리</h1>
        <div className="flex items-center space-x-2">
          <Button onClick={handleToggleAll} variant="secondary" className="mr-2">
            {allSelected ? "전체 해제" : "전체 선택"}
          </Button>
          <Button
            onClick={handleOpenPointModal}
            variant="primary"
            disabled={selectedUsers.length === 0}
          >
            포인트 일괄 지급
          </Button>
        </div>
      </div>

      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
          className="mb-4"
        />
      )}

      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />
      )}

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        emptyMessage="등록된 회원이 없습니다."
      />

      {/* 포인트 일괄 지급 모달 - 새로운 컴포넌트로 교체 */}
      <BulkPointModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        selectedUsers={users
          .filter((user) => selectedUsers.includes(user.id))
          .map((user) => ({
            id: user.id,
            nickname: user.nickname,
          }))}
        onSuccess={() => {
          setSelectedUsers([]);
          setAllSelected(false);
          fetchUsers();
        }}
      />

      {/* 회원 상세 모달 */}
      <UserDetail
        isOpen={showUserDetailModal}
        onClose={() => setShowUserDetailModal(false)}
        userId={selectedUserId}
        onUserUpdated={fetchUsers}
      />
    </div>
  );
};

export default UserManagement;
