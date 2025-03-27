import { Banner, User, Post, Comment, Board, Attachment, Message, PostLike } from '../types';
import prisma from '../lib/prisma';

// 배너 관련 API 함수
export const getBanners = async (type?: 'main' | 'company' | 'bottom' | 'mini'): Promise<Banner[]> => {
  try {
    const banners = await prisma.banner.findMany({
      where: type ? { type } : undefined,
      orderBy: { displayOrder: 'asc' },
    });
    
    return banners as unknown as Banner[];
  } catch (error) {
    console.error('Error fetching banners:', error);
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

export const createBanner = async (data: Omit<Banner, 'id'>): Promise<Banner> => {
  try {
    const banner = await prisma.banner.create({
      data: data as any,
    });
    
    return banner as unknown as Banner;
  } catch (error) {
    console.error('Error creating banner:', error);
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

export const updateBannerOrder = async (bannerOrders: { id: number; displayOrder: number }[]): Promise<void> => {
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
    console.error('Error updating banner orders:', error);
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
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);
    
    return { users: users as unknown as User[], total };
  } catch (error) {
    console.error('Error fetching users:', error);
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
export const getPosts = async (page = 1, limit = 10, boardId?: number): Promise<{ posts: Post[]; total: number }> => {
  try {
    const skip = (page - 1) * limit;
    
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        skip,
        take: limit,
        where: boardId ? { boardId } : undefined,
        orderBy: { createdAt: 'desc' },
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
      posts: posts.map(post => ({
        ...post,
        author: post.author as unknown as User,
        attachments: post.attachments as unknown as Attachment[],
      })) as unknown as Post[], 
      total 
    };
  } catch (error) {
    console.error('Error fetching posts:', error);
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
            createdAt: 'asc',
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
      comments: post.comments.map(comment => ({
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
      orderBy: { id: 'asc' },
    });
    
    return boards as unknown as Board[];
  } catch (error) {
    console.error('Error fetching boards:', error);
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
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
};

// 인증 관련 API 함수
export const login = async (email: string, password: string): Promise<{ user: User; token: string } | null> => {
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
    console.error('Error during login:', error);
    throw error;
  }
};
