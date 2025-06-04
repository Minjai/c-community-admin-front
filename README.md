# 커뮤니티 어드민 프론트엔드 (c-community-admin-front)

## 프로젝트 개요

이 프로젝트는 커뮤니티 서비스의 관리자 기능을 제공하는 프론트엔드 애플리케이션입니다. Vite, React, TypeScript, Tailwind CSS를 사용하여 개발되었습니다.

## 주요 기능

- 대시보드 (비활성화): 주요 통계 확인
- 배너 관리: 메인, 업체, 하단, 미니 배너 관리
- 데이터 관리: 카지노 게임/추천, 스포츠 종목/추천 정보 관리
- 리뷰 업체 관리: 카지노 업체 정보 관리
- 가이드라인 관리: 카지노, 스포츠, 크립토 가이드라인 관리
- 커뮤니티 관리: 공지사항, 게시글 관리
- 회원 관리: 일반 회원, 관리자 계정, 회원 등급 관리
- 뉴스 관리: 뉴스 목록 관리
- 송금 배너 관리: 송금 관련 배너 관리
- 하단 푸터 관리: 웹사이트 하단 푸터 링크 관리

## 설치 및 실행

### 요구 사항

- Node.js (권장 버전: 18.x 이상)
- npm 또는 yarn

### 설치

1.  저장소를 클론합니다:
    ```bash
    git clone <repository-url>
    cd c-community-admin-front
    ```
2.  의존성을 설치합니다:
    ```bash
    npm install
    # 또는
    yarn install
    ```

### 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 환경 변수를 설정합니다:

```env
VITE_API_BASE_URL=http://your-backend-api-url # 백엔드 API 기본 URL
VITE_ADMIN_PORT=5173                        # 어드민 프론트엔드 실행 포트 (선택사항, 기본값 5173)
VITE_CASINO_INFO_URL_PREFIX="www.your-casino-info-domain.com/" # 카지노 정보 URL 접두사 (선택사항)
```

### 실행

1.  개발 서버를 시작합니다:
    ```bash
    npm run dev
    # 또는
    yarn dev
    ```
2.  브라우저에서 `http://localhost:{VITE_ADMIN_PORT}` (기본값: `http://localhost:5173`) 로 접속합니다.

### 빌드

프로젝트를 프로덕션 환경용으로 빌드합니다. 이 명령어는 내부적으로 Vite를 사용합니다.

```bash
vite build
```

빌드 결과물은 `dist` 디렉토리에 생성됩니다.

## 프로젝트 구조

- `src/api`: Axios 인스턴스 설정 및 API 호출 함수 정의 (`axios.ts`, `index.ts`, `util.ts`)
- `src/components`: 재사용 가능한 UI 컴포넌트 (`DataTable`, `Modal`, `Button`, `Input`, `FileUpload` 등)
- `src/contexts`: 전역 상태 관리 (예: `AuthContext`)
- `src/layouts`: 페이지 레이아웃 컴포넌트 (`MainLayout.tsx`)
- `src/pages`: 각 페이지별 컴포넌트
  - `banners/`: 배너 관리 페이지
  - `community/`: 커뮤니티(게시글) 관리 페이지
  - `data/`: 데이터(카지노, 스포츠) 관리 페이지
  - `footer/`: 하단 푸터 관리 페이지
  - `guidelines/`: 가이드라인 관리 페이지
  - `news/`: 뉴스 관리 페이지
  - `notice/`: 공지사항 관리 페이지
  - `remittance/`: 송금 배너 관리 페이지
  - `reviews/`: 리뷰 업체 관리 페이지
  - `users/`: 사용자(회원, 관리자, 등급) 관리 페이지
  - `DashboardPage.tsx`: 대시보드 페이지
  - `LoginPage.tsx`: 로그인 페이지
- `src/services`: API 서비스 로직 (각 기능별 `ApiService.ts`)
- `src/types`: TypeScript 타입 정의 (`index.ts`)
- `src/utils`: 유틸리티 함수 (`dateUtils.ts` 등)

## 인증

- 관리자 로그인은 `src/api/axios.ts`의 `handleAdminLogin` 함수를 통해 처리됩니다.
- 로그인 시 `POST /admin/login` 엔드포인트로 이메일과 비밀번호를 전송합니다.
- 성공 시 서버로부터 받은 토큰(Access Token, Refresh Token)과 사용자 정보를 로컬 스토리지에 저장합니다.
  - 어드민 포트(`VITE_ADMIN_PORT`)에서 실행 시 `admin_token`, `admin_refreshToken`, `adminUserData` 키 사용.
- API 요청 시 `axios` 인터셉터가 로컬 스토리지에서 토큰을 읽어 `Authorization: Bearer <token>` 헤더를 자동으로 추가합니다.
- 토큰 만료 시 리프레시 토큰을 사용하여 재발급 로직이 인터셉터 내에 구현되어 있습니다.

## 페이지별 API 엔드포인트

각 페이지에서 사용되는 주요 API 요청 경로입니다. (`{id}`는 해당 리소스의 고유 ID를 나타냅니다.)

### 1. 로그인 (`src/pages/LoginPage.tsx`)

- **서비스:** `src/api/axios.ts` (직접 호출)
- **주요 기능:** 관리자 로그인
- **엔드포인트:**
  - `POST /api/admin/login`: 로그인 시도

### 2. 대시보드 (비활성화) (`src/pages/DashboardPage.tsx`)

- **서비스:** `src/services/DashboardService.ts`
- **주요 기능:** 통계 데이터 조회
- **엔드포인트:**
  - `GET /api/dashboard/stats`: 대시보드 통계 데이터 조회

### 3. 배너 관리

#### 3.1. 메인 배너 (`src/pages/banners/MainBannerPage.tsx`)

- **서비스:** `src/services/BannerApiService.ts`
- **주요 기능:** 메인 배너 목록 조회, 추가, 수정, 삭제, 순서 변경
- **엔드포인트:**
  - `GET /api/banner/main`: 메인 배너 목록 조회 (페이지네이션 포함)
  - `POST /api/banner/main`: 새 메인 배너 추가 (FormData, 이미지 포함)
  - `PUT /api/banner/main/{id}`: 메인 배너 수정 (FormData 또는 JSON)
  - `DELETE /api/banner/main/{id}`: 메인 배너 삭제
  - `PATCH /api/banner/main/{id}/order`: 메인 배너 순서 변경

#### 3.2. 업체 배너 (`src/pages/banners/CompanyBannerPage.tsx`)

- **서비스:** `src/services/BannerApiService.ts`
- **주요 기능:** 업체 배너 목록 조회, 추가, 수정, 삭제, 순서 변경
- **엔드포인트:**
  - `GET /api/banner/company`: 업체 배너 목록 조회 (페이지네이션 포함)
  - `POST /api/banner/company`: 새 업체 배너 추가 (FormData, 이미지 포함)
  - `PUT /api/banner/company/{id}`: 업체 배너 수정 (FormData 또는 JSON)
  - `DELETE /api/banner/company/{id}`: 업체 배너 삭제
  - `PATCH /api/banner/company/{id}/order`: 업체 배너 순서 변경

#### 3.3. 하단 배너 (`src/pages/banners/BottomBannerPage.tsx`)

- **서비스:** `src/services/BannerApiService.ts`
- **주요 기능:** 하단 배너 목록 조회, 추가, 수정, 삭제, 순서 변경
- **엔드포인트:**
  - `GET /api/banner/bottom`: 하단 배너 목록 조회 (페이지네이션 포함)
  - `POST /api/banner/bottom`: 새 하단 배너 추가 (FormData, 이미지 포함)
  - `PUT /api/banner/bottom/{id}`: 하단 배너 수정 (FormData 또는 JSON)
  - `DELETE /api/banner/bottom/{id}`: 하단 배너 삭제
  - `PATCH /api/banner/bottom/{id}/order`: 하단 배너 순서 변경

#### 3.4. 미니 배너 (`src/pages/banners/MiniBannerPage.tsx`)

- **서비스:** `src/services/BannerApiService.ts`
- **주요 기능:** 미니 배너 목록 조회, 추가, 수정, 삭제, 순서 변경
- **엔드포인트:**
  - `GET /api/banner/mini`: 미니 배너 목록 조회 (페이지네이션 포함)
  - `POST /api/banner/mini`: 새 미니 배너 추가 (FormData, 이미지 포함)
  - `PUT /api/banner/mini/{id}`: 미니 배너 수정 (FormData 또는 JSON)
  - `DELETE /api/banner/mini/{id}`: 미니 배너 삭제
  - `PATCH /api/banner/mini/{id}/order`: 미니 배너 순서 변경

### 4. 데이터 관리

#### 4.1. 카지노 게임 (`src/pages/data/CasinoGameManagement.tsx`)

- **서비스:** `src/api/axios.ts` (직접 호출)
- **주요 기능:** 카지노 게임 목록 조회, 추가, 수정, 삭제
- **엔드포인트:**
  - `GET /api/casino`: 카지노 게임 목록 조회 (페이지네이션 포함)
  - `POST /api/casino`: 새 카지노 게임 추가 (FormData, 썸네일 포함)
  - `PUT /api/casino/{id}`: 카지노 게임 수정 (FormData 또는 JSON)
  - `DELETE /api/casino/{id}`: 카지노 게임 삭제
  - `GET /api/casino/all`: (모달 내 게임 선택용) 전체 카지노 게임 목록 조회

#### 4.2. 카지노 추천 (`src/pages/data/CasinoRecommendationManagement.tsx`)

- **서비스:** `src/api/axios.ts` (직접 호출)
- **주요 기능:** 카지노 게임 추천 목록 조회, 추가, 수정, 삭제, 순서 변경
- **엔드포인트:**
  - `GET /api/casino-recommends`: 카지노 추천 목록 조회 (페이지네이션 없음)
  - `POST /api/casino-recommends/admin`: 새 카지노 추천 추가
  - `PUT /api/casino-recommends/admin/{id}`: 카지노 추천 수정
  - `DELETE /api/casino-recommends/admin/{id}`: 카지노 추천 삭제
  - `PATCH /api/casino-recommends/admin/{id}/order`: 카지노 추천 순서 변경
  - `GET /api/casino/all`: (모달 내 게임 선택용) 전체 카지노 게임 목록 조회

#### 4.3. 스포츠 종목 (`src/pages/data/SportsManagement.tsx`)

- **서비스:** `src/api/index.ts`
- **주요 기능:** 스포츠 종목 목록 조회, 추가, 수정, 삭제
- **엔드포인트:**
  - `GET /api/sport-categories/admin`: 스포츠 종목 목록 조회 (페이지네이션 포함)
  - `POST /api/sport-categories/admin`: 새 스포츠 종목 추가
  - `PUT /api/sport-categories/admin/{id}`: 스포츠 종목 수정
  - `DELETE /api/sport-categories/admin/{id}`: 스포츠 종목 삭제
  - `POST /api/sport-categories/admin/bulk-update`: (사용되지 않을 수 있음) 스포츠 종목 일괄 업데이트

#### 4.4. 스포츠 추천 (`src/pages/data/SportRecommendationsManagement.tsx`)

- **서비스:** `src/api/index.ts`
- **주요 기능:** 스포츠 추천 목록 조회, 추가, 수정, 삭제
- **엔드포인트:**
  - `GET /api/sport-recommendations/admin`: 스포츠 추천 목록 조회 (페이지네이션 포함)
  - `POST /api/sport-recommendations/admin`: 새 스포츠 추천 추가
  - `PUT /api/sport-recommendations/admin/{id}`: 스포츠 추천 수정
  - `DELETE /api/sport-recommendations/admin/{id}`: 스포츠 추천 삭제
  - `GET /api/sports/admin/games`: (모달 내 게임 선택용) 스포츠 게임 목록 조회

### 5. 리뷰 업체 관리 (`src/pages/reviews/CasinoCompanyPage.tsx`)

- **서비스:** `src/services/CasinoCompanyApiService.ts`
- **주요 기능:** 카지노 업체 목록 조회, 추가, 수정, 삭제, 순서 변경
- **엔드포인트:**
  - `GET /api/companies`: 카지노 업체 목록 조회 (페이지네이션 포함)
  - `POST /api/companies`: 새 카지노 업체 추가 (FormData, 로고 포함)
  - `PUT /api/companies/{id}`: 카지노 업체 수정 (FormData 또는 JSON)
  - `DELETE /api/companies/{id}`: 카지노 업체 삭제
  - `PATCH /api/companies/{id}/display-order`: 카지노 업체 순서 변경

### 6. 가이드라인 관리

#### 6.1. 카지노 가이드라인 (`src/pages/guidelines/CasinoGuidelineManagement.tsx`)

- **서비스:** `src/services/GuidelineApiService.ts`
- **주요 기능:** 카지노 가이드라인 목록 조회, 삭제 (상세 내용은 `GuidelineDetail` 사용)
- **엔드포인트:**
  - `GET /api/guidelines?boardId=3`: 카지노 가이드라인 목록 조회 (페이지네이션 포함)
  - `DELETE /api/guidelines/{id}`: 가이드라인 삭제

#### 6.2. 스포츠 가이드라인 (`src/pages/guidelines/SportsGuidelineManagement.tsx`)

- **서비스:** `src/services/GuidelineApiService.ts`
- **주요 기능:** 스포츠 가이드라인 목록 조회, 삭제 (상세 내용은 `GuidelineDetail` 사용)
- **엔드포인트:**
  - `GET /api/guidelines?boardId=4`: 스포츠 가이드라인 목록 조회 (페이지네이션 포함)
  - `DELETE /api/guidelines/{id}`: 가이드라인 삭제

#### 6.3. 크립토 가이드라인 (`src/pages/guidelines/CryptoGuidelineManagement.tsx`)

- **서비스:** `src/services/GuidelineApiService.ts`
- **주요 기능:** 크립토 가이드라인 목록 조회, 삭제 (상세 내용은 `GuidelineDetail` 사용)
- **엔드포인트:**
  - `GET /api/guidelines?boardId=5`: 크립토 가이드라인 목록 조회 (페이지네이션 포함)
  - `DELETE /api/guidelines/{id}`: 가이드라인 삭제

#### 6.4. 가이드라인 상세/수정 (`src/pages/guidelines/GuidelineDetail.tsx`)

- **서비스:** `src/services/GuidelineApiService.ts`
- **주요 기능:** 가이드라인 상세 조회, 생성, 수정
- **엔드포인트:**
  - `GET /api/guidelines/{id}`: 가이드라인 상세 조회
  - `POST /api/guidelines`: 새 가이드라인 생성
  - `PUT /api/guidelines/{id}`: 가이드라인 수정

### 7. 커뮤니티 관리

#### 7.1. 공지사항 (`src/pages/notice/NoticeManagement.tsx`)

- **서비스:** `src/api/axios.ts` (직접 호출)
- **주요 기능:** 공지사항 목록 조회, 삭제 (상세 내용은 `NoticeDetail` 사용)
- **엔드포인트:**
  - `GET /api/posts?boardId=1`: 공지사항 목록 조회 (페이지네이션 포함)
  - `DELETE /api/posts/{id}`: 공지사항 삭제

#### 7.2. 공지사항 상세/수정 (`src/pages/notice/NoticeDetail.tsx`)

- **서비스:** `src/api/axios.ts` (직접 호출)
- **주요 기능:** 공지사항 상세 조회, 생성, 수정
- **엔드포인트:**
  - `GET /api/posts/{id}`: 공지사항 상세 조회
  - `POST /api/posts`: 새 공지사항 생성 (boardId=1 포함)
  - `PUT /api/posts/{id}`: 공지사항 수정

#### 7.3. 게시글 (`src/pages/community/PostManagement.tsx`)

- **서비스:** `src/api/axios.ts` (직접 호출)
- **주요 기능:** 게시글 목록 조회, 삭제 (상세 내용은 `PostManagementDetail` 사용)
- **엔드포인트:**
  - `GET /api/posts?boardId=2`: 게시글 목록 조회 (페이지네이션 포함)
  - `DELETE /api/posts/{id}`: 게시글 삭제

#### 7.4. 게시글 상세/수정 (`src/pages/community/PostManagementDetail.tsx`)

- **서비스:** `src/api/axios.ts` (직접 호출)
- **주요 기능:** 게시글 상세 조회, 수정
- **엔드포인트:**
  - `GET /api/posts/{id}`: 게시글 상세 조회
  - `PUT /api/posts/{id}`: 게시글 수정

### 8. 회원 관리

#### 8.1. 회원 정보 (`src/pages/users/UserManagementPage.tsx`)

- **서비스:** `src/api/axios.ts` (직접 호출)
- **주요 기능:** 회원 목록 조회, 상세 조회, 정보 수정 (API 미구현 상태일 수 있음)
- **엔드포인트:** (가정)
  - `GET /api/admin/users`: 회원 목록 조회 (페이지네이션 포함)
  - `GET /api/admin/users/{id}`: 회원 상세 정보 조회
  - `PUT /api/admin/users/{id}`: 회원 정보 수정

#### 8.2. 회원 등급 (`src/pages/users/UserRankManagement.tsx`)

- **서비스:** `src/api/axios.ts` (직접 호출)
- **주요 기능:** 회원 등급 목록 조회, 추가, 수정, 삭제
- **엔드포인트:**
  - `GET /api/admin/ranks`: 회원 등급 목록 조회 (페이지네이션 포함)
  - `POST /api/admin/ranks`: 새 회원 등급 추가 (FormData, 이미지 포함)
  - `PUT /api/admin/ranks/{id}`: 회원 등급 수정 (FormData, 이미지 포함)
  - `DELETE /api/admin/ranks/{id}`: 회원 등급 삭제

#### 8.3. 관리자 계정 (`src/pages/users/AdminManagement.tsx`)

- **서비스:** `src/api/axios.ts` (직접 호출)
- **주요 기능:** 관리자 계정 목록 조회, 추가, 수정, 삭제
- **엔드포인트:**
  - `GET /api/admin/accounts`: 관리자 목록 조회 (페이지네이션 포함)
  - `POST /api/admin/signup`: 새 관리자 계정 추가
  - `PUT /api/admin/account/{id}`: 관리자 정보 수정 (이메일, 닉네임, 비밀번호)
  - `DELETE /api/admin/account/{id}`: 관리자 계정 삭제

### 9. 뉴스 관리 (`src/pages/news/NewsCasinoListPage.tsx`)

- **서비스:** `src/api/axios.ts` (직접 호출)
- **주요 기능:** 뉴스 목록 조회, 추가, 수정, 삭제, 공개 상태 변경
- **엔드포인트:**
  - `GET /api/admin-news/admin`: 뉴스 목록 조회 (페이지네이션 포함)
  - `POST /api/admin-news/admin`: 새 뉴스 추가
  - `PUT /api/admin-news/admin/{id}`: 뉴스 수정
  - `DELETE /api/admin-news/admin/{id}`: 뉴스 삭제
  - `PUT /api/admin-news/admin/{id}/toggle-public`: 뉴스 공개 상태 변경

### 10. 송금 배너 관리 (`src/pages/remittance/RemittanceBannerPage.tsx`)

- **서비스:** `src/services/RemittanceBannerService.ts`
- **주요 기능:** 송금 배너 목록 조회, 추가, 수정, 삭제, 순서 변경
- **엔드포인트:**
  - `GET /api/remittance-banners`: 송금 배너 목록 조회 (페이지네이션 포함)
  - `POST /api/remittance-banners`: 새 송금 배너 추가 (FormData, 로고 포함)
  - `PUT /api/remittance-banners/{id}`: 송금 배너 수정 (FormData, 로고 포함)
  - `DELETE /api/remittance-banners/{id}`: 송금 배너 삭제
  - `PATCH /api/remittance-banners/order`: 송금 배너 순서 일괄 변경

### 11. 하단 푸터 관리 (`src/pages/footer/FooterManagementPage.tsx`)

- **서비스:** `src/api/axios.ts` (직접 호출, 모달 내에서는 `FooterFormModal.tsx` 에서 처리)
- **주요 기능:** 푸터 항목 목록 조회, 추가, 수정, 삭제
- **엔드포인트:**
  - `GET /api/footer/all`: 푸터 항목 목록 조회 (페이지네이션 포함)
  - `POST /api/footer`: 새 푸터 항목 추가 (모달에서 처리)
  - `PUT /api/footer/{id}`: 푸터 항목 수정 (모달에서 처리)
  - `DELETE /api/footer/{id}`: 푸터 항목 개별 삭제
  - `DELETE /api/footer`: 푸터 항목 일괄 삭제 (body에 `ids` 배열 포함)

## 주요 공통 컴포넌트

- `src/components/DataTable.tsx`: 데이터 목록 표시 및 페이지네이션 처리
- `src/components/Modal.tsx`: 팝업 모달 창
- `src/components/Button.tsx`: 기본 버튼
- `src/components/ActionButton.tsx`: 테이블 내 동작 버튼 (수정, 삭제, 위/아래 이동)
- `src/components/forms/`: 입력 필드 관련 컴포넌트 (`Input`, `Select`, `DatePicker`, `FileUpload`, `TextEditor`)
- `src/components/Alert.tsx`: 알림 메시지 표시
- `src/components/LoadingOverlay.tsx`: 로딩 중 오버레이 표시

## 주요 유틸리티

- `src/utils/dateUtils.ts`: 날짜 형식 변환 및 표시 관련 함수
- `src/api/util.ts`: API 응답 데이터 추출 관련 유틸리티
