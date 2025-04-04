import axios from "@/api/axios";
import { Post } from "@/types";

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
  static async getGuidelines(boardId: number, page = 1, pageSize = 100) {
    try {
      console.log("가이드라인 목록 API 요청:", { boardId, page, pageSize });

      // 모든 가이드라인을 한 번에 가져오기 위해 /guidelines/all 엔드포인트 사용
      const response = await axios.get("/guidelines/all", {
        params: {
          boardId,
        },
      });

      console.log("가이드라인 목록 API 응답:", response.data);
      return response.data;
    } catch (error) {
      console.error(`가이드라인 목록 조회 오류 (boardId: ${boardId}):`, error);
      throw error;
    }
  }

  /**
   * 특정 가이드라인을 조회합니다.
   * @param id 가이드라인 ID
   * @returns 가이드라인 상세 정보
   */
  static async getGuidelineById(id: number) {
    try {
      console.log("가이드라인 상세 API 요청:", { id });

      const response = await axios.get(`/guidelines/${id}`);

      console.log("가이드라인 상세 API 응답:", response.data);
      return response.data;
    } catch (error) {
      console.error(`가이드라인 상세 조회 오류 (ID: ${id}):`, error);
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
      console.log("가이드라인 생성 데이터:", {
        title: data.title,
        content: data.content.substring(0, 100) + "...", // 내용 일부만 로그
        boardId: data.boardId,
        hasImage: !!data.image,
        tags: data.tags,
        isPublic: data.isPublic,
        displayOrder: data.displayOrder,
        position: data.position,
      });

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

        // FormData 내용 로그
        console.log("FormData로 전송되는 필드:");
        for (let [key, value] of formData.entries()) {
          if (key === "image") {
            console.log(`${key}: [File 객체]`);
          } else if (key === "content") {
            console.log(`${key}: ${String(value).substring(0, 100)}...`);
          } else {
            console.log(`${key}: ${value}`);
          }
        }

        const response = await axios.post("/guidelines", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        return response.data;
      } else {
        // JSON 데이터 로그
        console.log("JSON으로 전송되는 데이터:", data);

        // 일반 JSON 데이터로 처리
        const response = await axios.post("/guidelines", data);
        return response.data;
      }
    } catch (error) {
      console.error(`가이드라인 생성 오류:`, error);
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
      console.log(`가이드라인(ID: ${id}) 수정 데이터:`, {
        title: data.title,
        content: data.content ? data.content.substring(0, 100) + "..." : undefined,
        boardId: data.boardId,
        hasImage: !!data.image,
        tags: data.tags,
        isPublic: data.isPublic,
        displayOrder: data.displayOrder,
        position: data.position,
      });

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

        // FormData 내용 로그
        console.log(`FormData로 가이드라인(ID: ${id}) 수정 필드:`);
        for (let [key, value] of formData.entries()) {
          if (key === "image") {
            console.log(`${key}: [File 객체]`);
          } else if (key === "content") {
            console.log(`${key}: ${String(value).substring(0, 100)}...`);
          } else {
            console.log(`${key}: ${value}`);
          }
        }

        const response = await axios.put(`/guidelines/${id}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        return response.data;
      } else {
        // JSON 데이터 로그
        console.log(`JSON으로 가이드라인(ID: ${id}) 수정 데이터:`, data);

        // 일반 JSON 데이터로 처리
        const response = await axios.put(`/guidelines/${id}`, data);
        return response.data;
      }
    } catch (error) {
      console.error(`가이드라인 수정 오류 (ID: ${id}):`, error);
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
      console.error(`가이드라인 삭제 오류 (ID: ${id}):`, error);
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
      // 매개변수 로깅 (디버깅용)
      console.log("가이드라인 위치 변경 요청 매개변수:", { id, position });
      console.log("id 타입:", typeof id, "position 타입:", typeof position);

      // 서버에 전송할 데이터 - 서버 요구사항에 맞게 수정
      const data = {
        id: Number(id), // 명시적으로 숫자로 변환
        position: Number(position), // 명시적으로 숫자로 변환
      };

      console.log("서버로 전송되는 데이터:", data);

      // 기존 /guidelines/position 엔드포인트가 아닌 일반 가이드라인 업데이트 엔드포인트 사용
      const response = await axios.put(`/guidelines/${id}`, data);

      return response.data;
    } catch (error) {
      console.error(`가이드라인 위치 변경 오류 (ID: ${id}):`, error);
      throw error;
    }
  }
}

export default GuidelineApiService;
