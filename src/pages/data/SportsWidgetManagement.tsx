import React, { useState, useEffect } from "react";
import axios from "@/api/axios";
import DataTable from "@/components/DataTable";
import Button from "@/components/Button";
import ActionButton from "@/components/ActionButton";
import Modal from "@/components/Modal";
import Input from "@/components/forms/Input";
import Alert from "@/components/Alert";
import SearchInput from "@/components/SearchInput";
import ExcelDownloadButton from "../../components/ExcelDownloadButton";
import { formatDate } from "@/utils/dateUtils";

// 스포츠 위젯 타입 정의
interface SportsWidget {
  id: number;
  title: string;
  nightWidget: string;
  dayWidget: string;
  isPublic: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

const SportsWidgetManagement = () => {
  const [widgets, setWidgets] = useState<SportsWidget[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // 모달 관련 상태
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentWidget, setCurrentWidget] = useState<SportsWidget | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);

  // 선택된 위젯 ID 상태
  const [selectedWidgetIds, setSelectedWidgetIds] = useState<number[]>([]);

  // 검색 value 상태
  const [searchValue, setSearchValue] = useState<string>("");

  // 위젯 데이터 상태
  const [title, setTitle] = useState<string>("");
  const [nightScript, setNightScript] = useState<string>("");
  const [dayScript, setDayScript] = useState<string>("");
  const [isPublic, setIsPublic] = useState<number>(1);

  // 원본 위젯 데이터 (순서 저장용)
  const [originalWidgets, setOriginalWidgets] = useState<SportsWidget[]>([]);

  const handleSearch = (value: string) => {
    fetchWidgets(currentPage, pageSize, value);
  };

  // 위젯 목록 조회
  const fetchWidgets = async (
    page: number = currentPage,
    limit: number = pageSize,
    searchValue: string = ""
  ) => {
    setLoading(true);

    try {
      const response = await axios.get("/sport-widgets/admin", {
        params: {
          page: page,
          limit: limit,
          search: searchValue,
        },
      });

      if (response.data) {
        const widgetData = response.data || [];

        // 페이지네이션 정보가 없으므로 전체 데이터를 사용
        setWidgets(widgetData);
        setOriginalWidgets(widgetData); // 원본 데이터 저장
        setCurrentPage(1);
        setTotalPages(1);
        setPageSize(widgetData.length);
        setTotalItems(widgetData.length);
      } else {
        setWidgets([]);
        setAlertMessage({
          type: "error",
          message: "위젯 목록을 불러오는데 실패했습니다.",
        });
        setCurrentPage(1);
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Error fetching sports widgets:", err);
      setAlertMessage({ type: "error", message: "위젯 목록을 불러오는데 실패했습니다." });
      setWidgets([]);
      setCurrentPage(1);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      fetchWidgets(page, pageSize, searchValue);
    }
  };

  // 위젯 추가 모달 열기
  const handleAddWidget = () => {
    setIsEditing(false);
    setCurrentWidget(null);
    setTitle("");
    setNightScript("");
    setDayScript("");
    setIsPublic(1);
    setShowModal(true);
  };

  // 위젯 수정 모달 열기
  const handleEditWidget = (widget: SportsWidget) => {
    setIsEditing(true);
    setCurrentWidget(widget);
    setTitle(widget.title || "");
    setNightScript(widget.nightWidget || "");
    setDayScript(widget.dayWidget || "");
    setIsPublic(widget.isPublic === 1 ? 1 : 0);
    setShowModal(true);
  };

  // 위젯 삭제
  const handleDeleteWidget = async (id: number) => {
    if (!window.confirm("정말 이 위젯을 삭제하시겠습니까?")) {
      return;
    }

    try {
      await axios.delete(`/sport-widgets/admin/${id}`);
      setAlertMessage({
        type: "success",
        message: "위젯이 삭제되었습니다.",
      });
      fetchWidgets(currentPage, pageSize, searchValue);
    } catch (err) {
      console.error("Error deleting widget:", err);
      setAlertMessage({
        type: "error",
        message: "위젯 삭제에 실패했습니다.",
      });
    }
  };

  // 선택된 위젯 일괄 삭제
  const handleBulkDelete = async () => {
    if (selectedWidgetIds.length === 0) {
      setAlertMessage({
        type: "error",
        message: "삭제할 위젯을 선택해주세요.",
      });
      return;
    }

    if (!window.confirm(`선택한 ${selectedWidgetIds.length}개의 위젯을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const deletePromises = selectedWidgetIds.map((id) =>
        axios.delete(`/sport-widgets/admin/${id}`)
      );
      await Promise.all(deletePromises);

      setAlertMessage({
        type: "success",
        message: `${selectedWidgetIds.length}개의 위젯이 삭제되었습니다.`,
      });
      setSelectedWidgetIds([]);
      fetchWidgets(currentPage, pageSize, searchValue);
    } catch (err) {
      console.error("Error bulk deleting widgets:", err);
      setAlertMessage({
        type: "error",
        message: "위젯 일괄 삭제에 실패했습니다.",
      });
    }
  };

  // 위젯 선택/해제
  const handleSelectWidget = (id: number) => {
    setSelectedWidgetIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((widgetId) => widgetId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // displayOrder 입력값 변경 핸들러
  const handleDisplayOrderInputChange = (index: number, newOrder: number) => {
    setWidgets((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], displayOrder: newOrder };
      return updated;
    });
  };

  // 전체 선택/해제
  const handleSelectAllWidgets = (event: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    if (isChecked) {
      setSelectedWidgetIds(widgets.map((widget) => widget.id));
    } else {
      setSelectedWidgetIds([]);
    }
  };

  // 순서 저장
  const handleSaveOrder = async () => {
    setLoading(true);
    try {
      const changed = widgets.filter((widget) => {
        const original = originalWidgets.find((o) => o.id === widget.id);
        return original && widget.displayOrder !== original.displayOrder;
      });

      if (changed.length === 0) {
        setLoading(false);
        return;
      }

      await Promise.all(
        changed.map((widget) =>
          axios.put(`/sport-widgets/admin/${widget.id}`, {
            displayOrder: widget.displayOrder,
          })
        )
      );

      setAlertMessage({
        type: "success",
        message: "순서가 저장되었습니다.",
      });

      fetchWidgets(currentPage, pageSize, searchValue);
    } catch (err) {
      console.error("Error saving order:", err);
      setAlertMessage({
        type: "error",
        message: "순서 저장에 실패했습니다.",
      });
    } finally {
      setLoading(false);
    }
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setShowModal(false);
    setIsEditing(false);
    setCurrentWidget(null);
  };

  // 위젯 저장
  const handleSaveWidget = async () => {
    if (!title.trim()) {
      setAlertMessage({
        type: "error",
        message: "제목을 입력해주세요.",
      });
      return;
    }

    try {
      setSaving(true);

      const widgetData = {
        title: title.trim(),
        nightWidget: nightScript.trim(),
        dayWidget: dayScript.trim(),
        isPublic: isPublic,
      };

      if (isEditing && currentWidget) {
        await axios.put(`/sport-widgets/admin/${currentWidget.id}`, widgetData);
        setAlertMessage({
          type: "success",
          message: "위젯이 수정되었습니다.",
        });
      } else {
        await axios.post("/sport-widgets/admin", widgetData);
        setAlertMessage({
          type: "success",
          message: "위젯이 추가되었습니다.",
        });
      }

      handleCloseModal();
      fetchWidgets(currentPage, pageSize, searchValue);
    } catch (err) {
      console.error("Error saving widget:", err);
      setAlertMessage({
        type: "error",
        message: "위젯 저장에 실패했습니다.",
      });
    } finally {
      setSaving(false);
    }
  };

  // 폼 입력 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "title") setTitle(value);
    if (name === "isPublic") setIsPublic(Number(value));
  };

  useEffect(() => {
    fetchWidgets(1);
  }, []);

  // 테이블 컬럼 정의
  const columns = [
    {
      header: "선택",
      accessor: "id" as keyof SportsWidget,
      cell: (value: unknown) => (
        <input
          type="checkbox"
          checked={selectedWidgetIds.includes(value as number)}
          onChange={() => handleSelectWidget(value as number)}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
        />
      ),
      className: "w-20 text-center",
    },
    {
      header: "제목",
      accessor: "title" as keyof SportsWidget,
    },
    {
      header: "등록일시",
      accessor: "createdAt" as keyof SportsWidget,
      cell: (value: unknown) => formatDate(value as string),
      className: "w-36",
    },
    {
      header: "공개 여부",
      accessor: "isPublic" as keyof SportsWidget,
      cell: (value: unknown) => {
        const pub = value as number;
        return (
          <span
            className={`px-2 py-1 rounded text-xs ${
              pub === 1 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {pub === 1 ? "공개" : "비공개"}
          </span>
        );
      },
      className: "w-24",
    },
    {
      header: "순서",
      accessor: "displayOrder" as keyof SportsWidget,
      cell: (value: unknown, row: SportsWidget, index: number) => (
        <input
          type="number"
          min={1}
          className="w-16 text-center border rounded"
          value={value as number}
          onChange={(e) => handleDisplayOrderInputChange(index, Number(e.target.value))}
          disabled={loading}
        />
      ),
      className: "w-24",
    },
    {
      header: "관리",
      accessor: "id" as keyof SportsWidget,
      cell: (value: unknown, row: SportsWidget, index: number) => (
        <div className="flex items-center space-x-1">
          <ActionButton
            label="수정"
            onClick={() => handleEditWidget(row)}
            color="blue"
            action="edit"
            size="sm"
          />
          <ActionButton
            label="삭제"
            onClick={() => handleDeleteWidget(value as number)}
            color="red"
            action="delete"
            size="sm"
          />
        </div>
      ),
      className: "w-28",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">스포츠 위젯 관리</h1>
        <SearchInput
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          onSearch={handleSearch}
        />
        <div className="flex space-x-2">
          {/* 엑셀 다운로드 버튼 */}
          <ExcelDownloadButton type="sportWidgets" variant="outline" size="sm">
            엑셀 다운로드
          </ExcelDownloadButton>
          <Button onClick={handleSaveOrder} className="bg-blue-500 hover:bg-blue-600">
            순서저장
          </Button>
          <Button onClick={handleBulkDelete} className="bg-red-500 hover:bg-red-600">
            선택삭제 ({selectedWidgetIds.length})
          </Button>
          <Button onClick={handleAddWidget} className="bg-pink-500 hover:bg-pink-600">
            신규위젯 추가
          </Button>
        </div>
      </div>

      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
          className="mb-4"
        />
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          columns={columns}
          data={widgets}
          loading={loading}
          emptyMessage={searchValue ? "검색된 결과가 없습니다." : "등록된 위젯이 없습니다."}
          pagination={{
            currentPage: currentPage,
            pageSize: pageSize,
            totalItems: totalItems,
            onPageChange: handlePageChange,
          }}
        />
      </div>

      {/* 위젯 추가/수정 모달 */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={isEditing ? "위젯 수정" : "신규 위젯 추가"}
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
            <div className="flex space-x-2">
              <Button
                onClick={handleSaveWidget}
                disabled={saving}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {saving ? "저장 중..." : isEditing ? "수정" : "추가"}
              </Button>
              <Button onClick={handleCloseModal} className="bg-gray-500 hover:bg-gray-600">
                취소
              </Button>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="isPublic"
                checked={isPublic === 1}
                onChange={(e) => setIsPublic(e.target.checked ? 1 : 0)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">공개여부</label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">위젯 제목</label>
            <Input
              name="title"
              value={title}
              onChange={handleInputChange}
              placeholder="위젯 제목을 입력하세요"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Night 위젯 스크립트
            </label>
            <textarea
              value={nightScript}
              onChange={(e) => setNightScript(e.target.value)}
              placeholder="Night 위젯 스크립트를 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Day 위젯 스크립트
            </label>
            <textarea
              value={dayScript}
              onChange={(e) => setDayScript(e.target.value)}
              placeholder="Day 위젯 스크립트를 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SportsWidgetManagement;
