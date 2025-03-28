// 공통 타입 정의
export interface User {
  id: number;
  nickname: string;
  email: string;
  role: string;
  score: number;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  authorId: number;
  boardId: number;
  viewCount: number;
  isPopular: number;
  isPublic?: boolean | number;
  position?: number;
  imageUrl?: string;
  author?: User;
  attachments?: Attachment[];
  comments?: Comment[];
  likes?: PostLike[];
}

export interface Comment {
  id: number;
  content: string;
  authorId: number;
  postId: number;
  parentId?: number;
  createdAt: string;
  depth: number;
  author?: User;
  children?: Comment[];
}

export interface Board {
  id: number;
  name: string;
  posts?: Post[];
}

export interface Attachment {
  id: number;
  url: string;
  postId: number;
}

export interface Message {
  id: number;
  room: string;
  sender: string;
  content: string;
  timestamp: string;
}

export interface PostLike {
  id: number;
  postId: number;
  userId: number;
  createdAt: string;
}

// 배너 관련 타입
export interface Banner {
  id: number;
  title: string;
  pUrl: string;
  mUrl: string;
  startDate: string;
  endDate: string;
  isPublic: boolean;
  position: number;
  bannerType: "main" | "company" | "bottom" | "mini";
  companyDetailPath?: string;
  companyRedirectPath?: string;
  linkUrl?: string;
  linkUrl2?: string;
  targetPath?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 페이지네이션 타입
export interface PaginationParams {
  page: number;
  limit: number;
  total?: number;
}

// 응답 타입
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: PaginationParams;
}
