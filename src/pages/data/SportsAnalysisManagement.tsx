import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/Button";
import Alert from "@/components/Alert";
import Select from "@/components/forms/Select";
import DataTable from "@/components/DataTable";
import LoadingOverlay from "@/components/LoadingOverlay";
import ActionButton from "@/components/ActionButton";
import SearchInput from "@/components/SearchInput";
import ExcelDownloadButton from "../../components/ExcelDownloadButton";
import { SportGameAnalysis, SportCategory } from "@/types";
import {
  getAllSportGameAnalyses,
  getAllSportGameAnalysesAdmin,
  deleteSportGameAnalysis,
  updateSportGameAnalysisDisplayOrder,
  getAllSportCategoriesAdmin,
} from "@/api";
import { formatDate, formatGameDate, formatDateForDisplay } from "@/utils/dateUtils";
import Input from "@/components/forms/Input";
import FileUpload from "@/components/forms/FileUpload";
import TextEditor from "@/components/forms/TextEditor";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface Column {
  header: string | React.ReactNode;
  accessor: keyof SportGameAnalysis | "id";
  className?: string;
  cell?: (value: unknown, row: SportGameAnalysis, index: number) => React.ReactNode;
  colSpan?: (row: SportGameAnalysis) => number;
}

const SportsAnalysisManagement = () => {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<SportGameAnalysis[]>([]);
  const [originalAnalyses, setOriginalAnalyses] = useState<SportGameAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sportCategories, setSportCategories] = useState<SportCategory[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchValue, setSearchValue] = useState("");

  // 조회수 통계 상태 추가
  const [viewStats, setViewStats] = useState<{
    [key: number]: { anonymousUsers: number; loggedInUsers: number; totalViews: number };
  }>({});

  const handleSearch = (value: string) => {
    fetchAnalyses(value);
  };

  const fetchAnalyses = useCallback(async (searchValue: string = "") => {
    setLoading(true);
    try {
      const params: any = {};

      if (searchValue.trim()) {
        params.search = searchValue;
      }

      const response = await getAllSportGameAnalysesAdmin(params);
      if (response.success) {
        setAnalyses(response.data || []);
        setOriginalAnalyses(response.data ? [...response.data] : []);

        // 조회수 통계 저장
        if (response.contentViewStats) {
          setViewStats(response.contentViewStats);
        }

        setError(null);
      } else if (!response.success && response.message) {
        setError(response.message);
        setAnalyses([]);
        setOriginalAnalyses([]);
      }
    } catch (err) {
      setError("서버 오류가 발생했습니다.");
      setAnalyses([]);
      setOriginalAnalyses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSaveOrder = async () => {
    setLoading(true);
    try {
      // 변경된 항목만 필터링
      const changed = analyses.filter((analysis) => {
        const original = originalAnalyses.find((o) => o.id === analysis.id);
        return original && analysis.displayOrder !== original.displayOrder;
      });

      if (changed.length === 0) {
        setSuccess("변경된 순서가 없습니다.");
        return;
      }

      // 변경된 항목들만 업데이트
      await Promise.all(
        changed.map((analysis) =>
          updateSportGameAnalysisDisplayOrder(analysis.id, analysis.displayOrder)
        )
      );

      setSuccess(`${changed.length}개 항목의 순서가 저장되었습니다.`);
      fetchAnalyses();
    } catch (err) {
      setError("순서 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      setError("삭제할 항목을 선택해주세요.");
      return;
    }

    if (!window.confirm(`선택한 ${selectedIds.length}개의 항목을 삭제하시겠습니까?`)) {
      return;
    }

    setLoading(true);
    try {
      const deletePromises = selectedIds.map((id) => deleteSportGameAnalysis(id));
      await Promise.all(deletePromises);
      setSuccess("선택한 항목이 삭제되었습니다.");
      setSelectedIds([]);
      fetchAnalyses();
    } catch (err) {
      setError("삭제 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (type: "add" | "edit", analysis: SportGameAnalysis | null = null) => {
    navigate("/data/sports-analysis/new");
  };

  const handleEdit = (id: number) => {
    navigate(`/data/sports-analysis/${id}`);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) {
      return;
    }

    setLoading(true);
    try {
      await deleteSportGameAnalysis(id);
      setSuccess("삭제되었습니다.");
      fetchAnalyses();
    } catch (err) {
      setError("삭제 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleOrderChange = (draggedId: number, targetId: number) => {
    setAnalyses((prevAnalyses) => {
      const newAnalyses = [...prevAnalyses];
      const draggedIndex = newAnalyses.findIndex((a) => a.id === draggedId);
      const targetIndex = newAnalyses.findIndex((a) => a.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) return prevAnalyses;

      const [draggedItem] = newAnalyses.splice(draggedIndex, 1);
      newAnalyses.splice(targetIndex, 0, draggedItem);

      return newAnalyses.map((analysis, index) => ({
        ...analysis,
        displayOrder: index + 1,
      }));
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(analyses.map((a) => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const columns: Column[] = [
    {
      header: (
        <input
          type="checkbox"
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          checked={analyses.length > 0 && selectedIds.length === analyses.length}
          onChange={(e) => handleSelectAll(e.target.checked)}
          disabled={loading}
        />
      ),
      accessor: "id",
      className: "w-[25px] text-center",
      cell: (value: unknown, row: SportGameAnalysis) => (
        <input
          type="checkbox"
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          checked={selectedIds.includes(row.id)}
          onChange={() => handleSelect(row.id)}
          disabled={loading}
        />
      ),
    },
    {
      header: "분류",
      accessor: "type" as keyof SportGameAnalysis,
      className: "text-center w-[80px]",
      cell: (value: unknown, row: SportGameAnalysis) => {
        const type = (row as any).type || "analysis";
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              type === "analysis" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
            }`}
          >
            {type === "analysis" ? "분석" : "배너"}
          </span>
        );
      },
    },

    {
      header: "종목",
      accessor: "categoryId",
      className: "text-center w-[120px]",
      cell: (value: unknown, row: SportGameAnalysis) => {
        const category = sportCategories.find((c) => c.id === row.categoryId);
        return category?.displayName || category?.sportName || "-";
      },
    },
    {
      header: "Home 팀",
      accessor: "homeTeam",
      className: "text-center w-[150px]",
      colSpan: (row: SportGameAnalysis) => {
        const type = (row as any).type || "analysis";
        return type === "banner" ? 2 : 1; // 배너 타입일 때 2칸 병합
      },
      cell: (value: unknown, row: SportGameAnalysis) => {
        const type = (row as any).type || "analysis";
        return (
          <div className="flex flex-col items-center space-y-2 py-3">
            {type === "banner" ? (
              // 배너 타입일 때는 Home 팀과 Away 팀 이미지를 합쳐서 가로로 길게 표시
              <div className="w-full flex justify-center">
                {(row.homeTeamImageUrl || row.awayTeamImageUrl) && (
                  <img
                    src={row.homeTeamImageUrl || row.awayTeamImageUrl}
                    alt="배너 이미지"
                    className="w-full h-16 object-contain rounded cursor-pointer hover:opacity-80"
                    onClick={() => handleEdit(row.id)}
                  />
                )}
              </div>
            ) : (
              // 분석 타입일 때는 기존과 동일
              <>
                {row.homeTeamImageUrl && (
                  <img
                    src={row.homeTeamImageUrl}
                    alt={`${row.homeTeam} 로고`}
                    className="w-12 h-12 object-cover rounded cursor-pointer hover:opacity-80"
                    onClick={() => handleEdit(row.id)}
                  />
                )}
                <span
                  className="text-sm font-medium truncate w-[120px] text-center cursor-pointer hover:text-blue-600 hover:underline"
                  onClick={() => handleEdit(row.id)}
                >
                  {row.homeTeam}
                </span>
              </>
            )}
          </div>
        );
      },
    },
    {
      header: "Away 팀",
      accessor: "awayTeam",
      className: "text-center w-[150px]",
      colSpan: (row: SportGameAnalysis) => {
        const type = (row as any).type || "analysis";
        return type === "banner" ? 0 : 1; // 배너 타입일 때는 숨김 (Home 팀에서 병합)
      },
      cell: (value: unknown, row: SportGameAnalysis) => {
        const type = (row as any).type || "analysis";
        return (
          <div className="flex flex-col items-center space-y-2 py-3">
            {type === "banner" ? (
              // 배너 타입일 때는 빈 공간 (Home 팀에서 이미지 표시)
              <div className="w-full flex justify-center">
                {/* 배너 타입일 때는 Home 팀 칼럼에서 이미지 표시하므로 여기는 빈 공간 */}
              </div>
            ) : (
              // 분석 타입일 때는 기존과 동일
              <>
                {row.awayTeamImageUrl && (
                  <img
                    src={row.awayTeamImageUrl}
                    alt={`${row.awayTeam} 로고`}
                    className="w-12 h-12 object-cover rounded cursor-pointer hover:opacity-80"
                    onClick={() => handleEdit(row.id)}
                  />
                )}
                <span
                  className="text-sm font-medium truncate w-[120px] text-center cursor-pointer hover:text-blue-600 hover:underline"
                  onClick={() => handleEdit(row.id)}
                >
                  {row.awayTeam}
                </span>
              </>
            )}
          </div>
        );
      },
    },
    {
      header: "경기 일자",
      accessor: "gameDate",
      className: "text-center w-[150px]",
      cell: (value: unknown, row: SportGameAnalysis) => {
        const formattedDate = formatGameDate(row.gameDate);
        const [datePart, timePart] = formattedDate.split("\n");

        return (
          <div className="flex flex-col items-center">
            <div className="text-sm font-medium">{datePart}</div>
            <div className="text-sm font-medium text-gray-900">{timePart}</div>
          </div>
        );
      },
    },
    {
      header: "노출 기간",
      accessor: "startTime",
      className: "text-center w-[200px]",
      cell: (value: unknown, row: SportGameAnalysis) => (
        <div className="flex flex-col">
          <div>{formatDateForDisplay(row.startTime)}</div>
          <div>~ {formatDateForDisplay(row.endTime)}</div>
        </div>
      ),
    },
    {
      header: "조회",
      accessor: "id" as keyof SportGameAnalysis,
      className: "text-center w-[80px]",
      cell: (value: unknown, row: SportGameAnalysis) => {
        const stats = viewStats[row.id];
        const totalViews = stats ? stats.totalViews : 0;
        const loggedInUsers = stats ? stats.loggedInUsers : 0;
        return (
          <span className="text-sm text-gray-600">
            {totalViews.toLocaleString()}
            {loggedInUsers > 0 && (
              <span className="text-blue-600">({loggedInUsers.toLocaleString()})</span>
            )}
          </span>
        );
      },
    },
    {
      header: "공개 여부",
      accessor: "isPublic",
      className: "text-center w-[100px]",
      cell: (value: unknown, row: SportGameAnalysis) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.isPublic ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {row.isPublic ? "공개" : "비공개"}
        </span>
      ),
    },
    {
      header: "순서",
      accessor: "displayOrder",
      className: "text-center w-[80px]",
      cell: (value: unknown, row: SportGameAnalysis) => (
        <input
          type="number"
          min={1}
          className="w-16 text-center border rounded"
          value={row.displayOrder}
          onChange={(e) => {
            const newValue = Number(e.target.value);
            setAnalyses((prev) =>
              prev.map((item) => (item.id === row.id ? { ...item, displayOrder: newValue } : item))
            );
          }}
          disabled={loading}
        />
      ),
    },
    {
      header: "관리",
      accessor: "id",
      className: "text-center w-[150px]",
      cell: (value: unknown, row: SportGameAnalysis) => (
        <div className="flex space-x-1 justify-center">
          <ActionButton label="수정" action="edit" size="sm" onClick={() => handleEdit(row.id)} />
          <ActionButton
            label="삭제"
            action="delete"
            size="sm"
            onClick={() => handleDelete(row.id)}
          />
        </div>
      ),
    },
  ];

  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await getAllSportCategoriesAdmin(1, 1000);
        if (response.data) {
          setSportCategories(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };

    fetchCategories();
  }, []);

  const filteredData = selectedCategory
    ? analyses.filter((a) => String(a.categoryId) === selectedCategory)
    : analyses;

  return (
    <div className="container mx-auto px-4 py-8">
      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />
      )}
      {success && (
        <Alert type="success" message={success} onClose={() => setSuccess(null)} className="mb-4" />
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">스포츠 경기 분석</h1>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            options={[
              { value: "", label: "전체 종목" },
              ...sportCategories.map((category) => ({
                value: String(category.id),
                label: category.displayName || category.sportName,
              })),
            ]}
            className="w-40"
          />
        </div>
        <SearchInput
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          onSearch={handleSearch}
        />
        <div className="flex space-x-2">
          <ExcelDownloadButton type="sportGameAnalysis" variant="outline" size="sm">
            엑셀 다운로드
          </ExcelDownloadButton>
          <Button variant="primary" onClick={handleSaveOrder} disabled={loading}>
            순서저장
          </Button>
          <Button
            variant="danger"
            onClick={handleBulkDelete}
            disabled={selectedIds.length === 0 || loading}
          >
            {`선택 삭제 (${selectedIds.length})`}
          </Button>
          <Button variant="primary" onClick={() => handleOpenModal("add")} disabled={loading}>
            경기 분석 추가
          </Button>
        </div>
      </div>

      <LoadingOverlay isLoading={loading} />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredData}
          loading={loading}
          emptyMessage={searchValue ? "검색된 결과가 없습니다." : "등록된 분석글이 없습니다."}
          pagination={{
            currentPage: page,
            pageSize: limit,
            totalItems: total,
            onPageChange: setPage,
          }}
        />
      </div>
    </div>
  );
};

export default SportsAnalysisManagement;
