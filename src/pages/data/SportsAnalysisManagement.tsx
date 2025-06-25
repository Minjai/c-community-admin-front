import React from "react";
import DataTable from "../../components/DataTable";
import Button from "../../components/Button";

interface SportsAnalysisData {
  id: number;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  exposureDate: string;
  isPublic: boolean;
  displayOrder: number;
  selected?: boolean;
}

const SportsAnalysisManagement: React.FC = () => {
  const columns = [
    {
      accessor: (item: SportsAnalysisData) => (
        <input type="checkbox" className="w-4 h-4" checked={item.selected} onChange={() => {}} />
      ),
      header: <input type="checkbox" className="w-4 h-4" onChange={() => {}} />,
      className: "w-[50px]",
    },
    {
      accessor: "sport" as keyof SportsAnalysisData,
      header: "종목",
      className: "w-[100px]",
    },
    {
      accessor: "homeTeam" as keyof SportsAnalysisData,
      header: "Home팀",
      className: "w-[150px]",
    },
    {
      accessor: "awayTeam" as keyof SportsAnalysisData,
      header: "Away팀",
      className: "w-[150px]",
    },
    {
      accessor: "matchDate" as keyof SportsAnalysisData,
      header: "경기 일시",
      className: "w-[150px]",
    },
    {
      accessor: "exposureDate" as keyof SportsAnalysisData,
      header: "노출 일시",
      className: "w-[150px]",
    },
    {
      accessor: "isPublic" as keyof SportsAnalysisData,
      header: "공개여부",
      className: "w-[100px]",
      cell: (value: boolean) => <span>{value ? "공개" : "비공개"}</span>,
    },
    {
      accessor: "displayOrder" as keyof SportsAnalysisData,
      header: "순서",
      className: "w-[80px]",
    },
    {
      accessor: (item: SportsAnalysisData) => (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => {}}>
            수정
          </Button>
          <Button variant="danger" size="sm" onClick={() => {}}>
            삭제
          </Button>
        </div>
      ),
      header: "관리",
      className: "w-[150px]",
    },
  ];

  // 임시 데이터
  const data = [
    {
      id: 1,
      sport: "축구",
      homeTeam: "맨체스터 유나이티드",
      awayTeam: "리버풀",
      matchDate: "2024-03-20 20:00",
      exposureDate: "2024-03-19 09:00",
      isPublic: true,
      displayOrder: 1,
      selected: false,
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">스포츠 경기 분석 관리</h1>
        <Button variant="primary" onClick={() => {}}>
          등록
        </Button>
      </div>
      <DataTable data={data} columns={columns} />
    </div>
  );
};

export default SportsAnalysisManagement;
