import { format } from "date-fns";
import { ko } from "date-fns/locale"; // 한국어 로케일 추가

/**
 * ISO 형식의 날짜 문자열을 읽기 쉬운 형식으로 변환합니다.
 * @param dateStr ISO 형식의 날짜 문자열
 * @returns 년.월.일 시:분 형식의 문자열
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "";
  try {
    // ISO 문자열을 Date 객체로 파싱
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // 유효하지 않은 날짜 처리
      console.error("Invalid date string provided:", dateString);
      return "유효하지 않은 날짜";
    }
    // 원하는 형식으로 포맷
    return format(date, "yyyy.MM.dd HH:mm:ss", { locale: ko });
  } catch (error) {
    console.error("Error formatting date:", error);
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
 * 서버에서 받은 UTC ISO 문자열을 사용자 로컬 시간대의 'yyyy.MM.dd HH:mm' 형식으로 표시
 * @param isoUtcString - UTC ISO 8601 형식의 날짜 문자열 (예: '2023-10-27T10:00:00.000Z')
 * @returns 로컬 시간대의 'yyyy.MM.dd HH:mm' 형식 문자열 또는 오류 시 빈 문자열
 */
export function formatDateForDisplay(isoUtcString: string | null | undefined): string {
  if (!isoUtcString) return "";
  try {
    const date = new Date(isoUtcString); // Date 객체는 자동으로 로컬 시간대로 변환
    if (isNaN(date.getTime())) {
      console.error("Invalid date string for display:", isoUtcString);
      return "";
    }
    return format(date, "yyyy.MM.dd HH:mm", { locale: ko });
  } catch (error) {
    console.error("Error formatting date for display:", error);
    return "";
  }
}

/**
 * 서버에서 받은 UTC ISO 문자열을 HTML datetime-local input 요소의 값 형식으로 변환
 * (주의: datetime-local은 로컬 시간대를 가정하지만, Date 객체는 UTC를 로컬로 변환함)
 * @param isoUtcString - UTC ISO 8601 형식의 날짜 문자열
 * @returns datetime-local input에 적합한 'yyyy-MM-ddTHH:mm' 형식 문자열 또는 오류 시 빈 문자열
 */
export function formatISODateToDateTimeLocal(isoUtcString: string | null | undefined): string {
  if (!isoUtcString) return "";
  try {
    const date = new Date(isoUtcString); // 로컬 시간대로 변환된 Date 객체
    if (isNaN(date.getTime())) {
      console.error("Invalid date string for datetime-local:", isoUtcString);
      return "";
    }
    // Date 객체의 로컬 시간대 구성 요소를 사용하여 형식 생성
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    console.error("Error formatting ISO date to datetime-local:", error);
    return "";
  }
}

/**
 * HTML datetime-local input 요소의 값 (로컬 시간대 가정)을 UTC ISO 문자열로 변환
 * @param localDateTimeString - 'yyyy-MM-ddTHH:mm' 형식의 로컬 날짜/시간 문자열
 * @returns UTC ISO 8601 형식 문자열 또는 오류 시 빈 문자열
 */
export function convertDateTimeLocalToISOUTC(
  localDateTimeString: string | null | undefined
): string {
  if (!localDateTimeString) return "";
  try {
    // 로컬 시간 문자열로부터 Date 객체 생성
    // Date 생성자는 로컬 시간대를 가정하므로, 이 문자열은 로컬 시간으로 해석됨
    const date = new Date(localDateTimeString);
    if (isNaN(date.getTime())) {
      console.error("Invalid local datetime string:", localDateTimeString);
      return "";
    }
    // Date 객체의 toISOString() 메서드는 항상 UTC 기준 ISO 문자열을 반환
    return date.toISOString();
  } catch (error) {
    console.error("Error converting datetime-local to ISO UTC:", error);
    return "";
  }
}

// 필요한 다른 날짜 유틸리티 함수들...
