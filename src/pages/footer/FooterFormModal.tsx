// src/pages/footer/FooterFormModal.tsx
import React, { useState, useEffect } from "react";
import axios from "@/api/axios";
import Modal from "@/components/Modal";
import Input from "@/components/forms/Input";
import TextEditor from "@/components/forms/TextEditor";
import Button from "@/components/Button";
import Alert from "@/components/Alert";
import type { Footer } from "./types";

interface FooterFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Callback after successful save
  footerToEdit?: Footer | null; // Pass footer data for editing
}

function FooterFormModal({ isOpen, onClose, onSuccess, footerToEdit }: FooterFormModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(false); // Use boolean for state, convert on submit
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!footerToEdit;

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens or footerToEdit changes
      setTitle(footerToEdit?.title || "");

      const initialContent = footerToEdit?.content || "";
      // 기존 내용이 없거나 Quill의 기본 빈 상태일 경우 중앙 정렬된 빈 단락을 기본값으로 설정
      const isEmptyContent = !initialContent || initialContent === "<p><br></p>";
      setContent(isEmptyContent ? '<p class="ql-align-center"><br></p>' : initialContent);

      setIsPublic(footerToEdit ? footerToEdit.isPublic === 1 : false);
      setError(null);
    }
  }, [isOpen, footerToEdit]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      title,
      content,
      isPublic: isPublic ? 1 : 0,
    };

    try {
      if (isEditMode && footerToEdit) {
        // Update existing footer
        await axios.put(`/footer/${footerToEdit.id}`, payload);
      } else {
        // Create new footer
        await axios.post("/footer", payload);
      }

      // Call onSuccess for parent component to handle refresh and closing
      onSuccess();
    } catch (err: any) {
      console.error("Error saving footer:", err);
      const errorMessage =
        err.response?.data?.message ||
        (isEditMode
          ? "푸터 정보 수정 중 오류가 발생했습니다."
          : "푸터 정보 생성 중 오류가 발생했습니다.");
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? "푸터 수정" : "푸터 생성"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Modal Error Alert - Moved below controls */}
        {/* {error && (
          <div className="mb-4">
            <Alert type="error" message={error} onClose={() => setError(null)} />
          </div>
        )} */}

        {/* Top Control Area */}
        <div className="flex justify-between items-center pt-2 pb-4 border-b border-gray-200 mb-4">
          <div className="flex space-x-2">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? (isEditMode ? "저장 중..." : "생성 중...") : isEditMode ? "저장" : "생성"}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              취소
            </Button>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="footer-isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:cursor-not-allowed"
            />
            <label htmlFor="footer-isPublic" className="ml-2 block text-sm text-gray-900">
              공개 여부
            </label>
          </div>
        </div>

        {/* Modal Error Alert (Positioned Below controls) */}
        {error && (
          <div className="mb-4">
            <Alert type="error" message={error} onClose={() => setError(null)} />
          </div>
        )}

        <Input
          label="제목"
          id="footer-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={loading}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
          <TextEditor content={content} setContent={setContent} />
        </div>
      </form>
    </Modal>
  );
}

export default FooterFormModal;
