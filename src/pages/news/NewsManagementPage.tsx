import React, { useState, useEffect } from "react";
import axios from "@/api/axios";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import ActionButton from "@/components/ActionButton";
import Modal from "@/components/Modal";
import Input from "@/components/forms/Input";
import Alert from "@/components/Alert";
import { formatDate } from "@/utils/dateUtils";
import TextEditor from "@/components/forms/TextEditor";
import { extractDataArray } from "@/api/util";

// 뉴스 아이템 타입 정의
interface NewsItem {
  id: number;
  title: string;
  link: string;
  category: string;
  description: string;
  author: string;
  thumbnailUrl: string;
  isPublic: number;
  isSelected: number;
  createdAt: string;
  updatedAt: string;
}

const NewsManagementPage = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // 모달 관련 상태
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentNews, setCurrentNews] = useState<NewsItem | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // 뉴스 데이터 상태
  const [title, setTitle] = useState<string>("");
  const [link, setLink] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [author, setAuthor] = useState<string>("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("");
  const [isPublic, setIsPublic] = useState<number>(1);
  const [isSelected, setIsSelected] = useState<number>(0);
  const [selectedNews, setSelectedNews] = useState<number[]>([]);

  // 뉴스 목록 조회
  const fetchNews = async () => {
    setLoading(true);
    setError(null);

    try {
      // API 호출 - 슬래시(/) 제거
      const response = await axios.get("news/admin-news");
      console.log("뉴스 관리 응답 구조:", response);

      // extractDataArray 유틸리티 함수를 사용하여 데이터 배열 추출
      const newsData = extractDataArray(response.data, true);

      if (newsData && newsData.length > 0) {
        console.log("추출된 뉴스 데이터:", newsData);

        // thumbnail 필드를 thumbnailUrl로 매핑
        const mappedNewsData = newsData.map((news) => ({
          ...news,
          thumbnailUrl: news.thumbnail || news.thumbnailUrl,
        }));

        console.log("매핑된 뉴스 데이터:", mappedNewsData);
        setNews(mappedNewsData);
      } else {
        console.log("적절한 뉴스 데이터를 찾지 못했습니다.");
        setNews([]);
        setError("뉴스 목록을 불러오는데 실패했습니다. 서버 응답 형식을 확인해주세요.");
      }
    } catch (err: any) {
      console.error("뉴스 목록 조회 오류:", err);
      setError("뉴스 목록을 불러오는데 실패했습니다. 네트워크 또는 API 경로를 확인해주세요.");
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  // 모달 닫기
  const handleCloseModal = () => {
    setShowModal(false);
  };

  // 뉴스 추가 모달 열기
  const handleAddNews = () => {
    setCurrentNews(null);
    // 초기화
    setTitle("");
    setLink("");
    setCategory("");
    setDescription("");
    setAuthor("");
    setThumbnailUrl("");
    setIsPublic(1);
    setIsSelected(0);
    setIsEditing(false);
    setShowModal(true);
  };

  // 뉴스 수정 모달 열기
  const handleEditNews = (news: NewsItem) => {
    setCurrentNews(news);
    setTitle(news.title || "");
    setLink(news.link || "");
    setCategory(news.category || "");
    setDescription(news.description || "");
    setAuthor(news.author || "");
    setThumbnailUrl(news.thumbnailUrl || "");
    setIsPublic(news.isPublic);
    setIsSelected(news.isSelected);
    setIsEditing(true);
    setShowModal(true);
  };

  // 뉴스 삭제
  const handleDeleteNews = async (id: number) => {
    if (!window.confirm("정말로 이 뉴스를 삭제하시겠습니까?")) {
      return;
    }

    try {
      // API 호출 - 슬래시(/) 제거
      await axios.delete(`news/admin-news/${id}`);
      setAlertMessage({ type: "success", message: "뉴스가 삭제되었습니다." });
      fetchNews(); // 목록 새로고침
    } catch (err: any) {
      setAlertMessage({ type: "error", message: "뉴스 삭제 중 오류가 발생했습니다." });
    }
  };

  // 뉴스 저장 처리
  const handleSaveNews = async () => {
    if (!title.trim()) {
      setAlertMessage({ type: "error", message: "뉴스 제목을 입력해주세요." });
      return;
    }

    if (!link.trim()) {
      setAlertMessage({ type: "error", message: "뉴스 링크를 입력해주세요." });
      return;
    }

    try {
      setSaving(true);

      // API 요청 데이터 구성
      const requestData = {
        title: title.trim(),
        link: link.trim(),
        description: description.trim(),
        thumbnail: thumbnailUrl.trim(),
        isPublic: isPublic,
        isSelected: isSelected,
      };

      if (!isEditing) {
        // 새 뉴스 생성 - 슬래시(/) 제거
        const response = await axios.post("news/admin-news", requestData);

        if (response.status === 201 || response.status === 200) {
          setAlertMessage({ type: "success", message: "뉴스가 성공적으로 추가되었습니다." });
        }
      } else if (currentNews?.id) {
        // 기존 뉴스 수정 - 슬래시(/) 제거
        const response = await axios.put(`news/admin-news/${currentNews.id}`, requestData);

        if (response.status === 200) {
          setAlertMessage({ type: "success", message: "뉴스가 성공적으로 수정되었습니다." });
        }
      } else {
        throw new Error("수정할 뉴스 정보가 유효하지 않습니다.");
      }

      fetchNews(); // 목록 새로고침
      setShowModal(false); // 모달 닫기
    } catch (err: any) {
      setAlertMessage({ type: "error", message: "뉴스 저장 중 오류가 발생했습니다." });
    } finally {
      setSaving(false);
    }
  };

  // 뉴스 공개 상태 토글
  const handleTogglePublic = async (id: number, currentStatus: number) => {
    try {
      // API 호출 - 슬래시(/) 제거
      await axios.put(`news/admin-news/${id}/toggle-public`, {
        isPublic: currentStatus === 1 ? 0 : 1,
      });
      fetchNews(); // 목록 새로고침
    } catch (err: any) {
      setAlertMessage({ type: "error", message: "뉴스 공개 상태 변경 중 오류가 발생했습니다." });
    }
  };

  // 체크박스 토글 핸들러
  const handleToggleSelect = (id: number) => {
    if (selectedNews.includes(id)) {
      setSelectedNews(selectedNews.filter((newsId) => newsId !== id));
    } else {
      setSelectedNews([...selectedNews, id]);
    }
  };

  // 전체 선택/해제 토글
  const handleToggleAll = () => {
    if (selectedNews.length === news.length) {
      setSelectedNews([]);
    } else {
      setSelectedNews(news.map((item) => item.id));
    }
  };

  // 선택된 뉴스 삭제
  const handleDeleteSelected = async () => {
    if (selectedNews.length === 0) {
      setAlertMessage({ type: "info", message: "삭제할 뉴스를 선택해주세요." });
      return;
    }

    if (!window.confirm(`선택한 ${selectedNews.length}개의 뉴스를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      // 선택된 모든 뉴스 삭제 요청 - 슬래시(/) 제거
      const deletePromises = selectedNews.map((id) => axios.delete(`news/admin-news/${id}`));
      await Promise.all(deletePromises);

      setAlertMessage({ type: "success", message: "선택한 뉴스가 모두 삭제되었습니다." });
      setSelectedNews([]); // 선택 목록 초기화
      fetchNews(); // 목록 새로고침
    } catch (err: any) {
      setAlertMessage({ type: "error", message: "뉴스 삭제 중 오류가 발생했습니다." });
    }
  };

  // 모달 컨텐츠 렌더링
  const renderModalContent = () => {
    return (
      <div className="space-y-4">
        {/* 제목 */}
        <Input
          label="뉴스 제목"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="뉴스 제목을 입력하세요"
          required
          maxLength={255}
          disabled={saving}
        />

        {/* 링크 */}
        <Input
          label="뉴스 링크"
          type="text"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="뉴스 링크를 입력하세요"
          required
          maxLength={255}
          disabled={saving}
        />

        {/* 설명 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">뉴스 설명</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="뉴스 설명을 입력하세요"
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            disabled={saving}
          />
        </div>

        {/* 썸네일 URL */}
        <Input
          label="썸네일 URL"
          type="text"
          value={thumbnailUrl}
          onChange={(e) => setThumbnailUrl(e.target.value)}
          placeholder="뉴스 썸네일 URL을 입력하세요"
          maxLength={255}
          disabled={saving}
        />

        {/* 공개 여부 */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isPublic"
            checked={isPublic === 1}
            onChange={(e) => setIsPublic(e.target.checked ? 1 : 0)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
            공개 상태
          </label>
        </div>

        {/* 선택 여부 */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isSelected"
            checked={isSelected === 1}
            onChange={(e) => setIsSelected(e.target.checked ? 1 : 0)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="isSelected" className="ml-2 block text-sm text-gray-900">
            Most View 여부
          </label>
        </div>
      </div>
    );
  };

  // DataTable 컬럼 정의
  const columns = [
    {
      header: "선택",
      accessor: "id" as keyof NewsItem,
      cell: (value: number) => (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={selectedNews.includes(value)}
            onChange={() => handleToggleSelect(value)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>
      ),
    },
    {
      header: "타이틀",
      accessor: "title" as keyof NewsItem,
    },
    {
      header: "썸네일",
      accessor: "thumbnailUrl" as keyof NewsItem,
      cell: (value: string) => (
        <div className="w-20 h-12 bg-gray-100 flex items-center justify-center overflow-hidden">
          {value && value.trim() !== "" ? (
            <img src={value} alt="썸네일" className="max-w-full max-h-full object-contain" />
          ) : (
            <span className="text-xs text-gray-500">이미지 없음</span>
          )}
        </div>
      ),
    },
    {
      header: "공개 여부",
      accessor: "isPublic" as keyof NewsItem,
      cell: (value: number, row: NewsItem) => (
        <button
          onClick={() => handleTogglePublic(row.id, value)}
          className={`px-2 py-1 rounded text-xs ${
            value === 1
              ? "bg-green-100 text-green-800 hover:bg-green-200"
              : "bg-red-100 text-red-800 hover:bg-red-200"
          }`}
        >
          {value === 1 ? "공개" : "비공개"}
        </button>
      ),
    },
    {
      header: "Most View 여부",
      accessor: "isSelected" as keyof NewsItem,
      cell: (value: number) => (
        <span
          className={`px-2 py-1 rounded text-xs ${
            value === 1 ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
          }`}
        >
          {value === 1 ? "선택됨" : "선택안됨"}
        </span>
      ),
    },
    {
      header: "관리",
      accessor: "id" as keyof NewsItem,
      cell: (value: number, row: NewsItem) => (
        <div className="flex items-center space-x-2">
          <ActionButton
            label="수정"
            onClick={() => handleEditNews(row)}
            color="blue"
            action="edit"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">뉴스 관리</h1>
        <div className="flex items-center space-x-2">
          <Button onClick={handleToggleAll} variant="secondary" className="mr-2">
            {selectedNews.length === news.length && news.length > 0 ? "전체 해제" : "전체 선택"}
          </Button>
          <Button
            onClick={handleDeleteSelected}
            variant="danger"
            disabled={selectedNews.length === 0}
            className="mr-2"
          >
            선택 삭제
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

      <DataTable
        columns={columns}
        data={news}
        loading={loading}
        emptyMessage="등록된 뉴스가 없습니다."
      />

      {/* 뉴스 추가/수정 모달 */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={isEditing ? "뉴스 수정" : "새 뉴스 추가"}
        size="xl"
      >
        {renderModalContent()}

        <div className="border-t border-gray-200 pt-5 mt-5 flex justify-center">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCloseModal}
            disabled={saving}
            className="mr-2"
          >
            취소
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSaveNews}
            disabled={saving}
            className="px-8"
          >
            {saving ? "저장 중..." : "등록"}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default NewsManagementPage;
