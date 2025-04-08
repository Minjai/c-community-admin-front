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

    // 입력값 검증
    if (!url || typeof url !== "string") {
      console.warn("유효하지 않은 YouTube URL:", url);
      return "https://www.youtube.com/embed/error";
    }

    // 이미 videoId만 전달된 경우
    if (url.match(/^[a-zA-Z0-9_-]{11}$/)) {
      return `https://www.youtube.com/embed/${url}?showinfo=0`;
    }

    // URL 패턴에서 ID 추출
    const youtubeRegex =
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(youtubeRegex);

    if (match && match[1]) {
      videoId = match[1];
    } else {
      // 기존 로직도 백업으로 유지
      if (url.includes("youtube.com/watch?v=")) {
        const splitResult = url.split("v=");
        if (splitResult.length >= 2) {
          videoId = splitResult[1];
          const ampersandPosition = videoId.indexOf("&");
          if (ampersandPosition !== -1) {
            videoId = videoId.substring(0, ampersandPosition);
          }
        }
      } else if (url.includes("youtube.com/embed/")) {
        const splitResult = url.split("embed/");
        if (splitResult.length >= 2) {
          videoId = splitResult[1];
        }
      } else if (url.includes("youtu.be/")) {
        const splitResult = url.split("youtu.be/");
        if (splitResult.length >= 2) {
          videoId = splitResult[1];
        }
      } else {
        // 직접 비디오 ID를 입력한 경우 또는 URL이 인식되지 않는 경우
        console.warn("YouTube ID를 추출할 수 없음:", url);
        videoId = url;
      }
    }

    // videoId가 유효한지 확인 (기본적인 형식 검사)
    if (!videoId || videoId.length < 5) {
      console.warn("유효하지 않은 YouTube 비디오 ID:", videoId);
      return `https://www.youtube.com/embed/${url}?showinfo=0`;
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

        // 기존 내용이 있으면 설정
        if (content) {
          const delta = editor.clipboard.convert(content);
          editor.setContents(delta, "silent");
        }

        // 자동 유튜브 링크 감지 설정
        setupYouTubeLinkDetection(editor, setContent);

        // LTR(Left-to-Right) 방향 설정
        editor.root.setAttribute("dir", "ltr");
      } catch (error) {
        console.error("에디터 초기화 오류:", error);
      }
    }
  }, []);

  // 유튜브 링크 자동 감지 및 변환 설정
  const setupYouTubeLinkDetection = (editor: any, contentSetter: (value: string) => void) => {
    editor.on("text-change", function (delta: any, oldContents: any, source: string) {
      if (source !== "user") return;

      try {
        const text = editor.getText();
        if (!text) return;

        // 정규식 객체 재설정 (매번 처음부터 검색을 시작하도록)
        YOUTUBE_REGEX.lastIndex = 0;

        let match;
        let linkDetected = false;

        // 새로 추가된 텍스트에서 YouTube URL 찾기
        while ((match = YOUTUBE_REGEX.exec(text)) !== null) {
          // 매치 결과 검증
          if (!match || !match[0] || !match[1]) {
            console.warn("YouTube 링크 매치 결과가 유효하지 않음:", match);
            continue;
          }

          const url = match[0];
          const videoId = match[1];

          console.log("YouTube 링크 감지됨:", {
            fullUrl: url,
            videoId: videoId,
            position: match.index,
          });

          // URL의 위치 확인
          const urlPosition = match.index;
          if (urlPosition < 0) continue;

          // 주변 내용 확인 (이미 변환된 URL인지 확인)
          let surroundingDelta;
          try {
            // 범위 오류 방지
            let startPos = Math.max(0, urlPosition - 1);
            let length = Math.min(url.length + 2, text.length - startPos);

            surroundingDelta = editor.getContents(startPos, length);
            if (!surroundingDelta || !surroundingDelta.ops) {
              console.warn("YouTube URL 주변 내용을 가져오지 못함");
              continue;
            }
          } catch (err) {
            console.warn("YouTube URL 주변 내용 처리 오류:", err);
            continue;
          }

          const ops = surroundingDelta.ops;

          // URL이 텍스트로만 구성되어 있는지 확인 (이미 변환되지 않았는지)
          let isPlainText = true;
          for (const op of ops) {
            if (!op || typeof op.insert !== "string") {
              isPlainText = false;
              break;
            }
          }

          if (isPlainText) {
            linkDetected = true;
            // 링크를 영상으로 변환
            setTimeout(() => {
              try {
                // 에디터가 유효한지 다시 확인
                if (!editor || !editor.deleteText) {
                  console.error("에디터 객체가 유효하지 않음");
                  return;
                }

                // 현재 콘텐츠 상태 확인
                const currentPos = editor.getSelection();
                console.log("링크 변환 전 상태:", {
                  currentPosition: currentPos,
                  urlPosition: urlPosition,
                  urlLength: url.length,
                });

                // 삭제 및 삽입 전에 범위 유효성 확인
                if (urlPosition < 0 || urlPosition >= editor.getText().length) {
                  console.warn("유효하지 않은 URL 위치:", urlPosition);
                  return;
                }

                editor.deleteText(urlPosition, url.length);
                editor.insertEmbed(urlPosition, "video", videoId);
                editor.insertText(urlPosition + 1, "\n");

                console.log("YouTube 링크가 성공적으로 비디오로 변환됨");
              } catch (err) {
                console.error("유튜브 링크 변환 중 오류 발생:", err);
              }
            }, 100);
          }
        }

        // 정규식 객체 초기화 (다음 실행을 위해)
        YOUTUBE_REGEX.lastIndex = 0;
      } catch (error) {
        console.error("유튜브 링크 감지 중 오류 발생:", error);
      }
    });
  };

  // 에디터 내용이 변경될 때 HTML로 변환하여 상위 컴포넌트에 전달
  const handleChange = (value: string, delta: any, source: string, editor: any) => {
    try {
      // source가 'user'이고 실제 내용이 변경된 경우에만 부모 컴포넌트에 알림
      if (source === "user") {
        let html = "";
        if (editor && editor.getHTML) {
          html = editor.getHTML();
        } else if (editor && editor.root) {
          html = editor.root.innerHTML;
        } else if (value && typeof value === "string") {
          html = value;
        }

        // 현재 content와 동일하지 않을 때만 부모에게 전달
        if (html !== content) {
          setContent(html);
        }
      }
    } catch (error) {
      console.error("에디터 변경 처리 오류:", error);
    }
  };

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

      // 콘솔 로그만 남기고 중복 업데이트는 제거
      console.log("동영상이 에디터에 삽입되었습니다.");
      // 이미 handleChange에서 업데이트가 발생하므로 여기서는 setContent를 호출하지 않음
    } catch (error) {
      console.error("비디오 삽입 중 오류:", error);
      alert("동영상 삽입 중 오류가 발생했습니다.");
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
          insertBase64Image(file);
        }
      };

      input.click();
    } catch (error) {
      console.error("이미지 선택 오류:", error);
      alert("이미지 선택 중 오류가 발생했습니다.");
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
