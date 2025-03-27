import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const LoginPage: React.FC = () => {
  const { login, isLoading, error: authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setDebugInfo(null);

    if (!email || !password) {
      setError("이메일과 비밀번호를 모두 입력해주세요.");
      return;
    }

    try {
      console.log("로그인 시도:", { email, password: "********" });
      await login(email, password);
      // 성공 시 AuthContext에서 자동으로 리다이렉트
    } catch (err: any) {
      // 오류 처리는 AuthContext에서 담당
      console.error("로그인 페이지 오류:", err);
      // 디버깅 정보 저장
      if (err.response) {
        setDebugInfo(
          JSON.stringify(
            {
              status: err.response.status,
              data: err.response.data,
              headers: err.response.headers,
            },
            null,
            2
          )
        );
      } else if (err.request) {
        setDebugInfo(
          JSON.stringify(
            {
              request: "요청은 전송되었지만 응답이 없습니다.",
              message: err.message,
            },
            null,
            2
          )
        );
      } else {
        setDebugInfo(
          JSON.stringify(
            {
              message: err.message,
              stack: err.stack,
            },
            null,
            2
          )
        );
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">관리자 로그인</h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                이메일 주소
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="이메일 주소"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {(error || authError) && <div className="text-red-500 text-sm">{error || authError}</div>}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                isLoading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {isLoading ? "로그인 중..." : "로그인"}
            </button>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowDebug(!showDebug)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              {showDebug ? "디버그 정보 숨기기" : "디버그 정보 보기"}
            </button>
          </div>

          {showDebug && debugInfo && (
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
              <pre>{debugInfo}</pre>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
