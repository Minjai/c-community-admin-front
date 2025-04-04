import React, { useRef, useEffect, useCallback } from "react";
import ReactQuill, { Quill } from "react-quill";
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

const MAX_IMAGE_SIZE_MB = 20; // 이미지 크기 제한 20MB
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

// YouTube 비디오 블롯 정의 및 등록
// Quill을 외부에서 가져와서 한 번만 등록
const BlockEmbed = Quill.import("blots/block/embed");

class VideoBlot extends BlockEmbed {
  static create(value: string) {
    const node = super.create();
    // YouTube 비디오 ID를 추출하여 iframe으로 삽입
    node.setAttribute("frameborder", "0");
    node.setAttribute("allowfullscreen", true);
    node.setAttribute("src", this.transformVideoUrl(value));
    return node;
  }

  static value(node: HTMLElement) {
    return node.getAttribute("src");
  }

  // YouTube 비디오 URL을 임베드 URL로 변환
  static transformVideoUrl(url: string) {
    // YouTube URL 패턴 지원 (여러 형태의 URL 처리)
    let videoId = "";
    if (url.includes("youtube.com/watch?v=")) {
      videoId = url.split("v=")[1];
      const ampersandPosition = videoId.indexOf("&");
      if (ampersandPosition !== -1) {
        videoId = videoId.substring(0, ampersandPosition);
      }
    } else if (url.includes("youtube.com/embed/")) {
      videoId = url.split("embed/")[1];
    } else if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1];
    } else {
      // 직접 비디오 ID를 입력한 경우 또는 URL이 인식되지 않는 경우
      videoId = url;
    }

    // 임베드 URL 생성
    return `https://www.youtube.com/embed/${videoId}?showinfo=0`;
  }
}

VideoBlot.blotName = "video";
VideoBlot.tagName = "iframe";
VideoBlot.className = "ql-video";

// 글로벌 등록은 한 번만 수행
Quill.register(VideoBlot, true);

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
        if (editor && editor.getHTML) {
          const html = editor.getHTML();
          setContent(html);
        } else if (editor && editor.root) {
          const html = editor.root.innerHTML;
          setContent(html);
        } else if (value && typeof value === "string") {
          setContent(value);
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

  // YouTube 비디오 삽입 핸들러
  const videoHandler = useCallback(() => {
    try {
      const editor = quillRef.current?.getEditor();
      if (!editor) return;

      const url = prompt("YouTube 동영상 URL을 입력하세요:");
      if (!url) return;

      // 현재 선택 위치에 비디오 삽입
      const range = editor.getSelection() || { index: 0, length: 0 };
      editor.insertEmbed(range.index, "video", url);
      editor.setSelection(range.index + 1, 0);
    } catch (error) {
      console.error("비디오 삽입 중 오류:", error);
      alert("동영상 삽입 중 오류가 발생했습니다.");
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
        // 파일 정보 출력 (디버깅용 상세 정보)
        console.log("처리 중인 이미지 상세 정보:", {
          name: file.name,
          type: file.type,
          size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
          lastModified: new Date(file.lastModified).toISOString(),
        });

        // MIME 타입이 없으면 확장자로 확인
        const isValidMime = SUPPORTED_IMAGE_TYPES.includes(file.type);
        const isValidExt = isValidImageExtension(file.name);

        console.log("이미지 유효성 검증:", {
          isValidMime,
          isValidExt,
          acceptedType: isValidMime
            ? file.type
            : isValidExt
            ? `확장자: ${file.name.split(".").pop()}`
            : "지원되지 않음",
        });

        if (!isValidMime && !isValidExt) {
          alert(`지원하지 않는 이미지 형식입니다. 지원 형식: JPG, PNG, GIF, WebP, SVG`);
          return;
        }

        // GIF 파일 특별 처리 (디버깅용)
        if (file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif")) {
          console.log("GIF 파일 감지됨:", file.name);
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
            console.log("이미지 변환 성공:", {
              sizeKB: Math.round(base64Image.length / 1024),
              preview: base64Image.substring(0, 50) + "...", // 데이터 일부만 표시
            });
            insertToEditor(base64Image);
          } catch (e) {
            console.error("이미지 변환 오류:", e);
            alert("이미지 변환 중 오류가 발생했습니다.");
          }
        };
        reader.onerror = (error) => {
          console.error("FileReader 오류:", error);
          alert("파일을 읽는 중 오류가 발생했습니다.");
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error("이미지 처리 오류:", error);
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

  // 에디터가 마운트된 후 컨테이너에 클릭 이벤트 추가
  useEffect(() => {
    const container = editorRef.current;
    if (!container) return;

    const handleContainerClick = (e: MouseEvent) => {
      try {
        // 여백 클릭 시 에디터에 포커스
        const editorElement = quillRef.current?.getEditor().root;
        if (!editorElement) return;

        // 클릭한 요소가 에디터 자체가 아닌 경우만 포커스 설정
        const target = e.target as Node;
        if (container.contains(target) && !editorElement.contains(target)) {
          editorElement.focus();
        }
      } catch (error) {
        // 오류 발생 시 조용히 처리
      }
    };

    container.addEventListener("click", handleContainerClick as EventListener);

    return () => {
      container.removeEventListener("click", handleContainerClick as EventListener);
    };
  }, []);

  return (
    <div ref={editorRef} className="quill-editor-container">
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
                    ["link", "image", "video"],
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
                video: videoHandler,
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
            "video",
          ]}
        />
      </ErrorBoundary>
      <style>
        {`
          .quill-editor-container {
            border-radius: 0.375rem;
            overflow: hidden;
          }
          .ql-toolbar.ql-snow {
            border-top-left-radius: 0.375rem;
            border-top-right-radius: 0.375rem;
            background-color: #f9fafb;
          }
          .ql-container.ql-snow {
            border-bottom-left-radius: 0.375rem;
            border-bottom-right-radius: 0.375rem;
            background-color: #ffffff;
          }
          .ql-editor {
            min-height: ${height};
            max-height: ${height};
            overflow-y: auto;
            direction: ltr; /* 명시적으로 왼쪽에서 오른쪽으로 텍스트 방향 설정 */
            text-align: left;
            background-color: #ffffff;
            cursor: text;
          }
          .ql-editor.ql-blank::before {
            content: "";
            left: 0;
            right: 0;
            color: transparent;
            pointer-events: none;
          }
          .ql-editor:focus {
            outline: none;
          }
          .ql-video {
            display: block;
            width: 100%;
            height: 315px;
            margin: 10px 0;
          }
        `}
      </style>
    </div>
  );
};

export default TextEditor;
