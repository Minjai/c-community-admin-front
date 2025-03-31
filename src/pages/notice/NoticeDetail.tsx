import React, { useEffect, useState, useRef } from "react";
import TextEditor from "../../components/forms/TextEditor";
import { useParams, useNavigate } from "react-router-dom";
import { Post } from "@/types";
import axios from "@/api/axios";

const NoticeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [tags, setTags] = useState("");
  const isNewPost = id === "new";
  const isEditMode = !isNewPost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }

    if (!content.trim()) {
      setError("내용을 입력해주세요.");
      return;
    }

    setSaving(true);
    setError(null);

    // 디버깅: 서버로 전송할 값 확인
    console.log("현재 isPublic 상태(boolean):", isPublic);
    console.log("서버로 전송될 isPublic 값(숫자):", isPublic ? 1 : 0);

    try {
      if (isEditMode) {
        // 기존 공지사항 수정
        const requestData = {
          title,
          content,
          boardId: 1, // 공지사항
          isPublic: isPublic ? 1 : 0, // boolean 값을 1 또는 0으로 변환
          tags: tags.trim() ? tags : undefined,
        };

        console.log("서버로 전송되는 데이터:", requestData);

        const response = await axios.put<Post>(`/post/${id}`, requestData);

        if (response.status === 200) {
          alert("공지사항이 수정되었습니다.");
          navigate("/notice");
        } else {
          setError("공지사항 수정 중 오류가 발생했습니다.");
        }
      } else {
        // 새 공지사항 작성
        const requestData = {
          title,
          content,
          boardId: 1, // 공지사항
          isPublic: isPublic ? 1 : 0, // boolean 값을 1 또는 0으로 변환
          tags: tags.trim() ? tags : undefined,
        };

        console.log("서버로 전송되는 데이터:", requestData);

        const response = await axios.post<Post>("/post", requestData);

        if (response.status === 201 || response.status === 200) {
          alert("공지사항이 작성되었습니다.");
          navigate("/notice");
        } else {
          setError("공지사항 작성 중 오류가 발생했습니다.");
        }
      }
    } catch (error: any) {
      console.error("공지사항 저장 오류:", error);

      // 인증 오류 처리
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError("권한이 없습니다. 관리자 로그인이 필요합니다.");
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      } else {
        setError(
          "공지사항을 저장하는 중 오류가 발생했습니다: " +
            (error.response?.data?.error || "알 수 없는 오류")
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const getPostDetail = async () => {
    if (isNewPost) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // API 응답 처리를 위한 로그 추가
      console.log(`공지사항 데이터 요청 중: /post/${id}`);

      const response = await axios.get(`/post/${id}`);

      console.log("공지사항 API 응답:", response.data);

      // 게시물 데이터 처리: 다양한 응답 형식 지원
      let postData = null;
      if (response.data) {
        // 직접 데이터 객체인 경우
        if (response.data.id && response.data.title) {
          postData = response.data;
        }
        // success/data 형식인 경우
        else if (response.data.success && response.data.data) {
          postData = response.data.data;
        }
        // result 필드에 데이터가 있는 경우
        else if (response.data.result) {
          postData = response.data.result;
        }
        // post 필드에 데이터가 있는 경우
        else if (response.data.post) {
          postData = response.data.post;
        }
      }

      if (postData) {
        setPost(postData);
        setTitle(postData.title || "");

        // 안전하게 content 설정
        setTimeout(() => {
          setContent(postData.content || "");
        }, 0);

        // 서버에서 받은 isPublic 값 디버깅
        console.log("서버에서 받은 원본 isPublic 값:", postData.isPublic);
        console.log("typeof isPublic:", typeof postData.isPublic);

        // isPublic 값을 boolean으로 변환 (1 또는 true는 true로, 0 또는 false는 false로)
        setIsPublic(postData.isPublic === 1 || postData.isPublic === true);
        setTags(postData.tags || "");
      } else {
        setError("공지사항을 찾을 수 없습니다.");
        console.error("공지사항 조회 실패: 데이터 없음");
      }
    } catch (error) {
      console.error("공지사항 조회 오류:", error);
      setError("공지사항을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getPostDetail();
  }, [id]);

  // 에디터 컨테이너 참조가 변경되면 스크롤을 최상단으로 이동
  useEffect(() => {
    if (editorContainerRef.current) {
      editorContainerRef.current.scrollIntoView({ behavior: "auto", block: "nearest" });
    }
  }, [editorContainerRef.current]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">공지사항 정보를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">
        {isNewPost ? "새 공지사항 작성" : "공지사항 수정"}
      </h1>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            제목
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          />
        </div>

        <div ref={editorContainerRef}>
          <label className="block text-sm font-medium text-gray-700 mb-2">내용</label>
          <div className="min-h-[400px] border border-gray-300 rounded-md">
            <TextEditor content={content} setContent={setContent} />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            이미지는 에디터에 직접 드래그 앤 드롭하여 첨부할 수 있습니다.
          </p>
        </div>

        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
            태그
          </label>
          <input
            type="text"
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="태그는 쉼표(,)로 구분하여 입력해주세요"
            className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">예시: 중요,공지,업데이트</p>
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => {
                const newValue = e.target.checked;
                console.log("체크박스 변경:", newValue);
                setIsPublic(newValue);
              }}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-gray-700">공개 여부</span>
          </label>
          <p className="mt-1 text-xs text-gray-500">체크하면 사용자에게 공지사항이 표시됩니다.</p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate("/notice")}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NoticeDetail;
