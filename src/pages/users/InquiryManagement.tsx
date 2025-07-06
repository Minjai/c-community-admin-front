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

enum InquiryStatus {
  WAITING = "WAITING",
  DONE = "DONE",
}

// 1대1 문의 타입 정의
interface Inquiry {
  id: number;
  category: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  authorId: number;
  answer?: string;
  answeredAt?: string;
  answeredBy?: string;
}

// HTML 태그 제거 함수
function stripHtml(html: string) {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

const InquiryManagement = () => {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
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
  const [selectedInquiries, setSelectedInquiries] = useState<number[]>([]);
  const [allSelected, setAllSelected] = useState<boolean>(false);

  // 답변 모달 상태
  const [showAnswerModal, setShowAnswerModal] = useState<boolean>(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [answerContent, setAnswerContent] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  // 회원 정보 상태
  const [userDetail, setUserDetail] = useState<any>(null);
  const [userLoading, setUserLoading] = useState<boolean>(false);

  // 포인트 관련 상태
  const [showPointModal, setShowPointModal] = useState<boolean>(false);
  const [pointAction, setPointAction] = useState<"add" | "subtract">("add");
  const [pointAmount, setPointAmount] = useState<number>(0);

  // 관리자 메모 상태
  const [adminMemo, setAdminMemo] = useState<string>("");

  // 카테고리 필터 상태
  const [showCategoryFilter, setShowCategoryFilter] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [users, setUsers] = useState<{ id: number; nickname: string }[]>([]);

  // 검색 value 상태
  const [searchValue, setSearchValue] = useState<string>("");

  // 유저 목록 불러오기
  const fetchUsers = useCallback(async () => {
    try {
      const response = await axios.get("/admin/users");
      if (response.data && response.data.data) {
        setUsers(response.data.data.map((u: any) => ({ id: u.id, nickname: u.nickname })));
      }
    } catch (e) {
      setUsers([]);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // userId로 닉네임 찾기 (API 응답에 author 정보가 있으면 사용, 없으면 users 배열에서 찾기)
  const getNickname = (inquiry: Inquiry) => {
    // API 응답에 author 정보가 있으면 사용
    if ((inquiry as any).author && (inquiry as any).author.nickname) {
      return (inquiry as any).author.nickname;
    }

    // 없으면 기존 방식으로 users 배열에서 찾기
    const user = users.find((u) => u.id === inquiry.authorId);
    return user ? user.nickname : "-";
  };

  // 카테고리 필터링은 서버에서 처리하도록 변경
  // selectedCategory가 있으면 서버에 카테고리 파라미터 전달

  // 카테고리 필터 토글
  const handleCategoryFilterToggle = () => {
    setShowCategoryFilter(!showCategoryFilter);
  };

  // 카테고리 선택
  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category);
    setShowCategoryFilter(false);
    setCurrentPage(1); // 카테고리 변경 시 첫 페이지로 이동
    fetchInquiries(1, pageSize, searchValue);
  };

  // 검색 핸들러
  const handleSearch = (value: string) => {
    setCurrentPage(1); // 검색 시 첫 페이지로 이동
    fetchInquiries(1, pageSize, value);
  };

  // 1대1 문의 목록 조회 (페이지네이션 적용)
  const fetchInquiries = useCallback(
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

        const response = await axios.get(`/inquiries/admin`, { params });

        // API 응답 구조에 따라 데이터 및 페이지네이션 정보 추출
        if (response.data && response.data.inquiries && response.data.pagination) {
          const fetchedInquiries = Array.isArray(response.data.inquiries)
            ? response.data.inquiries
            : [];
          const pagination = response.data.pagination;

          setInquiries(fetchedInquiries);
          setTotalItems(pagination.totalCount || 0);
          setTotalPages(pagination.totalPages || 0);
          setCurrentPage(pagination.currentPage || page);
          setPageSize(pagination.limit || limit);
          setSelectedInquiries([]);
          setAllSelected(false);
        } else {
          // 페이지네이션 정보가 없는 경우 (기존 방식으로 처리)
          const fetchedInquiries = Array.isArray(response.data) ? response.data : [];
          setInquiries(fetchedInquiries);
          setTotalItems(fetchedInquiries.length);
          setTotalPages(1);
          setCurrentPage(1);
          setPageSize(fetchedInquiries.length);
          setSelectedInquiries([]);
          setAllSelected(false);
        }
      } catch (err) {
        console.error("Error fetching inquiries:", err);
        setError("1대1 문의 목록을 불러오는데 실패했습니다.");
        setInquiries([]);
        setTotalItems(0);
        setTotalPages(0);
        setCurrentPage(1);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // 초기 데이터 로딩
  useEffect(() => {
    fetchInquiries(1, 10, "");
  }, []);

  // 페이지, 검색, 카테고리 변경 시 데이터 로딩
  useEffect(() => {
    if (currentPage > 0) {
      fetchInquiries(currentPage, pageSize, searchValue);
    }
  }, [currentPage, pageSize, selectedCategory, searchValue]);

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
  const handleToggleSelect = (inquiryId: number) => {
    setSelectedInquiries((prev) => {
      if (prev.includes(inquiryId)) {
        return prev.filter((id) => id !== inquiryId);
      } else {
        return [...prev, inquiryId];
      }
    });
  };

  // 전체 선택 토글 핸들러
  const handleToggleAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    if (isChecked) {
      setSelectedInquiries(inquiries.map((inquiry) => inquiry.id));
    } else {
      setSelectedInquiries([]);
    }
  };

  // 회원 상세 정보 불러오기
  const fetchUserDetail = async (userId: number) => {
    setUserLoading(true);
    try {
      const response = await axios.get(`/admin/account/${userId}`);
      let userData;
      if (response.data && response.data.data) {
        userData = response.data.data;
      } else if (response.data && response.data.id) {
        userData = response.data;
      } else if (response.data && response.data.user) {
        userData = response.data.user;
      } else {
        throw new Error("유효한 사용자 데이터가 없습니다");
      }

      const formattedUser = {
        ...userData,
        score: userData.score || 0,
        rank: userData.rank
          ? {
              id: userData.rank.rankId || userData.rank.id || 0,
              name: userData.rank.rankName || userData.rank.name || "등급 없음",
            }
          : { id: 0, name: "등급 없음" },
        activities: userData.activities || [],
        nickname: userData.nickname || "알 수 없음",
        email: userData.email || "",
        status: userData.status || "오프라인",
      };

      setUserDetail(formattedUser);
      setAdminMemo(""); // 메모 초기화
    } catch (err) {
      console.error("Error fetching user details:", err);
      setUserDetail(null);
    } finally {
      setUserLoading(false);
    }
  };

  // 포인트 모달 열기
  const handlePointModalOpen = (action: "add" | "subtract") => {
    setPointAction(action);
    setPointAmount(0);
    setShowPointModal(true);
  };

  // 포인트 지급/차감
  const handlePointSubmit = async () => {
    if (!userDetail || pointAmount <= 0) {
      setAlertMessage({
        type: "error",
        message: "유효한 포인트 금액을 입력해주세요.",
      });
      return;
    }

    try {
      const amount = pointAction === "add" ? pointAmount : -pointAmount;

      await axios.post(`/admin/account/${userDetail.id}/points`, {
        amount,
      });

      setAlertMessage({
        type: "success",
        message: `${Math.abs(amount)} 포인트가 ${
          pointAction === "add" ? "지급" : "차감"
        }되었습니다.`,
      });

      // 유저 정보 새로고침
      if (userDetail.id) {
        fetchUserDetail(userDetail.id);
      }

      // 모달 닫기
      setShowPointModal(false);
    } catch (err) {
      console.error("Error updating points:", err);
      setAlertMessage({
        type: "error",
        message: "포인트 처리 중 오류가 발생했습니다.",
      });
    }
  };

  // 관리자 메모 저장
  const handleSaveMemo = async () => {
    if (!userDetail) return;

    try {
      // 메모 내용이 비어있으면 null, 아니면 해당 내용으로 설정
      const memoToSend = adminMemo.trim() === "" ? null : adminMemo;

      // API 요청 메소드를 PUT으로 변경하고 엔드포인트 수정
      await axios.put(`/admin/account/${userDetail.id}/memo`, {
        memo: memoToSend,
      });

      setAlertMessage({
        type: "success",
        message: "관리자 메모가 저장되었습니다.",
      });
    } catch (err) {
      console.error("Error saving memo:", err);
      setAlertMessage({
        type: "error",
        message: "메모 저장 중 오류가 발생했습니다.",
      });
    }
  };

  // 닉네임 초기화
  const handleResetNickname = async () => {
    if (!userDetail) return;

    if (!window.confirm("정말로 닉네임을 초기화하시겠습니까?")) {
      return;
    }

    try {
      await axios.post(`/admin/account/${userDetail.id}/reset-nickname`);

      setAlertMessage({
        type: "success",
        message: "닉네임이 초기화되었습니다.",
      });

      // 유저 정보 새로고침
      fetchUserDetail(userDetail.id);
    } catch (err) {
      console.error("Error resetting nickname:", err);
      setAlertMessage({
        type: "error",
        message: "닉네임 초기화 중 오류가 발생했습니다.",
      });
    }
  };

  // 패스워드 초기화
  const handleResetPassword = async () => {
    if (!userDetail) return;

    if (!window.confirm("정말로 패스워드를 초기화하시겠습니까?")) {
      return;
    }

    try {
      await axios.post(`/admin/account/${userDetail.id}/reset-password`);

      setAlertMessage({
        type: "success",
        message: "패스워드가 초기화되었습니다.",
      });
    } catch (err) {
      console.error("Error resetting password:", err);
      setAlertMessage({
        type: "error",
        message: "패스워드 초기화 중 오류가 발생했습니다.",
      });
    }
  };

  // 프로필 이미지 삭제
  const handleDeleteProfileImage = async () => {
    if (!userDetail) return;

    if (!window.confirm("정말로 프로필 이미지를 삭제하시겠습니까?")) {
      return;
    }

    try {
      await axios.delete(`/admin/account/${userDetail.id}/profile-image`);

      setAlertMessage({
        type: "success",
        message: "프로필 이미지가 삭제되었습니다.",
      });

      // 유저 정보 새로고침
      fetchUserDetail(userDetail.id);
    } catch (err) {
      console.error("Error deleting profile image:", err);
      setAlertMessage({
        type: "error",
        message: "프로필 이미지 삭제 중 오류가 발생했습니다.",
      });
    }
  };

  // 답변 모달 열기
  const handleOpenAnswerModal = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setAnswerContent(inquiry.answer || "");
    setShowAnswerModal(true);
    fetchUserDetail(inquiry.authorId);
  };

  // 답변 저장
  const handleSaveAnswer = async () => {
    if (!selectedInquiry) return;

    if (answerContent.trim() === "") {
      setAlertMessage({
        type: "error",
        message: "답변 내용을 입력해주세요.",
      });
      return;
    }

    try {
      setSaving(true);

      // 새로 작성할 때는 POST, 수정할 때는 PATCH
      const isNewAnswer = !selectedInquiry.answer || selectedInquiry.answer.trim() === "";
      const method = isNewAnswer ? "post" : "patch";

      await axios[method](`/inquiries/admin/${selectedInquiry.id}/answer`, {
        answer: answerContent,
      });

      setShowAnswerModal(false);
      setSelectedInquiry(null);
      setAnswerContent("");
      setAlertMessage({
        type: "success",
        message: isNewAnswer ? "답변이 등록되었습니다." : "답변이 수정되었습니다.",
      });

      fetchInquiries(currentPage, pageSize, searchValue);
    } catch (err) {
      console.error("Error saving answer:", err);
      setAlertMessage({
        type: "error",
        message: "답변 저장 중 오류가 발생했습니다.",
      });
    } finally {
      setSaving(false);
    }
  };

  // 개별 문의 삭제
  const handleDeleteInquiry = async (inquiryId: number) => {
    if (!window.confirm("정말로 이 문의를 삭제하시겠습니까?")) {
      return;
    }

    try {
      setSaving(true);
      await axios.delete(`/inquiries/admin/${inquiryId}`);
      setAlertMessage({
        type: "success",
        message: "문의가 삭제되었습니다.",
      });
      fetchInquiries(currentPage, pageSize, searchValue);
    } catch (err) {
      console.error("Error deleting inquiry:", err);
      setAlertMessage({
        type: "error",
        message: "문의 삭제 중 오류가 발생했습니다.",
      });
    } finally {
      setSaving(false);
    }
  };

  // 선택된 문의 삭제
  const handleDeleteSelected = async () => {
    if (selectedInquiries.length === 0) {
      setAlertMessage({
        type: "error",
        message: "삭제할 문의를 선택해주세요.",
      });
      return;
    }

    if (!window.confirm(`선택된 ${selectedInquiries.length}개의 문의를 정말 삭제하시겠습니까?`)) {
      return;
    }

    try {
      setSaving(true);
      // 여러 개 삭제: 각각 DELETE 호출
      await Promise.all(selectedInquiries.map((id) => axios.delete(`/inquiries/admin/${id}`)));
      setSelectedInquiries([]);
      setAllSelected(false);
      setAlertMessage({
        type: "success",
        message: `${selectedInquiries.length}개의 문의가 삭제되었습니다.`,
      });
      fetchInquiries(currentPage, pageSize, searchValue);
    } catch (err) {
      console.error("Error deleting inquiries:", err);
      setAlertMessage({
        type: "error",
        message: "문의 삭제 중 오류가 발생했습니다.",
      });
    } finally {
      setSaving(false);
    }
  };

  // 답변 상태에 따른 색상
  const getInquiryStatusClassName = (status: string) => {
    switch (status) {
      case InquiryStatus.WAITING:
        return "bg-gray-100 text-gray-800";
      case InquiryStatus.DONE:
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // 회원 상태에 따른 색상
  const getUserStatusClassName = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "온라인":
        return "bg-green-100 text-green-800";
      case "inactive":
      case "오프라인":
        return "bg-gray-100 text-gray-800";
      case "banned":
      case "정지":
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
      accessor: "id" as keyof Inquiry,
      className: "w-12",
      cell: (value: unknown, row: Inquiry) => (
        <input
          type="checkbox"
          checked={selectedInquiries.includes(row.id)}
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
                onClick={() => handleCategorySelect("GENERAL")}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                  selectedCategory === "GENERAL" ? "bg-blue-50 text-blue-600" : ""
                }`}
              >
                General
              </button>
              <button
                onClick={() => handleCategorySelect("ADVERTISING")}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                  selectedCategory === "ADVERTISING" ? "bg-blue-50 text-blue-600" : ""
                }`}
              >
                Advertising
              </button>
            </div>
          )}
        </div>
      ),
      accessor: "category" as keyof Inquiry,
      className: "w-24",
      cell: (value: unknown, row: Inquiry) => (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
          {row.category}
        </span>
      ),
    },
    {
      header: "문의",
      accessor: "title" as keyof Inquiry,
      className: "w-80",
      cell: (value: unknown, row: Inquiry) => (
        <div
          className="max-w-md truncate text-blue-600 hover:underline cursor-pointer"
          title={row.title}
          onClick={() => handleOpenAnswerModal(row)}
        >
          {row.title}
        </div>
      ),
    },
    {
      header: "작성자",
      accessor: "authorId" as keyof Inquiry,
      className: "w-32",
      cell: (value: unknown, row: Inquiry) => getNickname(row),
    },
    {
      header: "등록일자",
      accessor: "createdAt" as keyof Inquiry,
      className: "w-32",
      cell: (value: unknown, row: Inquiry) => formatDate(row.createdAt),
    },
    {
      header: "답변 상태",
      accessor: "status" as keyof Inquiry,
      className: "w-28",
      cell: (value: unknown, row: Inquiry) => {
        let label = "";
        if (row.status === InquiryStatus.WAITING) label = "대기";
        else if (row.status === InquiryStatus.DONE) label = "완료";
        return (
          <div>
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${getInquiryStatusClassName(
                row.status
              )}`}
            >
              {label}
            </span>
            {row.status === InquiryStatus.DONE && row.answeredAt && (
              <div className="text-xs text-gray-500 mt-1">{formatDate(row.answeredAt)}</div>
            )}
          </div>
        );
      },
    },
    {
      header: "관리",
      accessor: "id" as keyof Inquiry,
      className: "w-24 text-center",
      cell: (value: unknown, row: Inquiry) => (
        <div className="flex space-x-2">
          <ActionButton
            label="수정"
            action="edit"
            onClick={() => handleOpenAnswerModal(row)}
            disabled={loading || saving}
          />
          <ActionButton
            label="삭제"
            action="delete"
            onClick={() => handleDeleteInquiry(row.id)}
            disabled={loading || saving}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">1대1 문의 관리</h1>
        <SearchInput
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          onSearch={handleSearch}
        />
        <div className="flex space-x-2">
          <Button
            variant="danger"
            onClick={handleDeleteSelected}
            disabled={selectedInquiries.length === 0 || loading}
          >
            {`선택 삭제 (${selectedInquiries.length})`}
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
        data={inquiries}
        columns={columns}
        loading={loading}
        pagination={{
          currentPage,
          totalItems,
          pageSize,
          onPageChange: handlePageChange,
        }}
        emptyMessage={
          searchValue
            ? "검색된 결과가 없습니다."
            : selectedCategory
            ? `${selectedCategory} 구분의 문의가 없습니다.`
            : "등록된 1:1 문의가 없습니다."
        }
      />

      {/* 답변 모달 */}
      <Modal
        isOpen={showAnswerModal}
        onClose={() => {
          setShowAnswerModal(false);
          setUserDetail(null);
          setAdminMemo("");
          setShowPointModal(false);
        }}
        title={selectedInquiry?.status === InquiryStatus.WAITING ? "답변 작성" : "답변 수정"}
        size="xl"
      >
        <div className="space-y-6">
          {selectedInquiry && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">구분</label>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm">
                    {selectedInquiry.category}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">작성자</label>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm">
                    <span className="block truncate" title={getNickname(selectedInquiry)}>
                      {getNickname(selectedInquiry)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">문의 제목</label>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm break-words">
                  {selectedInquiry.title}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">문의 내용</label>
                <div
                  className="p-4 bg-gray-50 border border-gray-200 rounded-md text-sm min-h-[200px] max-h-[400px] overflow-y-auto prose prose-sm max-w-none break-words"
                  dangerouslySetInnerHTML={{ __html: selectedInquiry.content }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">답변 내용</label>
                <TextEditor content={answerContent} setContent={setAnswerContent} height="300px" />
                <div className="mt-4">
                  <Button onClick={handleSaveAnswer} disabled={saving} className="w-full">
                    {saving
                      ? "저장 중..."
                      : selectedInquiry?.status === InquiryStatus.WAITING
                      ? "답변 등록"
                      : "답변 수정"}
                  </Button>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">회원 정보 관리 상세</h3>
                {userLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : userDetail ? (
                  <div className="flex flex-col space-y-6">
                    <div className="flex flex-col space-y-6">
                      <div className="flex items-start justify-between">
                        <div className="w-24 font-medium text-sm text-gray-500 flex-shrink-0">
                          사용자명
                        </div>
                        <div className="flex-1 flex items-center min-w-0">
                          <span className="font-medium text-gray-900 break-words">
                            {userDetail.nickname}
                          </span>
                          <ActionButton
                            label="초기화"
                            action="refresh"
                            size="sm"
                            className="ml-2 flex-shrink-0"
                            onClick={handleResetNickname}
                          />
                        </div>
                      </div>

                      <div className="flex items-start justify-between">
                        <div className="w-24 font-medium text-sm text-gray-500 flex-shrink-0">
                          이메일
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-gray-900 break-all">
                            {userDetail.email}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start justify-between">
                        <div className="w-24 font-medium text-sm text-gray-500 flex-shrink-0">
                          패스워드
                        </div>
                        <div className="flex-1 flex items-center min-w-0">
                          <span className="font-medium text-gray-900">********</span>
                          <ActionButton
                            label="초기화"
                            action="refresh"
                            size="sm"
                            className="ml-2 flex-shrink-0"
                            onClick={handleResetPassword}
                          />
                        </div>
                      </div>

                      <div className="flex items-start justify-between">
                        <div className="w-24 font-medium text-sm text-gray-500 flex-shrink-0">
                          등급
                        </div>
                        <div className="flex-1 flex items-center min-w-0">
                          <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            {userDetail.rank?.name || "등급 없음"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start justify-between">
                        <div className="w-24 font-medium text-sm text-gray-500 flex-shrink-0">
                          포인트
                        </div>
                        <div className="flex-1 flex items-center min-w-0">
                          <span className="font-medium text-gray-900">
                            {(userDetail.score || 0).toLocaleString()} P
                          </span>
                          <Button
                            variant="primary"
                            size="sm"
                            className="ml-2 flex-shrink-0"
                            onClick={() => handlePointModalOpen("add")}
                          >
                            지급
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            className="ml-2 flex-shrink-0"
                            onClick={() => handlePointModalOpen("subtract")}
                          >
                            차감
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-start justify-between">
                        <div className="w-24 font-medium text-sm text-gray-500 flex-shrink-0">
                          가입일자
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-gray-900">
                            {formatDate(userDetail.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start justify-between">
                        <div className="w-24 font-medium text-sm text-gray-500 flex-shrink-0">
                          상태
                        </div>
                        <div className="flex-1 min-w-0">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${getUserStatusClassName(
                              userDetail.status
                            )}`}
                          >
                            {userDetail.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 회원 프로필 영역 */}
                    <div className="flex justify-between items-start mt-6">
                      <div className="w-24 font-medium text-sm text-gray-500 flex-shrink-0">
                        프로필 사진
                      </div>
                      <div className="flex-1 flex items-start min-w-0">
                        <div className="bg-gray-200 rounded-md w-48 h-48 flex items-center justify-center overflow-hidden mr-2 flex-shrink-0">
                          {userDetail.profileImageUrl ? (
                            <img
                              src={userDetail.profileImageUrl}
                              alt="프로필"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.style.display = "none";
                              }}
                            />
                          ) : null}
                        </div>
                        <ActionButton
                          label="초기화"
                          action="delete"
                          size="sm"
                          className="flex-shrink-0"
                          onClick={handleDeleteProfileImage}
                        />
                      </div>
                    </div>

                    {/* 활동내역 영역 */}
                    <div className="flex justify-between items-start mt-6">
                      <div className="w-24 font-medium text-sm text-gray-500 flex-shrink-0">
                        활동내역
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="border rounded-md overflow-y-auto h-48 bg-gray-50">
                          {userDetail.activities && userDetail.activities.length > 0 ? (
                            <div className="p-2">
                              {userDetail.activities.map((activity: any, index: number) => (
                                <div key={index} className="border-b py-2 last:border-0">
                                  <div className="text-sm text-gray-600 mb-1">
                                    {formatDate(activity.timestamp)}
                                  </div>
                                  <div className="text-sm break-words leading-relaxed">
                                    {activity.message}
                                  </div>
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
                      <div className="w-24 font-medium text-sm text-gray-500 flex-shrink-0">
                        관리자 메모
                      </div>
                      <div className="flex-1 min-w-0">
                        <textarea
                          className="w-full h-48 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
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
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    회원 정보를 불러올 수 없습니다.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* 포인트 지급/차감 모달 */}
      <Modal
        isOpen={showPointModal}
        onClose={() => setShowPointModal(false)}
        title={`포인트 ${pointAction === "add" ? "지급" : "차감"}`}
        size="md"
      >
        {userDetail && (
          <div className="space-y-4">
            <div className="mb-4">
              <div className="font-medium text-sm text-gray-500 mb-1">지급 대상자</div>
              <div className="text-blue-600 font-medium">{userDetail.nickname}</div>
            </div>

            <div className="mb-4">
              <div className="font-medium text-sm text-gray-500 mb-1">현재 포인트</div>
              <div className="text-blue-600 font-medium">
                {(userDetail.score || 0).toLocaleString()} P
              </div>
            </div>

            <Input
              label={`${pointAction === "add" ? "지급" : "차감"} 포인트`}
              type="number"
              value={pointAmount.toString()}
              onChange={(e) => setPointAmount(Math.max(0, parseInt(e.target.value) || 0))}
              min="0"
            />

            <div className="flex justify-center mt-6">
              <Button variant="primary" onClick={handlePointSubmit} disabled={pointAmount <= 0}>
                {pointAction === "add" ? "지급" : "차감"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {saving && <LoadingOverlay isLoading={saving} />}
    </div>
  );
};

export default InquiryManagement;
