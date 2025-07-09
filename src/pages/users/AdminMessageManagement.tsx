import React, { useState, useEffect, useCallback } from "react";
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
  targetRankIds?: number[]; // 그룹 발송 시 선택된 등급 ID들
  targetRanks?: { id: number; rankName: string; users: { id: number; nickname: string }[] }[]; // 상세 조회 시 등급 정보
  recipients?: { user: { id: number; nickname: string } }[]; // 개별 발송 시 수신자 정보
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
  const [searchValue, setSearchValue] = useState<string>("");

  // 선택 관련 상태
  const [selectedMessages, setSelectedMessages] = useState<number[]>([]);
  const [allSelected, setAllSelected] = useState<boolean>(false);

  // 쪽지 발송 모달 상태
  const [showSendModal, setShowSendModal] = useState<boolean>(false);
  const [messageTitle, setMessageTitle] = useState<string>("");
  const [messageContent, setMessageContent] = useState<string>("");
  const [messageCategory, setMessageCategory] = useState<string>("GENERAL");

  // 회원 선택 관련 상태
  const [selectedUsers, setSelectedUsers] = useState<
    { id: number; nickname: string; email: string }[]
  >([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredUsers, setFilteredUsers] = useState<
    { id: number; nickname: string; email: string }[]
  >([]);
  const [recipientId, setRecipientId] = useState<number | null>(null);
  const [sending, setSending] = useState<boolean>(false);

  // 그룹 발송 모달 상태
  const [showGroupSendModal, setShowGroupSendModal] = useState<boolean>(false);
  const [groupMessageTitle, setGroupMessageTitle] = useState<string>("");
  const [groupMessageContent, setGroupMessageContent] = useState<string>("");
  const [selectedRankIds, setSelectedRankIds] = useState<number[]>([]); // 여러 등급 선택 가능
  const [isAllSelected, setIsAllSelected] = useState<boolean>(false); // 전체 선택 여부
  const [ranks, setRanks] = useState<{ id: number; rankName: string; userCount: number }[]>([]);

  // 쪽지 상세 보기 모달 상태
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [showIndividualDetailModal, setShowIndividualDetailModal] = useState<boolean>(false);
  const [selectedMessage, setSelectedMessage] = useState<AdminMessage | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // 카테고리 필터 상태
  const [showCategoryFilter, setShowCategoryFilter] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [users, setUsers] = useState<{ id: number; nickname: string; email: string }[]>([]);

  // 검색 핸들러
  const handleSearch = (value: string) => {
    setSearchValue(value);
    setCurrentPage(1); // 검색 시 첫 페이지로 이동
    fetchMessages(1, pageSize, value);
  };

  // 유저 목록 불러오기
  const fetchUsers = useCallback(async () => {
    try {
      const response = await axios.get("/admin/users/all");
      if (response.data && response.data.data) {
        setUsers(
          response.data.data.map((u: any) => ({
            id: u.id,
            nickname: u.nickname,
            email: u.email || "",
          }))
        );
      }
    } catch (e) {
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRanks();
  }, [fetchUsers]);

  // 검색어에 따른 회원 필터링 및 알파벳 순 정렬
  useEffect(() => {
    let result = users;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = users.filter(
        (user) =>
          user.nickname.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.id.toString().includes(query)
      );
    }

    // 알파벳 순으로 정렬
    result = result.sort((a, b) => a.nickname.localeCompare(b.nickname));

    setFilteredUsers(result);
  }, [users, searchQuery]);

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

  // 대상자 표시 함수 (2명까지 표시하고 나머지는 "외 N명")
  const formatRecipients = (message: AdminMessage) => {
    if (message.category === "GROUP") {
      // 그룹 발송의 경우 기존 로직 유지
      return message.recipientNickname || getNickname(message.recipientId);
    } else {
      // 개별 발송의 경우 닉네임 파싱해서 표시
      const recipientDisplay = message.recipientNickname || getNickname(message.recipientId);

      // 쉼표로 구분된 닉네임들을 파싱
      if (recipientDisplay.includes(",")) {
        const nicknames = recipientDisplay.split(",").map((name) => name.trim());
        if (nicknames.length <= 2) {
          return nicknames.join(", ");
        } else {
          return `${nicknames.slice(0, 2).join(", ")} (외 ${nicknames.length - 2}명)`;
        }
      }

      return recipientDisplay;
    }
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
    setCurrentPage(1); // 카테고리 변경 시 첫 페이지로 이동
    fetchMessages(1, pageSize, searchValue);
  };

  // 관리자 쪽지 목록 조회 (페이지네이션 적용)
  const fetchMessages = useCallback(
    async (page: number, limit: number, searchValue: string = "") => {
      setLoading(true);
      setError(null);
      try {
        // 페이지네이션 파라미터 추가
        const params: any = {
          page: page,
          limit: limit,
        };

        if (searchValue.trim()) {
          params.search = searchValue;
        }

        if (selectedCategory) {
          params.category = selectedCategory;
        }

        const response = await axios.get("/admin/messages/messages", { params });

        // API 응답 구조에 따라 데이터 및 페이지네이션 정보 추출
        if (response.data && response.data.messages && response.data.pagination) {
          const fetchedMessages = Array.isArray(response.data.messages)
            ? response.data.messages
            : [];
          const pagination = response.data.pagination;

          // 백엔드 데이터를 프론트엔드 형식에 맞게 변환
          const mappedMessages: AdminMessage[] = fetchedMessages.map((msg: any) => {
            // 메시지 타입에 따른 대상자 표시
            let recipientDisplay = "-";
            if (msg.messageType === "GROUP") {
              if (msg.targetRanks && msg.targetRanks.length > 0) {
                // 등급명들을 수집
                const rankNames = msg.targetRanks.map((rank: any) => rank.rankName).filter(Boolean);
                if (rankNames.length > 0) {
                  recipientDisplay = rankNames.join(", ");
                } else {
                  recipientDisplay = "그룹 발송";
                }
              } else if (msg.targetRankIds && msg.targetRankIds.length > 0) {
                recipientDisplay = `등급 ${msg.targetRankIds.length}개`;
              } else {
                recipientDisplay = "그룹 발송";
              }
            } else if (msg.messageType === "INDIVIDUAL") {
              if (msg.recipients && msg.recipients.length > 0) {
                const nicknames = msg.recipients
                  .map((r: any) => r.user?.nickname || "알 수 없음")
                  .filter(Boolean);

                if (nicknames.length <= 2) {
                  recipientDisplay = nicknames.join(", ");
                } else {
                  recipientDisplay = `${nicknames.slice(0, 2).join(", ")} (외 ${
                    nicknames.length - 2
                  }명)`;
                }
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
              targetRankIds: msg.targetRankIds || [], // 그룹 발송 시 선택된 등급 ID들
            };
          });

          setMessages(mappedMessages);
          setTotalItems(pagination.totalCount || 0);
          setTotalPages(pagination.totalPages || 0);
          setCurrentPage(pagination.currentPage || page);
          setPageSize(pagination.limit || limit);
          setSelectedMessages([]);
          setAllSelected(false);
        } else {
          // 페이지네이션 정보가 없는 경우 (기존 방식으로 처리)
          const fetchedMessages = Array.isArray(response.data?.data) ? response.data.data : [];

          // 백엔드 데이터를 프론트엔드 형식에 맞게 변환
          const mappedMessages: AdminMessage[] = fetchedMessages.map((msg: any) => {
            // 메시지 타입에 따른 대상자 표시
            let recipientDisplay = "-";
            if (msg.messageType === "GROUP") {
              if (msg.targetRanks && msg.targetRanks.length > 0) {
                // 등급명들을 수집
                const rankNames = msg.targetRanks.map((rank: any) => rank.rankName).filter(Boolean);
                if (rankNames.length > 0) {
                  recipientDisplay = rankNames.join(", ");
                } else {
                  recipientDisplay = "그룹 발송";
                }
              } else if (msg.targetRankIds && msg.targetRankIds.length > 0) {
                recipientDisplay = `등급 ${msg.targetRankIds.length}개`;
              } else {
                recipientDisplay = "그룹 발송";
              }
            } else if (msg.messageType === "INDIVIDUAL") {
              if (msg.recipients && msg.recipients.length > 0) {
                const nicknames = msg.recipients
                  .map((r: any) => r.user?.nickname || "알 수 없음")
                  .filter(Boolean);

                if (nicknames.length <= 2) {
                  recipientDisplay = nicknames.join(", ");
                } else {
                  recipientDisplay = `${nicknames.slice(0, 2).join(", ")} (외 ${
                    nicknames.length - 2
                  }명)`;
                }
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
              targetRankIds: msg.targetRankIds || [], // 그룹 발송 시 선택된 등급 ID들
            };
          });

          setMessages(mappedMessages);
          setTotalItems(mappedMessages.length);
          setTotalPages(1);
          setCurrentPage(1);
          setPageSize(mappedMessages.length);
          setSelectedMessages([]);
          setAllSelected(false);
        }
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
    [selectedCategory]
  );

  useEffect(() => {
    fetchMessages(currentPage, pageSize, searchValue);
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
    setSelectedUsers([]);
    setSearchQuery("");
  };

  // 회원 선택/해제
  const handleToggleUser = (user: { id: number; nickname: string; email: string }) => {
    setSelectedUsers((prevSelected) => {
      const isSelected = prevSelected.some((u) => u.id === user.id);
      if (isSelected) {
        return prevSelected.filter((u) => u.id !== user.id);
      } else {
        return [...prevSelected, user];
      }
    });
  };

  // 선택된 회원 제거
  const handleRemoveSelectedUser = (userId: number) => {
    setSelectedUsers((prevSelected) => prevSelected.filter((user) => user.id !== userId));
  };

  // 그룹 발송 모달 열기
  const handleOpenGroupSendModal = () => {
    setShowGroupSendModal(true);
    setGroupMessageTitle("");
    setGroupMessageContent("");
    setSelectedRankIds([]);
    setIsAllSelected(false);
  };

  // 등급 선택 핸들러 (다중 선택)
  const handleRankSelect = (rankId: number) => {
    if (isAllSelected) return; // 전체 선택 시 개별 선택 불가

    setSelectedRankIds((prev) => {
      if (prev.includes(rankId)) {
        return prev.filter((id) => id !== rankId);
      } else {
        return [...prev, rankId];
      }
    });
  };

  // 전체 선택 핸들러
  const handleSelectAll = () => {
    setIsAllSelected(true);
    setSelectedRankIds([]); // 개별 선택 초기화
  };

  // 전체 선택 해제 핸들러
  const handleDeselectAll = () => {
    setIsAllSelected(false);
    setSelectedRankIds([]);
  };

  // 쪽지 발송
  const handleSendMessage = async () => {
    if (!messageTitle.trim() || !messageContent.trim()) {
      setAlertMessage({
        type: "error",
        message: "제목과 내용을 모두 입력해주세요.",
      });
      return;
    }

    if (selectedUsers.length === 0) {
      setAlertMessage({
        type: "error",
        message: "발송할 회원을 선택해주세요.",
      });
      return;
    }

    setSending(true);
    try {
      await axios.post("/admin/messages/messages/individual", {
        title: messageTitle,
        content: messageContent,
        recipientIds: selectedUsers.map((user) => user.id),
      });

      setAlertMessage({
        type: "success",
        message: `${selectedUsers.length}명에게 쪽지가 성공적으로 발송되었습니다.`,
      });
      setShowSendModal(false);
      fetchMessages(currentPage, pageSize, searchValue);
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

    if (!isAllSelected && selectedRankIds.length === 0) {
      setAlertMessage({
        type: "error",
        message: "발송할 대상 등급을 선택해주세요.",
      });
      return;
    }

    setSending(true);
    try {
      const requestData = {
        title: groupMessageTitle,
        content: groupMessageContent,
        targetRankIds: isAllSelected ? ranks.map((rank) => rank.id) : selectedRankIds,
      };

      await axios.post("/admin/messages/messages/group", requestData);

      setAlertMessage({
        type: "success",
        message: "그룹 쪽지가 성공적으로 발송되었습니다.",
      });
      setShowGroupSendModal(false);
      fetchMessages(currentPage, pageSize, searchValue);
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
  const handleOpenDetailModal = async (message: AdminMessage) => {
    // 개별 발송과 그룹 발송에 따라 다른 모달 열기
    if (message.category === "INDIVIDUAL") {
      setShowIndividualDetailModal(true);
    } else {
      setShowDetailModal(true);
    }

    setLoadingDetail(true);

    try {
      // 상세 정보 조회
      const response = await axios.get(`/admin/messages/messages/${message.id}`);
      const detailData = response.data;

      if (message.category === "INDIVIDUAL") {
        // 개별 발송의 경우 recipients 정보 추가
        setSelectedMessage({
          ...message,
          recipients: detailData.recipients || [],
        });
      } else {
        // 그룹 발송의 경우 기존 로직
        const targetRankIds = detailData.targetRanks
          ? detailData.targetRanks.map((rank: any) => rank.id)
          : [];

        setSelectedMessage({
          ...message,
          targetRankIds: targetRankIds,
          targetRanks: detailData.targetRanks || [],
        });
      }
    } catch (error) {
      console.error("메시지 상세 조회 실패:", error);
      // 실패 시 기본 메시지 정보라도 표시
      setSelectedMessage(message);
    } finally {
      setLoadingDetail(false);
    }
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
      fetchMessages(currentPage, pageSize, searchValue);
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
      fetchMessages(currentPage, pageSize, searchValue);
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
      cell: (value: unknown, row: AdminMessage) => (
        <input
          type="checkbox"
          checked={selectedMessages.includes(row.id)}
          onChange={() => handleToggleSelect(row.id)}
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
                onClick={() => handleCategorySelect("GROUP")}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                  selectedCategory === "GROUP" ? "bg-blue-50 text-blue-600" : ""
                }`}
              >
                그룹
              </button>
              <button
                onClick={() => handleCategorySelect("INDIVIDUAL")}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                  selectedCategory === "INDIVIDUAL" ? "bg-blue-50 text-blue-600" : ""
                }`}
              >
                개별
              </button>
            </div>
          )}
        </div>
      ),
      accessor: "category" as keyof AdminMessage,
      className: "w-24",
      cell: (value: unknown, row: AdminMessage) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            row.category === "GROUP"
              ? "bg-blue-100 text-blue-800"
              : row.category === "INDIVIDUAL"
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {row.category === "GROUP"
            ? "그룹"
            : row.category === "INDIVIDUAL"
            ? "개별"
            : row.category}
        </span>
      ),
    },
    {
      header: "제목",
      accessor: "title" as keyof AdminMessage,
      className: "w-60",
      cell: (value: unknown, row: AdminMessage) => (
        <div
          className="max-w-xs truncate text-blue-600 hover:underline cursor-pointer"
          title={row.title}
          onClick={() => handleOpenDetailModal(row)}
        >
          {row.title}
        </div>
      ),
    },
    {
      header: "대상자",
      accessor: "recipientId" as keyof AdminMessage,
      className: "w-32",
      cell: (value: unknown, row: AdminMessage) => formatRecipients(row),
    },
    {
      header: "발송일시",
      accessor: "sentAt" as keyof AdminMessage,
      className: "w-40",
      cell: (value: unknown, row: AdminMessage) => formatDate(row.sentAt),
    },
    {
      header: "관리",
      accessor: "id" as keyof AdminMessage,
      className: "w-24 text-center",
      cell: (value: unknown, row: AdminMessage) => (
        <div className="flex justify-center">
          <ActionButton
            label="삭제"
            action="delete"
            onClick={() => handleDeleteMessage(row.id)}
            disabled={loading || sending}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">관리자 쪽지 발송</h1>
        <SearchInput
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          onSearch={handleSearch}
        />
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
            className={
              selectedMessages.length > 0
                ? "bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
                : ""
            }
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
          className="mb-4"
        />
      )}

      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          columns={columns}
          data={messages}
          loading={loading}
          emptyMessage={searchValue ? "검색된 결과가 없습니다." : "등록된 메시지가 없습니다."}
          pagination={{
            currentPage,
            pageSize,
            totalItems,
            onPageChange: handlePageChange,
          }}
        />
      </div>

      {/* 쪽지 발송 모달 */}
      <Modal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        title="회원 발송"
        size="xl"
      >
        <div className="space-y-6">
          {/* 버튼 - 상단 왼쪽 */}
          <div className="flex justify-start space-x-3">
            <Button onClick={handleSendMessage} variant="primary" disabled={sending}>
              {sending ? "발송 중..." : "발송"}
            </Button>
            <Button onClick={() => setShowSendModal(false)} variant="outline" disabled={sending}>
              취소
            </Button>
          </div>
          {/* 선택된 회원 표시 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              선택된 회원 ({selectedUsers.length})
            </label>
            <div
              className="border border-gray-300 rounded-md p-3 bg-gray-50"
              style={{ minHeight: "100px", maxHeight: "200px", overflowY: "auto" }}
            >
              {selectedUsers.length > 0 ? (
                <div className="space-y-2">
                  {selectedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex justify-between items-center border-b pb-2 last:border-b-0"
                    >
                      <div>
                        <div className="font-medium text-sm">{user.nickname}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSelectedUser(user.id)}
                        className="text-red-500 hover:text-red-700 text-xs p-1"
                        disabled={sending}
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  아래 목록에서 회원을 선택해주세요.
                </div>
              )}
            </div>
          </div>

          {/* 회원 선택 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">회원 선택</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="회원 검색 (닉네임, 이메일...)"
                className="input w-64"
                disabled={sending}
              />
            </div>
            <div
              className="border border-gray-300 rounded-md p-3"
              style={{ maxHeight: "300px", overflowY: "auto" }}
            >
              {filteredUsers.length > 0 ? (
                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`p-2 border rounded-md cursor-pointer flex items-center ${
                        selectedUsers.some((u) => u.id === user.id)
                          ? "bg-blue-50 border-blue-300"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                      onClick={() => !sending && handleToggleUser(user)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedUsers.some((u) => u.id === user.id)}
                        onChange={() => {}}
                        onClick={(e) => {
                          e.stopPropagation();
                          !sending && handleToggleUser(user);
                        }}
                        className="h-4 w-4 text-blue-600 mr-3 rounded focus:ring-blue-500"
                        disabled={sending}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{user.nickname}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-6 text-gray-500">
                  {searchQuery.trim() ? "검색 결과가 없습니다." : "등록된 회원이 없습니다."}
                </div>
              )}
            </div>
          </div>

          {/* 제목 */}
          <Input
            label="제목"
            value={messageTitle}
            onChange={(e) => setMessageTitle(e.target.value)}
            placeholder="쪽지 제목을 입력하세요"
          />

          {/* 내용 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">내용</label>
            <TextEditor content={messageContent} setContent={setMessageContent} height="300px" />
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
          {/* 버튼 - 상단 왼쪽 */}
          <div className="flex justify-start space-x-3">
            <Button onClick={handleGroupSendMessage} variant="primary" disabled={sending}>
              {sending ? "발송 중..." : "쪽지 그룹 발송"}
            </Button>
            <Button
              onClick={() => setShowGroupSendModal(false)}
              variant="outline"
              disabled={sending}
            >
              취소
            </Button>
          </div>
          {/* 대상 그룹 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">대상 등급</label>

            {/* 개별 등급 선택 */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {ranks.map((rank) => (
                <div
                  key={rank.id}
                  className={`p-3 border rounded-md transition-colors ${
                    isAllSelected
                      ? "bg-gray-100 border-gray-200 cursor-not-allowed opacity-50"
                      : selectedRankIds.includes(rank.id)
                      ? "bg-blue-50 border-blue-300 cursor-pointer"
                      : "border-gray-200 hover:border-gray-300 cursor-pointer"
                  }`}
                  onClick={() => !isAllSelected && handleRankSelect(rank.id)}
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedRankIds.includes(rank.id)}
                      onChange={() => handleRankSelect(rank.id)}
                      disabled={isAllSelected}
                      className="mr-2 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <div className="flex-1">
                      <span
                        className={`text-sm font-medium ${isAllSelected ? "text-gray-400" : ""}`}
                      >
                        {rank.rankName}
                      </span>
                      <div
                        className={`text-xs ${isAllSelected ? "text-gray-400" : "text-gray-500"}`}
                      >
                        ({rank.userCount}명)
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 전체 선택 버튼 */}
            <div className="mb-4">
              <div
                className={`p-3 border rounded-md cursor-pointer transition-colors ${
                  isAllSelected
                    ? "bg-green-50 border-green-300"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={isAllSelected ? handleDeselectAll : handleSelectAll}
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={isAllSelected ? handleDeselectAll : handleSelectAll}
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

            {/* 선택된 등급 요약 */}
            {(isAllSelected || selectedRankIds.length > 0) && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="text-sm font-medium text-green-800">
                  {isAllSelected ? `전체 등급 선택됨` : `선택된 등급: ${selectedRankIds.length}개`}
                </div>
                <div className="text-xs text-green-600 mt-1">
                  총 대상자:{" "}
                  {isAllSelected
                    ? ranks.reduce((sum, rank) => sum + rank.userCount, 0)
                    : ranks
                        .filter((rank) => selectedRankIds.includes(rank.id))
                        .reduce((sum, rank) => sum + rank.userCount, 0)}
                  명
                </div>
              </div>
            )}
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
          {loadingDetail ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">상세 정보를 불러오는 중...</div>
            </div>
          ) : selectedMessage ? (
            <>
              {/* 대상 등급 선택 (읽기 전용) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">대상 등급</label>

                {/* 개별 등급 선택 (읽기 전용) */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {ranks.map((rank) => {
                    // 실제 발송된 등급인지 확인
                    const isSelectedRank =
                      selectedMessage.targetRankIds?.includes(rank.id) || false;
                    const isAllSelected = selectedMessage.targetRankIds?.length === ranks.length;

                    return (
                      <div
                        key={rank.id}
                        className={`p-3 border rounded-md transition-colors ${
                          isSelectedRank && !isAllSelected
                            ? "bg-blue-50 border-blue-300"
                            : isAllSelected
                            ? "bg-gray-100 border-gray-200 cursor-not-allowed opacity-50"
                            : "border-gray-200"
                        } cursor-not-allowed`}
                      >
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={isSelectedRank && !isAllSelected}
                            readOnly
                            className="mr-2 text-blue-600 focus:ring-blue-500 pointer-events-none"
                          />
                          <div className="flex-1">
                            <span
                              className={`text-sm font-medium ${
                                isAllSelected ? "text-gray-400" : ""
                              }`}
                            >
                              {rank.rankName}
                            </span>
                            <div
                              className={`text-xs ${
                                isAllSelected ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              ({rank.userCount}명)
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 전체 선택 버튼 (읽기 전용) */}
                <div className="mb-4">
                  {(() => {
                    const isAllSelected = selectedMessage.targetRankIds?.length === ranks.length;
                    return (
                      <div
                        className={`p-3 border rounded-md transition-colors ${
                          isAllSelected ? "bg-green-50 border-green-300" : "border-gray-200"
                        } cursor-not-allowed`}
                      >
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            readOnly
                            className="mr-2 text-green-600 focus:ring-green-500 pointer-events-none"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-green-700">전체</span>
                            <div className="text-xs text-gray-500">
                              (총 {ranks.reduce((sum, rank) => sum + rank.userCount, 0)}명)
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 선택된 등급 요약 (읽기 전용) */}
                {selectedMessage.category === "GROUP" &&
                  selectedMessage.targetRankIds &&
                  selectedMessage.targetRankIds.length > 0 && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                      <div className="text-sm font-medium text-green-800">
                        {selectedMessage.targetRankIds.length === ranks.length
                          ? "전체 등급 선택됨"
                          : `선택된 등급: ${selectedMessage.targetRankIds.length}개`}
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        총 대상자:{" "}
                        {selectedMessage.targetRankIds.length === ranks.length
                          ? ranks.reduce((sum, rank) => sum + rank.userCount, 0)
                          : ranks
                              .filter((rank) => selectedMessage.targetRankIds?.includes(rank.id))
                              .reduce((sum, rank) => sum + rank.userCount, 0)}
                        명
                      </div>
                    </div>
                  )}
              </div>

              {/* 제목 (읽기 전용) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">제목</label>
                <input
                  type="text"
                  value={selectedMessage.title}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
                />
              </div>

              {/* 내용 (읽기 전용) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">내용</label>
                <div
                  className="w-full min-h-[300px] max-h-[400px] p-4 border border-gray-300 rounded-md bg-gray-50 text-gray-700 overflow-y-auto prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedMessage.content }}
                />
              </div>

              {/* 버튼 */}
              <div className="flex justify-end space-x-3">
                <Button onClick={() => setShowDetailModal(false)} variant="outline">
                  닫기
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </Modal>

      {/* 개별 발송 상세 보기 모달 */}
      <Modal
        isOpen={showIndividualDetailModal}
        onClose={() => setShowIndividualDetailModal(false)}
        title="회원 발송 상세"
        size="xl"
      >
        <div className="space-y-6">
          {loadingDetail ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">상세 정보를 불러오는 중...</div>
            </div>
          ) : selectedMessage ? (
            <>
              {/* 선택된 회원 표시 (읽기 전용) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  선택된 회원 ({selectedMessage.recipients?.length || 0})
                </label>
                <div
                  className="border border-gray-300 rounded-md p-3 bg-gray-50"
                  style={{ minHeight: "100px", maxHeight: "200px", overflowY: "auto" }}
                >
                  {selectedMessage.recipients && selectedMessage.recipients.length > 0 ? (
                    <div className="space-y-2">
                      {selectedMessage.recipients.map((recipient, index) => (
                        <div
                          key={recipient.user.id}
                          className="flex justify-between items-center border-b pb-2 last:border-b-0"
                        >
                          <div>
                            <div className="font-medium text-sm">{recipient.user.nickname}</div>
                            <div className="text-xs text-gray-500">
                              {users.find((u) => u.id === recipient.user.id)?.email ||
                                `ID: ${recipient.user.id}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                      수신자 정보가 없습니다.
                    </div>
                  )}
                </div>
              </div>

              {/* 제목 (읽기 전용) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">제목</label>
                <input
                  type="text"
                  value={selectedMessage.title}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
                />
              </div>

              {/* 내용 (읽기 전용) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">내용</label>
                <div
                  className="w-full min-h-[300px] max-h-[400px] p-4 border border-gray-300 rounded-md bg-gray-50 text-gray-700 overflow-y-auto prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedMessage.content }}
                />
              </div>

              {/* 버튼 */}
              <div className="flex justify-end space-x-3">
                <Button onClick={() => setShowIndividualDetailModal(false)} variant="outline">
                  닫기
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </Modal>

      {sending && <LoadingOverlay isLoading={sending} />}
    </div>
  );
};

export default AdminMessageManagement;
