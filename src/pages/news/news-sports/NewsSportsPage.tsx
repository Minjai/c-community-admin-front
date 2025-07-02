import React, { useState, useEffect } from "react";
import axios from "@api/axios.ts";
import DataTable from "@components/DataTable.tsx";
import Button from "@components/Button.tsx";
import ActionButton from "@components/ActionButton.tsx";
import Modal from "@components/Modal.tsx";
import Input from "@components/forms/Input.tsx";
import Alert from "@components/Alert.tsx";
import SearchInput from "@components/SearchInput.tsx";
import { formatDate } from "@utils/dateUtils.ts";
import { toast } from "react-toastify";
import LoadingOverlay from "@components/LoadingOverlay.tsx";

// 뉴스 아이템 타입 정의 (API 응답 기준)
interface NewsItem {
  id: number;
  title: string;
  link: string;
  url?: string; // BBC 스포츠 API 필드
  description: string | null;
  excerpt?: string; // BBC 스포츠 API 필드
  thumbnailUrl: string | null; // Mapped from thumbnail
  imageUrl?: string; // BBC 스포츠 API 필드
  thumbnail?: string | null; // Original field from API
  isPublic: number;
  isSelected: number; // Field exists in API, keep for mapping consistency
  createdAt: string;
  updatedAt: string;
  viewCount?: number; // Optional field
  // Add other fields from API if needed (date, content, html_description)
}

const NewsSportsPage = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentNews, setCurrentNews] = useState<NewsItem | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // 선택된 뉴스 ID 상태 추가
  const [selectedNewsIds, setSelectedNewsIds] = useState<number[]>([]);

  // 페이지네이션 상태 추가
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10); // 기본 페이지 크기
  const [totalItems, setTotalItems] = useState<number>(0);

  // 검색 value 상태
  const [searchValue, setSearchValue] = useState<string>("");

  // 뉴스 데이터 상태 (API 필드 반영)
  const [title, setTitle] = useState<string>("");
  const [link, setLink] = useState<string>("");
  const [description, setDescription] = useState<string | null>("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(""); // Allow null
  const [isPublic, setIsPublic] = useState<number>(1);
  const [modalIsSelected, setModalIsSelected] = useState<number>(0); // 인기 여부 상태 추가
  // isSelected state is not needed for UI based on previous request - 이 주석은 제거해도 될 듯

  // 뉴스 목록 조회 (검색 파라미터 추가)
  const fetchNews = async (page: number, pageSize: number, searchValue: string = "") => {
    setLoading(true);
    setError(null);
    // Fetch 시 선택 상태 초기화 (필요에 따라 유지하도록 수정 가능)
    const currentSelected = [...selectedNewsIds];

    try {
      // API 호출 (page, limit 파라미터 다시 추가)
      console.log(`Fetching admin news with page: ${page}, pageSize: ${pageSize}`);
      const params: any = { page, pageSize };

      if (searchValue.trim()) {
        params.search = searchValue;
      }

      const response = await axios.get("/bbc-sport/admin/articles", { params });
      console.log("뉴스 관리 응답:", response.data);

      // 새로운 서버 응답 구조 처리: data[], count{}
      if (
        response.data?.success &&
        Array.isArray(response.data?.data) && // data가 배열인지 확인
        response.data?.count // count 객체 확인
      ) {
        const articles = response.data.data; // 뉴스 목록 직접 사용
        const totalCount = response.data.count; // 전체 개수 추출
        console.log("추출된 뉴스 데이터:", articles);
        console.log("추출된 전체 개수:", totalCount);

        const mappedNewsData: NewsItem[] = articles
          .filter((item: any) => {
            const isValidId = typeof item.id === "number" && item.id > 0;
            if (!isValidId) {
              console.warn("Invalid or missing ID found in news item, filtering out:", item);
            }
            return isValidId;
          })
          .map((item: any) => ({
            ...item,
            thumbnailUrl: item.imageUrl || item.thumbnail || item.thumbnailUrl || null,
            description: item.excerpt || item.description || null,
          }));
        setNews(mappedNewsData);

        // 페이지네이션 상태 업데이트 (API 응답 기준)
        setTotalItems(totalCount);
        setCurrentPage(page);
        setPageSize(pageSize);
        setTotalPages(Math.ceil(totalCount / pageSize));

        // 선택 상태 유지 (현재 페이지의 아이템만)
        setSelectedNewsIds(
          currentSelected.filter((id) => mappedNewsData.some((item) => item.id === id))
        );
      } else {
        console.warn("뉴스 데이터를 찾지 못했거나 형식이 다릅니다. 응답:", response.data);
        setNews([]);
        setSelectedNewsIds([]); // 에러 시 선택 초기화
        setError(response.data?.message || "뉴스 목록 형식이 올바르지 않습니다.");
        // 페이지네이션 상태 초기화
        setTotalItems(0);
        setCurrentPage(1);
        setPageSize(pageSize); // 요청 시 사용한 pageSize 값으로 초기화
        setTotalPages(1);
      }
    } catch (err: any) {
      console.error("뉴스 목록 조회 오류:", err);
      let detailedError = "뉴스 목록을 불러오는데 실패했습니다.";
      if (err.response) {
        detailedError = `서버 오류 ${err.response.status}: ${
          err.response.data?.message || "알 수 없는 오류"
        }`;
      } else if (err.request) {
        detailedError = "서버로부터 응답을 받지 못했습니다.";
      } else {
        detailedError = `요청 설정 중 오류 발생: ${err.message}`;
      }
      setError(detailedError);
      setNews([]);
      setSelectedNewsIds([]); // 에러 시 선택 초기화
      // 페이지네이션 상태 초기화
      setTotalItems(0);
      setCurrentPage(1);
      setPageSize(pageSize); // 요청 시 사용한 pageSize 값으로 초기화
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(currentPage, pageSize, searchValue);
  }, [currentPage, pageSize]); // currentPage, pageSize 변경 시 다시 로드

  // 페이지 변경 핸들러 추가
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      fetchNews(newPage, pageSize, searchValue); // 새 페이지 데이터 요청
    }
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setShowModal(false);
  };

  // 뉴스 수정 모달 열기 (필드 추가)
  const handleEditNews = (newsItem: NewsItem) => {
    setCurrentNews(newsItem);
    setTitle(newsItem.title || "");
    setLink(newsItem.url || newsItem.link || "");
    setDescription(newsItem.excerpt || newsItem.description || "");
    setThumbnailUrl(newsItem.imageUrl || newsItem.thumbnailUrl || null);
    setIsPublic(newsItem.isPublic);
    setModalIsSelected(newsItem.isSelected || 0); // modalIsSelected 상태 설정 추가
    setIsEditing(true);
    setAlertMessage(null); // Clear modal error
    setShowModal(true);
    setSelectedNewsIds([]); // 수정 시 선택 해제
  };

  // 뉴스 삭제 (선택 해제 추가)
  const handleDeleteNews = async (id: number) => {
    // Add ID validation check
    if (typeof id !== "number" || id <= 0) {
      toast.error("유효하지 않은 뉴스 ID입니다. 삭제할 수 없습니다.");
      console.error(`Invalid ID provided for deletion: ${id}`);
      return;
    }
    if (!window.confirm("정말로 이 뉴스를 삭제하시겠습니까?")) return;
    // Log the ID before making the delete request
    console.log(`Attempting to delete news with ID: ${id}, Type: ${typeof id}`);
    try {
      await axios.delete(`/bbc-sport/articles/${id}`);
      toast.success("뉴스가 삭제되었습니다.");
      // 선택된 목록에서 삭제된 ID 제거
      setSelectedNewsIds((prev) => prev.filter((newsId) => newsId !== id));
      fetchNews(currentPage, pageSize, searchValue); // 현재 페이지 유지
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "뉴스 삭제 중 오류가 발생했습니다.";
      toast.error(errorMessage);
      console.error("Delete news error:", err.response?.data || err);
    }
  };

  // 뉴스 저장 처리 (선택 해제 추가)
  const handleSaveNews = async () => {
    if (!title.trim()) {
      setAlertMessage({ type: "error", message: "뉴스 제목을 입력해주세요." });
      return;
    }
    if (!link.trim()) {
      setAlertMessage({ type: "error", message: "뉴스 링크를 입력해주세요." });
      return;
    }
    // Category, Author 등 다른 필수 필드가 있다면 추가 검증 필요

    // 수정 시 ID 유효성 검사 (강화)
    if (isEditing && (!currentNews || typeof currentNews.id !== "number" || currentNews.id <= 0)) {
      setAlertMessage({
        type: "error",
        message: "수정할 뉴스 정보가 유효하지 않습니다. (ID 오류)",
      });
      console.error("Invalid currentNews state for editing:", currentNews);
      return;
    }

    setSaving(true);
    setAlertMessage(null);
    try {
      // 서버가 받는 요청 데이터 형식에 맞춰야 함 (thumbnail vs thumbnailUrl 등)
      const requestData = {
        title: title.trim(),
        link: link.trim(),
        content: description?.trim() ?? null, // Map description to content
        thumbnailUrl: thumbnailUrl?.trim() ?? null, // Use thumbnailUrl
        isPublic: isPublic,
        isSelected: modalIsSelected, // isSelected 값 추가
      };

      if (isEditing && currentNews) {
        // 수정
        console.log(`Updating news with ID: ${currentNews.id}`);
        await axios.put(`/bbc-sport/articles/${currentNews.id}`, requestData);
        toast.success("뉴스가 수정되었습니다.");
      } else {
        // 새로 추가
        console.log("Creating new news");
        await axios.post("/bbc-sport/articles", requestData);
        toast.success("뉴스가 추가되었습니다.");
      }

      // 모달 닫기 및 목록 새로고침
      setShowModal(false);
      setCurrentNews(null);
      setIsEditing(false);
      // 폼 초기화
      setTitle("");
      setLink("");
      setDescription("");
      setThumbnailUrl("");
      setIsPublic(1);
      setModalIsSelected(0);
      // 목록 새로고침
      fetchNews(currentPage, pageSize, searchValue);
    } catch (err: any) {
      console.error("Save news error:", err.response?.data || err);
      const errorMessage = err.response?.data?.message || "뉴스 저장 중 오류가 발생했습니다.";
      setAlertMessage({ type: "error", message: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  // 공개 상태 토글
  const handleTogglePublic = async (id: number, currentStatus: number) => {
    try {
      const newStatus = currentStatus === 1 ? 0 : 1;
      await axios.patch(`/bbc-sport/articles/${id}/toggle-public`, {
        isPublic: newStatus,
      });
      toast.success(`뉴스가 ${newStatus === 1 ? "공개" : "비공개"}로 변경되었습니다.`);
      fetchNews(currentPage, pageSize, searchValue);
    } catch (err: any) {
      toast.error("상태 변경 중 오류가 발생했습니다.");
      console.error("Toggle public error:", err.response?.data || err);
    }
  };

  // 인기 여부 토글
  const handleToggleSelected = async (id: number, currentStatus: number) => {
    try {
      const newStatus = currentStatus === 1 ? 0 : 1;
      await axios.patch(`/api/bbc-sport/articles/${id}/toggle-selected`, {
        isSelected: newStatus,
      });
      toast.success(`뉴스가 ${newStatus === 1 ? "인기" : "일반"}로 변경되었습니다.`);
      fetchNews(currentPage, pageSize, searchValue);
    } catch (err: any) {
      toast.error("인기 여부 변경 중 오류가 발생했습니다.");
      console.error("Toggle selected error:", err.response?.data || err);
    }
  };

  // 모달 내용 렌더링
  const renderModalContent = () => {
    return (
      <div className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            뉴스 제목 *
          </label>
          <Input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="뉴스 제목을 입력하세요"
            required
          />
        </div>

        <div>
          <label htmlFor="link" className="block text-sm font-medium text-gray-700 mb-1">
            뉴스 링크 *
          </label>
          <Input
            id="link"
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://example.com/news-article"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            뉴스 설명
          </label>
          <textarea
            id="description"
            value={description || ""}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="뉴스 설명을 입력하세요"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            rows={4}
          />
        </div>

        <div>
          <label htmlFor="thumbnailUrl" className="block text-sm font-medium text-gray-700 mb-1">
            썸네일 URL
          </label>
          <Input
            id="thumbnailUrl"
            type="url"
            value={thumbnailUrl || ""}
            onChange={(e) => setThumbnailUrl(e.target.value)}
            placeholder="https://example.com/thumbnail.jpg"
          />
        </div>
      </div>
    );
  };

  // 새 뉴스 추가 모달 열기
  const handleAddNews = () => {
    setCurrentNews(null);
    setIsEditing(false);
    setTitle("");
    setLink("");
    setDescription("");
    setThumbnailUrl("");
    setIsPublic(1);
    setModalIsSelected(0);
    setAlertMessage(null);
    setShowModal(true);
    setSelectedNewsIds([]); // 추가 시 선택 해제
  };

  // 개별 뉴스 선택/해제
  const handleSelectNews = (id: number) => {
    setSelectedNewsIds((prev) =>
      prev.includes(id) ? prev.filter((newsId) => newsId !== id) : [...prev, id]
    );
  };

  // 전체 뉴스 선택/해제
  const handleSelectAllNews = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedNewsIds(news.map((item) => item.id));
    } else {
      setSelectedNewsIds([]);
    }
  };

  // 선택된 뉴스 일괄 삭제
  const handleBulkDelete = async () => {
    if (selectedNewsIds.length === 0) {
      toast.error("삭제할 뉴스를 선택해주세요.");
      return;
    }

    if (!window.confirm(`선택된 ${selectedNewsIds.length}개의 뉴스를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      setLoading(true);
      // 각 뉴스를 순차적으로 삭제
      for (const id of selectedNewsIds) {
        await axios.delete(`/bbc-sport/articles/${id}`);
      }
      toast.success(`${selectedNewsIds.length}개의 뉴스가 삭제되었습니다.`);
      setSelectedNewsIds([]);
      fetchNews(currentPage, pageSize, searchValue);
    } catch (err: any) {
      toast.error("일괄 삭제 중 오류가 발생했습니다.");
      console.error("Bulk delete error:", err.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  // 검색 핸들러
  const handleSearch = (value: string) => {
    setSearchValue(value);
    setCurrentPage(1); // 검색 시 첫 페이지로 이동
    fetchNews(1, pageSize, value);
  };

  // DataTable 컬럼 정의
  const columns = [
    {
      header: (
        <input
          type="checkbox"
          checked={selectedNewsIds.length === news.length && news.length > 0}
          onChange={handleSelectAllNews}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          disabled={loading || news.length === 0}
        />
      ),
      accessor: "id" as keyof NewsItem,
      cell: (id: number) => (
        <input
          type="checkbox"
          checked={selectedNewsIds.includes(id)}
          onChange={() => handleSelectNews(id)}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          disabled={loading}
        />
      ),
      size: 50,
    },
    {
      header: "썸네일",
      accessor: "thumbnailUrl" as keyof NewsItem,
      cell: (value: string | null) =>
        value ? <img src={value} alt="썸네일" className="h-10 w-auto object-contain" /> : "-", // "없음" 대신 "-" 표시
      size: 100,
    },
    {
      header: "타이틀", // "제목" 대신 "타이틀"
      accessor: "title" as keyof NewsItem,
      cell: (
        value: string,
        row: NewsItem // value 타입 string으로 유지하되 row 사용
      ) => (
        <span
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer block max-w-md truncate" // max-w-md 복원
          onClick={() => handleEditNews(row)}
          title={row.title} // row.title 사용
        >
          {row.title} {/* row.title 사용 */}
        </span>
      ),
      // size: auto (default)
    },
    {
      header: "공개 여부", // "상태" 대신 "공개 여부"
      accessor: "isPublic" as keyof NewsItem,
      cell: (value: number, row: NewsItem) => (
        <button
          onClick={() => handleTogglePublic(row.id, row.isPublic)}
          className={`px-2 py-1 text-xs rounded ${
            row.isPublic === 1 ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"
          }`} // 원래 클래스 복원
          disabled={loading || saving} // 비활성화 추가
        >
          {row.isPublic === 1 ? "공개" : "비공개"}
        </button>
      ),
      size: 80,
    },
    {
      header: "인기 여부", // 누락된 컬럼 복원
      accessor: "isSelected" as keyof NewsItem,
      cell: (value: number) => (
        <span className={`font-medium ${value === 1 ? "text-red-600" : "text-gray-900"}`}>
          {value === 1 ? "Y" : "N"}
        </span>
      ),
      size: 80,
    },
    {
      header: "등록일자", // "등록일" 대신 "등록일자"
      accessor: "createdAt" as keyof NewsItem,
      cell: (value: string) => formatDate(value),
      size: 120,
    },
    {
      header: "관리",
      accessor: "id" as keyof NewsItem,
      cell: (
        id: number,
        row: NewsItem // id 대신 row.id 사용
      ) => (
        <div className="flex space-x-1">
          {" "}
          {/* space-x-1 복원 */}
          <ActionButton
            label="수정"
            action="edit"
            size="sm"
            onClick={() => handleEditNews(row)}
            disabled={loading || saving} // 비활성화 추가
          />
          <ActionButton
            label="삭제"
            action="delete"
            size="sm"
            onClick={() => handleDeleteNews(row.id)} // row.id 사용
            disabled={loading || saving} // 비활성화 추가
          />
        </div>
      ),
      size: 120,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">뉴스 관리</h1>
        <SearchInput
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          onSearch={handleSearch}
        />
        <div className="flex space-x-2">
          <Button
            variant="danger"
            onClick={handleBulkDelete}
            disabled={selectedNewsIds.length === 0 || loading || saving}
          >
            {`선택 삭제 (${selectedNewsIds.length})`}
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alertMessage?.type !== "error" && alertMessage?.message && (
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

      {/* Loading Overlay */}
      <LoadingOverlay isLoading={loading || saving} />

      {/* Wrap DataTable in the styled div */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          columns={columns}
          data={news}
          loading={loading}
          emptyMessage="등록된 뉴스가 없습니다."
          pagination={{
            currentPage: currentPage,
            pageSize: pageSize,
            totalItems: totalItems,
            onPageChange: handlePageChange,
          }}
        />
      </div>

      {/* Modal */}
      {showModal && currentNews && (
        <Modal
          isOpen={showModal}
          onClose={handleCloseModal}
          title={isEditing ? "뉴스 수정" : "새 뉴스 추가"}
          size="xl"
        >
          {/* Modal Error Alert (only for save errors now) */}
          {alertMessage?.type === "error" && (
            <div className="mb-4">
              <Alert
                type="error"
                message={alertMessage.message}
                onClose={() => setAlertMessage(null)}
              />
            </div>
          )}
          {/* Top Control Area (ensure no isSelected) */}
          <div className="flex justify-between items-center pt-2 pb-4 border-b border-gray-200 mb-6">
            <div className="flex space-x-3">
              <Button onClick={handleSaveNews} variant="primary" disabled={saving}>
                {saving ? "저장 중..." : "수정"}
              </Button>
              <Button onClick={handleCloseModal} variant="secondary" disabled={saving}>
                취소
              </Button>
            </div>
            <div className="flex items-center space-x-4">
              {/* Public Status Checkbox */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic-modal"
                  checked={isPublic === 1}
                  onChange={(e) => setIsPublic(e.target.checked ? 1 : 0)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isPublic-modal" className="ml-2 block text-sm text-gray-900">
                  공개 상태
                </label>
              </div>
              {/* isSelected (인기 여부) Checkbox 추가 */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isSelected-modal"
                  checked={modalIsSelected === 1}
                  onChange={(e) => setModalIsSelected(e.target.checked ? 1 : 0)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={saving}
                />
                <label htmlFor="isSelected-modal" className="ml-2 block text-sm text-gray-900">
                  인기 여부
                </label>
              </div>
            </div>
          </div>
          {renderModalContent()}
        </Modal>
      )}
    </div>
  );
};

export default NewsSportsPage;
