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
  displayOrder: number;
  imageUrl?: string;
  tags?: string[];
  author?: User;
  tempUser?: {
    id: number;
    nickname: string;
    profileImageUrl?: string;
    rank: string;
  };
  _count?: {
    comments: number;
    likes: number;
  };
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
  pcImage?: string;
  mobileImage?: string;
  pDescription?: string | null;
  mDescription?: string | null;
  linkUrl?: string | null;
  linkUrl2?: string | null;
  isPublic: number;
  displayOrder?: number;
  position: number;
  createdAt?: string;
  updatedAt?: string;
  bannerType: string;
  startDate: string;
  endDate: string;
  showButton?: boolean;
  buttonText?: string;
  buttonColor?: string;
}

// 카지노 업체 관련 타입
export interface CasinoCompany {
  id: number;
  companyName: string; // 업체명
  description: string; // 업체소개
  imageUrl: string; // 이미지 URL
  isPublic: number; // boolean에서 number로 변경
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
export interface PaginationInfo {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

// Paginated data structure (when pagination is inside the 'data' object)
export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
  total?: number;
}

// 응답 타입
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string; // error -> message 로 변경하고 optional 로
  pagination?: PaginationInfo; // PaginationParams -> PaginationInfo 로 변경
}

// 스포츠 종목 관련 타입
export interface SportGame {
  id: number;
  sport: string;
  dateTime: string;
  league: string;
  matchName: string;
  homeTeam: string;
  awayTeam: string;
  isPublic?: number;
  position?: number;
  createdAt?: string;
  updatedAt?: string;
}

// 스포츠 추천 관련 타입
export interface SportRecommendation {
  id: number;
  sportGameId: number;
  sportGameIds?: number[];
  title: string;
  description?: string;
  isPublic: number;
  displayOrder: number;
  startTime: string;
  endTime: string;
  sportGame?: SportGame;
  games?: SportGame[];
  createdAt: string;
  updatedAt: string;
}

// 스포츠 종목 카테고리 관련 타입
export interface SportCategory {
  id: number;
  sportName: string;
  displayName?: string;
  category?: string; // goalserve 또는 sport
  icon?: string;
  isPublic: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

// 스포츠 경기 분석 관련 타입
export interface SportGameAnalysis {
  id: number;
  categoryId: number;
  homeTeam: string;
  awayTeam: string;
  homeTeamImageUrl?: string;
  awayTeamImageUrl?: string;
  gameDate: string;
  content: string;
  startTime: string;
  endTime: string;
  isPublic: number;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
  category?: {
    displayName: string;
  };
  league?: string;
}

export interface SportGameAnalysisFormData {
  categoryId: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamImage: File | null;
  awayTeamImage: File | null;
  gameDate: string;
  content: string;
  startTime: string;
  endTime: string;
  isPublic: number;
  displayOrder: number;
}

// 송금 배너(암호화폐 송금) 관련 타입
export interface RemittanceBanner {
  id: number;
  name: string; // siteName → name으로 변경
  imageUrl: string; // logo → imageUrl로 변경
  link: string;
  isPublic: number;
  displayOrder: number; // 순서
  createdAt: string;
  updatedAt: string;
}
