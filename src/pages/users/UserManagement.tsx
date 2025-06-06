import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  profileImageUrl?: string;
  lastLoginAt?: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
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
  const fetchUsers = useCallback(async (page: number, limit: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/admin/users?page=${page}&limit=${limit}`);
      console.log("회원 정보 API 응답:", response.data);

      if (response.data && response.data.data && response.data.pagination) {
        const fetchedUsers = response.data.data || [];
        const pagination = response.data.pagination;

        setUsers(fetchedUsers);
        setTotalItems(pagination.totalItems || 0);
        setTotalPages(pagination.totalPages || 0);
        setCurrentPage(pagination.currentPage || page);
        setPageSize(pagination.pageSize || limit);
        setSelectedUsers([]);
        setAllSelected(false);
      } else {
        console.error("회원 불러오기 실패: 응답 형식이 예상과 다릅니다", response.data);
        setUsers([]);
        setTotalItems(0);
        setTotalPages(0);
        setCurrentPage(1);
        setError("회원 데이터 형식이 올바르지 않습니다.");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("회원 목록을 불러오는데 실패했습니다.");
      setUsers([]);
      setTotalItems(0);
      setTotalPages(0);
      setCurrentPage(1);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(currentPage, pageSize);
  }, [fetchUsers, currentPage, pageSize]);

  // handlePageChange 구현
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
    }
  };

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
  const handleToggleAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    if (isChecked) {
      setSelectedUsers(users.map((user) => user.id));
    } else {
      setSelectedUsers([]);
    }
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

      fetchUsers(currentPage, pageSize);
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

      fetchUsers(currentPage, pageSize);
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
  const columns = useMemo(
    () =>
      [
        {
          header: (
            <input
              type="checkbox"
              className="form-checkbox h-4 w-4 text-blue-600"
              onChange={handleToggleAll}
              checked={users.length > 0 && selectedUsers.length === users.length}
              ref={(input) => {
                if (input) {
                  input.indeterminate =
                    selectedUsers.length > 0 && selectedUsers.length < users.length;
                }
              }}
              disabled={loading || users.length === 0}
            />
          ),
          accessor: "id" as keyof User,
          cell: (id: number) => (
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                className="form-checkbox h-4 w-4 text-blue-600"
                checked={selectedUsers.includes(id)}
                onChange={() => handleToggleSelect(id)}
              />
            </div>
          ),
          className: "w-px px-4",
        },
        {
          header: "이메일",
          accessor: "email" as keyof User,
          cell: (value: string, row: User) => (
            <span
              className="text-blue-600 hover:underline cursor-pointer"
              onClick={() => handleEditUser(row.id)}
            >
              {value}
            </span>
          ),
        },
        { header: "닉네임", accessor: "nickname" as keyof User },
        {
          header: "등급",
          accessor: "rank" as keyof User,
          cell: (rank: UserRank) => (
            <div className="flex items-center space-x-2">
              {rank?.image && <img src={rank.image} alt={rank.rankName} className="h-6 w-6" />}
              <span>{rank?.rankName || "-"}</span>
            </div>
          ),
        },
        {
          header: "상태",
          accessor: "status" as keyof User,
          cell: (status: string) => (
            <span
              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClassName(
                status
              )}`}
            >
              {status}
            </span>
          ),
          className: "text-center",
        },
        {
          header: "포인트",
          accessor: "score" as keyof User,
          cell: (score: number) => score.toLocaleString(),
        },
        {
          header: "가입일",
          accessor: "createdAt" as keyof User,
          cell: (value: string) => formatDate(value),
        },
        {
          header: "관리",
          accessor: "id" as keyof User,
          cell: (id: number, row: User) => (
            <div className="flex space-x-2">
              <ActionButton
                label="수정"
                action="edit"
                onClick={() => handleEditUser(row.id)}
                disabled={loading || saving}
              />
              <ActionButton
                label="삭제"
                action="delete"
                onClick={() => handleDeleteUser(id)}
                disabled={loading || saving}
              />
            </div>
          ),
          className: "w-24 text-center",
        },
      ].filter(
        (column) =>
          column.accessor !== "id" ||
          typeof column.header !== "string" ||
          column.header.toLowerCase() !== "id"
      ),
    [users, selectedUsers, loading, currentPage, pageSize]
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold mb-6">회원 관리</h1>
        <Button onClick={handleOpenPointModal} disabled={selectedUsers.length === 0 || loading}>
          포인트 일괄 지급
        </Button>
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

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          columns={columns}
          data={users}
          loading={loading}
          emptyMessage="등록된 회원이 없습니다."
          pagination={{
            currentPage: currentPage,
            pageSize: pageSize,
            totalItems: totalItems,
            onPageChange: handlePageChange,
          }}
        />
      </div>

      <BulkPointModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        selectedUsers={users
          .filter((user) => selectedUsers.includes(user.id))
          .map((user) => ({ id: user.id, nickname: user.nickname }))}
        onSuccess={() => {
          setSelectedUsers([]);
          setAllSelected(false);
          setAlertMessage({
            type: "success",
            message: `포인트 지급이 완료되었습니다.`,
          });
          fetchUsers(currentPage, pageSize);
        }}
      />

      {selectedUserId !== undefined && (
        <UserDetail
          userId={selectedUserId}
          isOpen={showUserDetailModal}
          onClose={() => {
            setShowUserDetailModal(false);
            setSelectedUserId(undefined);
          }}
          onUserUpdated={() => {
            fetchUsers(currentPage, pageSize);
            setAlertMessage({ type: "success", message: "회원 정보가 수정되었습니다." });
          }}
        />
      )}
    </div>
  );
};

export default UserManagement;
