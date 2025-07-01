import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export const useScrollToTop = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // 브라우저의 스크롤 복원 기능 비활성화
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    // 페이지 이동 시 스크롤을 맨 위로 이동
    const scrollToTop = () => {
      // 여러 방법으로 스크롤 초기화
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;

      // 추가로 스크롤 컨테이너가 있는 경우
      const scrollContainers = document.querySelectorAll(".overflow-auto, .overflow-y-auto");
      scrollContainers.forEach((container) => {
        if (container instanceof HTMLElement) {
          container.scrollTop = 0;
        }
      });

      // 모든 스크롤 가능한 요소 초기화
      const allScrollableElements = document.querySelectorAll("*");
      allScrollableElements.forEach((element) => {
        if (element instanceof HTMLElement) {
          const computedStyle = window.getComputedStyle(element);
          if (
            computedStyle.overflow === "auto" ||
            computedStyle.overflow === "scroll" ||
            computedStyle.overflowY === "auto" ||
            computedStyle.overflowY === "scroll"
          ) {
            element.scrollTop = 0;
          }
        }
      });
    };

    // 즉시 실행
    scrollToTop();

    // 여러 번 실행하여 확실히 처리
    const timeoutId1 = setTimeout(scrollToTop, 50);
    const timeoutId2 = setTimeout(scrollToTop, 100);
    const timeoutId3 = setTimeout(scrollToTop, 200);

    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
    };
  }, [pathname]);
};
