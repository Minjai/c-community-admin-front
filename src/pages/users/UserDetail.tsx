import React, { useState, useEffect } from "react";
import axios from "@/api/axios";
import Modal from "@/components/Modal";
import Input from "@/components/forms/Input";
import Button from "@/components/Button";
import { formatDate } from "@/utils/dateUtils";
import Alert from "@/components/Alert";
import Select from "@/components/forms/Select";
import ActionButton from "@/components/ActionButton";

interface Rank {
  id: number;
  name: string;
  minScore: number;
}

interface User {
  id: number;
  nickname: string;
  email: string;
  password?: string;
  score: number;
  createdAt: string;
  updatedAt: string;
  status: string;
  profileImage?: string;
  rank: {
    id: number;
    name: string;
  };
  activities?: Array<{
    type: string;
    message: string;
    timestamp: string;
    data: any;
  }>;
}

interface UserDetailProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: number;
  onUserUpdated?: () => void;
}

const UserDetail: React.FC<UserDetailProps> = ({ isOpen, onClose, userId, onUserUpdated }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // 포인트 관련 상태
  const [showPointModal, setShowPointModal] = useState<boolean>(false);
  const [pointAction, setPointAction] = useState<"add" | "subtract">("add");
  const [pointAmount, setPointAmount] = useState<number>(0);

  // 등급 변경 관련 상태
  const [showRankModal, setShowRankModal] = useState<boolean>(false);
  const [selectedRank, setSelectedRank] = useState<number>(0);
  const [availableRanks, setAvailableRanks] = useState<Rank[]>([]);

  // 관리자 메모 상태
  const [adminMemo, setAdminMemo] = useState<string>("");

  // 회원 삭제 확인 모달 상태
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  // 수정 관련 상태
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedUser, setEditedUser] = useState<Partial<User>>({});

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetail(userId);
      fetchAvailableRanks();
    }
  }, [isOpen, userId]);

  const fetchUserDetail = async (id: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/admin/account/${id}`);

      // API 응답 구조 디버깅
      console.log("User detail API response:", response.data);

      if (response.data && response.data.success && response.data.data) {
        // 사용자 정보는 response.data.data에 있음
        const userData = response.data.data;

        // rank 필드와 activities 필드를 User 인터페이스 형식에 맞게 변환
        const formattedUser = {
          ...userData,
          // score 값이 없으면 0으로 설정
          score: userData.score || 0,
          // rank 필드 매핑
          rank: {
            id: 0, // 서버 응답에 id가 없으므로 임의의 값 지정
            name: userData.rank?.rankName || "등급 없음",
          },
          // activities 필드가 있으면 그대로 사용
          activities: userData.activities || [],
        };

        console.log("Formatted user data:", formattedUser);
        setUser(formattedUser);

        // rank ID가 있으면 selectedRank 설정
        if (userData.rank) {
          setSelectedRank(0); // 서버 응답에 rank ID가 없어서 임의의 값 지정
        }
      } else {
        setError("회원 정보를 불러오는데 실패했습니다.");
      }
    } catch (err) {
      console.error("Error fetching user details:", err);
      setError("회원 정보를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableRanks = async () => {
    try {
      const response = await axios.get("/admin/ranks");
      if (response.data && Array.isArray(response.data)) {
        setAvailableRanks(response.data);
      }
    } catch (err) {
      console.error("Error fetching ranks:", err);
    }
  };

  const handlePointModalOpen = (action: "add" | "subtract") => {
    setPointAction(action);
    setPointAmount(0);
    setShowPointModal(true);
  };

  const handlePointSubmit = async () => {
    if (!user || pointAmount <= 0) {
      setAlertMessage({
        type: "error",
        message: "유효한 포인트 금액을 입력해주세요.",
      });
      return;
    }

    try {
      const amount = pointAction === "add" ? pointAmount : -pointAmount;

      await axios.post(`/admin/account/${user.id}/points`, {
        amount,
      });

      setAlertMessage({
        type: "success",
        message: `${Math.abs(amount)} 포인트가 ${
          pointAction === "add" ? "지급" : "차감"
        }되었습니다.`,
      });

      // 유저 정보 새로고침
      if (user.id) {
        fetchUserDetail(user.id);
      }

      // 모달 닫기
      setShowPointModal(false);

      // 부모 컴포넌트에 업데이트 알림
      if (onUserUpdated) {
        onUserUpdated();
      }
    } catch (err) {
      console.error("Error updating points:", err);
      setAlertMessage({
        type: "error",
        message: "포인트 처리 중 오류가 발생했습니다.",
      });
    }
  };

  const handleSaveMemo = async () => {
    if (!user) return;

    try {
      await axios.post(`/admin/users/${user.id}/memo`, {
        memo: adminMemo,
      });

      setAlertMessage({
        type: "success",
        message: "메모가 저장되었습니다.",
      });

      // 부모 컴포넌트에 업데이트 알림
      if (onUserUpdated) {
        onUserUpdated();
      }
    } catch (err) {
      console.error("Error saving memo:", err);
      setAlertMessage({
        type: "error",
        message: "메모 저장 중 오류가 발생했습니다.",
      });
    }
  };

  // 회원 삭제 함수
  const handleDeleteUser = async () => {
    if (!user) return;

    try {
      setDeleting(true);

      // API 경로 수정
      await axios.delete(`/admin/account/${user.id}`);

      setAlertMessage({
        type: "success",
        message: "회원이 성공적으로 삭제되었습니다.",
      });

      // 삭제 확인 모달 닫기
      setShowDeleteModal(false);

      // 1초 후 회원 상세 모달 닫기
      setTimeout(() => {
        onClose();

        // 부모 컴포넌트에 업데이트 알림
        if (onUserUpdated) {
          onUserUpdated();
        }
      }, 1000);
    } catch (err) {
      console.error("Error deleting user:", err);
      setAlertMessage({
        type: "error",
        message: "회원 삭제 중 오류가 발생했습니다.",
      });
    } finally {
      setDeleting(false);
    }
  };

  // 수정 모드 토글
  const handleEditMode = () => {
    if (isEditing) {
      // 수정 모드 취소
      setIsEditing(false);
    } else {
      // 수정 모드 시작
      setIsEditing(true);
      // 현재 사용자 정보로 초기화
      setEditedUser({
        nickname: user?.nickname,
        email: user?.email,
      });
    }
  };

  // 수정 입력값 변경 핸들러
  const handleEditChange = (field: string, value: any) => {
    setEditedUser((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 수정 저장 함수
  const handleSaveEdit = async () => {
    if (!user) return;

    try {
      // 수정 API 요청
      await axios.put(`/admin/account/${user.id}`, editedUser);

      setAlertMessage({
        type: "success",
        message: "회원 정보가 성공적으로 수정되었습니다.",
      });

      // 수정 모드 종료
      setIsEditing(false);

      // 사용자 정보 갱신
      if (user.id) {
        fetchUserDetail(user.id);
      }

      // 부모 컴포넌트에 업데이트 알림
      if (onUserUpdated) {
        onUserUpdated();
      }
    } catch (err) {
      console.error("Error updating user:", err);
      setAlertMessage({
        type: "error",
        message: "회원 정보 수정 중 오류가 발생했습니다.",
      });
    }
  };

  // 상태에 따른 색상 클래스
  const getStatusClassName = (status: string) => {
    switch (status) {
      case "온라인":
        return "bg-green-100 text-green-800";
      case "오프라인":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="회원 정보 관리 상세">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      </Modal>
    );
  }

  if (error || !user) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="회원 정보 관리 상세">
        <div className="text-center py-10 text-red-500">
          {error || "회원 정보를 불러올 수 없습니다."}
        </div>
      </Modal>
    );
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="회원 정보 관리 상세" size="xl">
        <div className="space-y-6">
          {alertMessage && (
            <Alert
              type={alertMessage.type}
              message={alertMessage.message}
              onClose={() => setAlertMessage(null)}
            />
          )}

          <div className="flex flex-col space-y-6">
            <div className="flex items-center mb-4">
              <h2 className="text-lg font-semibold">회원 정보 관리 상세</h2>
            </div>

            <div className="flex flex-col space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-24 font-medium text-sm text-gray-500">사용자명</div>
                <div className="flex-1 flex items-center">
                  <span className="font-medium text-gray-900">{user.nickname}</span>
                  <ActionButton
                    label="초기화"
                    action="refresh"
                    size="sm"
                    className="ml-2"
                    onClick={() => console.log("사용자명 초기화")}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="w-24 font-medium text-sm text-gray-500">이메일</div>
                <div className="flex-1 flex items-center">
                  <span className="font-medium text-gray-900">{user.email}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="w-24 font-medium text-sm text-gray-500">패스워드</div>
                <div className="flex-1 flex items-center">
                  <span className="font-medium text-gray-900">********</span>
                  <ActionButton
                    label="초기화"
                    action="refresh"
                    size="sm"
                    className="ml-2"
                    onClick={() => console.log("패스워드 초기화")}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="w-24 font-medium text-sm text-gray-500">등급</div>
                <div className="flex-1 flex items-center">
                  <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    {user.rank?.name || "등급 없음"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="w-24 font-medium text-sm text-gray-500">포인트</div>
                <div className="flex-1 flex items-center">
                  <span className="font-medium text-gray-900">
                    {(user.score || 0).toLocaleString()} P
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    className="ml-2"
                    onClick={() => handlePointModalOpen("add")}
                  >
                    지급
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    className="ml-2"
                    onClick={() => handlePointModalOpen("subtract")}
                  >
                    차감
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="w-24 font-medium text-sm text-gray-500">가입일자</div>
                <div className="flex-1">
                  <span className="font-medium text-gray-900">{formatDate(user.createdAt)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="w-24 font-medium text-sm text-gray-500">상태</div>
                <div className="flex-1">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${getStatusClassName(user.status)}`}
                  >
                    {user.status}
                  </span>
                </div>
              </div>
            </div>

            {/* 회원 프로필 영역 */}
            <div className="flex justify-between items-start mt-6">
              <div className="w-24 font-medium text-sm text-gray-500">프로필 사진</div>
              <div className="flex-1 flex flex-col items-center">
                <div className="bg-blue-100 rounded-md w-48 h-48 flex items-center justify-center overflow-hidden">
                  <img
                    src={user.profileImage || "/placeholder-user.png"}
                    alt="프로필"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/placeholder-user.png";
                    }}
                  />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-2"
                  onClick={() => console.log("프로필 초기화")}
                >
                  초기화
                </Button>
              </div>
            </div>

            {/* 활동내역 영역 */}
            <div className="flex justify-between items-start mt-6">
              <div className="w-24 font-medium text-sm text-gray-500">활동내역</div>
              <div className="flex-1">
                <div className="border rounded-md overflow-y-auto h-48 bg-gray-50">
                  {user.activities && user.activities.length > 0 ? (
                    <div className="p-2">
                      {user.activities.map((activity, index) => (
                        <div key={index} className="border-b py-2 last:border-0">
                          <div className="text-sm text-gray-600">
                            {formatDate(activity.timestamp)}
                          </div>
                          <div className="text-sm">{activity.message}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex justify-center items-center h-full text-gray-500">
                      활동 내역이 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 관리자 메모 영역 */}
            <div className="flex justify-between items-start mt-6">
              <div className="w-24 font-medium text-sm text-gray-500">관리자 메모</div>
              <div className="flex-1">
                <textarea
                  className="w-full h-48 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={adminMemo}
                  onChange={(e) => setAdminMemo(e.target.value)}
                  placeholder="회원에 대한 관리자 메모를 입력하세요."
                ></textarea>
                <div className="flex justify-end mt-2">
                  <Button variant="primary" size="sm" onClick={handleSaveMemo}>
                    저장
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-8 space-x-4">
            <Button variant="secondary" onClick={onClose}>
              목록
            </Button>
            {isEditing ? (
              <Button variant="primary" onClick={handleSaveEdit}>
                저장
              </Button>
            ) : (
              <Button variant="primary" onClick={handleEditMode}>
                수정
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* 포인트 지급/차감 모달 */}
      <Modal
        isOpen={showPointModal}
        onClose={() => setShowPointModal(false)}
        title={`포인트 ${pointAction === "add" ? "지급" : "차감"}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="mb-4">
            <div className="font-medium text-sm text-gray-500 mb-1">지급 대상자</div>
            <div className="text-blue-600 font-medium">{user.nickname}</div>
          </div>

          <div className="mb-4">
            <div className="font-medium text-sm text-gray-500 mb-1">현재 포인트</div>
            <div className="text-blue-600 font-medium">{(user.score || 0).toLocaleString()} P</div>
          </div>

          <Input
            label={`${pointAction === "add" ? "지급" : "차감"} 포인트`}
            type="number"
            value={pointAmount.toString()}
            onChange={(e) => setPointAmount(Math.max(0, parseInt(e.target.value) || 0))}
            min="0"
          />

          <div className="flex justify-center mt-6">
            <Button
              variant={pointAction === "add" ? "primary" : "danger"}
              onClick={handlePointSubmit}
              className="w-full py-3"
            >
              회원 포인트 {pointAction === "add" ? "지급" : "차감"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 회원 삭제 확인 모달 */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="회원 삭제 확인"
        size="sm"
      >
        <div className="space-y-4">
          <div className="text-center py-4">
            <p className="text-lg font-medium mb-2">정말 이 회원을 삭제하시겠습니까?</p>
            <p className="text-sm text-gray-600">회원명: {user?.nickname}</p>
            <p className="text-sm text-red-600 mt-4">이 작업은 되돌릴 수 없습니다.</p>
          </div>

          <div className="flex justify-center space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
              disabled={deleting}
            >
              취소
            </Button>
            <Button variant="danger" onClick={handleDeleteUser} disabled={deleting}>
              {deleting ? "삭제 중..." : "삭제"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default UserDetail;
