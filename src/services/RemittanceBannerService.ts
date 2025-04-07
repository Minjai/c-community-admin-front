import axios from "../api/axios";
import { RemittanceBanner } from "../types";

// 암호화폐 송금 배너 API 서비스
const RemittanceBannerService = {
  // 송금 배너 목록 조회
  getRemittanceBanners: async (): Promise<RemittanceBanner[]> => {
    try {
      console.log("송금 배너 데이터 요청 시작: /crypto-transfers/admin");
      const response = await axios.get("/crypto-transfers/admin");
      console.log("송금 배너 응답 데이터:", response.data);

      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "송금 배너 조회에 실패했습니다.");
    } catch (error: any) {
      console.error("송금 배너 조회 오류:", error);
      // 더 자세한 오류 정보 출력
      if (error.response) {
        // 서버 응답이 있는 경우
        console.error("서버 응답 상태:", error.response.status);
        console.error("서버 응답 데이터:", error.response.data);
      } else if (error.request) {
        // 요청은 보냈지만 응답이 없는 경우
        console.error("응답 없음:", error.request);
      } else {
        // 요청 설정 중 오류가 발생한 경우
        console.error("요청 설정 오류:", error.message);
      }
      throw error;
    }
  },

  // 송금 배너 상세 조회
  getRemittanceBannerById: async (id: number): Promise<RemittanceBanner> => {
    try {
      const response = await axios.get(`/crypto-transfers/admin/${id}`);
      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "송금 배너 상세 조회에 실패했습니다.");
    } catch (error) {
      console.error("송금 배너 상세 조회 오류:", error);
      throw error;
    }
  },

  // 송금 배너 생성
  createRemittanceBanner: async (
    bannerData: Partial<RemittanceBanner>,
    logoFile: File
  ): Promise<RemittanceBanner> => {
    const formData = new FormData();

    // 텍스트 데이터 추가
    formData.append("name", bannerData.name || "");
    formData.append("link", bannerData.link || "");

    if (bannerData.isPublic !== undefined) {
      formData.append("isPublic", String(bannerData.isPublic));
    }

    if (bannerData.displayOrder !== undefined) {
      formData.append("displayOrder", String(bannerData.displayOrder));
    }

    // 로고 파일 추가
    formData.append("imageUrl", logoFile);

    try {
      const response = await axios.post("/crypto-transfers/admin", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "송금 배너 생성에 실패했습니다.");
    } catch (error) {
      console.error("송금 배너 생성 오류:", error);
      throw error;
    }
  },

  // 송금 배너 수정
  updateRemittanceBanner: async (
    id: number,
    bannerData: Partial<RemittanceBanner>,
    logoFile?: File
  ): Promise<RemittanceBanner> => {
    try {
      // 이미지가 있으면 FormData로 요청
      if (logoFile) {
        const formData = new FormData();

        // 텍스트 데이터 추가
        if (bannerData.name !== undefined) {
          formData.append("name", bannerData.name);
        }

        if (bannerData.link !== undefined) {
          formData.append("link", bannerData.link);
        }

        if (bannerData.isPublic !== undefined) {
          formData.append("isPublic", String(bannerData.isPublic));
        }

        if (bannerData.displayOrder !== undefined) {
          formData.append("displayOrder", String(bannerData.displayOrder));
        }

        // 로고 파일 추가
        formData.append("imageUrl", logoFile);

        const response = await axios.put(`/crypto-transfers/admin/${id}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        if (response.data && response.data.success) {
          return response.data.data;
        }
        throw new Error(response.data.message || "송금 배너 수정에 실패했습니다.");
      }
      // 이미지가 없으면 JSON으로 요청
      else {
        const response = await axios.put(`/crypto-transfers/admin/${id}`, bannerData);
        if (response.data && response.data.success) {
          return response.data.data;
        }
        throw new Error(response.data.message || "송금 배너 수정에 실패했습니다.");
      }
    } catch (error) {
      console.error("송금 배너 수정 오류:", error);
      throw error;
    }
  },

  // 송금 배너 삭제
  deleteRemittanceBanner: async (id: number): Promise<boolean> => {
    try {
      const response = await axios.delete(`/crypto-transfers/admin/${id}`);
      return response.data && response.data.success;
    } catch (error) {
      console.error("송금 배너 삭제 오류:", error);
      throw error;
    }
  },

  // 송금 배너 순서 일괄 업데이트
  bulkUpdateRemittanceBannerOrders: async (
    bannerOrders: { id: number; displayOrder: number }[]
  ): Promise<boolean> => {
    try {
      // 서버에서 제공하는 bulk-update 엔드포인트는 다른 형식이므로,
      // 개별 업데이트를 순차적으로 수행
      for (const order of bannerOrders) {
        await axios.put(`/crypto-transfers/admin/${order.id}`, {
          displayOrder: order.displayOrder,
        });
      }
      return true;
    } catch (error) {
      console.error("송금 배너 순서 일괄 변경 오류:", error);
      throw error;
    }
  },
};

export default RemittanceBannerService;
