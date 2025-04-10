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
    console.log(`GIF 이미지 (${sizeInMB.toFixed(2)}MB)가 최대 크기 이내이므로 최적화 건너뜀`);
    return file;
  }

  console.log(`큰 GIF 이미지 감지: ${sizeInMB.toFixed(2)}MB - 최적화 필요함`);

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

  if (sizeInMB > WARN_IMAGE_SIZE_MB) {
    console.warn(`큰 이미지 파일: ${sizeInMB.toFixed(2)}MB - 업로드에 시간이 걸릴 수 있음`);
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
const BlockEmbed = Quill.import("blots/block/embed");

class VideoBlot extends BlockEmbed {
  static create(value: string) {
    const node = super.create();

    // YouTube 비디오 URL 처리
    let videoUrl = value;

    // 이미 임베드 URL이 아닌 경우만 변환
    if (!videoUrl.includes("youtube.com/embed/")) {
      videoUrl = this.transformVideoUrl(value);
    }

    // iframe 속성 설정
    node.setAttribute("frameborder", "0");
    node.setAttribute("allowfullscreen", "true");
    node.setAttribute("src", videoUrl);

    // 디버깅을 위한 로그
    console.log("비디오 블롯 생성:", value, "->", videoUrl);

    return node;
  }

  static value(node: HTMLElement) {
    return node.getAttribute("src");
  }

  // YouTube 비디오 URL을 임베드 URL로 변환
  static transformVideoUrl(url: string) {
    console.log("URL 변환 시작:", url);

    // 입력값 검증
    if (!url || typeof url !== "string") {
      console.warn("유효하지 않은 YouTube URL:", url);
      return "https://www.youtube.com/embed/dQw4w9WgXcQ"; // 기본 비디오
    }

    // 이미 videoId만 전달된 경우
    if (url.match(/^[a-zA-Z0-9_-]{11}$/)) {
      console.log("ID만 전달됨:", url);
      return `https://www.youtube.com/embed/${url}`;
    }

    // 이미 임베드 URL인 경우
    if (url.includes("youtube.com/embed/")) {
      console.log("이미 임베드 URL임:", url);
      return url;
    }

    // URL 패턴에서 ID 추출
    let videoId = "";

    // 일반 유튜브 URL (watch?v=)
    if (url.includes("youtube.com/watch?v=")) {
      const match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
      if (match && match[1]) {
        videoId = match[1];
        console.log("watch?v= 패턴에서 ID 추출:", videoId);
      }
    }
    // 짧은 유튜브 URL (youtu.be/)
    else if (url.includes("youtu.be/")) {
      const match = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
      if (match && match[1]) {
        videoId = match[1];
        console.log("youtu.be/ 패턴에서 ID 추출:", videoId);
      }
    }
    // 그 외 모든 경우에 대한 포괄적인 정규식 시도
    else {
      const generalMatch = url.match(
        /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
      );
      if (generalMatch && generalMatch[1]) {
        videoId = generalMatch[1];
        console.log("일반 정규식으로 ID 추출:", videoId);
      }
    }

    // videoId가 추출되지 않은 경우, 직접 ID로 간주
    if (!videoId) {
      console.log("ID 추출 실패, 입력값을 직접 ID로 사용:", url);
      videoId = url.trim();
    }

    // ID 길이 검사 (기본적인 유효성 확인)
    if (videoId.length !== 11) {
      console.warn("비정상적인 YouTube ID 길이:", videoId.length, videoId);
    }

    // 임베드 URL 생성 및 반환
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    console.log("최종 임베드 URL:", embedUrl);
    return embedUrl;
  }
}

VideoBlot.blotName = "video";
VideoBlot.tagName = "iframe";
VideoBlot.className = "ql-video";

// 글로벌 등록은 한 번만 수행
try {
  Quill.register(VideoBlot, true);
  console.log("VideoBlot 등록 성공");
} catch (error) {
  console.warn("VideoBlot 등록 오류 (이미 등록됨):", error);
}

// 유튜브 링크 인식 패턴
const YOUTUBE_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)(?:&[^\ ]*)?/g;

// 파일 정보 출력 함수
const logFileInfo = (file: File, prefix: string = ""): void => {
  const sizeInMB = file.size / (1024 * 1024);
  console.log(`${prefix} 파일 정보:`, {
    name: file.name,
    type: file.type,
    size: `${sizeInMB.toFixed(2)}MB`,
    lastModified: new Date(file.lastModified).toISOString(),
  });
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
            node.addEventListener("error", (e) => {
              console.error("이미지 로딩 오류:", e);
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

// 에디터 초기화 함수 수정
const initQuill = async (
  quillRef: React.RefObject<ReactQuill>,
  content: string,
  prevContentRef: React.MutableRefObject<string>
) => {
  try {
    // 에디터가 아직 초기화되지 않았을 때만 초기화
    if (!quillRef.current) return;

    // 초기 콘텐츠 설정
    const editor = quillRef.current.getEditor();

    // 초기 콘텐츠가 있는 경우에만 설정
    if (content) {
      console.log("초기 콘텐츠 설정 시작:", content.substring(0, 30) + "...");

      try {
        // HTML 문자열 정리 및 정규화
        const normalizedContent = content === "<p><br></p>" ? "" : content;
        // silent 모드로 내용 설정 (이벤트 발생 방지)
        editor.clipboard.dangerouslyPasteHTML(normalizedContent, "silent");
        prevContentRef.current = normalizedContent;
        console.log("초기 콘텐츠 설정 완료");
      } catch (err) {
        console.error("초기 콘텐츠 설정 실패:", err);
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
          console.error("이미지 업로드 중 오류:", error);
          alert("이미지 업로드 중 오류가 발생했습니다.");
        }
      };
    });

    // 초기화 완료 표시
    initializedRef.current = true;
    console.log("에디터 초기화 완료");
  } catch (error) {
    console.error("에디터 초기화 중 오류:", error);
  }
};

const TextEditor: React.FC<TextEditorProps> = ({
  content,
  setContent,
  showImageAndLink = true,
  customModules,
  customFormats,
  height = "400px",
  onChange,
  onFocus,
}) => {
  const quillRef = useRef<ReactQuill>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef<boolean>(false);
  const prevContentRef = useRef<string>(content || "");
  const internalChangeRef = useRef<boolean>(false);

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
          console.log("초기 콘텐츠 설정 시작:", content.substring(0, 30) + "...");

          try {
            // HTML 문자열 정리 및 정규화
            const normalizedContent = content === "<p><br></p>" ? "" : content;
            // silent 모드로 내용 설정 (이벤트 발생 방지)
            editor.clipboard.dangerouslyPasteHTML(normalizedContent, "silent");
            prevContentRef.current = normalizedContent;
            console.log("초기 콘텐츠 설정 완료");
          } catch (err) {
            console.error("초기 콘텐츠 설정 실패:", err);
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
              console.error("이미지 업로드 중 오류:", error);
              alert("이미지 업로드 중 오류가 발생했습니다.");
            }
          };
        });

        // 초기화 완료 표시
        initializedRef.current = true;
        console.log("에디터 초기화 완료");
      } catch (error) {
        console.error("에디터 초기화 중 오류:", error);
      }
    };

    // 초기화 실행
    initQuill();

    // 컴포넌트 언마운트 시 초기화 상태 리셋
    return () => {
      initializedRef.current = false;
      prevContentRef.current = "";
      console.log("에디터 정리됨");
    };
  }, []);

  // 초기화 및 업데이트 함수
  useEffect(() => {
    if (!initializedRef.current) return;

    if (quillRef.current) {
      const editor = quillRef.current.getEditor();

      // 외부에서 content가 변경되었고, 내부 변경이 아닌 경우에만 적용
      if (content !== prevContentRef.current && !internalChangeRef.current) {
        prevContentRef.current = content;
        editor.root.innerHTML = content || "";
      }

      // 내부 변경 플래그 초기화
      internalChangeRef.current = false;
    }
  }, [content]);

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

          // 이미지 삽입 위치에 내용 확인 (디버깅용)
          const currentContent = editor.root.innerHTML;
          const contentAtPosition = editor.getText(range.index, 10);
          console.log("삽입 위치 컨텍스트:", {
            position: range.index,
            nearbyText: contentAtPosition,
            currentContentLength: currentContent.length,
          });

          // 이미지 URL과 함께 실제 DOM 객체 확인
          const imgData = {
            url: url.substring(0, 50) + "...",
            type: url.startsWith("data:image/")
              ? url.substring(0, url.indexOf(";"))
              : "external URL",
          };
          console.log("삽입 중인 이미지:", imgData);

          // 이미지 삽입 시도
          editor.insertEmbed(range.index, "image", url);

          // 삽입 후 DOM 확인
          setTimeout(() => {
            const updatedContent = editor.root.innerHTML;
            const hasInserted = updatedContent.length > currentContent.length;
            const imgTags = (updatedContent.match(/<img[^>]*>/g) || []).length;

            console.log("이미지 삽입 결과:", {
              contentLengthChanged: hasInserted,
              previousLength: currentContent.length,
              newLength: updatedContent.length,
              imgTagCount: imgTags,
              previewImage: updatedContent.includes(url.substring(0, 30))
                ? "이미지 포함됨"
                : "이미지 누락됨",
            });

            // 내용 업데이트를 부모 컴포넌트에 알림
            setContent(updatedContent);
          }, 10);

          editor.setSelection(range.index + 1, 0);

          // 콘솔 로그만 남기고 중복 업데이트는 제거
          console.log("이미지가 에디터에 삽입되었습니다.");
        }
      } catch (error) {
        console.error("이미지 삽입 오류:", error);
      }
    },
    [setContent]
  );

  // 유튜브 동영상 링크 처리 함수
  const videoHandler = useCallback(() => {
    try {
      if (!quillRef.current || !initializedRef.current) {
        console.warn("에디터 참조가 없거나 초기화되지 않아 비디오 삽입 불가");
        return;
      }

      const editor = quillRef.current.getEditor();
      const range = editor.getSelection(true);

      if (range) {
        const videoUrl = prompt("YouTube 비디오 URL 또는 ID를 입력하세요:");

        if (videoUrl) {
          console.log("비디오 삽입 시도:", videoUrl);

          // 동영상 삽입
          editor.insertEmbed(range.index, "video", videoUrl);

          // 커서 위치 조정
          editor.setSelection(range.index + 1, 0);

          // 변경 사항이 감지되도록 에디터에 포커스 후 블러 처리
          editor.focus();
          setTimeout(() => {
            const editorContainer = quillRef.current?.editor?.root.parentElement;
            if (editorContainer) {
              editorContainer.click();
            }
          }, 100);

          console.log("비디오 삽입 완료");
        }
      }
    } catch (err) {
      console.error("비디오 삽입 중 오류 발생:", err);
    }
  }, []);

  // 이미지를 Base64로 변환하여 에디터에 삽입
  const insertBase64Image = useCallback(
    async (file: File) => {
      try {
        // 파일 정보 출력 (디버깅용 상세 정보)
        logFileInfo(file, "처리 중인 이미지");

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

        // GIF 파일 특별 처리
        if (file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif")) {
          console.log("GIF 파일 감지됨:", file.name);

          // GIF 파일 최적화 시도
          try {
            const optimizedFile = await optimizeGifImage(file);
            file = optimizedFile; // 최적화된 파일로 교체
          } catch (error) {
            console.error("GIF 최적화 중 오류:", error);
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
            const sizeInKB = Math.round(base64Image.length / 1024);

            console.log("이미지 변환 성공:", {
              sizeKB: sizeInKB,
              type: file.type,
              preview: base64Image.substring(0, 50) + "...", // 데이터 일부만 표시
            });

            // 크기가 큰 이미지(특히 GIF)에 대한 경고
            if (sizeInKB > 1024 * 5) {
              // 5MB 이상
              console.warn(
                `대용량 이미지 삽입: ${sizeInKB / 1024}MB - 저장 시 문제가 발생할 수 있음`
              );
            }

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

        // 디버깅용 로그
        logFileInfo(file, "이미지 선택");

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
          console.error("에디터 참조를 찾을 수 없음");
          return;
        }

        // 현재 커서 위치 가져오기
        const range = editor.getSelection();
        if (!range) {
          console.warn("선택 범위를 찾을 수 없음. 문서 끝에 삽입합니다.");
        }

        // 이미지 FileReader 처리
        const reader = new FileReader();
        reader.onload = (e) => {
          // 임시 이미지 URL 생성
          const imageDataUrl = e.target?.result as string;

          // 이미지 삽입 및 커서 위치 조정
          editor.insertEmbed(range ? range.index : 0, "image", imageDataUrl);
          editor.setSelection((range ? range.index : 0) + 1, 0);

          // 콘솔 로그만 남기고 중복 업데이트는 제거
          console.log("이미지가 에디터에 삽입되었습니다.");
        };

        // 파일 처리 시작
        reader.readAsDataURL(processedFile);
      };
    } catch (error) {
      console.error("이미지 핸들러 오류:", error);
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
          logFileInfo(file, "드롭된 이미지");

          // 이미지 유형 및 확장자 확인
          if (isImageTypeSupported(file)) {
            insertBase64Image(file);
          }
        }
      } catch (error) {
        console.error("이미지 드롭 오류:", error);
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
                logFileInfo(file, "붙여넣기 이미지");
                e.preventDefault();

                // 이미지 유형 및 크기 확인
                if (isImageTypeSupported(file) && checkImageSize(file)) {
                  // GIF 이미지 검사 및 최적화
                  if (file.type === "image/gif") {
                    console.log("GIF 이미지 붙여넣기 감지됨");

                    // 비동기 처리를 위해 즉시 실행 함수 사용
                    (async () => {
                      try {
                        const optimizedFile = await optimizeGifImage(file);
                        insertBase64Image(optimizedFile);
                      } catch (error) {
                        console.error("GIF 이미지 최적화 오류:", error);
                        insertBase64Image(file); // 최적화 실패 시 원본 사용
                      }
                    })();
                  } else {
                    // 일반 이미지 처리
                    insertBase64Image(file);
                  }
                }

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

  // 툴바 구성 (여기서는 일부만 보여줌)
  useEffect(() => {
    if (quillRef.current) {
      console.log("에디터 툴바 설정 중...");
      const toolbar = quillRef.current.getEditor().getModule("toolbar");

      // 핸들러 등록
      toolbar.addHandler("image", imageHandler);
      toolbar.addHandler("video", videoHandler);

      console.log("에디터 툴바 핸들러 등록 완료");
    }
  }, [imageHandler, videoHandler]);

  return (
    <div ref={editorRef} className="quill-editor-container">
      <ErrorBoundary>
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
            keyboard: {
              bindings: {
                tab: false,
              },
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
          /* 에디터가 비정상적으로 사라지는 것을 방지하는 스타일 */
          .quill-editor-maintain-focus {
            min-height: ${height};
            opacity: 1 !important;
            visibility: visible !important;
          }
          .quill-editor-maintain-focus .ql-editor {
            visibility: visible !important;
            display: block !important;
          }
          /* 툴바 버튼들의 정렬 수정 */
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
          /* 특히 이미지와 링크 버튼 정렬 수정 */
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
        `}
      </style>
    </div>
  );
};

export default TextEditor;
