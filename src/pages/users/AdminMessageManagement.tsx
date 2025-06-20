import React, { useState, useEffect, useCallback } from "react";
import axios from "@/api/axios";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import ActionButton from "@/components/ActionButton";
import Modal from "@/components/Modal";
import Input from "@/components/forms/Input";
import Alert from "@/components/Alert";
import { formatDate } from "@/utils/dateUtils";
import LoadingOverlay from "@/components/LoadingOverlay";
import TextEditor from "@/components/forms/TextEditor";
import Select from "@/components/forms/Select";

enum MessageStatus {
  SENT = "SENT",
  PENDING = "PENDING",
  FAILED = "FAILED",
}

// 관리자 쪽지 타입 정의
interface AdminMessage {
  id: number;
  category: string;
  title: string;
  content: string;
  recipientId: number;
  recipientNickname?: string;
  sentAt: string;
  status: string;
  sentBy: string;
}

const AdminMessageManagement = () => {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
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

  // 선택 관련 상태
  const [selectedMessages, setSelectedMessages] = useState<number[]>([]);
  const [allSelected, setAllSelected] = useState<boolean>(false);

  // 쪽지 발송 모달 상태
  const [showSendModal, setShowSendModal] = useState<boolean>(false);
  const [messageTitle, setMessageTitle] = useState<string>("");
  const [messageContent, setMessageContent] = useState<string>("");
  const [messageCategory, setMessageCategory] = useState<string>("GENERAL");
  const [recipientId, setRecipientId] = useState<number | null>(null);
  const [sending, setSending] = useState<boolean>(false);

  // 그룹 발송 모달 상태
  const [showGroupSendModal, setShowGroupSendModal] = useState<boolean>(false);
  const [groupMessageTitle, setGroupMessageTitle] = useState<string>("");
  const [groupMessageContent, setGroupMessageContent] = useState<string>("");
  const [selectedRankId, setSelectedRankId] = useState<number | string | null>(null); // "all" 문자열도 허용
  const [ranks, setRanks] = useState<{ id: number; rankName: string; userCount: number }[]>([]);

  // 쪽지 상세 보기 모달 상태
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [selectedMessage, setSelectedMessage] = useState<AdminMessage | null>(null);

  // 카테고리 필터 상태
  const [showCategoryFilter, setShowCategoryFilter] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [users, setUsers] = useState<{ id: number; nickname: string }[]>([]);

  // 유저 목록 불러오기
  const fetchUsers = useCallback(async () => {
    try {
      const response = await axios.get("/admin/users?page=1&limit=1000");
      if (response.data && response.data.data) {
        setUsers(response.data.data.map((u: any) => ({ id: u.id, nickname: u.nickname })));
      }
    } catch (e) {
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRanks();
  }, [fetchUsers]);

  // 등급 목록 불러오기
  const fetchRanks = useCallback(async () => {
    try {
      const response = await axios.get("/admin/messages/ranks");
      if (response.data && Array.isArray(response.data)) {
        setRanks(
          response.data.map((rank: any) => ({
            id: rank.id,
            rankName: rank.rankName || rank.name || "",
            userCount: rank.userCount || 0,
          }))
        );
      }
    } catch (e) {
      console.error("Error fetching ranks:", e);
      setRanks([]);
    }
  }, []);

  // userId로 닉네임 찾기
  const getNickname = (userId: number) => {
    const user = users.find((u) => u.id === userId);
    return user ? user.nickname : "-";
  };

  // 필터링된 쪽지 목록
  const filteredMessages = selectedCategory
    ? messages.filter((message) => message.category === selectedCategory)
    : messages;

  // 카테고리 필터 토글
  const handleCategoryFilterToggle = () => {
    setShowCategoryFilter(!showCategoryFilter);
  };

  // 카테고리 선택
  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category);
    setShowCategoryFilter(false);
  };

  // 관리자 쪽지 목록 조회
  const fetchMessages = useCallback(
    async (page: number, limit: number) => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get("/admin/messages/messages");
        const fetchedMessages = response.data || [];

        // 백엔드 데이터를 프론트엔드 형식에 맞게 변환
        const mappedMessages: AdminMessage[] = fetchedMessages.map((msg: any) => {
          // 메시지 타입에 따른 대상자 표시
          let recipientDisplay = "-";
          if (msg.messageType === "GROUP") {
            if (msg.targetRanks && msg.targetRanks.length > 0) {
              recipientDisplay = msg.targetRanks.map((rank: any) => rank.rankName).join(", ");
            } else if (msg.targetRankIds && msg.targetRankIds.length > 0) {
              recipientDisplay = `등급 ${msg.targetRankIds.length}개`;
            } else {
              recipientDisplay = "그룹 발송";
            }
          } else if (msg.messageType === "INDIVIDUAL") {
            if (msg.recipients && msg.recipients.length > 0) {
              recipientDisplay = msg.recipients
                .map((r: any) => r.user?.nickname || "알 수 없음")
                .join(", ");
            } else {
              recipientDisplay = "개별 발송";
            }
          }

          return {
            id: msg.id,
            category: msg.messageType || "GENERAL",
            title: msg.title,
            content: msg.content,
            recipientId: 0, // 그룹 발송에서는 의미없음
            recipientNickname: recipientDisplay,
            sentAt: msg.createdAt,
            status: MessageStatus.SENT,
            sentBy: msg.sender?.nickname || "관리자",
          };
        });

        setMessages(mappedMessages);
        setTotalItems(mappedMessages.length);
        setTotalPages(1);
        setCurrentPage(1);
        setPageSize(mappedMessages.length);
        setSelectedMessages([]);
        setAllSelected(false);
      } catch (err) {
        console.error("Error fetching admin messages:", err);
        // 데이터가 없거나 오류가 있어도 사용자에게는 알리지 않음
        setMessages([]);
        setTotalItems(0);
        setTotalPages(0);
        setCurrentPage(1);
      } finally {
        setLoading(false);
      }
    },
    [users]
  );

  useEffect(() => {
    fetchMessages(currentPage, pageSize);
  }, [fetchMessages, currentPage, pageSize]);

  // 카테고리 필터 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showCategoryFilter) {
        setShowCategoryFilter(false);
      }
    };

    if (showCategoryFilter) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showCategoryFilter]);

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
    }
  };

  // 체크박스 토글 핸들러
  const handleToggleSelect = (messageId: number) => {
    setSelectedMessages((prev) => {
      if (prev.includes(messageId)) {
        return prev.filter((id) => id !== messageId);
      } else {
        return [...prev, messageId];
      }
    });
  };

  // 전체 선택 토글 핸들러
  const handleToggleAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    if (isChecked) {
      setSelectedMessages(messages.map((message) => message.id));
    } else {
      setSelectedMessages([]);
    }
  };

  // 쪽지 발송 모달 열기
  const handleOpenSendModal = () => {
    setShowSendModal(true);
    setMessageTitle("");
    setMessageContent("");
    setMessageCategory("GENERAL");
    setRecipientId(null);
  };

  // 그룹 발송 모달 열기
  const handleOpenGroupSendModal = () => {
    setShowGroupSendModal(true);
    setGroupMessageTitle("");
    setGroupMessageContent("");
    setSelectedRankId(null);
  };

  // 등급 선택 핸들러 (단일 선택 + 전체)
  const handleRankSelect = (rankId: number | string) => {
    setSelectedRankId(rankId);
  };

  // 쪽지 발송
  const handleSendMessage = async () => {
    if (!messageTitle.trim() || !messageContent.trim() || !recipientId) {
      setAlertMessage({
        type: "error",
        message: "제목, 내용, 수신자를 모두 입력해주세요.",
      });
      return;
    }

    setSending(true);
    try {
      await axios.post("/admin/messages/messages/individual", {
        title: messageTitle,
        content: messageContent,
        recipientIds: [recipientId], // 백엔드 API에 맞게 배열로 전송
      });

      setAlertMessage({
        type: "success",
        message: "쪽지가 성공적으로 발송되었습니다.",
      });
      setShowSendModal(false);
      fetchMessages(currentPage, pageSize);
    } catch (err) {
      setAlertMessage({
        type: "error",
        message: "쪽지 발송에 실패했습니다.",
      });
    } finally {
      setSending(false);
    }
  };

  // 그룹 발송
  const handleGroupSendMessage = async () => {
    if (!groupMessageTitle.trim() || !groupMessageContent.trim()) {
      setAlertMessage({
        type: "error",
        message: "제목과 내용을 모두 입력해주세요.",
      });
      return;
    }

    if (!selectedRankId) {
      setAlertMessage({
        type: "error",
        message: "발송할 대상 등급을 선택해주세요.",
      });
      return;
    }

    setSending(true);
    try {
      // 전체 선택 시 모든 등급 ID를 배열로 전송
      const requestData = {
        title: groupMessageTitle,
        content: groupMessageContent,
        targetRankIds:
          selectedRankId === "all"
            ? ranks.map((rank) => rank.id) // 전체 선택 시 모든 등급 ID 배열
            : [selectedRankId], // 개별 선택 시에도 배열로 전송
      };

      await axios.post("/admin/messages/messages/group", requestData);

      setAlertMessage({
        type: "success",
        message: "그룹 쪽지가 성공적으로 발송되었습니다.",
      });
      setShowGroupSendModal(false);
      fetchMessages(currentPage, pageSize);
    } catch (err) {
      console.error("Error sending group message:", err);
      setAlertMessage({
        type: "error",
        message: "그룹 쪽지 발송에 실패했습니다.",
      });
    } finally {
      setSending(false);
    }
  };

  // 쪽지 상세 보기
  const handleOpenDetailModal = (message: AdminMessage) => {
    setSelectedMessage(message);
    setShowDetailModal(true);
  };

  // 쪽지 삭제
  const handleDeleteMessage = async (messageId: number) => {
    if (!window.confirm("정말로 이 쪽지를 삭제하시겠습니까?")) {
      return;
    }

    setSending(true);
    try {
      await axios.delete(`/admin/messages/messages/${messageId}`);
      setAlertMessage({
        type: "success",
        message: "쪽지가 성공적으로 삭제되었습니다.",
      });
      fetchMessages(currentPage, pageSize);
    } catch (err) {
      console.error("Error deleting message:", err);
      setAlertMessage({
        type: "error",
        message: "쪽지 삭제에 실패했습니다.",
      });
    } finally {
      setSending(false);
    }
  };

  // 선택된 쪽지 삭제
  const handleDeleteSelected = async () => {
    if (selectedMessages.length === 0) {
      setAlertMessage({
        type: "error",
        message: "삭제할 쪽지를 선택해주세요.",
      });
      return;
    }

    if (!window.confirm(`선택된 ${selectedMessages.length}개의 쪽지를 삭제하시겠습니까?`)) {
      return;
    }

    setSending(true);
    try {
      // 각 선택된 쪽지에 대해 개별 DELETE 요청 전송
      await Promise.all(
        selectedMessages.map((id) => axios.delete(`/admin/messages/messages/${id}`))
      );

      setAlertMessage({
        type: "success",
        message: `${selectedMessages.length}개의 쪽지가 성공적으로 삭제되었습니다.`,
      });

      // 선택 상태 초기화
      setSelectedMessages([]);
      setAllSelected(false);

      // 목록 새로고침
      fetchMessages(currentPage, pageSize);
    } catch (err) {
      console.error("Error deleting messages:", err);
      setAlertMessage({
        type: "error",
        message: "쪽지 삭제에 실패했습니다.",
      });
    } finally {
      setSending(false);
    }
  };

  // 쪽지 상태에 따른 색상
  const getMessageStatusClassName = (status: string) => {
    switch (status) {
      case MessageStatus.SENT:
        return "bg-green-100 text-green-800";
      case MessageStatus.PENDING:
        return "bg-yellow-100 text-yellow-800";
      case MessageStatus.FAILED:
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // DataTable 컬럼 정의
  const columns = [
    {
      header: (
        <input
          type="checkbox"
          checked={allSelected}
          onChange={handleToggleAll}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      ),
      accessor: "id" as keyof AdminMessage,
      className: "w-12",
      cell: (value: any, message: AdminMessage) => (
        <input
          type="checkbox"
          checked={selectedMessages.includes(message.id)}
          onChange={() => handleToggleSelect(message.id)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      ),
    },
    {
      header: (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCategoryFilterToggle();
            }}
            className="flex items-center space-x-1 text-left"
          >
            <span>구분</span>
            <svg
              className={`w-4 h-4 transition-transform ${showCategoryFilter ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {showCategoryFilter && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[120px]">
              <button
                onClick={() => handleCategorySelect(null)}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                  selectedCategory === null ? "bg-blue-50 text-blue-600" : ""
                }`}
              >
                전체
              </button>
              <button
                onClick={() => handleCategorySelect("GENERAL")}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                  selectedCategory === "GENERAL" ? "bg-blue-50 text-blue-600" : ""
                }`}
              >
                일반
              </button>
              <button
                onClick={() => handleCategorySelect("NOTICE")}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                  selectedCategory === "NOTICE" ? "bg-blue-50 text-blue-600" : ""
                }`}
              >
                알림
              </button>
              <button
                onClick={() => handleCategorySelect("EVENT")}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                  selectedCategory === "EVENT" ? "bg-blue-50 text-blue-600" : ""
                }`}
              >
                이벤트
              </button>
            </div>
          )}
        </div>
      ),
      accessor: "category" as keyof AdminMessage,
      className: "w-24",
      cell: (value: any, message: AdminMessage) => (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
          {message.category === "GENERAL"
            ? "일반"
            : message.category === "NOTICE"
            ? "알림"
            : message.category === "EVENT"
            ? "이벤트"
            : message.category}
        </span>
      ),
    },
    {
      header: "제목",
      accessor: "title" as keyof AdminMessage,
      className: "w-80",
      cell: (value: any, message: AdminMessage) => (
        <div
          className="max-w-md truncate text-blue-600 hover:underline cursor-pointer"
          title={message.title}
          onClick={() => handleOpenDetailModal(message)}
        >
          {message.title}
        </div>
      ),
    },
    {
      header: "대상자",
      accessor: "recipientId" as keyof AdminMessage,
      className: "w-32",
      cell: (value: any, message: AdminMessage) =>
        message.recipientNickname || getNickname(message.recipientId),
    },
    {
      header: "발송일시",
      accessor: "sentAt" as keyof AdminMessage,
      className: "w-40",
      cell: (value: any, message: AdminMessage) => formatDate(message.sentAt),
    },
    {
      header: "관리",
      accessor: "id" as keyof AdminMessage,
      className: "w-24 text-center",
      cell: (id: number, message: AdminMessage) => (
        <div className="flex space-x-2">
          <ActionButton
            label="보기"
            action="edit"
            onClick={() => handleOpenDetailModal(message)}
            disabled={loading || sending}
          />
          <ActionButton
            label="삭제"
            action="delete"
            onClick={() => handleDeleteMessage(message.id)}
            disabled={loading || sending}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">관리자 쪽지 발송</h1>
          <p className="mt-2 text-sm text-gray-700">
            회원들에게 쪽지를 발송하고 발송 내역을 관리할 수 있습니다.
          </p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={handleOpenGroupSendModal} variant="primary" disabled={sending}>
            그룹 발송
          </Button>
          <Button
            onClick={handleOpenSendModal}
            variant="primary"
            disabled={sending}
            className="bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700"
          >
            회원 발송
          </Button>
          <Button
            onClick={handleDeleteSelected}
            variant="outline"
            disabled={sending || selectedMessages.length === 0}
          >
            선택 삭제 {selectedMessages.length > 0 && `(${selectedMessages.length})`}
          </Button>
        </div>
      </div>

      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
        />
      )}

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      <DataTable
        data={filteredMessages}
        columns={columns}
        loading={loading}
        pagination={{
          currentPage,
          totalItems: filteredMessages.length,
          pageSize,
          onPageChange: handlePageChange,
        }}
        emptyMessage={
          selectedCategory
            ? `${selectedCategory} 구분의 쪽지가 없습니다.`
            : "발송된 쪽지가 없습니다."
        }
      />

      {/* 쪽지 발송 모달 */}
      <Modal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        title="쪽지 발송"
        size="xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="구분"
              value={messageCategory}
              onChange={(e) => setMessageCategory(e.target.value)}
              options={[
                { value: "GENERAL", label: "일반" },
                { value: "NOTICE", label: "알림" },
                { value: "EVENT", label: "이벤트" },
              ]}
            />
            <Select
              label="수신자"
              value={recipientId?.toString() || ""}
              onChange={(e) => setRecipientId(parseInt(e.target.value) || null)}
              options={[
                { value: "", label: "수신자 선택" },
                ...users.map((user) => ({
                  value: user.id.toString(),
                  label: user.nickname,
                })),
              ]}
            />
          </div>

          <Input
            label="제목"
            value={messageTitle}
            onChange={(e) => setMessageTitle(e.target.value)}
            placeholder="쪽지 제목을 입력하세요"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">내용</label>
            <TextEditor content={messageContent} setContent={setMessageContent} height="300px" />
          </div>

          <div className="flex justify-end space-x-3">
            <Button onClick={() => setShowSendModal(false)} variant="outline" disabled={sending}>
              취소
            </Button>
            <Button onClick={handleSendMessage} variant="primary" disabled={sending}>
              {sending ? "발송 중..." : "발송"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 그룹 발송 모달 */}
      <Modal
        isOpen={showGroupSendModal}
        onClose={() => setShowGroupSendModal(false)}
        title="그룹 발송"
        size="xl"
      >
        <div className="space-y-6">
          {/* 대상 그룹 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">대상 등급</label>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {ranks.map((rank) => (
                <div
                  key={rank.id}
                  className={`p-3 border rounded-md cursor-pointer transition-colors ${
                    selectedRankId === rank.id
                      ? "bg-blue-50 border-blue-300"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => handleRankSelect(rank.id)}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="targetRank"
                      checked={selectedRankId === rank.id}
                      onChange={() => handleRankSelect(rank.id)}
                      className="mr-2 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium">{rank.rankName}</span>
                      <div className="text-xs text-gray-500">({rank.userCount}명)</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 전체 선택 */}
            <div
              className={`p-3 border rounded-md cursor-pointer transition-colors ${
                selectedRankId === "all"
                  ? "bg-green-50 border-green-300"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => handleRankSelect("all")}
            >
              <div className="flex items-center">
                <input
                  type="radio"
                  name="targetRank"
                  checked={selectedRankId === "all"}
                  onChange={() => handleRankSelect("all")}
                  className="mr-2 text-green-600 focus:ring-green-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-green-700">전체</span>
                  <div className="text-xs text-gray-500">
                    (총 {ranks.reduce((sum, rank) => sum + rank.userCount, 0)}명)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 제목 */}
          <Input
            label="제목"
            value={groupMessageTitle}
            onChange={(e) => setGroupMessageTitle(e.target.value)}
            placeholder="그룹 쪽지 제목을 입력하세요"
          />

          {/* 내용 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">내용</label>
            <TextEditor
              content={groupMessageContent}
              setContent={setGroupMessageContent}
              height="300px"
            />
          </div>

          {/* 버튼 */}
          <div className="flex justify-end space-x-3">
            <Button
              onClick={() => setShowGroupSendModal(false)}
              variant="outline"
              disabled={sending}
            >
              취소
            </Button>
            <Button onClick={handleGroupSendMessage} variant="primary" disabled={sending}>
              {sending ? "발송 중..." : "쪽지 그룹 발송"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 쪽지 상세 보기 모달 */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="쪽지 상세"
        size="xl"
      >
        <div className="space-y-6">
          {selectedMessage && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">구분</label>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {selectedMessage.category === "GENERAL"
                        ? "일반"
                        : selectedMessage.category === "NOTICE"
                        ? "알림"
                        : selectedMessage.category === "EVENT"
                        ? "이벤트"
                        : selectedMessage.category}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">수신자</label>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm">
                    {selectedMessage.recipientNickname || getNickname(selectedMessage.recipientId)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">제목</label>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm">
                  {selectedMessage.title}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">내용</label>
                <div
                  className="p-4 bg-gray-50 border border-gray-200 rounded-md text-sm min-h-[200px] max-h-[400px] overflow-y-auto prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedMessage.content }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">발송일시</label>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm">
                    {formatDate(selectedMessage.sentAt)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">발송자</label>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm">
                    {selectedMessage.sentBy}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">상태</label>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${getMessageStatusClassName(
                      selectedMessage.status
                    )}`}
                  >
                    {selectedMessage.status === MessageStatus.SENT
                      ? "발송완료"
                      : selectedMessage.status === MessageStatus.PENDING
                      ? "발송대기"
                      : selectedMessage.status === MessageStatus.FAILED
                      ? "발송실패"
                      : selectedMessage.status}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      {sending && <LoadingOverlay isLoading={sending} />}
    </div>
  );
};

export default AdminMessageManagement;
