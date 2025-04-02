import React, { useState, useEffect } from "react";
import axios from "@/api/axios";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import ActionButton from "@/components/ActionButton";
import Modal from "@/components/Modal";
import Input from "@/components/forms/Input";
import Alert from "@/components/Alert";
import { formatDate } from "@/utils/dateUtils";

// 관리자 계정 타입 정의
interface Rank {
  rankName: string;
  image: string;
  score: number;
}

interface Activity {
  type: "comment" | "post" | "like";
  message: string;
  timestamp: string;
  data: {
    commentId?: number;
    postId?: number;
    content?: string;
  };
}

interface AdminUser {
  id: number;
  email: string;
  nickname: string;
  createdAt: string;
  updatedAt: string;
  profileImage?: string;
  score: number;
  role: string;
  status: string;
  rank: Rank;
  password?: string;
  activities: Activity[];
}

interface AdminResponse {
  users: AdminUser[];
  total: number;
  page: number;
  totalPages: number;
}

const AdminManagement: React.FC = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // 관리자 목록 조회
  const fetchAdmins = async (page: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get<AdminResponse>(`/admin/admins?page=${page}`);

      if (response.data) {
        setAdmins(response.data.users);
        setCurrentPage(response.data.page);
        setTotalPages(response.data.totalPages);
      } else {
        setAdmins([]);
        setError("관리자 목록을 불러오는데 실패했습니다.");
      }
    } catch (err) {
      console.error("Error fetching admins:", err);
      setError("관리자 목록을 불러오는데 실패했습니다.");
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    fetchAdmins(page);
  };

  // 관리자 추가 모달 열기
  const handleAddAdmin = () => {
    setCurrentAdmin({
      id: 0,
      email: "",
      nickname: "",
      password: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      score: 0,
      role: "admin",
      status: "오프라인",
      rank: {
        rankName: "",
        image: "",
        score: 0,
      },
      activities: [],
    });
    setShowModal(true);
    setIsEditing(false);
  };

  // 관리자 상세 정보 조회
  const fetchAdminDetail = async (id: number) => {
    try {
      const response = await axios.get(`/admin/account/${id}`);
      if (response.data && response.data.success) {
        setCurrentAdmin(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching admin detail:", err);
      setAlertMessage({
        type: "error",
        message: "관리자 정보를 불러오는데 실패했습니다.",
      });
    }
  };

  // 관리자 수정 모달 열기
  const handleEditAdmin = (admin: AdminUser) => {
    fetchAdminDetail(admin.id);
    setShowModal(true);
    setIsEditing(true);
  };

  // 관리자 계정 저장 (추가 또는 수정)
  const handleSaveAdmin = async () => {
    if (!currentAdmin) return;

    try {
      // 필수 필드 검증 (새 관리자 추가 시에만)
      if (!isEditing && (!currentAdmin.nickname || !currentAdmin.email || !currentAdmin.password)) {
        setAlertMessage({ type: "error", message: "이름, 이메일, 비밀번호는 필수 항목입니다." });
        return;
      }

      if (isEditing && currentAdmin.id) {
        // 수정 모드일 때 - 입력된 필드만 전송
        const updateData: any = {};

        if (currentAdmin.email) updateData.email = currentAdmin.email;
        if (currentAdmin.nickname) updateData.nickname = currentAdmin.nickname;
        if (currentAdmin.password) updateData.password = currentAdmin.password;

        await axios.put(`/admin/account/${currentAdmin.id}`, updateData);

        setAlertMessage({ type: "success", message: "관리자 정보가 수정되었습니다." });
      } else {
        // 추가 모드일 때
        await axios.post("/admin/signup", {
          email: currentAdmin.email,
          password: currentAdmin.password,
          nickname: currentAdmin.nickname,
        });

        setAlertMessage({ type: "success", message: "새 관리자가 추가되었습니다." });
      }

      // 모달 닫고 목록 갱신
      setShowModal(false);
      fetchAdmins(currentPage);
    } catch (error: any) {
      console.error("Error saving admin:", error);
      setAlertMessage({
        type: "error",
        message: `관리자 저장 중 오류가 발생했습니다: ${
          error.response?.data?.message || error.message
        }`,
      });
    }
  };

  // 관리자 삭제
  const handleDeleteAdmin = async (id: number) => {
    if (!window.confirm("정말로 이 관리자를 삭제하시겠습니까?")) {
      return;
    }

    try {
      await axios.delete(`/admin/account/${id}`);
      setAlertMessage({ type: "success", message: "관리자가 삭제되었습니다." });
      fetchAdmins(currentPage);
    } catch (error: any) {
      console.error("Error deleting admin:", error);
      setAlertMessage({
        type: "error",
        message: `관리자 삭제 중 오류가 발생했습니다: ${
          error.response?.data?.message || error.message
        }`,
      });
    }
  };

  // 입력 변경 핸들러
  const handleInputChange = (name: string, value: any) => {
    if (currentAdmin) {
      setCurrentAdmin({ ...currentAdmin, [name]: value });
    }
  };

  // 상태에 따른 색상
  const getStatusClassName = (status: string) => {
    switch (status) {
      case "온라인":
        return "bg-green-100 text-green-800";
      case "오프라인":
        return "bg-gray-100 text-gray-800";
      case "비활성":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // 역할에 따른 색상
  const getRoleClassName = (role: string) => {
    switch (role) {
      case "superadmin":
        return "bg-purple-100 text-purple-800";
      case "admin":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // DataTable 컬럼 정의
  const columns = [
    {
      header: "관리자 명",
      accessor: "nickname" as keyof AdminUser,
    },
    {
      header: "로그인 계정",
      accessor: "email" as keyof AdminUser,
    },
    {
      header: "등급",
      accessor: "rank" as keyof AdminUser,
      cell: (value: Rank) => (
        <span className={`px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800`}>
          {value?.rankName || "등급 없음"}
        </span>
      ),
    },
    {
      header: "가입일자",
      accessor: "createdAt" as keyof AdminUser,
      cell: (value: string) => formatDate(value),
    },
    {
      header: "최근 수정일",
      accessor: "updatedAt" as keyof AdminUser,
      cell: (value: string) => formatDate(value),
    },
    {
      header: "포인트",
      accessor: "score" as keyof AdminUser,
      cell: (value: number) => `${value.toLocaleString()} P`,
    },
    {
      header: "상태",
      accessor: "status" as keyof AdminUser,
      cell: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs ${getStatusClassName(value)}`}>
          {value}
        </span>
      ),
    },
    {
      header: "관리",
      accessor: "id" as keyof AdminUser,
      cell: (value: number, row: AdminUser) => (
        <div className="flex items-center space-x-2">
          <ActionButton
            label="수정"
            onClick={() => handleEditAdmin(row)}
            color="blue"
            action="edit"
          />
          <ActionButton
            label="삭제"
            onClick={() => handleDeleteAdmin(value)}
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
        <h1 className="text-2xl font-semibold">관리자 계정 관리</h1>
        <Button onClick={handleAddAdmin} variant="primary">
          새 관리자 추가
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

      <DataTable
        columns={columns}
        data={admins}
        loading={loading}
        emptyMessage="등록된 관리자가 없습니다."
        pagination={{
          currentPage,
          pageSize: 10,
          totalItems: admins.length,
          onPageChange: handlePageChange,
        }}
      />

      {/* 관리자 추가/수정 모달 */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isEditing ? "관리자 정보 수정" : "새 관리자 추가"}
      >
        {currentAdmin && (
          <div className="space-y-6">
            <Input
              label="관리자 명"
              id="nickname"
              value={currentAdmin.nickname}
              onChange={(e) => handleInputChange("nickname", e.target.value)}
              required
            />

            <Input
              label="이메일(로그인 계정)"
              id="email"
              type="email"
              value={currentAdmin.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              required
            />

            <Input
              label={isEditing ? "비밀번호 (변경 시에만 입력)" : "비밀번호"}
              id="password"
              type="password"
              value={currentAdmin.password || ""}
              onChange={(e) => handleInputChange("password", e.target.value)}
              required={!isEditing}
            />

            {isEditing && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">가입일자</label>
                  <div className="text-gray-900">{formatDate(currentAdmin.createdAt)}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                  <div
                    className={`px-2 py-1 rounded-full text-xs inline-block ${getStatusClassName(
                      currentAdmin.status
                    )}`}
                  >
                    {currentAdmin.status}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">활동내역</label>
                  <div className="mt-1 text-sm text-gray-900 space-y-2">
                    {currentAdmin.activities.length > 0 ? (
                      currentAdmin.activities.map((activity, index) => (
                        <div key={index} className="ml-2">
                          {activity.message}
                        </div>
                      ))
                    ) : (
                      <div>활동 내역이 없습니다.</div>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button onClick={() => setShowModal(false)} variant="secondary">
                취소
              </Button>
              <Button onClick={handleSaveAdmin} variant="primary">
                저장
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminManagement;
