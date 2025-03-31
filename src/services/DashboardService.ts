import axios from "../api/axios";

// 대시보드 API 서비스
const DashboardService = {
  // 대시보드 통계 데이터 조회
  getDashboardStats: async () => {
    try {
      const response = await axios.get("/dashboard/stats");
      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "대시보드 통계 조회에 실패했습니다.");
    } catch (error) {
      console.error("대시보드 통계 조회 오류:", error);
      throw error;
    }
  },
};

export default DashboardService;
