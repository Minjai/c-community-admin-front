import axios from "../api/axios";
import { Banner, ApiResponse, PaginationInfo } from "../types";

// 배너 API 서비스
const BannerApiService = {
  // 메인 배너 목록 조회 (페이지네이션 적용)
  getMainBanners: async (
    page = 1,
    limit = 10,
    searchValue = ""
  ): Promise<ApiResponse<Banner[]>> => {
    try {
      // API 요청 시 page와 limit 파라미터 추가
      const response = await axios.get("/banner/main", {
        params: { page, limit, search: searchValue },
      });
      // 전체 응답 객체 반환 (success, data, pagination 등 포함)
      return response.data;
    } catch (error: any) {
      console.error("메인 배너 조회 오류:", error);
      // 에러 발생 시에도 ApiResponse 형식으로 반환
      return {
        success: false,
        message: error.response?.data?.message || error.message || "메인 배너 조회 중 오류 발생",
        data: [],
        pagination: { totalItems: 0, totalPages: 1, currentPage: 1, pageSize: limit },
      };
    }
  },

  // 업체 배너 목록 조회
  getCompanyBanners: async (
    page = 1,
    limit = 10,
    searchValue = ""
  ): Promise<ApiResponse<Banner[]>> => {
    try {
      const response = await axios.get("/banner/company", {
        params: { page, limit, search: searchValue },
      });
      return response.data;
    } catch (error: any) {
      console.error("업체 배너 조회 오류:", error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || "업체 배너 조회 중 오류 발생",
        data: [],
        pagination: { totalItems: 0, totalPages: 1, currentPage: 1, pageSize: limit },
      };
    }
  },

  // 하단 배너 목록 조회
  getBottomBanners: async (
    page = 1,
    limit = 10,
    searchValue = ""
  ): Promise<ApiResponse<Banner[]>> => {
    try {
      const response = await axios.get("/banner/bottom", {
        params: { page, limit, search: searchValue },
      });
      return response.data;
    } catch (error: any) {
      console.error("하단 배너 조회 오류:", error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || "하단 배너 조회 중 오류 발생",
        data: [],
        pagination: { totalItems: 0, totalPages: 1, currentPage: 1, pageSize: limit },
      };
    }
  },

  // 미니 배너 목록 조회
  getMiniBanners: async (
    page = 1,
    limit = 10,
    searchValue = ""
  ): Promise<ApiResponse<Banner[]>> => {
    try {
      const response = await axios.get("/banner/mini", {
        params: { page, limit, search: searchValue },
      });
      return response.data;
    } catch (error: any) {
      console.error("미니 배너 조회 오류:", error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || "미니 배너 조회 중 오류 발생",
        data: [],
        pagination: { totalItems: 0, totalPages: 1, currentPage: 1, pageSize: limit },
      };
    }
  },

  // 메인 배너 생성
  createMainBanner: async (bannerData: any, pcImage: File, mobileImage: File): Promise<Banner> => {
    const formData = new FormData();

    // 텍스트 데이터 추가
    Object.keys(bannerData).forEach((key) => {
      if (bannerData[key] !== undefined && bannerData[key] !== null) {
        // 날짜 필드 처리
        if (key === "startDate" || key === "endDate") {
          try {
            // ISO 형식으로 변환
            const dateValue = new Date(bannerData[key]).toISOString();
            formData.append(key, dateValue);
          } catch (e) {
            console.error(`${key} 형식 오류 (멀티파트):`, e);
            formData.append(key, bannerData[key]); // 오류 시 원본 값 사용
          }
        }
        // position 값은 문자열로 변환하여 전송
        else if (key === "position") {
          formData.append(key, String(bannerData[key]));
        } else {
          formData.append(key, bannerData[key]);
        }
      }
    });

    // 이미지 파일 추가
    formData.append("pUrl", pcImage);
    formData.append("mUrl", mobileImage);

    try {
      const response = await axios.post("/banner/main", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "메인 배너 생성에 실패했습니다.");
    } catch (error) {
      console.error("메인 배너 생성 오류:", error);
      throw error;
    }
  },

  // 업체 배너 생성
  createCompanyBanner: async (
    bannerData: any,
    pcImage: File,
    mobileImage: File
  ): Promise<Banner> => {
    const formData = new FormData();

    // position 값이 없으면 기본값 0 설정
    if (bannerData.position === undefined || bannerData.position === null) {
      bannerData.position = 0;
    }

    // 텍스트 데이터 추가
    Object.keys(bannerData).forEach((key) => {
      if (bannerData[key] !== undefined && bannerData[key] !== null) {
        // 날짜 필드 처리
        if (key === "startDate" || key === "endDate") {
          try {
            // ISO 형식으로 변환
            const dateValue = new Date(bannerData[key]).toISOString();
            formData.append(key, dateValue);
          } catch (e) {
            console.error(`${key} 형식 오류 (업체):`, e);
            formData.append(key, bannerData[key]); // 오류 시 원본 값 사용
          }
        }
        // position 값은 문자열로 변환하여 전송
        else if (key === "position") {
          formData.append(key, String(bannerData[key]));
        } else {
          formData.append(key, bannerData[key]);
        }
      }
    });

    // 이미지 파일 추가
    formData.append("pUrl", pcImage);
    formData.append("mUrl", mobileImage);

    try {
      // Authorization 헤더는 인터셉터에서 자동으로 추가됨
      const response = await axios.post("/banner/company", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "업체 배너 생성에 실패했습니다.");
    } catch (error) {
      console.error("업체 배너 생성 오류:", error);
      throw error;
    }
  },

  // 메인 배너 수정
  updateMainBanner: async (
    id: number,
    bannerData: any,
    pcImage?: File | null,
    mobileImage?: File | null
  ): Promise<Banner> => {
    try {
      const formData = new FormData();

      // 이미지 없이 기본 데이터만 전송하는 방식 시도
      const hasNoImages =
        (!pcImage || !(pcImage instanceof File) || pcImage.size === 0) &&
        (!mobileImage || !(mobileImage instanceof File) || mobileImage.size === 0);

      // 이미지가 없는 경우 일반 JSON 요청으로 처리
      if (hasNoImages) {
        // 날짜 형식 확인 및 변환
        if (bannerData.startDate) {
          try {
            // ISO 형식인지 확인하고 아니면 변환 시도
            const startDate = new Date(bannerData.startDate);
            bannerData.startDate = startDate.toISOString();
          } catch (e) {
            console.error("startDate 형식 오류:", e);
          }
        }

        if (bannerData.endDate) {
          try {
            // ISO 형식인지 확인하고 아니면 변환 시도
            const endDate = new Date(bannerData.endDate);
            bannerData.endDate = endDate.toISOString();
          } catch (e) {
            console.error("endDate 형식 오류:", e);
          }
        }

        // 이미지 파일 없이 JSON 데이터만 PUT 요청
        const response = await axios.put(`/banner/main/${id}`, bannerData, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.data && response.data.success) {
          return response.data.data;
        }

        console.error("API Error response:", response.data);
        throw new Error(response.data.message || "메인 배너 수정에 실패했습니다.");
      }

      // 이미지가 있는 경우 formData 사용
      // 텍스트 데이터 추가
      Object.keys(bannerData).forEach((key) => {
        if (bannerData[key] !== undefined && bannerData[key] !== null) {
          // 날짜 필드 처리
          if (key === "startDate" || key === "endDate") {
            try {
              // ISO 형식으로 변환
              const dateValue = new Date(bannerData[key]).toISOString();
              formData.append(key, dateValue);
            } catch (e) {
              console.error(`${key} 형식 오류 (멀티파트):`, e);
              formData.append(key, bannerData[key]); // 오류 시 원본 값 사용
            }
          }
          // position 값은 문자열로 변환하여 전송
          else if (key === "position") {
            formData.append(key, String(bannerData[key]));
          } else {
            formData.append(key, bannerData[key]);
          }
        }
      });

      // 이미지 파일 추가 - key 이름을 서버 요구사항에 맞게 수정
      if (pcImage && pcImage instanceof File && pcImage.size > 0) {
        formData.append("pUrl", pcImage); // "pcImage"에서 "pUrl"로 변경
        console.log("PC 이미지 추가:", pcImage.name, pcImage.size, pcImage.type);
      }

      if (mobileImage && mobileImage instanceof File && mobileImage.size > 0) {
        formData.append("mUrl", mobileImage); // "mobileImage"에서 "mUrl"로 변경
        console.log("모바일 이미지 추가:", mobileImage.name, mobileImage.size, mobileImage.type);
      }

      console.log(`Sending multipart PUT request to /banner/main/${id}`, {
        formDataKeys: [...formData.keys()],
        hasImages: { pc: !!pcImage, mobile: !!mobileImage },
      });

      const response = await axios.put(`/banner/main/${id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Accept: "application/json",
        },
      });

      if (response.data && response.data.success) {
        return response.data.data;
      }

      console.error("API Error response:", response.data);
      throw new Error(response.data.message || "메인 배너 수정에 실패했습니다.");
    } catch (error) {
      console.error("메인 배너 수정 오류:", error);
      throw error;
    }
  },

  // 업체 배너 수정
  updateCompanyBanner: async (
    id: number,
    bannerData: any,
    pcImage?: File | null,
    mobileImage?: File | null
  ): Promise<Banner> => {
    try {
      const formData = new FormData();

      // 이미지 없이 기본 데이터만 전송하는 방식 시도
      const hasNoImages =
        (!pcImage || !(pcImage instanceof File) || pcImage.size === 0) &&
        (!mobileImage || !(mobileImage instanceof File) || mobileImage.size === 0);

      // 이미지가 없는 경우 일반 JSON 요청으로 처리
      if (hasNoImages) {
        console.log(`Sending JSON PUT request to /banner/company/${id} (without images)`, {
          requestData: bannerData,
          requestDataType: typeof bannerData,
          startDate: bannerData.startDate,
          startDateType: typeof bannerData.startDate,
          endDate: bannerData.endDate,
          endDateType: typeof bannerData.endDate,
        });

        // 날짜 형식 확인 및 변환
        if (bannerData.startDate) {
          try {
            // ISO 형식인지 확인하고 아니면 변환 시도
            const startDate = new Date(bannerData.startDate);
            bannerData.startDate = startDate.toISOString();
            console.log("변환된 startDate (업체):", bannerData.startDate);
          } catch (e) {
            console.error("startDate 형식 오류 (업체):", e);
          }
        }

        if (bannerData.endDate) {
          try {
            // ISO 형식인지 확인하고 아니면 변환 시도
            const endDate = new Date(bannerData.endDate);
            bannerData.endDate = endDate.toISOString();
            console.log("변환된 endDate (업체):", bannerData.endDate);
          } catch (e) {
            console.error("endDate 형식 오류 (업체):", e);
          }
        }

        // position 값은 문자열로 변환
        if (bannerData.position !== undefined) {
          bannerData.position = String(bannerData.position);
        }

        // 이미지 파일 없이 JSON 데이터만 PUT 요청
        const response = await axios.put(`/banner/company/${id}`, bannerData, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.data && response.data.success) {
          return response.data.data;
        }

        console.error("API Error response:", response.data);
        throw new Error(response.data.message || "업체 배너 수정에 실패했습니다.");
      }

      // 이미지가 있는 경우 formData 사용
      // 텍스트 데이터 추가
      Object.keys(bannerData).forEach((key) => {
        if (bannerData[key] !== undefined && bannerData[key] !== null) {
          // 날짜 필드 처리
          if (key === "startDate" || key === "endDate") {
            try {
              // ISO 형식으로 변환
              const dateValue = new Date(bannerData[key]).toISOString();
              formData.append(key, dateValue);
              console.log(`변환된 ${key} (업체 멀티파트):`, dateValue);
            } catch (e) {
              console.error(`${key} 형식 오류 (업체 멀티파트):`, e);
              formData.append(key, bannerData[key]); // 오류 시 원본 값 사용
            }
          }
          // position 값은 문자열로 변환하여 전송
          else if (key === "position") {
            formData.append(key, String(bannerData[key]));
          } else {
            formData.append(key, bannerData[key]);
          }
        }
      });

      // 이미지 파일 추가 - key 이름을 서버 요구사항에 맞게 수정
      if (pcImage && pcImage instanceof File && pcImage.size > 0) {
        formData.append("pUrl", pcImage); // "pcImage"에서 "pUrl"로 변경
        console.log("PC 이미지 추가(업체):", pcImage.name, pcImage.size, pcImage.type);
      }

      if (mobileImage && mobileImage instanceof File && mobileImage.size > 0) {
        formData.append("mUrl", mobileImage); // "mobileImage"에서 "mUrl"로 변경
        console.log(
          "모바일 이미지 추가(업체):",
          mobileImage.name,
          mobileImage.size,
          mobileImage.type
        );
      }

      // Authorization 헤더는 인터셉터에서 자동으로 추가됨
      console.log(`Sending multipart PUT request to /banner/company/${id}`, {
        formDataKeys: [...formData.keys()],
        hasImages: { pc: !!pcImage, mobile: !!mobileImage },
      });

      const response = await axios.put(`/banner/company/${id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Accept: "application/json",
        },
      });

      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "업체 배너 수정에 실패했습니다.");
    } catch (error) {
      console.error("업체 배너 수정 오류:", error);
      throw error;
    }
  },

  // 메인 배너 삭제
  deleteMainBanner: async (id: number): Promise<void> => {
    try {
      const response = await axios.delete(`/banner/main/${id}`);
      if (response.data && !response.data.success) {
        throw new Error(response.data.message || "메인 배너 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("메인 배너 삭제 오류:", error);
      throw error;
    }
  },

  // 업체 배너 삭제
  deleteCompanyBanner: async (id: number): Promise<void> => {
    try {
      const response = await axios.delete(`/banner/company/${id}`);
      if (response.data && !response.data.success) {
        throw new Error(response.data.message || "업체 배너 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("업체 배너 삭제 오류:", error);
      throw error;
    }
  },

  // 하단 배너 생성
  createBottomBanner: async (
    bannerData: any,
    pcImage: File,
    mobileImage: File
  ): Promise<Banner> => {
    const formData = new FormData();

    // 텍스트 데이터 추가
    Object.keys(bannerData).forEach((key) => {
      if (bannerData[key] !== undefined && bannerData[key] !== null) {
        // position 값은 문자열로 변환하여 전송
        if (key === "position") {
          formData.append(key, String(bannerData[key]));
        } else {
          formData.append(key, bannerData[key]);
        }
      }
    });

    // 이미지 파일 추가
    formData.append("pUrl", pcImage);
    formData.append("mUrl", mobileImage);

    try {
      // Authorization 헤더는 인터셉터에서 자동으로 추가됨
      const response = await axios.post("/banner/bottom", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "하단 배너 생성에 실패했습니다.");
    } catch (error) {
      console.error("하단 배너 생성 오류:", error);
      throw error;
    }
  },

  // 미니 배너 생성
  createMiniBanner: async (bannerData: any, pcImage: File, mobileImage: File): Promise<Banner> => {
    const formData = new FormData();

    // position 값이 없으면 기본값 0 설정
    if (bannerData.position === undefined || bannerData.position === null) {
      bannerData.position = 0;
    }

    // position 값을 먼저 추가하여 항상 전송되도록 함
    formData.append("position", String(bannerData.position));

    // 나머지 텍스트 데이터 추가
    Object.keys(bannerData).forEach((key) => {
      if (key !== "position" && bannerData[key] !== undefined && bannerData[key] !== null) {
        formData.append(key, bannerData[key]);
      }
    });

    // 이미지 파일 추가
    formData.append("pUrl", pcImage);
    formData.append("mUrl", mobileImage);

    try {
      // Authorization 헤더는 인터셉터에서 자동으로 추가됨
      const response = await axios.post("/banner/mini", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "미니 배너 생성에 실패했습니다.");
    } catch (error) {
      console.error("미니 배너 생성 오류:", error);
      throw error;
    }
  },

  // 하단 배너 수정
  updateBottomBanner: async (
    id: number,
    bannerData: any,
    pcImage?: File | null,
    mobileImage?: File | null
  ): Promise<Banner> => {
    try {
      const formData = new FormData();

      // 이미지 없이 기본 데이터만 전송하는 방식 시도
      const hasNoImages =
        (!pcImage || !(pcImage instanceof File) || pcImage.size === 0) &&
        (!mobileImage || !(mobileImage instanceof File) || mobileImage.size === 0);

      // 이미지가 없는 경우 일반 JSON 요청으로 처리
      if (hasNoImages) {
        // 날짜 형식 확인 및 변환
        if (bannerData.startDate) {
          try {
            // ISO 형식인지 확인하고 아니면 변환 시도
            const startDate = new Date(bannerData.startDate);
            bannerData.startDate = startDate.toISOString();
          } catch (e) {
            console.error("startDate 형식 오류:", e);
          }
        }

        if (bannerData.endDate) {
          try {
            // ISO 형식인지 확인하고 아니면 변환 시도
            const endDate = new Date(bannerData.endDate);
            bannerData.endDate = endDate.toISOString();
          } catch (e) {
            console.error("endDate 형식 오류:", e);
          }
        }

        // position 값은 문자열로 변환
        if (bannerData.position !== undefined) {
          bannerData.position = String(bannerData.position);
        }

        // 이미지 파일 없이 JSON 데이터만 PUT 요청
        const response = await axios.put(`/banner/bottom/${id}`, bannerData, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.data && response.data.success) {
          return response.data.data;
        }
        throw new Error(response.data.message || "하단 배너 수정에 실패했습니다.");
      } else {
        // 이미지가 있는 경우 multipart/form-data로 처리
        // 텍스트 데이터 추가
        Object.keys(bannerData).forEach((key) => {
          if (bannerData[key] !== undefined && bannerData[key] !== null) {
            // position 값은 문자열로 변환하여 전송
            if (key === "position") {
              formData.append(key, String(bannerData[key]));
            } else {
              formData.append(key, bannerData[key]);
            }
          }
        });

        // 이미지 파일 추가
        if (pcImage && pcImage instanceof File && pcImage.size > 0) {
          formData.append("pUrl", pcImage);
        }

        if (mobileImage && mobileImage instanceof File && mobileImage.size > 0) {
          formData.append("mUrl", mobileImage);
        }

        const response = await axios.put(`/banner/bottom/${id}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        if (response.data && response.data.success) {
          return response.data.data;
        }
        throw new Error(response.data.message || "하단 배너 수정에 실패했습니다.");
      }
    } catch (error) {
      console.error("하단 배너 수정 오류:", error);
      throw error;
    }
  },

  // 미니 배너 수정
  updateMiniBanner: async (
    id: number,
    bannerData: any,
    pcImage?: File | null,
    mobileImage?: File | null
  ): Promise<Banner> => {
    try {
      const formData = new FormData();

      // 이미지 없이 기본 데이터만 전송하는 방식 시도
      const hasNoImages =
        (!pcImage || !(pcImage instanceof File) || pcImage.size === 0) &&
        (!mobileImage || !(mobileImage instanceof File) || mobileImage.size === 0);

      // 이미지가 없는 경우 일반 JSON 요청으로 처리
      if (hasNoImages) {
        // 날짜 형식 확인 및 변환
        if (bannerData.startDate) {
          try {
            // ISO 형식인지 확인하고 아니면 변환 시도
            const startDate = new Date(bannerData.startDate);
            bannerData.startDate = startDate.toISOString();
          } catch (e) {
            console.error("startDate 형식 오류:", e);
          }
        }

        if (bannerData.endDate) {
          try {
            // ISO 형식인지 확인하고 아니면 변환 시도
            const endDate = new Date(bannerData.endDate);
            bannerData.endDate = endDate.toISOString();
          } catch (e) {
            console.error("endDate 형식 오류:", e);
          }
        }

        // position 값은 문자열로 변환
        if (bannerData.position !== undefined) {
          bannerData.position = String(bannerData.position);
        }

        // 이미지 파일 없이 JSON 데이터만 PUT 요청
        const response = await axios.put(`/banner/mini/${id}`, bannerData, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.data && response.data.success) {
          return response.data.data;
        }
        throw new Error(response.data.message || "미니 배너 수정에 실패했습니다.");
      } else {
        // 이미지가 있는 경우 multipart/form-data로 처리
        // 텍스트 데이터 추가
        Object.keys(bannerData).forEach((key) => {
          if (bannerData[key] !== undefined && bannerData[key] !== null) {
            // position 값은 문자열로 변환하여 전송
            if (key === "position") {
              formData.append(key, String(bannerData[key]));
            } else {
              formData.append(key, bannerData[key]);
            }
          }
        });

        // 이미지 파일 추가
        if (pcImage && pcImage instanceof File && pcImage.size > 0) {
          formData.append("pUrl", pcImage);
        }

        if (mobileImage && mobileImage instanceof File && mobileImage.size > 0) {
          formData.append("mUrl", mobileImage);
        }

        const response = await axios.put(`/banner/mini/${id}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        if (response.data && response.data.success) {
          return response.data.data;
        }
        throw new Error(response.data.message || "미니 배너 수정에 실패했습니다.");
      }
    } catch (error) {
      console.error("미니 배너 수정 오류:", error);
      throw error;
    }
  },

  // 하단 배너 삭제
  deleteBottomBanner: async (id: number): Promise<void> => {
    try {
      const response = await axios.delete(`/banner/bottom/${id}`);
      if (!response.data.success) {
        throw new Error(response.data.message || "하단 배너 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("하단 배너 삭제 오류:", error);
      throw error;
    }
  },

  // 미니 배너 삭제
  deleteMiniBanner: async (id: number): Promise<void> => {
    try {
      const response = await axios.delete(`/banner/mini/${id}`);
      if (!response.data.success) {
        throw new Error(response.data.message || "미니 배너 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("미니 배너 삭제 오류:", error);
      throw error;
    }
  },
};

export default BannerApiService;
