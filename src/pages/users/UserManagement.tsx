import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "@/api/axios";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import ActionButton from "@/components/ActionButton";
import Modal from "@/components/Modal";
import Input from "@/components/forms/Input";
import Alert from "@/components/Alert";
import SearchInput from "@/components/SearchInput";
import { formatDate } from "@/utils/dateUtils";
import UserDetail from "./UserDetail";
import BulkPointModal from "./BulkPointModal";
import ExcelDownloadButton from "../../components/ExcelDownloadButton";
import StatusBadge, { statusNumberColor } from "@/components/StatusBadge";

// 회원 타입 정의
interface UserRank {
  rankId: number;
  rankName: string;
  image: string;
}

interface UserCount {
  posts: number;
  comments: number;
  likes: number;
  reviews: number;
  inquiries: number;
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
  isDeleted: boolean;
  isDeletedAt?: string;
  _count?: UserCount;
  activities?: string;
}

interface UserStatistics {
  userStatus: {
    online: number;
    offline: number;
    deleted: number;
  };
  rankDistribution: Array<{
    rankName: string;
    count: number;
  }>;
}

interface UserResponse {
  data: User[];
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
  statistics: UserStatistics;
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

  // 통계 정보 상태
  const [statistics, setStatistics] = useState<UserStatistics>({
    userStatus: { online: 0, offline: 0, deleted: 0 },
    rankDistribution: [],
  });

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

  // 검색 value 상태
  const [searchValue, setSearchValue] = useState<string>("");

  // 필터 상태
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // 회원 목록 조회
  const fetchUsers = useCallback(
    async (
      page: number,
      limit: number,
      searchValue: string = "",
      statusFilter: string | null = null
    ) => {
      setLoading(true);
      setError(null);

      try {
        const params: any = {
          page: page,
          limit: limit,
        };

        if (searchValue.trim()) {
          params.search = searchValue;
        }

        if (statusFilter) {
          params.status = statusFilter;
        }

        const response = await axios.get(`/admin/users`, { params });
        console.log("회원 정보 API 응답:", response.data);

        if (response.data && response.data.data && response.data.pagination) {
          const fetchedUsers = response.data.data || [];
          const pagination = response.data.pagination;
          const responseStatistics = response.data.statistics;

          setUsers(fetchedUsers);
          setTotalItems(pagination.totalItems || 0);
          setTotalPages(pagination.totalPages || 0);
          setCurrentPage(pagination.currentPage || page);
          setPageSize(pagination.pageSize || limit);
          setSelectedUsers([]);
          setAllSelected(false);

          // 통계 정보 설정
          if (responseStatistics) {
            setStatistics(responseStatistics);
          }
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
    },
    []
  );

  useEffect(() => {
    fetchUsers(currentPage, pageSize, searchValue, statusFilter);
  }, [fetchUsers, currentPage, pageSize, statusFilter]);

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
  const getStatusClassName = (status: string, isDeleted: boolean) => {
    if (isDeleted) {
      return "bg-red-500 text-white";
    }

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

      fetchUsers(currentPage, pageSize, searchValue, statusFilter);
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

  // 회원 삭제 처리 (소프트 삭제)
  const handleDeleteUser = async (userId: number) => {
    const user = users.find((u) => u.id === userId);
    const nickname = user?.nickname || "알 수 없음";

    // 삭제된 회원인지 확인
    if (user?.isDeleted) {
      setAlertMessage({
        type: "error",
        message: "이미 삭제 처리된 회원입니다.",
      });
      return;
    }

    if (
      !window.confirm(`[${nickname}] 회원 삭제하시겠습니까?\n\n삭제된 회원은 복구 불가능합니다.`)
    ) {
      return;
    }

    try {
      await axios.delete(`/admin/users/${userId}/delete`);

      setAlertMessage({
        type: "success",
        message: "회원이 성공적으로 삭제 처리되었습니다.",
      });

      fetchUsers(currentPage, pageSize, searchValue, statusFilter);
    } catch (err) {
      console.error("Error deleting user:", err);
      setAlertMessage({
        type: "error",
        message: "회원 삭제 처리 중 오류가 발생했습니다.",
      });
    }
  };

  // 회원 수정 처리
  const handleEditUser = (userId: number) => {
    setSelectedUserId(userId);
    setShowUserDetailModal(true);
  };

  // 검색 핸들러
  const handleSearch = (value: string) => {
    setSearchValue(value);
    fetchUsers(currentPage, pageSize, value, statusFilter);
  };

  // 상태 필터 핸들러
  const handleStatusFilter = (status: string | null) => {
    setStatusFilter(status);
    setCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
  };

  // DataTable 컬럼 정의
  const columns = useMemo(() => {
    const baseColumns = [
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
        cell: (value: unknown, row: User) => (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              className="form-checkbox h-4 w-4 text-blue-600"
              checked={selectedUsers.includes(row.id)}
              onChange={() => handleToggleSelect(row.id)}
            />
          </div>
        ),
        className: "w-px px-4",
      },
      {
        header: "이메일",
        accessor: "email" as keyof User,
        cell: (value: unknown, row: User) => (
          <span
            className="text-blue-600 hover:underline cursor-pointer truncate block max-w-xs"
            title={value as string}
            onClick={() => handleEditUser(row.id)}
          >
            {value as string}
          </span>
        ),
      },
      {
        header: "닉네임",
        accessor: "nickname" as keyof User,
        cell: (value: unknown, row: User) => (
          <span className="truncate block max-w-xs" title={value as string}>
            {value as string}
          </span>
        ),
      },
      {
        header: "등급",
        accessor: "rank" as keyof User,
        cell: (value: unknown, row: User) => {
          const rank = value as UserRank;
          return (
            <div className="flex items-center space-x-2">
              {rank?.image && <img src={rank.image} alt={rank.rankName} className="h-6 w-6" />}
              <span>{rank?.rankName || "-"}</span>
            </div>
          );
        },
      },
      {
        header: "상태",
        accessor: "status" as keyof User,
        cell: (value: unknown, row: User) => {
          const status = value as string;
          const isDeleted = row.isDeleted;
          return (
            <div>
              <span
                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClassName(
                  status,
                  isDeleted
                )}`}
              >
                {isDeleted ? "삭제" : status}
              </span>
              {isDeleted && row.isDeletedAt && (
                <div className="text-xs text-gray-500 mt-1">{formatDate(row.isDeletedAt)}</div>
              )}
            </div>
          );
        },
        className: "text-center",
      },
      {
        header: "포인트",
        accessor: "score" as keyof User,
        cell: (value: unknown, row: User) => {
          const score = value as number;
          return score.toLocaleString();
        },
      },
      {
        header: "가입일",
        accessor: "createdAt" as keyof User,
        cell: (value: unknown, row: User) => {
          const dateValue = value as string;
          return formatDate(dateValue);
        },
      },
    ];
    // 활동 칼럼
    const activityColumn = {
      header: "등록/댓글/추천/리뷰/문의",
      accessor: "activities" as keyof User,
      cell: (value: unknown, row: User) => {
        if (row.activities) {
          const activities = row.activities.split("/");
          return `${activities[0] || 0}/${activities[1] || 0}/${activities[2] || 0}/${
            activities[3] || 0
          }/${activities[4] || 0}`;
        }
        return `${row._count?.posts || 0}/${row._count?.comments || 0}/${row._count?.likes || 0}/${
          row._count?.reviews || 0
        }/${row._count?.inquiries || 0}`;
      },
      className: "text-center",
    };
    // 관리 칼럼
    const manageColumn = {
      header: "관리",
      accessor: "id" as keyof User,
      cell: (value: unknown, row: User) => (
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
            onClick={() => handleDeleteUser(row.id)}
            disabled={loading || saving || row.isDeleted}
          />
        </div>
      ),
      className: "w-24 text-center",
    };
    // 최종 컬럼 배열: baseColumns + 활동 + 관리
    return [...baseColumns, activityColumn, manageColumn];
  }, [users, selectedUsers, loading, currentPage, pageSize]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold mb-6">회원 관리</h1>
        <SearchInput
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          onSearch={handleSearch}
        />
        <div className="flex space-x-2">
          {/* 엑셀 다운로드 버튼 */}
          <ExcelDownloadButton type="userAccounts" variant="outline" size="sm">
            엑셀 다운로드
          </ExcelDownloadButton>
          <Button onClick={handleOpenPointModal} disabled={selectedUsers.length === 0 || loading}>
            포인트 일괄 지급
          </Button>
        </div>
      </div>

      {/* 통계 정보 섹션 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">회원 통계</h2>

        {/* 상태별 통계 */}
        <div className="flex flex-row gap-x-2 mb-6">
          <div className="flex items-center">
            <StatusBadge status="온라인" />
            <span className={`ml-2 ${statusNumberColor["온라인"]}`}>
              {statistics.userStatus.online.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center">
            <StatusBadge status="오프라인" />
            <span className={`ml-2 ${statusNumberColor["오프라인"]}`}>
              {statistics.userStatus.offline.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center">
            <StatusBadge status="삭제" />
            <span className={`ml-2 ${statusNumberColor["삭제"]}`}>
              {statistics.userStatus.deleted.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 등급별 통계 */}
        <div>
          <h3 className="text-md font-semibold text-gray-900 mb-3">등급별 분포</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {statistics.rankDistribution
              .filter((rank) => !rank.rankName.toLowerCase().includes("manager"))
              .map((rank, index) => (
                <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-800">{rank.rankName}</p>
                  <p className="text-lg font-bold text-gray-900">{rank.count}명</p>
                </div>
              ))}
          </div>
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

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          columns={columns}
          data={users}
          loading={loading}
          emptyMessage={searchValue ? "검색된 결과가 없습니다." : "등록된 회원이 없습니다."}
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
          fetchUsers(currentPage, pageSize, searchValue, statusFilter);
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
            fetchUsers(currentPage, pageSize, searchValue, statusFilter);
            setAlertMessage({ type: "success", message: "회원 정보가 수정되었습니다." });
          }}
        />
      )}
    </div>
  );
};

export default UserManagement;
