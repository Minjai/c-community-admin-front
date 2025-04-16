import { format } from "date-fns";
import { ko } from "date-fns/locale"; // 한국어 로케일 추가

/**
 * UTC ISO 형식의 날짜 문자열을 UTC 기준 'yyyy.MM.dd HH:mm:ss' 형식으로 변환합니다.
 * @param dateStr ISO 형식의 날짜 문자열 (UTC 가정)
 * @returns UTC 기준 'yyyy.MM.dd HH:mm:ss' 형식의 문자열
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.error("Invalid date string provided:", dateString);
      return "유효하지 않은 날짜";
    }
    // UTC 메서드 사용
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
    const day = date.getUTCDate().toString().padStart(2, "0");
    const hours = date.getUTCHours().toString().padStart(2, "0");
    const minutes = date.getUTCMinutes().toString().padStart(2, "0");
    const seconds = date.getUTCSeconds().toString().padStart(2, "0");
    return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`; // UTC 기준
  } catch (error) {
    console.error("Error formatting date (UTC):", error);
    return "날짜 형식 오류";
  }
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
 * 서버에서 받은 UTC ISO 문자열을 UTC 기준 'yyyy.MM.dd HH:mm' 형식으로 표시
 * @param isoUtcString - UTC ISO 8601 형식의 날짜 문자열
 * @returns UTC 기준 'yyyy.MM.dd HH:mm' 형식 문자열 또는 오류 시 빈 문자열
 */
export function formatDateForDisplay(isoUtcString: string | null | undefined): string {
  if (!isoUtcString) return "";
  try {
    const date = new Date(isoUtcString);
    if (isNaN(date.getTime())) {
      console.error("Invalid date string for display (UTC):", isoUtcString);
      return "";
    }
    // UTC 메서드 사용
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
    const day = date.getUTCDate().toString().padStart(2, "0");
    const hours = date.getUTCHours().toString().padStart(2, "0");
    const minutes = date.getUTCMinutes().toString().padStart(2, "0");
    return `${year}.${month}.${day} ${hours}:${minutes}`; // UTC 기준
  } catch (error) {
    console.error("Error formatting date for display (UTC):", error);
    return "";
  }
}

/**
 * 서버에서 받은 UTC ISO 문자열을 HTML datetime-local input 요소의 값 형식으로 변환 (UTC 기준)
 * @param isoUtcString - UTC ISO 8601 형식의 날짜 문자열
 * @returns datetime-local input에 적합한 'yyyy-MM-ddTHH:mm' 형식 문자열 (UTC 기준) 또는 오류 시 빈 문자열
 */
export function formatISODateToDateTimeLocal(isoUtcString: string | null | undefined): string {
  if (!isoUtcString) return "";
  try {
    const date = new Date(isoUtcString);
    if (isNaN(date.getTime())) {
      console.error("Invalid date string for datetime-local (UTC):", isoUtcString);
      return "";
    }
    // UTC 메서드를 사용하여 형식 생성
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
    const day = date.getUTCDate().toString().padStart(2, "0");
    const hours = date.getUTCHours().toString().padStart(2, "0");
    const minutes = date.getUTCMinutes().toString().padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`; // UTC 기준
  } catch (error) {
    console.error("Error formatting ISO date to datetime-local (UTC):", error);
    return "";
  }
}

/**
 * HTML datetime-local input 요소의 값 (입력된 시간은 UTC로 간주)을 UTC ISO 문자열로 변환
 * @param utcDateTimeLocalString - 'yyyy-MM-ddTHH:mm' 형식의 UTC 날짜/시간 문자열
 * @returns UTC ISO 8601 형식 문자열 또는 오류 시 빈 문자열
 */
export function convertDateTimeLocalToISOUTC(
  utcDateTimeLocalString: string | null | undefined
): string {
  if (!utcDateTimeLocalString) return "";
  try {
    // 입력 문자열에 'Z'를 추가하여 UTC임을 명시적으로 알림
    const date = new Date(utcDateTimeLocalString + "Z");
    if (isNaN(date.getTime())) {
      console.error("Invalid UTC datetime-local string:", utcDateTimeLocalString);
      return "";
    }
    // Date 객체의 toISOString() 메서드는 항상 UTC 기준 ISO 문자열을 반환
    return date.toISOString();
  } catch (error) {
    console.error("Error converting datetime-local (UTC) to ISO UTC:", error);
    return "";
  }
}

// 필요한 다른 날짜 유틸리티 함수들...
