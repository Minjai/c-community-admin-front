import axios from "@/api/axios";
import {
  SportCategory,
  ApiResponse,
  PaginatedData,
  SportGameAnalysis,
  SportGameAnalysisFormData,
} from "@/types";

// 통계 관련 API 함수

// 스포츠 경기 관련 API 함수
export const getSportGames = async (params = {}): Promise<{ data: any[]; meta: any }> => {
  try {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const response = await axios.get(`/sports/admin/games?${queryParams.toString()}`);

    if (response.data && response.data.success) {
      return {
        data: response.data.data || [],
        meta: response.data.meta || {},
      };
    }

    return { data: [], meta: { total: 0 } };
  } catch (error) {
    console.error("Error fetching sport games:", error);
    throw error;
  }
};

export const getSportGameById = async (id: number): Promise<any> => {
  try {
    const response = await axios.get(`/sports/games/${id}`);

    if (response.data && response.data.success) {
      return response.data.data;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching sport game with id ${id}:`, error);
    throw error;
  }
};

export const updateSportGame = async (id: number, data: any): Promise<any> => {
  try {
    const response = await axios.put(`/sports/admin/games/${id}`, data);

    if (response.data && response.data.success) {
      return response.data.data;
    }

    return null;
  } catch (error) {
    console.error(`Error updating sport game with id ${id}:`, error);
    throw error;
  }
};

export const deleteSportGame = async (id: number): Promise<boolean> => {
  try {
    const response = await axios.delete(`/sports/admin/games/${id}`);

    return response.data && response.data.success;
  } catch (error) {
    console.error(`Error deleting sport game with id ${id}:`, error);
    throw error;
  }
};

export const bulkDeleteSportGames = async (ids: number[]): Promise<boolean> => {
  try {
    const response = await axios.post(`/sports/admin/games/bulk-delete`, { ids });

    return response.data && response.data.success;
  } catch (error) {
    console.error("Error bulk deleting sport games:", error);
    throw error;
  }
};

export const getSportStats = async (): Promise<any> => {
  try {
    const response = await axios.get("/sports/stats");

    if (response.data && response.data.success) {
      return response.data.data;
    }

    return {};
  } catch (error) {
    console.error("Error fetching sport stats:", error);
    throw error;
  }
};

// 스포츠 종목 카테고리 관련 API 함수
export const getSportCategories = async (): Promise<any[]> => {
  try {
    const response = await axios.get("/sport-categories/public");

    if (response.data && response.data.success) {
      return response.data.data || [];
    }

    return [];
  } catch (error) {
    console.error("Error fetching sport categories:", error);
    throw error;
  }
};

export const getAllSportCategoriesAdmin = async (
  page: number = 1,
  limit: number = 10,
  searchValue: any = ""
): Promise<{ data: SportCategory[]; pagination: any }> => {
  try {
    const response = await axios.get(`/sport-categories/admin?page=${page}&limit=${limit}`);

    if (response.data && response.data.success) {
      return {
        data: response.data.data || [],
        pagination: response.data.pagination || {
          totalItems: 0,
          totalPages: 0,
          currentPage: 1,
          pageSize: limit,
        },
      };
    }

    return {
      data: [],
      pagination: { totalItems: 0, totalPages: 0, currentPage: 1, pageSize: limit },
    };
  } catch (error) {
    console.error("Error fetching admin sport categories:", error);
    throw error;
  }
};

export const createSportCategory = async (data: {
  sportName: string;
  displayName?: string;
  icon?: string;
  isPublic?: number;
  displayOrder?: number;
}): Promise<any> => {
  try {
    const response = await axios.post("/sport-categories/admin", data);

    if (response.data && response.data.success) {
      return response.data.data;
    }

    return null;
  } catch (error) {
    console.error("Error creating sport category:", error);
    throw error;
  }
};

export const updateSportCategory = async (
  id: number,
  data: {
    sportName?: string;
    displayName?: string;
    icon?: string;
    isPublic?: number;
    displayOrder?: number;
  }
): Promise<any> => {
  try {
    const response = await axios.put(`/sport-categories/admin/${id}`, data);

    if (response.data && response.data.success) {
      return response.data.data;
    }

    return null;
  } catch (error) {
    console.error(`Error updating sport category with id ${id}:`, error);
    throw error;
  }
};

export const deleteSportCategory = async (id: number): Promise<boolean> => {
  try {
    const response = await axios.delete(`/sport-categories/admin/${id}`);

    return response.data && response.data.success;
  } catch (error) {
    console.error(`Error deleting sport category with id ${id}:`, error);
    throw error;
  }
};

export const bulkUpdateSportCategories = async (data: {
  ids: number[];
  isPublic: number;
}): Promise<any> => {
  try {
    const response = await axios.post("/sport-categories/admin/bulk-update", data);

    return response.data && response.data.success ? response.data : null;
  } catch (error) {
    console.error("Error bulk updating sport categories:", error);
    throw error;
  }
};

// 스포츠 종목 추천 관련 API 함수
export const getSportRecommendations = async (params = {}): Promise<{ data: any[]; meta: any }> => {
  try {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const response = await axios.get(`/sport-recommendations/admin?${queryParams.toString()}`);

    console.log("response:", response);

    if (response.data && response.data.success) {
      return {
        data: response.data.data || [],
        meta: response.data.pagination || {},
      };
    }

    return { data: [], meta: { total: 0 } };
  } catch (error) {
    console.error("Error fetching sport recommendations:", error);
    throw error;
  }
};

export const getSportRecommendationById = async (id: number): Promise<any> => {
  try {
    const response = await axios.get(`/sport-recommendations/admin/${id}`);

    if (response.data && response.data.success) {
      return response.data.data;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching sport recommendation with id ${id}:`, error);
    throw error;
  }
};

export const createSportRecommendation = async (data: {
  title: string;
  sportGameId?: number;
  sportGameIds?: number[];
  description?: string;
  startTime?: string;
  endTime?: string;
  isPublic: number;
  displayOrder?: number;
}): Promise<any> => {
  try {
    const response = await axios.post("/sport-recommendations/admin", data);

    if (response.data && response.data.success) {
      return response.data.data;
    }

    return null;
  } catch (error) {
    console.error("Error creating sport recommendation:", error);
    throw error;
  }
};

export const updateSportRecommendation = async (
  id: number,
  data: {
    sportGameId?: number;
    sportGameIds?: number[];
    title?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    isPublic?: number;
    displayOrder?: number;
  }
): Promise<any> => {
  try {
    const response = await axios.put(`/sport-recommendations/admin/${id}`, data);

    if (response.data && response.data.success) {
      return response.data.data;
    }

    return null;
  } catch (error) {
    console.error(`Error updating sport recommendation with id ${id}:`, error);
    throw error;
  }
};

export const deleteSportRecommendation = async (id: number): Promise<boolean> => {
  try {
    const response = await axios.delete(`/sport-recommendations/admin/${id}`);

    return response.data && response.data.success;
  } catch (error) {
    console.error(`Error deleting sport recommendation with id ${id}:`, error);
    throw error;
  }
};

export const bulkUpdateSportRecommendations = async (data: {
  ids: number[];
  isPublic: number;
}): Promise<any> => {
  try {
    const response = await axios.post("/sport-recommendations/admin/bulk-update", data);

    return response.data && response.data.success ? response.data : null;
  } catch (error) {
    console.error("Error bulk updating sport recommendations:", error);
    throw error;
  }
};

// 스포츠 경기 분석 관련 API 함수
export const getAllSportGameAnalyses = async (): Promise<ApiResponse<SportGameAnalysis[]>> => {
  try {
    const response = await axios.get("/sport-analyses");
    return response.data;
  } catch (error) {
    console.error("Error fetching sport game analyses:", error);
    throw error;
  }
};

export const getSportGameAnalysisById = async (
  id: number
): Promise<ApiResponse<SportGameAnalysis>> => {
  try {
    const response = await axios.get(`/sport-analyses/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching sport game analysis with id ${id}:`, error);
    throw error;
  }
};

export const createSportGameAnalysis = async (
  formData: FormData | SportGameAnalysisFormData
): Promise<ApiResponse<SportGameAnalysis>> => {
  try {
    const data = formData instanceof FormData ? formData : new FormData();
    if (!(formData instanceof FormData)) {
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (key === "homeTeamImage" || key === "awayTeamImage") {
            if (value instanceof File) {
              data.append(key, value);
            }
          } else {
            data.append(key, String(value));
          }
        }
      });
    }

    const response = await axios.post("/sport-analyses", data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error creating sport game analysis:", error);
    throw error;
  }
};

export const updateSportGameAnalysis = async (
  id: number,
  formData: FormData | Partial<SportGameAnalysisFormData>
): Promise<ApiResponse<SportGameAnalysis>> => {
  try {
    const data = formData instanceof FormData ? formData : new FormData();
    if (!(formData instanceof FormData)) {
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (key === "homeTeamImage" || key === "awayTeamImage") {
            if (value instanceof File) {
              data.append(key, value);
            }
          } else {
            data.append(key, String(value));
          }
        }
      });
    }

    const response = await axios.put(`/sport-analyses/${id}`, data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Error updating sport game analysis with id ${id}:`, error);
    throw error;
  }
};

export const deleteSportGameAnalysis = async (id: number): Promise<ApiResponse<boolean>> => {
  try {
    const response = await axios.delete(`/sport-analyses/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting sport game analysis with id ${id}:`, error);
    throw error;
  }
};

export const updateSportGameAnalysisDisplayOrder = async (
  id: number,
  displayOrder: number
): Promise<ApiResponse<SportGameAnalysis>> => {
  try {
    const response = await axios.put(`/sport-analyses/${id}/display-order`, { displayOrder });
    return response.data;
  } catch (error) {
    console.error(`Error updating sport game analysis display order with id ${id}:`, error);
    throw error;
  }
};

// 수동 등록 상세 데이터 조회
export const getManualRegistrationDetail = async (id: number): Promise<any> => {
  try {
    const response = await axios.get(`/sport-categories/admin/${id}`);

    if (response.data && response.data.success) {
      return response.data.data;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching manual registration detail with id ${id}:`, error);
    throw error;
  }
};
