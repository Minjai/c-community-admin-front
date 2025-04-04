import React, { useRef, useEffect, useCallback } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

// React의 findDOMNode 경고 억제
// eslint-disable-next-line @typescript-eslint/no-empty-function
const originalConsoleError = console.error;
console.error = function (message: any, ...args: any[]) {
  if (
    typeof message === "string" &&
    (message.includes("findDOMNode is deprecated") ||
      message.includes("DOMNodeInserted") ||
      message.includes("mutation event"))
  ) {
    return;
  }
  originalConsoleError(message, ...args);
};

interface TextEditorProps {
  content: string;
  setContent: (content: string) => void;
  showImageAndLink?: boolean;
  customModules?: any;
  customFormats?: string[];
  height?: string;
}

const MAX_IMAGE_SIZE_MB = 10; // GIF 파일은 크기가 클 수 있으므로 최대 크기 증가
const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

// 에러 바운더리 클래스
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 개발 중에만 에러 로깅
    if (process.env.NODE_ENV === "development") {
      console.log(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return <div className="border p-4">에디터 로딩 중 오류가 발생했습니다.</div>;
    }

    return this.props.children;
  }
}

const TextEditor: React.FC<TextEditorProps> = ({
  content,
  setContent,
  showImageAndLink = true,
  customModules,
  customFormats,
  height = "400px",
}) => {
  const quillRef = useRef<ReactQuill>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // 에디터 초기화 및 방향 설정
  useEffect(() => {
    if (quillRef.current) {
      try {
        const editor = quillRef.current.getEditor();
        // LTR(Left-to-Right) 방향 설정
        editor.root.setAttribute("dir", "ltr");

        // 기존 내용이 있으면 설정
        if (content) {
          const delta = editor.clipboard.convert(content);
          editor.setContents(delta, "silent");
        }
      } catch (error) {
        // 오류 발생 시 조용히 처리
      }
    }
  }, []);

  // 내용 변경시 에디터 업데이트 (초기 로딩 이후에만 실행)
  useEffect(() => {
    if (quillRef.current && content) {
      try {
        const editor = quillRef.current.getEditor();
        const currentContent = editor.root.innerHTML;

        // 현재 에디터 내용과 props로 받은 content가 다를 경우만 업데이트
        if (currentContent !== content) {
          const delta = editor.clipboard.convert(content);
          editor.setContents(delta, "silent");
        }
      } catch (error) {
        // 오류 발생 시 조용히 처리
      }
    }
  }, [content]);

  // 에디터 내용이 변경될 때 HTML로 변환하여 상위 컴포넌트에 전달
  const handleChange = (value: string, delta: any, source: string, editor: any) => {
    try {
      if (source === "user") {
        const hasText = editor && editor.getText && editor.getText().trim().length > 0;
        let html = "";

        if (hasText && editor && editor.getHTML) {
          html = editor.getHTML();
        } else if (hasText && editor && editor.root) {
          html = editor.root.innerHTML;
        } else if (value && typeof value === "string") {
          html = value;
        }

        if (html) {
          setContent(html);
        }
      }
    } catch (error) {
      // 오류가 발생해도 value를 직접 사용하여 내용 유지 시도
      if (value && typeof value === "string") {
        setContent(value);
      }
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
      // 오류 발생 시 조용히 처리
    }
  }, []);

  // 파일 확장자 확인 (MIME 타입이 없는 경우를 위한 백업 확인)
  const isValidImageExtension = (filename: string): boolean => {
    const ext = filename.split(".").pop()?.toLowerCase();
    return (
      ext === "jpg" ||
      ext === "jpeg" ||
      ext === "png" ||
      ext === "gif" ||
      ext === "webp" ||
      ext === "svg"
    );
  };

  // 이미지를 Base64로 변환하여 에디터에 삽입
  const insertBase64Image = useCallback(
    (file: File) => {
      try {
        // 파일 정보 출력
        console.log("처리 중인 이미지:", {
          name: file.name,
          type: file.type,
          size: file.size,
        });

        // MIME 타입이 없으면 확장자로 확인
        const isValidMime = SUPPORTED_IMAGE_TYPES.includes(file.type);
        const isValidExt = isValidImageExtension(file.name);

        if (!isValidMime && !isValidExt) {
          alert(`지원하지 않는 이미지 형식입니다. 지원 형식: JPG, PNG, GIF, WebP, SVG`);
          return;
        }

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
            alert("이미지 변환 중 오류가 발생했습니다.");
          }
        };
        reader.onerror = () => {
          alert("파일을 읽는 중 오류가 발생했습니다.");
        };
        reader.readAsDataURL(file);
      } catch (error) {
        alert("이미지 처리 중 오류가 발생했습니다.");
      }
    },
    [insertToEditor]
  );

  // 이미지 핸들러 함수
  const imageHandler = useCallback(() => {
    try {
      const input = document.createElement("input");
      input.setAttribute("type", "file");
      // accept에 .gif 명시적 추가
      input.setAttribute(
        "accept",
        "image/jpeg, image/png, image/gif, image/webp, image/svg+xml, .jpg, .jpeg, .png, .gif, .webp, .svg"
      );

      input.onchange = (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files[0]) {
          const file = target.files[0];
          // 파일 정보 출력
          console.log("선택된 이미지:", {
            name: file.name,
            type: file.type,
            size: file.size,
          });
          insertBase64Image(file);
        }
      };

      input.click();
    } catch (error) {
      // 오류 발생 시 조용히 처리
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
          // 파일 정보 출력
          console.log("드롭된 이미지:", {
            name: file.name,
            type: file.type,
            size: file.size,
          });

          // MIME 타입이 없으면 확장자로 확인
          const isValidMime = SUPPORTED_IMAGE_TYPES.includes(file.type);
          const isValidExt = isValidImageExtension(file.name);

          if (isValidMime || isValidExt) {
            insertBase64Image(file);
          } else {
            alert(`지원하지 않는 이미지 형식입니다. 지원 형식: JPG, PNG, GIF, WebP, SVG`);
          }
        }
      } catch (error) {
        // 오류 발생 시 조용히 처리
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
      // 오류 발생 시 조용히 처리
    }
  }, [handleDrop, handleDragOver]);

  // 붙여넣기 이벤트 처리
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
                // 파일 정보 출력
                console.log("붙여넣기 이미지:", {
                  name: file.name,
                  type: file.type,
                  size: file.size,
                });
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
          // 오류 발생 시 조용히 처리
        }
      };

      // MutationObserver 설정
      const setupMutationObserver = () => {
        if (!editor.root) return;

        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
              mutation.addedNodes.forEach((node) => {
                if (node instanceof HTMLImageElement) {
                  node.addEventListener("error", () => {
                    // 이미지 로드 오류 시 조용히 처리
                  });
                }
              });
            }
          });
        });

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
      // 오류 발생 시 조용히 처리
    }
  }, [insertBase64Image]);

  return (
    <div ref={editorRef}>
      <ErrorBoundary>
        <ReactQuill
          ref={quillRef}
          value={content || ""}
          onChange={handleChange}
          modules={{
            toolbar: {
              container: showImageAndLink
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
              handlers: {
                image: imageHandler,
              },
            },
            clipboard: {
              matchVisual: false, // 텍스트 방향 문제 해결에 도움이 될 수 있음
            },
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
          ]}
          placeholder="내용을 입력해주세요."
        />
      </ErrorBoundary>
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
          .ql-editor {
            min-height: ${height};
            max-height: ${height};
            overflow-y: auto;
            direction: ltr; /* 명시적으로 왼쪽에서 오른쪽으로 텍스트 방향 설정 */
            text-align: left;
          }
        `}
      </style>
    </div>
  );
};

export default TextEditor;
