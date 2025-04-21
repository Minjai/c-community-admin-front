import { format } from "date-fns";
import { ko } from "date-fns/locale"; // 한국어 로케일 추가

/**
 * ISO 형식의 날짜 문자열을 로컬 시간대 기준 'yyyy.MM.dd HH:mm:ss' 형식으로 변환합니다.
 * @param dateStr ISO 형식의 날짜 문자열
 * @returns 로컬 시간대 기준 'yyyy.MM.dd HH:mm:ss' 형식의 문자열
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.error("Invalid date string provided:", dateString);
      return "유효하지 않은 날짜";
    }
    return format(date, "yyyy.MM.dd HH:mm:ss", { locale: ko });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "날짜 형식 오류";
  }
}

/**
 * ISO 형식의 날짜 문자열을 로컬 시간대 기준 'yyyy.MM.dd HH:mm' 형식으로 변환합니다.
 * @param dateStr ISO 형식의 날짜 문자열
 * @returns 로컬 시간대 기준 'yyyy.MM.dd HH:mm' 형식의 문자열
 */
export function formatDateForDisplay(dateString: string | null | undefined): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // console.error("Invalid date string provided:", dateString); // 콘솔 오류 제거
      return dateString; // 원본 문자열 반환
    }
    return format(date, "yyyy.MM.dd HH:mm", { locale: ko });
  } catch (error) {
    console.error("Error formatting date for display:", error);
    return "날짜 형식 오류"; // 예상치 못한 다른 오류 발생 시
  }
}

/**
 * ISO 형식의 날짜 문자열을 HTML datetime-local input 요소의 값 형식으로 변환합니다.
 * @param isoString ISO 형식의 날짜 문자열
 * @returns datetime-local input에 적합한 'yyyy-MM-ddTHH:mm' 형식 문자열
 */
export function formatDateForInput(dateString: string | null | undefined): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.error("Invalid date string provided:", dateString);
      return "";
    }
    return format(date, "yyyy-MM-dd'T'HH:mm");
  } catch (error) {
    console.error("Error formatting date for input:", error);
    return "";
  }
}

/**
 * HTML datetime-local input 요소의 값을 ISO 형식으로 변환합니다.
 * @param localDateTimeString 'yyyy-MM-ddTHH:mm' 형식의 로컬 날짜/시간 문자열
 * @returns ISO 형식의 날짜 문자열
 */
export function convertToISOString(localDateTimeString: string | null | undefined): string {
  if (!localDateTimeString) return "";
  try {
    const date = new Date(localDateTimeString);
    if (isNaN(date.getTime())) {
      console.error("Invalid datetime string provided:", localDateTimeString);
      return "";
    }
    return date.toISOString();
  } catch (error) {
    console.error("Error converting to ISO string:", error);
    return "";
  }
}

/**
 * 현재 시각을 ISO 형식으로 반환합니다.
 * @returns ISO 형식의 현재 시각 문자열
 */
export function getCurrentISOString(): string {
  return new Date().toISOString();
}

/**
 * 현재 시각을 HTML datetime-local input 요소의 값 형식으로 반환합니다.
 * @returns 'yyyy-MM-ddTHH:mm' 형식의 현재 시각 문자열
 */
export function getCurrentDateTimeLocalString(): string {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm");
}

/**
 * ISO 형식으로 날짜를 변환합니다.
 * @param dateStr 날짜 문자열
 * @returns ISO 형식의 날짜 문자열
 */
export const toISOString = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toISOString();
};

/**
 * 서버에서 받은 UTC ISO 문자열을 HTML datetime-local input 요소의 값 형식으로 변환 (로컬 시간 기준)
 * @param isoUtcString - UTC ISO 8601 형식의 날짜 문자열
 * @returns datetime-local input에 적합한 'yyyy-MM-ddTHH:mm' 형식 문자열 (로컬 시간 기준) 또는 오류 시 빈 문자열
 */
export function formatISODateToDateTimeLocal(isoUtcString: string | null | undefined): string {
  if (!isoUtcString) return "";
  try {
    const date = new Date(isoUtcString);
    if (isNaN(date.getTime())) {
      console.error("Invalid date string for datetime-local:", isoUtcString);
      return "";
    }
    // 로컬 시간 메서드를 사용하여 형식 생성
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`; // 로컬 시간 기준
  } catch (error) {
    console.error("Error formatting ISO date to datetime-local:", error);
    return "";
  }
}

/**
 * HTML datetime-local input 요소의 값 (사용자 로컬 시간대)을 UTC ISO 문자열로 변환 (저장용)
 * @param localDateTimeString - 'yyyy-MM-ddTHH:mm' 형식의 로컬 날짜/시간 문자열
 * @returns UTC ISO 8601 형식 문자열 또는 유효하지 않으면 빈 문자열
 */
export function convertDateTimeLocalToISOUTC(
  localDateTimeString: string | null | undefined
): string {
  if (!localDateTimeString) return "";
  try {
    // 로컬 시간 문자열을 Date 객체로 파싱
    // new Date()는 로컬 시간 문자열을 브라우저/Node.js 환경의 로컬 시간대로 해석
    const date = new Date(localDateTimeString);
    if (isNaN(date.getTime())) {
      console.error("Invalid datetime-local string provided:", localDateTimeString);
      return "";
    }
    // UTC 기준 ISO 문자열로 변환하여 반환
    return date.toISOString();
  } catch (error) {
    console.error("Error converting local datetime-local to ISO UTC:", error);
    return "";
  }
}

/**
 * 저장된 로컬 시간 문자열을 KST 기준의 HTML datetime-local input 형식으로 변환 (수정 모달 표시용)
 * @param storedLocalString - 저장된 'yyyy-MM-ddTHH:mm' 형식의 로컬 날짜/시간 문자열
 * @returns datetime-local input에 적합한 'yyyy-MM-ddTHH:mm' 형식 문자열 또는 오류 시 빈 문자열
 */
export function formatStoredToKSTDateTimeLocal(
  storedLocalString: string | null | undefined
): string {
  if (!storedLocalString) return "";
  try {
    // 저장된 문자열이 이미 원하는 형식이므로, 유효성 검사 후 그대로 반환
    // 또는 Date 객체로 파싱하여 형식을 재확인할 수도 있음
    const date = new Date(storedLocalString); // 로컬 시간으로 해석됨
    if (isNaN(date.getTime())) {
      console.error("Invalid stored local date string for display:", storedLocalString);
      return "";
    }
    // Date 객체에서 로컬 시간 기준으로 다시 포맷 (형식 보장)
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`; // 로컬 기준 datetime-local format
  } catch (error) {
    console.error("Error formatting stored local date to KST datetime-local:", error);
    return "";
  }
}

/**
 * 현재 시각의 UTC 시간을 HTML datetime-local input 요소의 값 형식으로 반환
 * @returns 'yyyy-MM-ddTHH:mm' 형식의 현재 UTC 날짜/시간 문자열
 */
export function getCurrentUTCDateTimeLocalString(): string {
  try {
    const now = new Date();
    // UTC 메서드를 사용하여 형식 생성
    const year = now.getUTCFullYear();
    const month = (now.getUTCMonth() + 1).toString().padStart(2, "0");
    const day = now.getUTCDate().toString().padStart(2, "0");
    const hours = now.getUTCHours().toString().padStart(2, "0");
    const minutes = now.getUTCMinutes().toString().padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`; // UTC 기준
  } catch (error) {
    console.error("Error getting current UTC datetime-local string:", error);
    // 오류 발생 시 빈 문자열 대신 현재 로컬 시간 기반의 기본값이라도 반환하거나,
    // 혹은 특정 에러 값을 반환하는 것을 고려할 수 있음. 여기서는 빈 문자열 반환.
    return "";
  }
}

// 필요한 다른 날짜 유틸리티 함수들...
