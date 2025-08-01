import { ApiResponse, Post as Guideline, PaginationInfo } from "@/types";
import axios from "@/api/axios";
import { AxiosResponse } from "axios";

/**
 * 가이드라인 API 서비스
 * - 모든 가이드라인 타입(카지노, 스포츠, 암호화폐)에 대한 API 호출을 관리합니다.
 * - 카지노: boardId = 3
 * - 스포츠: boardId = 4
 * - 암호화폐: boardId = 5
 */
export class GuidelineApiService {
  /**
   * 가이드라인 목록을 조회합니다.
   * @param boardId 게시판 ID (3: 카지노, 4: 스포츠, 5: 암호화폐)
   * @param page 페이지 번호
   * @param pageSize 페이지 크기
   * @returns 가이드라인 목록 응답
   */
  static async getGuidelines(
    boardId: number,
    page: number = 1,
    limit: number = 10,
    searchValue: any
  ): Promise<ApiResponse<Guideline[]>> {
    try {
      const response: AxiosResponse<any> = await axios.get("/guidelines/admin", {
        params: {
          boardId,
          page,
          limit,
          search: searchValue,
        },
      });

      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "An error occurred while fetching guidelines.";
      return {
        success: false,
        message: errorMessage,
        data: [],
        pagination: undefined,
      };
    }
  }

  /**
   * 특정 가이드라인을 조회합니다.
   * @param id 가이드라인 ID
   * @returns 가이드라인 상세 정보
   */
  static async getGuidelineById(id: number) {
    try {
      const response = await axios.get(`/guidelines/${id}`);

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 새 가이드라인을 생성합니다.
   * @param data 가이드라인 데이터
   * @returns 생성된 가이드라인 정보
   */
  static async createGuideline(data: {
    title: string;
    content: string;
    boardId: number;
    image?: File;
    tags?: string[] | string;
    isPublic?: boolean | number;
    displayOrder?: number;
    position?: number;
  }) {
    try {
      // 이미지 파일이 있는 경우 FormData로 처리
      if (data.image) {
        const formData = new FormData();
        formData.append("title", data.title);
        formData.append("content", data.content);
        formData.append("boardId", String(data.boardId));
        formData.append("image", data.image);

        if (data.tags && data.tags.length > 0) {
          formData.append("tags", JSON.stringify(data.tags));
        }

        if (data.isPublic !== undefined) {
          formData.append("isPublic", String(data.isPublic));
        }

        if (data.displayOrder !== undefined) {
          formData.append("displayOrder", String(data.displayOrder));
        }

        if (data.position !== undefined) {
          formData.append("position", String(data.position));
        }

        const response = await axios.post("/guidelines", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        return response.data;
      } else {
        // 일반 JSON 데이터로 처리
        const response = await axios.post("/guidelines", data);
        return response.data;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * 가이드라인을 수정합니다.
   * @param id 가이드라인 ID
   * @param data 수정할 데이터
   * @returns 수정된 가이드라인 정보
   */
  static async updateGuideline(
    id: number,
    data: {
      title?: string;
      content?: string;
      boardId?: number;
      image?: File;
      tags?: string[] | string;
      isPublic?: boolean | number;
      displayOrder?: number;
      position?: number;
    }
  ) {
    try {
      // 이미지 파일이 있는 경우 FormData로 처리
      if (data.image) {
        const formData = new FormData();

        if (data.title) formData.append("title", data.title);
        if (data.content) formData.append("content", data.content);
        if (data.boardId) formData.append("boardId", String(data.boardId));

        formData.append("image", data.image);

        if (data.tags && data.tags.length > 0) {
          formData.append("tags", JSON.stringify(data.tags));
        }

        if (data.isPublic !== undefined) {
          formData.append("isPublic", String(data.isPublic));
        }

        if (data.displayOrder !== undefined) {
          formData.append("displayOrder", String(data.displayOrder));
        }

        if (data.position !== undefined) {
          formData.append("position", String(data.position));
        }

        const response = await axios.put(`/guidelines/${id}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        return response.data;
      } else {
        // JSON 데이터 로그

        // 일반 JSON 데이터로 처리
        const response = await axios.put(`/guidelines/${id}`, data);
        return response.data;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * 가이드라인을 삭제합니다.
   * @param id 가이드라인 ID
   * @returns 삭제 결과
   */
  static async deleteGuideline(id: number) {
    try {
      const response = await axios.delete(`/guidelines/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 가이드라인 노출 순서를 변경합니다.
   * @param id 가이드라인 ID
   * @param position 새 위치
   * @returns 변경 결과
   */
  static async updateGuidelinePosition(id: number, position: number) {
    try {
      // 서버에 전송할 데이터 - 서버 요구사항에 맞게 수정
      const data = {
        id: Number(id), // 명시적으로 숫자로 변환
        position: Number(position), // 명시적으로 숫자로 변환
      };

      // 기존 /guidelines/position 엔드포인트가 아닌 일반 가이드라인 업데이트 엔드포인트 사용
      const response = await axios.put(`/guidelines/${id}`, data);

      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export default GuidelineApiService;
