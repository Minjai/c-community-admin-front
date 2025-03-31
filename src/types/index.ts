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

// 카지노 업체 관련 타입
export interface CasinoCompany {
  id: number;
  companyName: string; // 업체명
  description: string; // 업체소개
  imageUrl: string; // 이미지 URL
  isPublic: boolean; // 공개여부
  displayOrder: number; // 순서 (서버에서는 displayOrder)
  linkUrl1?: string; // 링크 URL 1
  linkUrl2?: string; // 링크 URL 2
  rating: number; // 평점
  position?: number; // 내부 위치 속성 (서버에서도 position이 있음)
  createdAt: string; // 등록일자
  updatedAt?: string; // 수정일자
  reviews?: CompanyReview[]; // 리뷰 (상세 조회시)
}

// 회사 리뷰 타입
export interface CompanyReview {
  id: number;
  content: string;
  rating: number;
  userId: number;
  companyId: number;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    nickname: string;
  };
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
