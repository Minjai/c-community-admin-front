import { PrismaClient } from '@prisma/client';

// 데이터 모델 타입 정의 확장
export interface User {
  id: number;
  email: string;
  nickname: string;
  password?: string;
  role: string;
  score: number;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  posts?: Post[];
  comments?: Comment[];
  likes?: PostLike[];
}

export interface Post {
  id: number;
  title: string;
  content: string;
  authorId: number;
  boardId: number;
  viewCount: number;
  isPopular: number;
  createdAt: Date;
  updatedAt: Date;
  author?: User;
  board?: Board;
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
  depth: number;
  createdAt: Date;
  updatedAt: Date;
  author?: User;
  post?: Post;
  parent?: Comment;
  children?: Comment[];
}

export interface Board {
  id: number;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  posts?: Post[];
}

export interface Attachment {
  id: number;
  url: string;
  filename: string;
  mimetype: string;
  size: number;
  postId: number;
  createdAt: Date;
  updatedAt: Date;
  post?: Post;
}

export interface PostLike {
  id: number;
  postId: number;
  userId: number;
  createdAt: Date;
  post?: Post;
  user?: User;
}

export interface Banner {
  id: number;
  title: string;
  pcImageUrl: string;
  mobileImageUrl: string;
  startDate: string;
  endDate: string;
  isPublic: boolean;
  displayOrder: number;
  type: 'main' | 'company' | 'bottom' | 'mini';
  companyDetailPath?: string;
  companyRedirectPath?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BannerClick {
  id: number;
  bannerId: number;
  userId?: number;
  ipAddress: string;
  createdAt: Date;
  banner?: Banner;
  user?: User;
}

export interface Guideline {
  id: number;
  title: string;
  content: string;
  category: 'casino' | 'sports' | 'crypto';
  displayOrder: number;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CasinoGame {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  provider: string;
  isRecommended: boolean;
  displayOrder: number;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SportCategory {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  isRecommended: boolean;
  displayOrder: number;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CasinoCompany {
  id: number;
  name: string;
  description: string;
  logoUrl: string;
  websiteUrl: string;
  rating: number;
  reviewContent: string;
  isRecommended: boolean;
  displayOrder: number;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserLevel {
  id: number;
  name: string;
  minScore: number;
  maxScore: number;
  benefits: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SiteMenu {
  id: number;
  name: string;
  url: string;
  parentId?: number;
  displayOrder: number;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  parent?: SiteMenu;
  children?: SiteMenu[];
}

export interface SiteTerm {
  id: number;
  title: string;
  content: string;
  type: 'terms' | 'privacy' | 'disclaimer';
  version: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FooterContent {
  id: number;
  content: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// API 응답 타입
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

// 전역 타입 확장
declare global {
  var prisma: PrismaClient;
}
