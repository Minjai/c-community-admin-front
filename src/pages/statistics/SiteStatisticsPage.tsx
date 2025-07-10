import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  getSiteSummary,
  getSiteChart,
  getSitePeriodSummary,
  getMemberGradeSummary,
} from "@/api/index";

const graphTabs = [
  { key: "today", label: "금일" },
  { key: "yesterday", label: "전일" },
  { key: "week", label: "주간" },
  { key: "month", label: "월간" },
];

const chartApiMap: Record<string, "daily" | "weekly" | "monthly"> = {
  yesterday: "daily",
  week: "weekly",
  month: "monthly",
};

const SiteStatisticsPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState<"today" | "yesterday" | "week" | "month">("today");
  const [summary, setSummary] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [period, setPeriod] = useState<{ start: string; end: string }>({
    start: new Date().toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
  });
  const [periodData, setPeriodData] = useState<any>(null);
  const [gradeData, setGradeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // summary, chart, grade fetch
  useEffect(() => {
    setLoading(true);
    setError(null);
    // summary fetch (금일/접속자현황/가입자현황)
    getSiteSummary()
      .then((data) => setSummary(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // 등급별 회원 현황 fetch
    getMemberGradeSummary()
      .then((data) => setGradeData(data))
      .catch(() => {});
  }, []);

  // 상단 버튼별 chart fetch
  useEffect(() => {
    if (selectedTab === "today") {
      setChartData([]);
      return;
    }
    setLoading(true);
    setError(null);
    getSiteChart(chartApiMap[selectedTab])
      .then((data) => setChartData(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedTab]);

  // 기간 내 현황 fetch
  useEffect(() => {
    if (!period.start || !period.end) return;
    getSitePeriodSummary(period.start, period.end)
      .then((data) => setPeriodData(data))
      .catch(() => {});
  }, [period]);

  // 버튼 UI 및 클릭 핸들러
  const handleTab = (tab: "today" | "yesterday" | "week" | "month") => {
    setSelectedTab(tab);
  };

  // 상단 그래프 데이터
  let graphItems: { label: string; access: number; join: number }[] = [];
  if (selectedTab === "today" && summary) {
    graphItems = [
      {
        label: "금일",
        access: summary.today?.loggedIn?.접속자수 ?? 0,
        join: summary.today?.loggedIn?.가입자수 ?? 0,
      },
      {
        label: "전일",
        access: summary.yesterday?.loggedIn?.접속자수 ?? 0,
        join: summary.yesterday?.loggedIn?.가입자수 ?? 0,
      },
      {
        label: "주간",
        access: summary.week?.loggedIn?.접속자수 ?? 0,
        join: summary.week?.loggedIn?.가입자수 ?? 0,
      },
      {
        label: "월간",
        access: summary.month?.loggedIn?.접속자수 ?? 0,
        join: summary.month?.loggedIn?.가입자수 ?? 0,
      },
    ];
  } else if (selectedTab !== "today" && chartData.length > 0) {
    // chartData: [{label, 접속자수, 가입자수}...]
    graphItems = chartData.slice(-4).map((d: any, i: number) => ({
      label: graphTabs[i]?.label ?? d.label,
      access: d.접속자수 ?? 0,
      join: d.가입자수 ?? 0,
    }));
  } else {
    graphItems = graphTabs.map((t) => ({ label: t.label, access: 0, join: 0 }));
  }

  return (
    <div className="w-full px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">사이트 통계 관리</h1>
      {/* 상단: 그래프 전체 + 버튼 */}
      <div className="bg-white rounded-lg shadow p-6 mb-8 w-full" style={{ minHeight: 260 }}>
        <div className="flex items-center justify-between mb-4">
          {/* 중앙: 범례 */}
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1 text-sm">
                <span className="inline-block w-4 h-4 rounded bg-blue-500 mr-1" />
                <span className="text-blue-700 font-semibold">접속자</span>
              </span>
              <span className="flex items-center gap-1 text-sm">
                <span className="inline-block w-4 h-4 rounded bg-orange-400 mr-1" />
                <span className="text-orange-600 font-semibold">가입자</span>
              </span>
            </div>
          </div>
          {/* 오른쪽: 금일/전일/주간/월간 버튼 */}
          <div className="flex gap-2">
            <button
              onClick={() => handleTab("today")}
              className={`px-4 py-2 rounded-md text-sm font-semibold border transition-colors ${
                selectedTab === "today"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
              }`}
            >
              금일
            </button>
            <button
              onClick={() => handleTab("yesterday")}
              className={`px-4 py-2 rounded-md text-sm font-semibold border transition-colors ${
                selectedTab === "yesterday"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
              }`}
            >
              전일
            </button>
            <button
              onClick={() => handleTab("week")}
              className={`px-4 py-2 rounded-md text-sm font-semibold border transition-colors ${
                selectedTab === "week"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
              }`}
            >
              주간
            </button>
            <button
              onClick={() => handleTab("month")}
              className={`px-4 py-2 rounded-md text-sm font-semibold border transition-colors ${
                selectedTab === "month"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
              }`}
            >
              월간
            </button>
          </div>
        </div>
        {/* 그래프 영역 */}
        <div className="grid grid-cols-4 gap-8 mt-4">
          {graphItems.map((item, idx) => {
            const maxVal = Math.max(item.access, item.join, 1);
            const maxBarHeight = 120;
            const minBarHeight = 8;
            const accessHeight = Math.max(
              minBarHeight,
              Math.round((item.access / maxVal) * maxBarHeight)
            );
            const joinHeight = Math.max(
              minBarHeight,
              Math.round((item.join / maxVal) * maxBarHeight)
            );
            return (
              <div key={item.label} className="flex flex-col items-center">
                <div className="flex items-end gap-4 h-48">
                  <div className="flex flex-col items-center">
                    <div
                      className="bg-blue-500 rounded-t-md"
                      style={{ width: 32, height: `${accessHeight}px` }}
                    ></div>
                    <span className="mt-2 text-blue-700 font-bold text-lg">{item.access}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div
                      className="bg-orange-400 rounded-t-md"
                      style={{ width: 32, height: `${joinHeight}px` }}
                    ></div>
                    <span className="mt-2 text-orange-600 font-bold text-lg">{item.join}</span>
                  </div>
                </div>
                <div className="mt-3 text-sm text-gray-700 font-semibold">{item.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 하단: 2:1 비율로 분할 */}
      <div className="flex flex-col lg:flex-row gap-6 w-full">
        {/* 좌측 2/3 */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          {/* 접속자 현황 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="font-semibold mb-2">접속자 현황</div>
            <table className="w-full text-center border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2">금일 접속자 수</th>
                  <th>전일 접속자 수</th>
                  <th>주간 접속자 수</th>
                  <th>월간 접속자 수</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2 font-bold">{summary?.today?.loggedIn?.접속자수 ?? 0}</td>
                  <td className="font-bold">{summary?.yesterday?.loggedIn?.접속자수 ?? 0}</td>
                  <td className="font-bold">{summary?.week?.loggedIn?.접속자수 ?? 0}</td>
                  <td className="font-bold">{summary?.month?.loggedIn?.접속자수 ?? 0}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {/* 가입자 현황 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="font-semibold mb-2">가입자 현황</div>
            <table className="w-full text-center border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2">금일 가입자 수</th>
                  <th>전일 가입자 수</th>
                  <th>주간 가입자 수</th>
                  <th>월간 가입자 수</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2 font-bold">{summary?.today?.loggedIn?.가입자수 ?? 0}</td>
                  <td className="font-bold">{summary?.yesterday?.loggedIn?.가입자수 ?? 0}</td>
                  <td className="font-bold">{summary?.week?.loggedIn?.가입자수 ?? 0}</td>
                  <td className="font-bold">{summary?.month?.loggedIn?.가입자수 ?? 0}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {/* 기간 내 현황 */}
          <div className="bg-white rounded-lg shadow p-4 flex flex-col gap-4 w-full">
            {/* 상단: 제목, 엑셀 다운로드 */}
            <div className="flex items-center justify-between">
              <div className="font-semibold">기간 내 현황</div>
              <button className="px-3 py-1 rounded bg-green-500 text-white text-sm font-semibold flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17 3a1 1 0 00-1 1v1H4V4a1 1 0 10-2 0v12a2 2 0 002 2h12a2 2 0 002-2V4a1 1 0 00-1-1zM4 8h12v8H4V8zm2 2v2h2v-2H6zm4 0v2h2v-2h-2z" />
                </svg>
                엑셀 다운로드
              </button>
            </div>
            {/* 중간: 날짜 입력, 일자검색 */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <div className="flex gap-2 items-center">
                <span className="text-sm">시작일시</span>
                <input
                  type="date"
                  className="border rounded px-2 py-1 text-sm"
                  value={period.start}
                  onChange={(e) => setPeriod((p) => ({ ...p, start: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-sm">종료일시</span>
                <input
                  type="date"
                  className="border rounded px-2 py-1 text-sm"
                  value={period.end}
                  onChange={(e) => setPeriod((p) => ({ ...p, end: e.target.value }))}
                />
              </div>
              <button className="px-3 py-1 rounded bg-blue-500 text-white text-sm font-semibold">
                일자 검색
              </button>
            </div>
            {/* 하단: 표 */}
            <div className="flex flex-col items-center mt-2">
              <table className="w-full text-center border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2">총 접속자 수</th>
                    <th>총 가입자 수</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 font-bold text-lg">
                      {periodData?.loggedIn?.접속자수 ?? 0}
                    </td>
                    <td className="py-2 font-bold text-lg">
                      {periodData?.loggedIn?.가입자수 ?? 0}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* 우측 1/3 */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6 min-w-[280px]">
          {/* 현재 접속자 수 */}
          <div className="bg-blue-50 rounded-lg shadow p-6 flex flex-col items-center mb-6">
            <div className="text-base font-semibold mb-2">현재 접속자 수</div>
            <div className="text-4xl font-bold text-blue-700 mb-1">-</div>
            <div className="text-xs text-gray-500">(실시간 집계)</div>
          </div>
          {/* 등급별 회원 현황 */}
          <div className="bg-white rounded-lg shadow p-0 flex flex-col justify-between overflow-hidden">
            <div className="font-semibold px-6 pt-6 pb-2">등급 별 회원 현황</div>
            <table className="w-full text-center border-separate border-spacing-0">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2">구분</th>
                  <th>회원 수</th>
                </tr>
              </thead>
              <tbody>
                {gradeData.map((g, i) => (
                  <tr key={g.grade} className={i === 0 ? "bg-orange-50 font-bold" : ""}>
                    <td className="py-2 border-t border-gray-200">{g.grade}</td>
                    <td className="py-2 border-t border-gray-200">{g.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteStatisticsPage;
