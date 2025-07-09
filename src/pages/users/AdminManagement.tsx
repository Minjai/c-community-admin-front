import React, { useState, useEffect, useMemo } from "react";
import axios from "@/api/axios";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import ActionButton from "@/components/ActionButton";
import Modal from "@/components/Modal";
import Input from "@/components/forms/Input";
import Alert from "@/components/Alert";
import SearchInput from "@/components/SearchInput";
import { formatDate } from "@/utils/dateUtils";
import LoadingOverlay from "@/components/LoadingOverlay";

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
  const [totalItems, setTotalItems] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const [saving, setSaving] = useState<boolean>(false);

  // 선택된 관리자 ID 상태 추가
  const [selectedAdminIds, setSelectedAdminIds] = useState<number[]>([]);

  // 검색 value 상태
  const [searchValue, setSearchValue] = useState<string>("");

  // 관리자 목록 조회 (검색 파라미터 추가)
  const fetchAdmins = async (
    page: number = 1,
    limit: number = pageSize,
    searchValue: string = ""
  ) => {
    setLoading(true);
    setError(null);
    const currentSelected = [...selectedAdminIds]; // 선택 상태 유지

    try {
      const params: any = {
        page: page,
        limit: limit,
      };

      if (searchValue.trim()) {
        params.search = searchValue;
      }

      const response = await axios.get<AdminResponse>(`/admin/admins`, { params });

      if (response.data) {
        setAdmins(response.data.users);
        setCurrentPage(response.data.page);
        setTotalPages(response.data.totalPages);
        setTotalItems(response.data.total);
        // 선택 상태 복원
        setSelectedAdminIds(
          currentSelected.filter((id) => response.data.users.some((admin) => admin.id === id))
        );
      } else {
        setAdmins([]);
        setTotalItems(0);
        setSelectedAdminIds([]); // 에러 시 선택 초기화
        setError("관리자 목록을 불러오는데 실패했습니다.");
        setPageSize(limit); // Reset pageSize on error
      }
    } catch (err) {
      console.error("Error fetching admins:", err);
      setAdmins([]);
      setTotalItems(0);
      setSelectedAdminIds([]); // 에러 시 선택 초기화
      setError("관리자 목록을 불러오는데 실패했습니다.");
      setPageSize(limit); // Reset pageSize on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins(currentPage, pageSize, searchValue);
  }, [currentPage, pageSize]);

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
    }
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
    setAlertMessage(null); // 모달 오류 초기화
    setSelectedAdminIds([]); // 추가 시 선택 해제
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
    setAlertMessage(null); // 모달 오류 초기화
    setSelectedAdminIds([]); // 수정 시 선택 해제
  };

  // 관리자 계정 저장 (추가 또는 수정)
  const handleSaveAdmin = async () => {
    if (!currentAdmin) return;

    setSaving(true); // 저장 로딩 상태 시작
    setAlertMessage(null);

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
      setSelectedAdminIds([]); // 저장 후 선택 해제
      fetchAdmins(currentPage, pageSize, searchValue);
    } catch (error: any) {
      console.error("Error saving admin:", error);
      setAlertMessage({
        type: "error",
        message: `관리자 저장 중 오류가 발생했습니다: ${
          error.response?.data?.message || error.message
        }`,
      });
    } finally {
      setSaving(false); // 저장 로딩 상태 종료
    }
  };

  // 관리자 삭제
  const handleDeleteAdmin = async (id: number) => {
    if (!window.confirm("정말로 이 관리자를 삭제하시겠습니까?")) {
      return;
    }

    setLoading(true); // 삭제 로딩 상태 시작
    setAlertMessage(null);
    try {
      await axios.delete(`/admin/account/${id}`);
      setAlertMessage({ type: "success", message: "관리자가 삭제되었습니다." });
      setSelectedAdminIds((prev) => prev.filter((adminId) => adminId !== id)); // 선택 해제
      fetchAdmins(currentPage, pageSize, searchValue);
    } catch (error: any) {
      console.error("Error deleting admin:", error);
      setAlertMessage({
        type: "error",
        message: `관리자 삭제 중 오류가 발생했습니다: ${
          error.response?.data?.message || error.message
        }`,
      });
    } finally {
      setLoading(false); // 삭제 로딩 상태 종료
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

  // 개별 선택 핸들러 추가
  const handleSelectAdmin = (id: number) => {
    setSelectedAdminIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((adminId) => adminId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // 전체 선택 핸들러 추가
  const handleSelectAllAdmins = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedAdminIds(admins.map((admin) => admin.id));
    } else {
      setSelectedAdminIds([]);
    }
  };

  // 일괄 삭제 핸들러 추가
  const handleBulkDelete = async () => {
    if (selectedAdminIds.length === 0) {
      setAlertMessage({ type: "info", message: "삭제할 관리자를 선택해주세요." });
      return;
    }
    if (!window.confirm(`선택된 ${selectedAdminIds.length}명의 관리자를 정말 삭제하시겠습니까?`)) {
      return;
    }

    setLoading(true);
    setAlertMessage(null);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const id of selectedAdminIds) {
      try {
        await axios.delete(`/admin/account/${id}`);
        successCount++;
      } catch (err: any) {
        errorCount++;
        const message = err.response?.data?.message || `관리자(ID: ${id}) 삭제 중 오류`;
        errors.push(message);
        console.error(`Error deleting admin ${id}:`, err.response?.data || err);
      }
    }

    setSelectedAdminIds([]); // 완료 후 선택 해제
    setLoading(false);

    if (errorCount === 0) {
      setAlertMessage({
        type: "success",
        message: `${successCount}명의 관리자가 성공적으로 삭제되었습니다.`,
      });
    } else if (successCount === 0) {
      setAlertMessage({
        type: "error",
        message: `선택된 관리자를 삭제하는 중 오류가 발생했습니다. (${errors.join(", ")})`,
      });
    } else {
      setAlertMessage({
        type: "info",
        message: `${successCount}명 삭제 성공, ${errorCount}명 삭제 실패.`,
      });
    }

    fetchAdmins(currentPage, pageSize, searchValue);
  };

  // 검색 핸들러
  const handleSearch = (value: string) => {
    setSearchValue(value);
    fetchAdmins(currentPage, pageSize, value);
  };

  // DataTable 컬럼 정의
  const columns = useMemo(
    () => [
      // 체크박스 컬럼 추가
      {
        header: (
          <input
            type="checkbox"
            className="form-checkbox h-4 w-4 text-blue-600"
            onChange={handleSelectAllAdmins}
            checked={admins.length > 0 && selectedAdminIds.length === admins.length}
            ref={(input) => {
              if (input) {
                input.indeterminate =
                  selectedAdminIds.length > 0 && selectedAdminIds.length < admins.length;
              }
            }}
            disabled={loading || admins.length === 0 || saving}
          />
        ),
        accessor: "id" as keyof AdminUser,
        cell: (value: unknown, row: AdminUser) => (
          <input
            type="checkbox"
            className="form-checkbox h-4 w-4 text-blue-600"
            checked={selectedAdminIds.includes(row.id)}
            onChange={() => handleSelectAdmin(row.id)}
            disabled={loading || saving}
          />
        ),
        className: "w-px px-4",
        size: 50,
      },
      {
        header: "관리자 명",
        accessor: "nickname" as keyof AdminUser,
        cell: (value: unknown, row: AdminUser) => (
          <span
            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer block max-w-xs truncate"
            onClick={() => handleEditAdmin(row)}
            title={value as string}
          >
            {value as string}
          </span>
        ),
      },
      {
        header: "이메일",
        accessor: "email" as keyof AdminUser,
      },
      {
        header: "권한",
        accessor: "role" as keyof AdminUser,
        cell: (value: unknown) => (
          <span
            className={`px-2 py-1 rounded ${getRoleClassName(value as string)} text-xs font-medium`}
          >
            {value as string}
          </span>
        ),
      },
      {
        header: "상태",
        accessor: "status" as keyof AdminUser,
        cell: (value: unknown) => (
          <span
            className={`px-2 py-1 rounded ${getStatusClassName(
              value as string
            )} text-xs font-medium`}
          >
            {value as string}
          </span>
        ),
      },
      {
        header: "등록일자",
        accessor: "createdAt" as keyof AdminUser,
        cell: (value: unknown) => formatDate(value as string),
      },
      {
        header: "관리",
        accessor: "id" as keyof AdminUser,
        cell: (value: unknown, row: AdminUser) => (
          <div className="flex space-x-2">
            <ActionButton
              label="수정"
              action="edit"
              onClick={() => handleEditAdmin(row)}
              disabled={loading || saving}
            />
            <ActionButton
              label="삭제"
              action="delete"
              onClick={() => handleDeleteAdmin(row.id)}
              disabled={loading || saving}
            />
          </div>
        ),
        size: 120,
      },
    ],
    [
      admins,
      selectedAdminIds,
      loading,
      handleSelectAllAdmins,
      handleSelectAdmin,
      handleEditAdmin,
      handleDeleteAdmin,
    ]
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">관리자 계정 관리</h1>
        <SearchInput
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          onSearch={handleSearch}
        />
        <div className="flex space-x-2">
          <Button
            variant="danger"
            onClick={handleBulkDelete}
            disabled={selectedAdminIds.length === 0 || loading || saving}
          >
            {`선택 삭제 (${selectedAdminIds.length})`}
          </Button>
          <Button onClick={handleAddAdmin} variant="primary" disabled={loading || saving}>
            새 관리자 추가
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

      <LoadingOverlay isLoading={loading || saving} />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          columns={columns}
          data={admins}
          loading={loading}
          emptyMessage={searchValue ? "검색된 결과가 없습니다." : "등록된 관리자가 없습니다."}
          pagination={{
            currentPage: currentPage,
            pageSize: pageSize,
            totalItems: totalItems,
            onPageChange: handlePageChange,
          }}
        />
      </div>

      {/* 관리자 추가/수정 모달 */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isEditing ? "관리자 정보 수정" : "새 관리자 추가"}
      >
        {/* Modal Error/Success Alert (Above controls) */}
        {alertMessage && (
          <div className="mb-4">
            <Alert
              type={alertMessage.type}
              message={alertMessage.message}
              onClose={() => setAlertMessage(null)}
            />
          </div>
        )}
        {error && (
          <div className="mb-4">
            <Alert type="error" message={error} onClose={() => setError(null)} />
          </div>
        )}

        {/* Top Control Area */}
        <div className="flex justify-between items-center pt-2 pb-4 border-b border-gray-200 mb-6">
          {/* Buttons (Left) */}
          <div className="flex space-x-3">
            <Button onClick={handleSaveAdmin} variant="primary">
              {isEditing ? "저장" : "등록"}
            </Button>
            <Button onClick={() => setShowModal(false)} variant="secondary">
              취소
            </Button>
          </div>
          {/* Right side - Placeholder if needed in future */}
          <div></div>
        </div>

        {currentAdmin && (
          <div className="space-y-6">
            <Input
              label="관리자 명"
              id="nickname"
              value={currentAdmin.nickname}
              onChange={(e) => handleInputChange("nickname", e.target.value)}
              required
              disabled={saving}
            />

            <Input
              label="이메일(로그인 계정)"
              id="email"
              type="email"
              value={currentAdmin.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              required
              disabled={saving || isEditing}
            />

            <Input
              label={isEditing ? "비밀번호 (변경 시에만 입력)" : "비밀번호"}
              id="password"
              type="password"
              value={currentAdmin.password || ""}
              onChange={(e) => handleInputChange("password", e.target.value)}
              required={!isEditing}
              disabled={saving}
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
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminManagement;
