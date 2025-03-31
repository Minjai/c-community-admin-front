/**
 * ISO 형식의 날짜 문자열을 읽기 쉬운 형식으로 변환합니다.
 * @param dateStr ISO 형식의 날짜 문자열
 * @returns 년.월.일 시:분 형식의 문자열
 */
export const formatDate = (dateStr: string): string => {
  if (!dateStr) return "-";

  // ISO 형식 문자열을 Date 객체로 변환
  const date = new Date(dateStr);

  // 유효한 날짜인지 확인
  if (isNaN(date.getTime())) return "-";

  // 로컬 시간대로 변환
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}.${month}.${day} ${hours}:${minutes}`;
};

/**
 * ISO 형식으로 날짜를 변환합니다.
 * @param dateStr 날짜 문자열
 * @returns ISO 형식의 날짜 문자열
 */
export const toISOString = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toISOString();
};
