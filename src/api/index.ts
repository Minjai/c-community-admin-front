import { Banner, User, Post, Comment, Board, Attachment, Message, PostLike } from "../types";
import prisma from "../lib/prisma";
import axios from "@/api/axios";

// 배너 관련 API 함수
export const getBanners = async (
  type?: "main" | "company" | "bottom" | "mini"
): Promise<Banner[]> => {
  try {
    const banners = await prisma.banner.findMany({
      where: type ? { type } : undefined,
      orderBy: { displayOrder: "asc" },
    });

    return banners as unknown as Banner[];
  } catch (error) {
    console.error("Error fetching banners:", error);
    throw error;
  }
};

export const getBannerById = async (id: number): Promise<Banner | null> => {
  try {
    const banner = await prisma.banner.findUnique({
      where: { id },
    });

    return banner as unknown as Banner;
  } catch (error) {
    console.error(`Error fetching banner with id ${id}:`, error);
    throw error;
  }
};

export const createBanner = async (data: Omit<Banner, "id">): Promise<Banner> => {
  try {
    const banner = await prisma.banner.create({
      data: data as any,
    });

    return banner as unknown as Banner;
  } catch (error) {
    console.error("Error creating banner:", error);
    throw error;
  }
};

export const updateBanner = async (id: number, data: Partial<Banner>): Promise<Banner> => {
  try {
    const banner = await prisma.banner.update({
      where: { id },
      data: data as any,
    });

    return banner as unknown as Banner;
  } catch (error) {
    console.error(`Error updating banner with id ${id}:`, error);
    throw error;
  }
};

export const deleteBanner = async (id: number): Promise<void> => {
  try {
    await prisma.banner.delete({
      where: { id },
    });
  } catch (error) {
    console.error(`Error deleting banner with id ${id}:`, error);
    throw error;
  }
};

export const updateBannerOrder = async (
  bannerOrders: { id: number; displayOrder: number }[]
): Promise<void> => {
  try {
    await prisma.$transaction(
      bannerOrders.map(({ id, displayOrder }) =>
        prisma.banner.update({
          where: { id },
          data: { displayOrder },
        })
      )
    );
  } catch (error) {
    console.error("Error updating banner orders:", error);
    throw error;
  }
};

// 사용자 관련 API 함수
export const getUsers = async (page = 1, limit = 10): Promise<{ users: User[]; total: number }> => {
  try {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count(),
    ]);

    return { users: users as unknown as User[], total };
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

export const getUserById = async (id: number): Promise<User | null> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    return user as unknown as User;
  } catch (error) {
    console.error(`Error fetching user with id ${id}:`, error);
    throw error;
  }
};

// 게시물 관련 API 함수
export const getPosts = async (
  page = 1,
  limit = 10,
  boardId?: number
): Promise<{ posts: Post[]; total: number }> => {
  try {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        skip,
        take: limit,
        where: boardId ? { boardId } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          author: true,
          attachments: true,
          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
        },
      }),
      prisma.post.count({
        where: boardId ? { boardId } : undefined,
      }),
    ]);

    return {
      posts: posts.map((post) => ({
        ...post,
        author: post.author as unknown as User,
        attachments: post.attachments as unknown as Attachment[],
      })) as unknown as Post[],
      total,
    };
  } catch (error) {
    console.error("Error fetching posts:", error);
    throw error;
  }
};

export const getPostById = async (id: number): Promise<Post | null> => {
  try {
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: true,
        attachments: true,
        comments: {
          include: {
            author: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        likes: true,
      },
    });

    if (!post) return null;

    return {
      ...post,
      author: post.author as unknown as User,
      attachments: post.attachments as unknown as Attachment[],
      comments: post.comments.map((comment) => ({
        ...comment,
        author: comment.author as unknown as User,
      })) as unknown as Comment[],
      likes: post.likes as unknown as PostLike[],
    } as unknown as Post;
  } catch (error) {
    console.error(`Error fetching post with id ${id}:`, error);
    throw error;
  }
};

// 게시판 관련 API 함수
export const getBoards = async (): Promise<Board[]> => {
  try {
    const boards = await prisma.board.findMany({
      orderBy: { id: "asc" },
    });

    return boards as unknown as Board[];
  } catch (error) {
    console.error("Error fetching boards:", error);
    throw error;
  }
};

// 통계 관련 API 함수
export const getDashboardStats = async (): Promise<any> => {
  try {
    const [totalUsers, todayUsers, newPosts, totalBannerClicks] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.post.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7)),
          },
        },
      }),
      prisma.bannerClick.count(),
    ]);

    return {
      totalUsers,
      todayUsers,
      newPosts,
      totalBannerClicks,
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    throw error;
  }
};

// 인증 관련 API 함수
export const login = async (
  email: string,
  password: string
): Promise<{ user: User; token: string } | null> => {
  try {
    // 실제 구현에서는 비밀번호 해싱 및 검증 로직 추가
    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user) return null;

    // 임시 토큰 생성 (실제 구현에서는 JWT 등 사용)
    const token = `token_${user.id}_${Date.now()}`;

    return { user: user as unknown as User, token };
  } catch (error) {
    console.error("Error during login:", error);
    throw error;
  }
};

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

export const getAllSportCategoriesAdmin = async (): Promise<any[]> => {
  try {
    const response = await axios.get("/sport-categories/admin");

    if (response.data && response.data.success) {
      return response.data.data || [];
    }

    return [];
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
