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
  onChange?: (content: string) => void;
  onFocus?: () => void;
}

const MAX_IMAGE_SIZE_MB = 20; // 이미지 크기 제한 20MB
const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

// 이미지 크기 제한 설정
const MAX_GIF_SIZE_MB = 8; // GIF 이미지 크기 제한
const WARN_IMAGE_SIZE_MB = 5; // 경고 표시 시작 크기 (5MB)

// GIF 이미지 최적화 함수 (추후 확장 가능)
const optimizeGifImage = async (file: File): Promise<File> => {
  // 파일 크기 확인
  const sizeInMB = file.size / (1024 * 1024);

  if (sizeInMB <= MAX_GIF_SIZE_MB) {
    return file;
  }

  // 여기서는 간단히 경고만 표시하고 원본 반환 (실제 최적화 로직은 추가 라이브러리 필요)
  alert(
    `대용량 GIF 이미지 (${sizeInMB.toFixed(
      2
    )}MB)가 감지되었습니다. 업로드 시 문제가 발생할 수 있습니다. 가능하면 크기가 작은 이미지를 사용해주세요.`
  );

  return file;
};

// 이미지 크기 확인 및 경고 함수
const checkImageSize = (file: File): boolean => {
  const sizeInMB = file.size / (1024 * 1024);

  if (sizeInMB > MAX_IMAGE_SIZE_MB) {
    alert(
      `이미지 크기(${sizeInMB.toFixed(2)}MB)가 최대 허용 크기(${MAX_IMAGE_SIZE_MB}MB)를 초과합니다.`
    );
    return false;
  }

  return true;
};

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
      // 로깅 제거
    }
  }

  render() {
    if (this.state.hasError) {
      return <div className="border p-4">에디터 로딩 중 오류가 발생했습니다.</div>;
    }

    return this.props.children;
  }
}

// 범용 임베드 블롯 정의 (iframe 사용)
const BlockEmbed = Quill.import("blots/block/embed");

class EmbedBlot extends BlockEmbed {
  static blotName = "embed";
  static tagName = "iframe"; // Reverted to iframe
  static className = "ql-embed"; // Reverted to ql-embed

  static create(url: string) {
    // Reverted to accept only url string
    const node = super.create(url);
    // Basic attributes - allow Quill/browser to handle the rest if pasted
    node.setAttribute("src", this.sanitizeUrl(url)); // Use sanitizeUrl again
    node.setAttribute("frameborder", "0");
    node.setAttribute("allowfullscreen", "true");
    // Add common allow policy
    node.setAttribute("allow", "autoplay; fullscreen; picture-in-picture; clipboard-write");
    return node;
  }

  static value(node: HTMLElement): string | undefined {
    return node.getAttribute("src") || undefined;
  }

  // Re-introduce sanitizeUrl
  static sanitizeUrl(url: string): string {
    if (!url || typeof url !== "string") return "";
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      if (!url.startsWith("mailto:") && !url.startsWith("tel:") && !url.startsWith("data:")) {
        if (url.includes(".")) {
          return `https://${url}`;
        }
        return "";
      }
    }
    return url;
  }
}

// 커스텀 Link Blot 정의
const Link = Quill.import("formats/link");

class CustomLink extends Link {
  static create(value: string) {
    const node = super.create(value);
    value = this.sanitize(value);
    node.setAttribute("href", value);
    // target="_blank" 및 보안 속성 추가 (선택 사항)
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
    return node;
  }

  static sanitize(url: string): string {
    // 기본 Link sanitize 호출 (XSS 방지 등)
    let sanitizedUrl = super.sanitize(url);
    // 프로토콜 추가
    if (
      sanitizedUrl &&
      !sanitizedUrl.startsWith("http://") &&
      !sanitizedUrl.startsWith("https://")
    ) {
      // mailto:, tel: 등 다른 프로토콜은 그대로 둠
      if (!sanitizedUrl.startsWith("mailto:") && !sanitizedUrl.startsWith("tel:")) {
        sanitizedUrl = `https://${sanitizedUrl}`;
      }
    }
    return sanitizedUrl;
  }
}

// 지원 플랫폼별 정규식 패턴
const YOUTUBE_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/; // watch, embed, v, short
const VIMEO_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/;
const INSTAGRAM_REGEX = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel)\/([a-zA-Z0-9_-]+)/;
const TIKTOK_REGEX = /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@(?:[\w.-]+)\/video\/(\d+)/;
const TWITTER_REGEX =
  /(?:https?:\/\/)?(?:www\.|mobile\.)?twitter\.com\/(?:#\!\/)?(\w+)\/status(es)?\/(\d+)/;

// URL을 임베드 URL로 변환하는 함수
function transformUrlToEmbed(url: string): string | null {
  let match;

  // YouTube
  match = url.match(YOUTUBE_REGEX);
  if (match && match[1]) {
    if (url.includes("/embed/")) return url.split("?")[0];
    return `https://www.youtube.com/embed/${match[1]}`;
  }

  // Vimeo
  match = url.match(VIMEO_REGEX);
  if (match && match[1]) {
    if (url.includes("player.vimeo.com/video/")) return url.split("?")[0];
    return `https://player.vimeo.com/video/${match[1]}`;
  }

  // TikTok - Re-enable iframe transformation attempt
  match = url.match(TIKTOK_REGEX);
  if (match && match[1]) {
    const videoId = match[1];
    return `https://www.tiktok.com/embed/v2/${videoId}`; // Re-enabled
  }

  // Instagram/Twitter links are handled separately via blockquote paste

  // 지원하지 않는 URL
  return null;
}

// 글로벌 등록은 한 번만 수행
try {
  Quill.register(EmbedBlot, true); // 새로운 EmbedBlot 등록
  Quill.register(CustomLink, true);
} catch (error) {
  // 이미 등록된 경우 무시
}

// 파일 정보 출력 함수
const logFileInfo = (file: File, prefix: string = ""): void => {
  const sizeInMB = file.size / (1024 * 1024);
  // 로깅 제거
};

// 이미지 유형 확인 함수
const isImageTypeSupported = (file: File): boolean => {
  const isValidMime = SUPPORTED_IMAGE_TYPES.includes(file.type);
  const isValidExt = isValidImageExtension(file.name);

  if (!isValidMime && !isValidExt) {
    alert(`지원하지 않는 이미지 형식입니다. 지원 형식: JPG, PNG, GIF, WebP, SVG`);
    return false;
  }

  return true;
};

// 파일 확장자 확인 함수
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

// MutationObserver 설정
const setupMutationObserver = (editorRoot: HTMLElement) => {
  if (!editorRoot) return null;

  // 대신 MutationObserver의 childList와 subtree 옵션만 사용
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

  observer.observe(editorRoot, {
    childList: true,
    subtree: true,
  });

  return observer;
};

// URL인지 확인하는 함수
const isValidURL = (str: string): boolean => {
  try {
    new URL(str);
    return true;
  } catch {
    // 단순 URL 패턴 매칭 추가 (http/https 필수 아님)
    return (
      str.match(
        /^((https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?|([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?)$/i
      ) !== null
    );
  }
};

// 에디터 초기화 함수 수정
const initQuill = async (
  quillRef: React.RefObject<ReactQuill>,
  content: string,
  prevContentRef: React.MutableRefObject<string>,
  onFocus?: () => void,
  initializedRef?: React.MutableRefObject<boolean>
) => {
  try {
    // 에디터가 아직 초기화되지 않았을 때만 초기화
    if (!quillRef.current) return;

    // 초기 콘텐츠 설정
    const editor = quillRef.current.getEditor();

    // 초기 콘텐츠가 있는 경우에만 설정
    if (content) {
      try {
        // HTML 문자열 정리 및 정규화
        const normalizedContent = content === "<p><br></p>" ? "" : content;
        // silent 모드로 내용 설정 (이벤트 발생 방지)
        editor.clipboard.dangerouslyPasteHTML(normalizedContent, "silent");
        prevContentRef.current = normalizedContent;
      } catch (err) {
        // 로깅 제거
      }
    }

    // 에디터 포커스 시 onFocus 호출
    editor.root.addEventListener("focus", () => {
      onFocus && onFocus();
    });

    // 이미지 처리를 위한 Quill 이벤트 핸들러
    editor.getModule("toolbar").addHandler("image", () => {
      // 파일 선택 모달 열기
      const input = document.createElement("input");
      input.setAttribute("type", "file");
      input.setAttribute("accept", "image/*");
      input.click();

      // 파일 선택 시 처리
      input.onchange = async () => {
        if (!input.files || input.files.length === 0) return;

        const file = input.files[0];

        try {
          // 파일 크기 검증 (5MB 제한)
          if (file.size > 5 * 1024 * 1024) {
            alert("파일 크기는 5MB 이하여야 합니다.");
            return;
          }

          // 로컬에서 이미지 미리보기를 위한 base64 변환
          const reader = new FileReader();
          reader.onload = (e) => {
            const range = editor.getSelection(true);
            if (range) {
              editor.insertEmbed(range.index, "image", e.target?.result);
              editor.setSelection(range.index + 1, 0);
            }
          };
          reader.readAsDataURL(file);
        } catch (error) {
          alert("이미지 업로드 중 오류가 발생했습니다.");
        }
      };
    });

    // 초기화 완료 표시
    if (initializedRef) {
      initializedRef.current = true;
    }
  } catch (error) {
    // 로깅 제거
  }
};

const TextEditor: React.FC<TextEditorProps> = ({
  content,
  setContent,
  showImageAndLink = true,
  customModules,
  customFormats,
  height = "200px",
  onChange,
  onFocus,
}) => {
  // Log the received content prop
  // console.log("TextEditor received content prop:", content);

  const quillRef = useRef<ReactQuill>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef<boolean>(false);
  const prevContentRef = useRef<string>(content || "");
  const internalChangeRef = useRef<boolean>(false);
  const quillInstanceRef = useRef<Quill | null>(null);

  // 에디터 초기화 useEffect
  useEffect(() => {
    if (initializedRef.current) return;

    const initQuill = async () => {
      try {
        // 에디터가 아직 초기화되지 않았을 때만 초기화
        if (!quillRef.current) return;

        // 초기 콘텐츠 설정
        const editor = quillRef.current.getEditor();

        // 초기 콘텐츠가 있는 경우에만 설정
        if (content) {
          try {
            // HTML 문자열 정리 및 정규화
            const normalizedContent = content === "<p><br></p>" ? "" : content;
            // silent 모드로 내용 설정 (이벤트 발생 방지)
            editor.clipboard.dangerouslyPasteHTML(normalizedContent, "silent");
            prevContentRef.current = normalizedContent;
          } catch (err) {
            // 로깅 제거
          }
        }

        // 에디터 포커스 시 onFocus 호출
        editor.root.addEventListener("focus", () => {
          onFocus && onFocus();
        });

        // 이미지 처리를 위한 Quill 이벤트 핸들러
        editor.getModule("toolbar").addHandler("image", () => {
          // 파일 선택 모달 열기
          const input = document.createElement("input");
          input.setAttribute("type", "file");
          input.setAttribute("accept", "image/*");
          input.click();

          // 파일 선택 시 처리
          input.onchange = async () => {
            if (!input.files || input.files.length === 0) return;

            const file = input.files[0];

            try {
              // 파일 크기 검증 (5MB 제한)
              if (file.size > 5 * 1024 * 1024) {
                alert("파일 크기는 5MB 이하여야 합니다.");
                return;
              }

              // 로컬에서 이미지 미리보기를 위한 base64 변환
              const reader = new FileReader();
              reader.onload = (e) => {
                const range = editor.getSelection(true);
                if (range) {
                  editor.insertEmbed(range.index, "image", e.target?.result);
                  editor.setSelection(range.index + 1, 0);
                }
              };
              reader.readAsDataURL(file);
            } catch (error) {
              alert("이미지 업로드 중 오류가 발생했습니다.");
            }
          };
        });

        // 초기화 완료 표시
        initializedRef.current = true;
      } catch (error) {
        // 로깅 제거
      }
    };

    // 초기화 실행
    initQuill();

    // 컴포넌트 언마운트 시 초기화 상태 리셋
    return () => {
      initializedRef.current = false;
      prevContentRef.current = "";
    };
  }, []);

  // 초기화 및 업데이트 함수
  useEffect(() => {
    if (!initializedRef.current) return;

    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const quillInstance = quillRef.current.getEditor(); // quill 인스턴스 가져오기

      // 외부에서 content가 변경되었고, 내부 변경이 아닌 경우에만 적용
      if (content !== prevContentRef.current && !internalChangeRef.current) {
        prevContentRef.current = content;

        // Always attempt to convert the incoming HTML string to Delta format
        try {
          // Always attempt to convert the incoming HTML string to Delta format
          const delta = quillInstance.clipboard.convert(content);
          // Set the editor contents using the Delta object, 'silent' prevents triggering 'text-change'
          quillInstance.setContents(delta, "silent");
        } catch (error) {
          console.error("Error setting Quill content in TextEditor:", error);
          // Optional: Set fallback text or handle the error appropriately
          // quillInstance.setText('Error loading content.');
        }
      }

      // 내부 변경 플래그 초기화
      internalChangeRef.current = false;
    }
  }, [content]); // Rerun only when content prop changes

  // 에디터 변경 핸들러
  const handleChange = useCallback(
    (value: string) => {
      if (!initializedRef.current) return;

      // 내부 변경 플래그 설정
      internalChangeRef.current = true;

      // 비동기로 상태 업데이트 (에디터가 사라지는 문제 방지)
      setTimeout(() => {
        prevContentRef.current = value;
        setContent(value);
        if (onChange) onChange(value);
      }, 0);
    },
    [setContent, onChange]
  );

  // 포커스 핸들러
  const handleFocus = useCallback(() => {
    // 에디터 포커스 시 onFocus 호출
    if (onFocus) {
      onFocus();
    }
  }, [onFocus]);

  // 에디터에 이미지 삽입
  const insertToEditor = useCallback(
    (url: string) => {
      try {
        const editor = quillRef.current?.getEditor();
        if (editor) {
          const range = editor.getSelection() || { index: 0, length: 0 };

          // 이미지 삽입 시도
          editor.insertEmbed(range.index, "image", url);

          // 삽입 후 DOM 확인
          setTimeout(() => {
            const updatedContent = editor.root.innerHTML;

            // 내용 업데이트를 부모 컴포넌트에 알림
            setContent(updatedContent);
          }, 10);

          editor.setSelection(range.index + 1, 0);
        }
      } catch (error) {
        // 로깅 제거
      }
    },
    [setContent]
  );

  // 범용 URL 임베드 처리 함수 (툴바용) - 변환 로직 추가
  const embedHandler = useCallback(() => {
    try {
      if (!quillRef.current || !initializedRef.current) {
        return;
      }

      const editor = quillRef.current.getEditor();
      const range = editor.getSelection(true);

      if (range !== null) {
        const inputUrl = prompt("임베드할 비디오 URL을 입력하세요:");

        if (inputUrl) {
          // URL 변환 시도
          const embedUrl = transformUrlToEmbed(inputUrl);

          if (embedUrl) {
            // 변환 성공 시 (YouTube, Vimeo)
            // 범용 임베드 삽입
            editor.insertEmbed(range.index, "embed", embedUrl, "user");
            editor.setSelection(range.index + 1, 0, "user");
            editor.focus();
          } else {
            // 변환 실패 시 (Instagram, TikTok, 기타)
            // 단순 링크로 삽입하거나 사용자에게 알림
            // alert("지원하지 않는 URL 형식이거나 임베드가 제한된 사이트입니다. 링크로 삽입합니다.");
            // editor.insertText(range.index, inputUrl, { link: inputUrl }, "user");
            // editor.setSelection(range.index + inputUrl.length, 0, "user");
            alert("입력된 URL은 현재 자동 임베드를 지원하지 않습니다.");
          }
        } // inputUrl 이 null 이 아닌 경우
      } else {
        alert("임베드할 위치를 에디터 내에서 클릭해주세요.");
        editor.focus();
      }
    } catch (err) {
      // 로깅 제거
    }
  }, []);

  // 이미지를 Base64로 변환하여 에디터에 삽입
  const insertBase64Image = useCallback(
    async (file: File) => {
      try {
        // MIME 타입이 없으면 확장자로 확인
        const isValidMime = SUPPORTED_IMAGE_TYPES.includes(file.type);
        const isValidExt = isValidImageExtension(file.name);

        if (!isValidMime && !isValidExt) {
          alert(`지원하지 않는 이미지 형식입니다. 지원 형식: JPG, PNG, GIF, WebP, SVG`);
          return;
        }

        // GIF 파일 특별 처리
        if (file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif")) {
          // GIF 파일 최적화 시도
          try {
            const optimizedFile = await optimizeGifImage(file);
            file = optimizedFile; // 최적화된 파일로 교체
          } catch (error) {
            // 최적화 실패 시 원본 유지하고 계속 진행
          }
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
        reader.onerror = (error) => {
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
      if (!quillRef.current) return;

      // 파일 선택 인풋 생성 및 트리거
      const input = document.createElement("input");
      input.setAttribute("type", "file");
      input.setAttribute("accept", "image/*");
      input.click();

      // 파일 선택 이벤트 핸들러
      input.onchange = async () => {
        if (!input.files || !input.files[0]) return;
        const file = input.files[0];

        // 파일 유형 및 크기 검증
        if (!isImageTypeSupported(file) || !checkImageSize(file)) {
          return;
        }

        // GIF 파일 특별 처리 (필요시)
        let processedFile = file;
        if (file.type === "image/gif") {
          processedFile = await optimizeGifImage(file);
        }

        // 에디터 참조 유효성 검사
        const editor = quillRef.current?.getEditor();
        if (!editor) {
          return;
        }

        // 현재 커서 위치 가져오기
        const range = editor.getSelection();
        if (!range) {
          // 경고 제거
        }

        // 이미지 FileReader 처리
        const reader = new FileReader();
        reader.onload = (e) => {
          // 임시 이미지 URL 생성
          const imageDataUrl = e.target?.result as string;

          // 이미지 삽입 및 커서 위치 조정
          editor.insertEmbed(range ? range.index : 0, "image", imageDataUrl);
          editor.setSelection((range ? range.index : 0) + 1, 0);
        };

        // 파일 처리 시작
        reader.readAsDataURL(processedFile);
      };
    } catch (error) {
      // 로깅 제거
    }
  }, []);

  // 드래그 앤 드롭 이벤트 핸들러
  const handleDrop = useCallback(
    (e: Event) => {
      try {
        e.preventDefault();
        const dragEvent = e as DragEvent;
        if (dragEvent.dataTransfer?.files && dragEvent.dataTransfer.files.length > 0) {
          const file = dragEvent.dataTransfer.files[0];

          // 이미지 유형 및 확장자 확인
          if (isImageTypeSupported(file)) {
            insertBase64Image(file);
          }
        }
      } catch (error) {
        // 로깅 제거
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

  // 붙여넣기 이벤트 처리 (URL 자동 변환 및 임베드)
  useEffect(() => {
    try {
      const editor = quillRef.current?.getEditor();
      if (!editor) return;

      const handlePaste = (e: ClipboardEvent) => {
        try {
          const clipboardData = e.clipboardData;
          if (!clipboardData) return;

          let processed = false;
          const editor = quillRef.current?.getEditor();
          if (!editor) return;
          const range = editor.getSelection(true);

          // 1. 이미지 파일 확인 (기존 로직 유지)
          for (let i = 0; i < clipboardData.items.length; i++) {
            const item = clipboardData.items[i];
            if (item.type.match(/^image\//)) {
              e.preventDefault();
              const file = item.getAsFile();
              if (file && isImageTypeSupported(file)) {
                insertBase64Image(file);
                processed = true;
              }
              break;
            }
          }

          // 2. Text processing if not an image file
          if (!processed) {
            const pastedText = clipboardData.getData("text/plain").trim();

            // --- START: Check if pasted text is iframe (Case-insensitive) ---
            if (pastedText.toLowerCase().startsWith("<iframe")) {
              console.log("[Paste Handler] Pasted text starts with <iframe>:", pastedText);
              // --- START: Extract src and use insertEmbed ---
              const srcMatch = pastedText.match(/src="([^"]*)"/i); // Extract src value
              if (srcMatch && srcMatch[1]) {
                const extractedSrc = srcMatch[1];
                console.log("[Paste Handler] Extracted src from iframe:", extractedSrc);
                e.preventDefault();
                processed = true;
                if (range) {
                  console.log(
                    "[Paste Handler] Attempting insertEmbed for extracted iframe src:",
                    extractedSrc,
                    "at range:",
                    range
                  );
                  editor.deleteText(range.index, range.length, "user");
                  editor.insertEmbed(range.index, "embed", extractedSrc, "user"); // Use insertEmbed with extracted src
                  console.log(
                    "[Paste Handler] Editor content after iframe src insertEmbed (range):",
                    editor.root.innerHTML
                  );
                  editor.setSelection(range.index + 1, 0, "user");
                } else {
                  const length = editor.getLength();
                  console.log(
                    "[Paste Handler] Attempting insertEmbed for extracted iframe src:",
                    extractedSrc,
                    "at end (length):",
                    length
                  );
                  editor.insertEmbed(length, "embed", extractedSrc, "user"); // Use insertEmbed with extracted src
                  console.log(
                    "[Paste Handler] Editor content after iframe src insertEmbed (end):",
                    editor.root.innerHTML
                  );
                  editor.setSelection(length + 1, 0, "user");
                }
              } else {
                console.warn(
                  "[Paste Handler] Could not extract src from pasted iframe:",
                  pastedText
                );
                // Let the default paste happen or handle as plain text if needed
              }
              // --- END: Extract src and use insertEmbed ---
              return; // Return after handling (or attempting to handle) iframe paste
            }
            // --- END: Check if pasted text is iframe ---

            // --- Image URL Check (Use insertEmbed) ---
            const isImageUrl = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(pastedText);
            if (isImageUrl && isValidURL(pastedText)) {
              e.preventDefault();
              processed = true;
              if (range) {
                editor.deleteText(range.index, range.length, "user");
                editor.insertEmbed(range.index, "image", pastedText, "user");
                editor.setSelection(range.index + 1, 0, "user");
              } else {
                const length = editor.getLength();
                editor.insertEmbed(length, "image", pastedText, "user");
                editor.setSelection(length + 1, 0, "user");
              }
              return;
            }

            let embedHTML = ""; // Variable for generated HTML
            let isBlockquote = false; // Flag for blockquote embeds (Twitter)
            let targetClass = "";
            let processFunc = () => {};

            // --- START: Check for TikTok Link --- (Use insertEmbed with iframe source)
            const tiktokMatch = pastedText.match(TIKTOK_REGEX);
            if (tiktokMatch && tiktokMatch[1]) {
              console.log("[Paste Handler] TikTok link matched (insertEmbed iframe):", pastedText);
              const videoId = tiktokMatch[1];
              const embedSrc = `https://www.tiktok.com/embed/v2/${videoId}`;
              e.preventDefault();
              processed = true;
              if (range) {
                console.log(
                  "[Paste Handler] Attempting insertEmbed for TikTok:",
                  embedSrc,
                  "at range:",
                  range
                );
                editor.deleteText(range.index, range.length, "user");
                editor.insertEmbed(range.index, "embed", embedSrc, "user"); // Use insertEmbed
                console.log(
                  "[Paste Handler] Editor content after TikTok insertEmbed (range):",
                  editor.root.innerHTML
                );
                editor.setSelection(range.index + 1, 0, "user");
              } else {
                const length = editor.getLength();
                console.log(
                  "[Paste Handler] Attempting insertEmbed for TikTok:",
                  embedSrc,
                  "at end (length):",
                  length
                );
                editor.insertEmbed(length, "embed", embedSrc, "user"); // Use insertEmbed
                console.log(
                  "[Paste Handler] Editor content after TikTok insertEmbed (end):",
                  editor.root.innerHTML
                );
                editor.setSelection(length + 1, 0, "user");
              }
              return; // TikTok handled
            }
            // --- END: Check for TikTok Link ---

            // --- START: Check for YouTube/Vimeo/Instagram Link --- (Generate iframe or use insertEmbed)
            if (!embedHTML) {
              // This check remains, but TikTok block now returns early
              const ytMatch = pastedText.match(YOUTUBE_REGEX);
              const vimeoMatch = pastedText.match(VIMEO_REGEX);
              const instagramMatch = pastedText.match(INSTAGRAM_REGEX); // Check Instagram here

              if (ytMatch && ytMatch[1]) {
                const videoId = ytMatch[1];
                const embedSrc = `https://www.youtube.com/embed/${videoId}`;
                embedHTML = `<iframe src="${embedSrc}" allowfullscreen></iframe>`;
              } else if (vimeoMatch && vimeoMatch[1]) {
                const videoId = vimeoMatch[1];
                const embedSrc = `https://player.vimeo.com/video/${videoId}`;
                embedHTML = `<iframe src="${embedSrc}" allowfullscreen></iframe>`;
              } else if (instagramMatch && instagramMatch[1]) {
                // Attempt to use insertEmbed for Instagram instead of dangerouslyPasteHTML
                const shortcode = instagramMatch[1];
                const embedSrc = `https://www.instagram.com/p/${shortcode}/embed`;
                // --- START: Use insertEmbed directly ---
                e.preventDefault(); // Prevent default paste
                processed = true;
                if (range) {
                  console.log(
                    "[Paste Handler] Attempting insertEmbed for Instagram:",
                    embedSrc,
                    "at range:",
                    range
                  );
                  editor.deleteText(range.index, range.length, "user");
                  editor.insertEmbed(range.index, "embed", embedSrc, "user");
                  console.log(
                    "[Paste Handler] Editor content after insertEmbed (range):",
                    editor.root.innerHTML
                  );
                  editor.setSelection(range.index + 1, 0, "user");
                } else {
                  const length = editor.getLength();
                  console.log(
                    "[Paste Handler] Attempting insertEmbed for Instagram:",
                    embedSrc,
                    "at end (length):",
                    length
                  );
                  editor.insertEmbed(length, "embed", embedSrc, "user");
                  console.log(
                    "[Paste Handler] Editor content after insertEmbed (end):",
                    editor.root.innerHTML
                  );
                  editor.setSelection(length + 1, 0, "user");
                }
                return; // Instagram handled, exit the check block
                // --- END: Use insertEmbed directly ---
              }
            }
            // --- END: Check for YouTube/Vimeo/Instagram Link ---

            // --- START: Check for Twitter Link --- (Generate blockquote)
            if (!embedHTML) {
              const twitterMatch = pastedText.match(TWITTER_REGEX);
              if (twitterMatch && twitterMatch[3]) {
                isBlockquote = true; // Twitter uses blockquote
                targetClass = ".twitter-tweet";
                processFunc = () => (window as any).twttr?.widgets?.load();
                embedHTML = `
                  <blockquote class="twitter-tweet">
                    <p lang="ko" dir="ltr"></p>&mdash; Loading tweet... <a href="${pastedText}">${pastedText}</a>
                  </blockquote>
                `;
              }
            }
            // --- END: Check for Twitter Link ---

            console.log(
              `[Paste Handler] Reached check for final embedHTML. isBlockquote: ${isBlockquote}, embedHTML exists: ${!!embedHTML}`
            );
            // If any embedHTML was generated, paste it
            if (embedHTML) {
              console.log("[Paste Handler] Embed HTML generated:", embedHTML); // Log generated HTML
              e.preventDefault();
              processed = true;
              if (range) {
                console.log(
                  "[Paste Handler] Inserting embedHTML via dangerouslyPasteHTML at range:",
                  range
                );
                editor.deleteText(range.index, range.length, "user");
                editor.clipboard.dangerouslyPasteHTML(range.index, embedHTML, "user");
                console.log(
                  "[Paste Handler] Editor content after DPH (range):",
                  editor.root.innerHTML
                );
                editor.setSelection(range.index + 1, 0, "user");
              } else {
                const length = editor.getLength();
                console.log(
                  "[Paste Handler] Inserting embedHTML via dangerouslyPasteHTML at end (length):",
                  length
                );
                editor.clipboard.dangerouslyPasteHTML(length, embedHTML, "user");
                console.log(
                  "[Paste Handler] Editor content after DPH (end):",
                  editor.root.innerHTML
                );
                editor.setSelection(length + 1, 0, "user");
              }

              // Trigger processing only for blockquote types (Twitter)
              if (isBlockquote) {
                // isBlockquote should be false for Instagram iframe attempt
                console.log("[Paste Handler] Triggering processFunc for blockquote.");
                setTimeout(() => {
                  try {
                    if (typeof processFunc === "function") {
                      processFunc();
                    }
                  } catch (scriptError) {
                    console.error(`Error triggering ${targetClass} script:`, scriptError);
                  }
                }, 100);
              }
              return; // Link handled
            }
          }
        } catch (error) {
          console.error("Error in handlePaste:", error);
        }
      };

      // ... MutationObserver setup ...

      const pasteHandler = handlePaste as unknown as EventListener;
      editor.root.addEventListener("paste", pasteHandler);

      return () => {
        editor.root.removeEventListener("paste", pasteHandler);
        // ... observer disconnect ...
      };
    } catch (error) {
      // 오류 발생 시 조용히 처리
    }
  }, [insertBase64Image]); // 의존성 배열 유지

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

  // 툴바 구성 업데이트
  useEffect(() => {
    if (quillRef.current) {
      const toolbar = quillRef.current.getEditor().getModule("toolbar");

      // 핸들러 등록 (videoHandler -> embedHandler)
      toolbar.addHandler("image", imageHandler);
      toolbar.addHandler("embed", embedHandler); // 새로운 핸들러 등록
    }
  }, [imageHandler, embedHandler]); // videoHandler -> embedHandler

  return (
    <ErrorBoundary>
      <div className="text-editor-wrapper mb-0 pb-0">
        <ReactQuill
          ref={quillRef}
          value={content || ""}
          onChange={handleChange}
          preserveWhitespace={true}
          className="quill-editor-maintain-focus"
          modules={{
            toolbar: {
              container: showImageAndLink
                ? [
                    [{ header: [1, 2, 3, false] }],
                    ["bold", "italic", "underline", "strike"],
                    [{ list: "ordered" }, { list: "bullet" }],
                    [{ align: [] }],
                    ["link", "image", "embed"], // video -> embed
                  ]
                : [
                    [{ header: [1, 2, 3, false] }],
                    ["bold", "italic", "underline", "strike"],
                    [{ list: "ordered" }, { list: "bullet" }],
                    [{ align: [] }],
                  ],
              handlers: {
                image: imageHandler,
                embed: embedHandler, // embed 핸들러 연결
              },
            },
            clipboard: {
              matchVisual: false,
            },
            keyboard: {
              bindings: {
                tab: false,
              },
            },
          }}
          formats={[
            // formats 배열 업데이트
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
            "embed", // embed 포맷 추가
          ]}
        />
      </div>
      <style>
        {`
        .text-editor-wrapper .ql-container {
            height: ${height}; /* Apply fixed height to the container */
            overflow: hidden; /* Hide editor overflow within the container */
          margin-bottom: 0 !important;
            padding-bottom: 0 !important; /* Ensure container has no bottom padding */
          border-bottom-left-radius: 0.375rem;
          border-bottom-right-radius: 0.375rem;
          background-color: #ffffff;
          border: 1px solid #e5e7eb;
          border-top: none;
        }
        .text-editor-wrapper .ql-editor {
            /* Let editor fill the container */
          height: 100%;
          padding-bottom: 0 !important;
          overflow-y: auto;
          box-sizing: border-box;
          direction: ltr;
          text-align: left;
          background-color: #ffffff;
          cursor: text;
          }
           .quill-editor-container {
             border-radius: 0.375rem;
             overflow: hidden;
        }
        .ql-toolbar.ql-snow {
          border-top-left-radius: 0.375rem;
          border-top-right-radius: 0.375rem;
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-bottom: none;
        }
        .ql-container.ql-snow {
          border-bottom-left-radius: 0.375rem;
          border-bottom-right-radius: 0.375rem;
          background-color: #ffffff;
          border: 1px solid #e5e7eb;
          border-top: none;
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
          .ql-embed { /* iframe blot wrapper (now less used) */
            display: block;
            width: 100%;
            height: 315px;
            margin: 10px auto;
          }
          /* Ensure iframe elements are visible */
          .ql-editor iframe {
            display: block !important; /* Ensure display */
            width: 100%;
            min-height: 315px; /* Minimum height */
            height: auto; /* Allow height to adjust or use aspect ratio */
            aspect-ratio: 16 / 9; /* Common video aspect ratio */
            border: none;
            margin: 10px auto;
          }
          /* Ensure blockquote embeds are visible */
          .ql-editor blockquote.tiktok-embed,
          .ql-editor blockquote.instagram-media,
          .ql-editor blockquote.twitter-tweet {
            display: block !important; /* Ensure display */
            background: #f9f9f9; /* Light background to see the container */
            border-left: 5px solid #ccc; /* Standard blockquote style */
            padding: 10px;
            margin: 10px 0;
            min-height: 100px; /* Minimum height */
            box-shadow: none; /* Reset previous complex styles if any */
            max-width: 540px; /* Consistent max width */
            width: 100%;
          }
          /* Specific overrides if needed, e.g., for TikTok */
          .ql-editor blockquote.tiktok-embed {
             min-width: 325px;
          }

          .quill-editor-maintain-focus {
             /* Remove min-height from this potentially conflicting class */
             /* min-height: ${height}; */
             opacity: 1 !important;
             visibility: visible !important;
           }
           .quill-editor-maintain-focus .ql-editor {
             visibility: visible !important;
             display: block !important;
           }
           .ql-toolbar.ql-snow .ql-formats {
             display: inline-flex;
             align-items: center;
             vertical-align: middle;
             margin-right: 8px;
           }
           .ql-toolbar.ql-snow button {
             display: inline-flex;
             align-items: center;
             justify-content: center;
             height: 24px;
             vertical-align: middle;
           }
           .ql-toolbar.ql-snow button svg {
             width: 18px;
             height: 18px;
           }
           .ql-toolbar.ql-snow .ql-formats button.ql-link,
           .ql-toolbar.ql-snow .ql-formats button.ql-image,
           .ql-toolbar.ql-snow .ql-formats button.ql-video {
             padding: 0;
             display: inline-flex;
             align-items: center;
             justify-content: center;
             height: 24px;
             width: 28px;
             vertical-align: middle;
           }
           /* Remove margin from the last element inside the editor */
           .text-editor-wrapper .ql-editor > *:last-child {
             margin-bottom: 0 !important; /* Target last child element directly */
           }
           /* Remove margin from the last paragraph (redundant but harmless) */
           .text-editor-wrapper .ql-editor p:last-of-type {
             margin-bottom: 0 !important;
           }
           /* Add this rule to specifically target elements immediately following blockquotes */
           .ql-editor blockquote + * {
             margin-left: 0 !important;
             padding-left: 0 !important;
             border-left: none !important;
           }
           /* More specific rule targeting p tags after blockquote */
           .ql-editor blockquote + p {
             margin-left: 0 !important;
             padding-left: 0 !important;
             border-left: none !important;
             /* Add other resets if needed */
             list-style: none !important; /* Example reset */
           }
           /* Ensure images inserted by Quill render as actual images */
           .ql-editor img {
             display: inline-block !important; /* or block, depending on desired layout */
             max-width: 100%; /* Prevent image overflow */
             height: auto; /* Maintain aspect ratio */
             content: none !important; /* Prevent content override */
           }
           .ql-editor .ql-image {
             /* Reset any styles potentially overriding image display */
             display: inline-block !important;
             content: none !important;
           }
        `}
      </style>
    </ErrorBoundary>
  );
};

export default TextEditor;
