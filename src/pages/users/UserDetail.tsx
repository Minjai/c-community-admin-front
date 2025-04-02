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
    id: number;
    date: string;
    content: string;
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
  const [pointMemo, setPointMemo] = useState<string>("");

  // 등급 변경 관련 상태
  const [showRankModal, setShowRankModal] = useState<boolean>(false);
  const [selectedRank, setSelectedRank] = useState<number>(0);
  const [availableRanks, setAvailableRanks] = useState<Rank[]>([]);

  // 관리자 메모 상태
  const [adminMemo, setAdminMemo] = useState<string>("");

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
      const response = await axios.get(`/users/${id}`);

      if (response.data) {
        setUser(response.data);
        if (response.data.rank) {
          setSelectedRank(response.data.rank.id);
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
    setPointMemo("");
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

      await axios.post(`/admin/users/${user.id}/points`, {
        amount,
        memo: pointMemo,
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

  const handleRankChange = async () => {
    if (!user || selectedRank === user.rank.id) {
      return;
    }

    try {
      await axios.put(`/admin/users/${user.id}/rank`, {
        rankId: selectedRank,
      });

      setAlertMessage({
        type: "success",
        message: "회원 등급이 변경되었습니다.",
      });

      // 유저 정보 새로고침
      if (user.id) {
        fetchUserDetail(user.id);
      }

      // 모달 닫기
      setShowRankModal(false);

      // 부모 컴포넌트에 업데이트 알림
      if (onUserUpdated) {
        onUserUpdated();
      }
    } catch (err) {
      console.error("Error updating rank:", err);
      setAlertMessage({
        type: "error",
        message: "등급 변경 중 오류가 발생했습니다.",
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 회원 정보 영역 */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center mb-4">
                <h2 className="text-lg font-semibold">회원 정보 관리 상세</h2>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <div className="font-medium text-sm text-gray-500">사용자명</div>
                  <div className="flex items-center mt-1">
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

                <div className="col-span-2">
                  <div className="font-medium text-sm text-gray-500">이메일</div>
                  <div className="flex items-center mt-1">
                    <span className="font-medium text-gray-900">{user.email}</span>
                  </div>
                </div>

                <div className="col-span-3">
                  <div className="font-medium text-sm text-gray-500">패스워드</div>
                  <div className="flex items-center mt-1">
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

                <div className="col-span-1">
                  <div className="font-medium text-sm text-gray-500">등급</div>
                  <div className="flex items-center mt-1">
                    <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      {user.rank.name}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="ml-2"
                      onClick={() => setShowRankModal(true)}
                    >
                      변경
                    </Button>
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="font-medium text-sm text-gray-500">골드</div>
                  <div className="flex items-center mt-1">
                    <span className="font-medium text-gray-900">0 G</span>
                  </div>
                </div>

                <div className="col-span-3">
                  <div className="font-medium text-sm text-gray-500">보유 포인트</div>
                  <div className="flex items-center mt-1">
                    <span className="font-medium text-gray-900">
                      {user.score.toLocaleString()} P
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

                <div className="col-span-2">
                  <div className="font-medium text-sm text-gray-500">가입일자</div>
                  <div className="mt-1">
                    <span className="font-medium text-gray-900">{formatDate(user.createdAt)}</span>
                  </div>
                </div>

                <div className="col-span-1">
                  <div className="font-medium text-sm text-gray-500">상태</div>
                  <div className="mt-1">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${getStatusClassName(
                        user.status
                      )}`}
                    >
                      {user.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="font-medium text-sm text-gray-500 mb-2">활동내역</div>
                <div className="border rounded-md overflow-y-auto h-48 bg-gray-50">
                  {user.activities && user.activities.length > 0 ? (
                    <div className="p-2">
                      {user.activities.map((activity) => (
                        <div key={activity.id} className="border-b py-2 last:border-0">
                          <div className="text-sm text-gray-600">{formatDate(activity.date)}</div>
                          <div className="text-sm">{activity.content}</div>
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

            {/* 프로필 이미지 영역 */}
            <div className="md:col-span-1 space-y-4">
              <div className="text-center">
                <div className="mb-2 font-medium text-sm text-gray-500">회원 프로필 사진</div>
                <div className="flex justify-center">
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

              <div className="mt-6">
                <div className="font-medium text-sm text-gray-500 mb-2">관리자 메모</div>
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

          <div className="flex justify-center mt-8">
            <Button variant="secondary" onClick={onClose}>
              목록
            </Button>
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
            <div className="text-blue-600 font-medium">{user.score.toLocaleString()} P</div>
          </div>

          <Input
            label={`${pointAction === "add" ? "지급" : "차감"} 포인트`}
            type="number"
            value={pointAmount.toString()}
            onChange={(e) => setPointAmount(Math.max(0, parseInt(e.target.value) || 0))}
            min="0"
            required
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

      {/* 등급 변경 모달 */}
      <Modal
        isOpen={showRankModal}
        onClose={() => setShowRankModal(false)}
        title="회원 등급 변경"
        size="md"
      >
        <div className="space-y-4">
          <div className="mb-4">
            <div className="font-medium text-sm text-gray-500 mb-1">대상자</div>
            <div className="text-blue-600 font-medium">{user.nickname}</div>
          </div>

          <div className="mb-4">
            <div className="font-medium text-sm text-gray-500 mb-1">현재등급</div>
            <div className="text-blue-600 font-medium">{user.rank.name}</div>
          </div>

          <div>
            <div className="font-medium text-sm text-gray-500 mb-1">변경 등급</div>
            <Select
              value={selectedRank.toString()}
              onChange={(e) => setSelectedRank(parseInt(e.target.value))}
              options={availableRanks.map((rank) => ({
                value: rank.id.toString(),
                label: rank.name,
              }))}
              className="w-full"
            />
          </div>

          <div className="flex justify-center mt-6">
            <Button variant="primary" onClick={handleRankChange} className="w-full py-3">
              회원 등급 변경
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default UserDetail;
