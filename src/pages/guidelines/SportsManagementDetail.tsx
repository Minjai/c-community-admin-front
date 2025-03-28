import React, { useEffect, useState } from "react";
import TextEditor from "../../components/forms/TextEditor";
import { useParams, useNavigate } from "react-router-dom";
import { Post } from "@/types";
import axios from "@/api/axios";

const SportsManagementDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

    try {
      if (isEditMode) {
        // 기존 가이드라인 수정
        const response = await axios.put<Post>(`/sports-guideline/${id}`, {
          title,
          content,
          boardId: post?.boardId || 2, // 기본값 설정 (자유게시판)
        });

        if (response.status === 200) {
          alert("가이드라인이 수정되었습니다.");
          navigate("/guidelines/sports");
        } else {
          setError("가이드라인 수정 중 오류가 발생했습니다.");
        }
      } else {
        // 새 가이드라인 작성
        const response = await axios.post<Post>("/sports-guideline", {
          title,
          content,
          boardId: 2, // 기본 자유게시판으로 설정
        });

        if (response.status === 201 || response.status === 200) {
          alert("가이드라인이 작성되었습니다.");
          navigate("/guidelines/sports");
        } else {
          setError("가이드라인 작성 중 오류가 발생했습니다.");
        }
      }
    } catch (error: any) {
      console.error("가이드라인 저장 오류:", error);

      // 인증 오류 처리
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError("권한이 없습니다. 로그인이 필요합니다.");
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      } else {
        setError(
          "가이드라인을 저장하는 중 오류가 발생했습니다: " +
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
      const response = await axios.get<Post>(`/sports-guideline/${id}`);

      if (response.data) {
        const postData = response.data;
        setPost(postData);
        setTitle(postData.title);
        setContent(postData.content);
      } else {
        setError("가이드라인을 찾을 수 없습니다.");
        console.error("가이드라인 조회 실패: 데이터 없음");
      }
    } catch (error) {
      console.error("가이드라인 조회 오류:", error);
      setError("가이드라인을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getPostDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">가이드라인 정보를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{isNewPost ? "새 가이드라인 작성" : "가이드라인 수정"}</h1>

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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">내용</label>
          <div className="min-h-[400px] border border-gray-300 rounded-md">
            <TextEditor content={content} setContent={setContent} />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate("/guidelines/sports")}
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

export default SportsManagementDetail; 