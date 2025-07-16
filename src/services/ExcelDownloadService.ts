import axios from "axios";
import { toast } from "react-toastify";
import { getToken } from "../api/axios";
import * as XLSX from "xlsx";

// 유효한 엑셀 다운로드 타입들
export const validExcelTypes = [
  // 배너 관리
  "bannerMain",
  "bannerCompany",
  "bannerBottom",
  "bannerMini",

  // 가이드라인 관리
  "guidelineCasino",
  "guidelineSports",
  "guidelineCrypto",

  // 데이터 관리
  "casinoGames",
  "casinoRecommends",
  "sportCategories",
  "sportWidgets",
  "sportRecommends",
  "sportGameAnalysis",

  // 리뷰 업체 관리
  "reviewCompanies",
  "casinoFilters",

  // 뉴스 관리
  "newsCasino",
  "newsSports",

  // 커뮤니티 관리
  "notices",
  "posts",

  // 회원 관리
  "userAccounts",
  "adminAccounts",

  // 기타 관리
  "userRanks",
  "cryptoTransfers",
  "footers",

  // 사이트 노출 관리
  "homeSections",
] as const;

export type ExcelDownloadType = (typeof validExcelTypes)[number];

// 서버 응답 타입 (실제로는 blob이 반환되므로 주석 처리)
// interface ExcelDownloadResponse {
//   success: boolean;
//   message: string;
//   data?: {
//     fileName: string;
//     fileContent: string; // base64 encoded file content
//   };
// }

class ExcelDownloadService {
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || "";
  }

  /**
   * 엑셀 파일 다운로드 요청
   * @param type - 다운로드할 데이터 타입
   * @returns Promise<boolean> - 성공 여부
   */
  async downloadExcel(type: ExcelDownloadType): Promise<boolean> {
    try {
      // 로딩 토스트 표시
      const loadingToast = toast.loading("엑셀 파일을 생성 중입니다...");

      const response = await axios.post(
        `/admin/data?type=${type}`,
        {},
        {
          baseURL: this.baseURL,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken() || ""}`,
          },
        }
      );

      // 로딩 토스트 제거
      toast.dismiss(loadingToast);

      // 응답이 성공인지 확인
      if (response.status === 200 && response.data.success) {
        const jsonData = response.data.data;
        const fileName = response.data.filename || `${type}.xlsx`;

        // JSON 데이터를 Excel 워크북으로 변환
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(jsonData);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

        // Excel 파일을 Blob으로 변환
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        // 다운로드 링크 생성 및 클릭
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success("엑셀 파일이 성공적으로 다운로드되었습니다.");
        return true;
      } else {
        throw new Error("서버 응답 오류");
      }
    } catch (error: any) {
      console.error("엑셀 다운로드 오류:", error);

      // 에러 메시지 처리
      let errorMessage = "엑셀 파일 다운로드에 실패했습니다.";

      if (error.response?.status === 401) {
        errorMessage = "인증이 필요합니다. 다시 로그인해주세요.";
      } else if (error.response?.status === 403) {
        errorMessage = "권한이 없습니다.";
      } else if (error.response?.status === 404) {
        errorMessage = "요청한 데이터를 찾을 수 없습니다.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      toast.error(errorMessage);
      return false;
    }
  }

  /**
   * 타입이 유효한지 확인
   * @param type - 확인할 타입
   * @returns boolean - 유효 여부
   */
  isValidType(type: string): type is ExcelDownloadType {
    return validExcelTypes.includes(type as ExcelDownloadType);
  }
}

// 싱글톤 인스턴스 생성
export const excelDownloadService = new ExcelDownloadService();
