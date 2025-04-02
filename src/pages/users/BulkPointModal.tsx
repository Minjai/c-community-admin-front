import React, { useState } from "react";
import Modal from "@/components/Modal";
import Input from "@/components/forms/Input";
import Button from "@/components/Button";
import Alert from "@/components/Alert";
import axios from "@/api/axios";

interface BulkPointModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUsers: { id: number; nickname: string }[];
  onSuccess: () => void;
}

const BulkPointModal: React.FC<BulkPointModalProps> = ({
  isOpen,
  onClose,
  selectedUsers,
  onSuccess,
}) => {
  const [pointAmount, setPointAmount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const handlePointSubmit = async () => {
    if (pointAmount <= 0) {
      setAlertMessage({
        type: "error",
        message: "유효한 포인트 금액을 입력해주세요.",
      });
      return;
    }

    if (selectedUsers.length === 0) {
      setAlertMessage({
        type: "error",
        message: "선택된 회원이 없습니다.",
      });
      return;
    }

    try {
      setLoading(true);

      // 서버에 포인트 일괄 지급 요청
      await axios.post("/admin/users/bulk-points", {
        userIds: selectedUsers.map((user) => user.id),
        amount: pointAmount,
      });

      setAlertMessage({
        type: "success",
        message: `${
          selectedUsers.length
        }명의 회원에게 ${pointAmount.toLocaleString()}P가 지급되었습니다.`,
      });

      // 성공 후 1초 후에 모달 닫기
      setTimeout(() => {
        onClose();
        onSuccess();
        setPointAmount(0);
      }, 1000);
    } catch (error) {
      console.error("포인트 일괄 지급 오류:", error);
      setAlertMessage({
        type: "error",
        message: "포인트 지급 중 오류가 발생했습니다.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="포인트 일괄 지급" size="md">
      <div className="space-y-6">
        {alertMessage && (
          <Alert
            type={alertMessage.type}
            message={alertMessage.message}
            onClose={() => setAlertMessage(null)}
          />
        )}

        <div className="mb-4">
          <div className="font-medium mb-2">지급 대상자 : {selectedUsers.length}명</div>
          <div className="bg-blue-50 p-3 rounded-md text-blue-600">
            {selectedUsers.map((user) => user.nickname).join(", ")}
          </div>
        </div>

        <div className="mb-4">
          <div className="font-medium mb-2">지급 포인트</div>
          <div className="flex items-center">
            <Input
              type="number"
              value={pointAmount.toString()}
              onChange={(e) => setPointAmount(Math.max(0, parseInt(e.target.value) || 0))}
              min="0"
              className="flex-1"
              placeholder="지급할 포인트를 입력하세요"
            />
            <span className="ml-2 text-gray-700 font-medium">P</span>
          </div>
        </div>

        <div className="mt-8">
          <Button
            variant="primary"
            onClick={handlePointSubmit}
            disabled={loading || pointAmount <= 0 || selectedUsers.length === 0}
            className="w-full py-3"
          >
            {loading ? "처리 중..." : "포인트 일괄 지급"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default BulkPointModal;
