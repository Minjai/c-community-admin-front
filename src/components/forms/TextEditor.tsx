import React, { useRef, useEffect, useCallback } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

interface TextEditorProps {
  content: string;
  setContent: (content: string) => void;
  showImageAndLink?: boolean;
  customModules?: any;
  customFormats?: string[];
}

const MAX_IMAGE_SIZE_MB = 1; // 1MB 이미지 크기 제한

const TextEditor: React.FC<TextEditorProps> = ({
  content,
  setContent,
  showImageAndLink = true,
  customModules,
  customFormats,
}) => {
  const quillRef = useRef<ReactQuill>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // HTML 내용이 변경될 때 Delta로 변환하여 에디터에 설정
  useEffect(() => {
    if (quillRef.current && content) {
      const editor = quillRef.current.getEditor();
      const delta = editor.clipboard.convert(content);
      editor.setContents(delta, "silent");
    }
  }, [content]);

  // 에디터 내용이 변경될 때 HTML로 변환하여 상위 컴포넌트에 전달
  const handleChange = (content: string, delta: any, source: string, editor: any) => {
    if (source === "user") {
      const html = editor.root.innerHTML;
      setContent(html);
    }
  };

  // 에디터에 이미지 삽입
  const insertToEditor = useCallback((url: string) => {
    try {
      const editor = quillRef.current?.getEditor();
      if (editor) {
        const range = editor.getSelection() || { index: 0, length: 0 };
        editor.insertEmbed(range.index, "image", url);
        editor.setSelection(range.index + 1, 0);
      }
    } catch (error) {
      console.error("이미지 삽입 오류:", error);
    }
  }, []);

  // 이미지를 Base64로 변환하여 에디터에 삽입
  const insertBase64Image = useCallback(
    (file: File) => {
      try {
        // 이미지 크기 체크
        if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
          alert(`이미지 크기는 ${MAX_IMAGE_SIZE_MB}MB 이하여야 합니다.`);
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          try {
            const base64Image = reader.result as string;
            insertToEditor(base64Image);
          } catch (e) {
            console.error("이미지 변환 오류:", e);
          }
        };
        reader.onerror = () => {
          console.error("파일 읽기 오류");
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error("이미지 처리 오류:", error);
      }
    },
    [insertToEditor]
  );

  // 이미지 핸들러 함수
  const imageHandler = useCallback(() => {
    try {
      const input = document.createElement("input");
      input.setAttribute("type", "file");
      input.setAttribute("accept", "image/*");

      input.onchange = (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files[0]) {
          insertBase64Image(target.files[0]);
        }
      };

      input.click();
    } catch (error) {
      console.error("이미지 선택 오류:", error);
    }
  }, [insertBase64Image]);

  // 드래그 앤 드롭 이벤트 핸들러
  const handleDrop = useCallback(
    (e: Event) => {
      try {
        e.preventDefault();
        const dragEvent = e as DragEvent;
        if (dragEvent.dataTransfer?.files && dragEvent.dataTransfer.files.length > 0) {
          const file = dragEvent.dataTransfer.files[0];
          if (file.type.match(/^image\//)) {
            insertBase64Image(file);
          }
        }
      } catch (error) {
        console.error("드래그 앤 드롭 오류:", error);
      }
    },
    [insertBase64Image]
  );

  const handleDragOver = useCallback((e: Event) => {
    e.preventDefault();
  }, []);

  // 드래그 앤 드롭 이벤트 처리
  useEffect(() => {
    try {
      if (!editorRef.current) return;

      const dropHandler = handleDrop as unknown as EventListener;
      const dragOverHandler = handleDragOver as unknown as EventListener;

      editorRef.current.addEventListener("drop", dropHandler);
      editorRef.current.addEventListener("dragover", dragOverHandler);

      return () => {
        if (editorRef.current) {
          editorRef.current.removeEventListener("drop", dropHandler);
          editorRef.current.removeEventListener("dragover", dragOverHandler);
        }
      };
    } catch (error) {
      console.error("이벤트 리스너 설정 오류:", error);
    }
  }, [handleDrop, handleDragOver]);

  // 붙여넣기 이벤트 처리 - MutationObserver 사용
  useEffect(() => {
    try {
      const editor = quillRef.current?.getEditor();
      if (!editor) return;

      const handlePaste = (e: Event) => {
        try {
          const pasteEvent = e as ClipboardEvent;
          const clipboardData = pasteEvent.clipboardData;
          if (!clipboardData) return;

          let imageFound = false;

          for (let i = 0; i < clipboardData.items.length; i++) {
            const item = clipboardData.items[i];
            if (item.type.match(/^image\//)) {
              const file = item.getAsFile();
              if (file) {
                e.preventDefault();
                insertBase64Image(file);
                imageFound = true;
                break;
              }
            }
          }

          if (imageFound) {
            e.preventDefault();
          }
        } catch (error) {
          console.error("붙여넣기 처리 오류:", error);
        }
      };

      // DOMNodeInserted 대신 MutationObserver 사용
      const setupMutationObserver = () => {
        if (!editor.root) return;

        // 이미지 변경 감지를 위한 MutationObserver 설정
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
              mutation.addedNodes.forEach((node) => {
                if (node instanceof HTMLImageElement) {
                  // 새로 추가된 이미지에 대한 처리
                  node.addEventListener("error", () => {
                    console.warn("이미지 로드 오류:", node.src);
                  });
                }
              });
            }
          });
        });

        // 옵저버 시작
        observer.observe(editor.root, {
          childList: true,
          subtree: true,
        });

        return observer;
      };

      const observer = setupMutationObserver();
      const pasteHandler = handlePaste as unknown as EventListener;
      editor.root.addEventListener("paste", pasteHandler);

      return () => {
        editor.root.removeEventListener("paste", pasteHandler);
        if (observer) {
          observer.disconnect();
        }
      };
    } catch (error) {
      console.error("붙여넣기 이벤트 설정 오류:", error);
    }
  }, [insertBase64Image]);

  // 기본 툴바 옵션
  const defaultModules = {
    toolbar: {
      container: [
        [{ header: [1, 2, false] }],
        ["bold", "italic", "underline", "strike", "blockquote"],
        [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
        [{ align: "" }, { align: "center" }, { align: "right" }, { align: "justify" }],
        ["link", "image"],
      ],
      handlers: {
        image: imageHandler,
      },
    },
  };

  // 커스텀 모듈이 제공된 경우 이를 사용, 그렇지 않으면 기본 모듈 사용
  const modules = customModules || defaultModules;

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "blockquote",
    "list",
    "bullet",
    "indent",
    "align",
    "link",
    "image",
  ];

  // 커스텀 formats가 제공된 경우 이를 사용, 그렇지 않으면 기본 형식 사용
  const currentFormats = customFormats || formats;

  return (
    <div ref={editorRef}>
      <ReactQuill
        ref={quillRef}
        value={content}
        onChange={handleChange}
        modules={{
          toolbar: showImageAndLink
            ? [
                [{ header: [1, 2, 3, false] }],
                ["bold", "italic", "underline", "strike"],
                [{ list: "ordered" }, { list: "bullet" }],
                [{ align: [] }],
                ["link", "image"],
                ["clean"],
              ]
            : [
                [{ header: [1, 2, 3, false] }],
                ["bold", "italic", "underline", "strike"],
                [{ list: "ordered" }, { list: "bullet" }],
                [{ align: [] }],
                ["clean"],
              ],
          ...modules,
        }}
        formats={[
          "header",
          "bold",
          "italic",
          "underline",
          "strike",
          "blockquote",
          "list",
          "bullet",
          "indent",
          "link",
          "image",
          "align",
          "color",
          "background",
          "font",
          "size",
          ...currentFormats,
        ]}
        placeholder=""
      />
      <style>
        {`
          .ql-editor.ql-blank::before {
            content: "내용을 입력해주세요.";
            color: #999;
            font-style: normal;
          }
          .ql-editor:focus::before {
            content: none;
          }
        `}
      </style>
    </div>
  );
};

export default TextEditor;
