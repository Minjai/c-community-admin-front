import axios from "@/api/axios";

/**
 * 이미지 관련 API 서비스
 */
export class ImageApiService {
  /**
   * 인라인 이미지 업로드
   * @param file 업로드할 이미지 파일
   * @returns 업로드된 이미지 URL
   */
  static async uploadInlineImage(file: File) {
    try {
      console.log("인라인 이미지 업로드 시작:", {
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      });

      const formData = new FormData();
      formData.append("image", file);

      const response = await axios.post("/upload/inline-image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("인라인 이미지 업로드 성공:", response.data);

      // 응답에서 이미지 URL 반환
      return response.data.imageUrl || response.data.url || response.data.data?.imageUrl;
    } catch (error) {
      console.error("인라인 이미지 업로드 실패:", error);
      throw error;
    }
  }
}

export default ImageApiService;
