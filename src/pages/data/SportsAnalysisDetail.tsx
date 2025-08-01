import React, { useState, useRef, ChangeEvent, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/Button";
import TextEditor from "@/components/forms/TextEditor";
import Select from "@/components/forms/Select";
import DatePicker from "@/components/forms/DatePicker";
import FileUpload from "@/components/forms/FileUpload";
import Input from "@/components/forms/Input";
import Alert from "@/components/Alert";
import {
  createSportGameAnalysis,
  updateSportGameAnalysis,
  getAnalysesSportCategories,
  getSportGameAnalysisById,
} from "@/api";
import { SportGameAnalysisFormData, SportCategory } from "@/types";

const SportsAnalysisDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState<number>(1);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [sport, setSport] = useState<string>("");
  const [homeTeam, setHomeTeam] = useState<string>("");
  const [awayTeam, setAwayTeam] = useState<string>("");
  const [homeTeamImage, setHomeTeamImage] = useState<File | null>(null);
  const [awayTeamImage, setAwayTeamImage] = useState<File | null>(null);
  const [homeTeamImageUrl, setHomeTeamImageUrl] = useState<string>("");
  const [awayTeamImageUrl, setAwayTeamImageUrl] = useState<string>("");
  const [matchDate, setMatchDate] = useState<string>("");
  const [leagueName, setLeagueName] = useState<string>("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [sportCategories, setSportCategories] = useState<SportCategory[]>([]);
  const [contentType, setContentType] = useState<string>("analysis"); // analysis 또는 banner
  const [customTitle, setCustomTitle] = useState<string>(""); // 배너용 커스텀 제목

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getAnalysesSportCategories();
        setSportCategories(data || []);
      } catch (err) {
        console.error("Error fetching sport categories:", err);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchAnalysis = async () => {
      if (!id) return;

      try {
        setSaving(true);
        const response = await getSportGameAnalysisById(parseInt(id));
        if (response.success && response.data) {
          const analysis = response.data;
          setSport(String(analysis.categoryId));
          setHomeTeam(analysis.homeTeam);
          setAwayTeam(analysis.awayTeam);
          setLeagueName(analysis.league || "");
          setMatchDate(analysis.gameDate);
          setContent(analysis.content);
          setStartDate(analysis.startTime);
          setEndDate(analysis.endTime);
          setIsPublic(analysis.isPublic);
          setDisplayOrder(analysis.displayOrder);
          setHomeTeamImageUrl(analysis.homeTeamImageUrl || "");
          setAwayTeamImageUrl(analysis.awayTeamImageUrl || "");
          setContentType((analysis as any).type || "analysis");
          setCustomTitle((analysis as any).title || "");
        }
      } catch (err) {
        setError("데이터를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setSaving(false);
      }
    };

    fetchAnalysis();
  }, [id]);

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to convert file to base64"));
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError(null);

      if (!sport) {
        setError("종목을 선택해주세요.");
        return;
      }

      if (contentType === "analysis") {
        if (!homeTeam) {
          setError("Home 팀명을 입력해주세요.");
          return;
        }

        if (!awayTeam) {
          setError("Away 팀명을 입력해주세요.");
          return;
        }

        if (!matchDate) {
          setError("경기 일시를 선택해주세요.");
          return;
        }

        if (!content) {
          setError("내용을 입력해주세요.");
          return;
        }

        if (!leagueName.trim()) {
          setError("대회(리그명) 확인해주세요.");
          return;
        }

        if (!homeTeamImage && !homeTeamImageUrl) {
          setError("Home/Away 이미지 확인해주세요.");
          return;
        }

        if (!awayTeamImage && !awayTeamImageUrl) {
          setError("Home/Away 이미지 확인해주세요.");
          return;
        }
      } else {
        if (!customTitle.trim()) {
          setError("배너 제목을 입력해주세요.");
          return;
        }
        if (!content) {
          setError("내용을 입력해주세요.");
          return;
        }
      }

      if (!startDate) {
        setError("노출 시작일을 선택해주세요.");
        return;
      }

      if (!endDate) {
        setError("노출 종료일을 선택해주세요.");
        return;
      }

      const formData = new FormData();
      formData.append("categoryId", sport);
      formData.append("homeTeam", homeTeam);
      formData.append("awayTeam", awayTeam);
      formData.append("league", leagueName);
      formData.append("gameDate", matchDate);
      formData.append("content", content);
      formData.append("startTime", startDate);
      formData.append("endTime", endDate);
      formData.append("isPublic", String(isPublic));
      formData.append("displayOrder", String(displayOrder));
      formData.append("type", contentType);
      if (contentType === "banner") {
        formData.append("title", customTitle);
      }

      if (contentType === "analysis") {
        // Home 팀 이미지 처리
        if (homeTeamImage instanceof File) {
          const homeTeamBase64 = await convertFileToBase64(homeTeamImage);
          formData.append("homeTeamImage", homeTeamBase64);
        } else if (homeTeamImageUrl) {
          // 기존 이미지가 있는 경우
          formData.append("homeTeamImage", homeTeamImageUrl);
        } else {
          setError("Home 팀 이미지를 선택해주세요.");
          return;
        }

        // Away 팀 이미지 처리
        if (awayTeamImage instanceof File) {
          const awayTeamBase64 = await convertFileToBase64(awayTeamImage);
          formData.append("awayTeamImage", awayTeamBase64);
        } else if (awayTeamImageUrl) {
          // 기존 이미지가 있는 경우
          formData.append("awayTeamImage", awayTeamImageUrl);
        } else {
          setError("Away 팀 이미지를 선택해주세요.");
          return;
        }
      } else {
        if (homeTeamImage instanceof File) {
          const homeTeamBase64 = await convertFileToBase64(homeTeamImage);
          formData.append("homeTeamImage", homeTeamBase64);
        } else if (homeTeamImageUrl) {
          formData.append("homeTeamImage", homeTeamImageUrl);
        } else {
          setError("배너 이미지를 선택해주세요.");
          return;
        }
      }

      if (id) {
        await updateSportGameAnalysis(parseInt(id), formData);
      } else {
        await createSportGameAnalysis(formData);
      }

      navigate("/data/sports-analysis");
    } catch (err) {
      setError("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-4">
      {error && (
        <div className="mb-2">
          <Alert type="error" message={error} onClose={() => setError(null)} />
        </div>
      )}

      {/* Top Control Area */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-4">
          {id ? (
            <Button variant="primary" onClick={handleSubmit} disabled={saving}>
              수정
            </Button>
          ) : (
            <Button variant="primary" onClick={handleSubmit} disabled={saving}>
              추가
            </Button>
          )}
          <Button variant="secondary" onClick={() => navigate(-1)} disabled={saving}>
            취소
          </Button>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic === 1}
              onChange={(e) => setIsPublic(e.target.checked ? 1 : 0)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={saving}
            />
            <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
              공개여부
            </label>
          </div>
        </div>
        <div className="flex items-center space-x-12">
          <DatePicker
            value={startDate}
            onChange={(value) => setStartDate(value)}
            label="노출 시작일"
          />
          <DatePicker value={endDate} onChange={(value) => setEndDate(value)} label="노출 종료일" />
        </div>
      </div>

      <hr className="border-gray-200 mb-2" />

      {/* Sport Selection */}
      <div className="mb-2">
        <div className="flex items-center space-x-8">
          <label className="block text-sm font-medium text-gray-700 w-20">종목 선택</label>
          <Select
            value={sport}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setSport(e.target.value)}
            options={[
              { value: "", label: "종목을 선택하세요" },
              ...sportCategories.map((category) => ({
                value: String(category.id),
                label: category.displayName || category.sportName,
              })),
            ]}
            className="w-60"
          />
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="contentType"
                  value="analysis"
                  checked={contentType === "analysis"}
                  onChange={(e) => setContentType(e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  disabled={saving}
                />
                <span className="ml-2 text-sm text-gray-700">분석</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="contentType"
                  value="banner"
                  checked={contentType === "banner"}
                  onChange={(e) => setContentType(e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  disabled={saving}
                />
                <span className="ml-2 text-sm text-gray-700">배너</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Team Information */}
      {contentType === "analysis" ? (
        <div className="grid grid-cols-2 gap-8 mb-4">
          <div className="flex items-start space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Home 팀명</label>
              <Input
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
                placeholder="Home 팀명"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Home 팀 이미지</label>
              <FileUpload
                accept="image/*"
                onChange={(file) => {
                  setHomeTeamImage(file);
                  if (!file) {
                    setHomeTeamImageUrl(""); // 이미지를 지우면 기존 URL도 지움
                  }
                }}
                disabled={saving}
                preview={true}
                initialPreview={homeTeamImageUrl}
              />
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Away 팀명</label>
              <Input
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                placeholder="Away 팀명"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Away 팀 이미지</label>
              <FileUpload
                accept="image/*"
                onChange={(file) => {
                  setAwayTeamImage(file);
                  if (!file) {
                    setAwayTeamImageUrl(""); // 이미지를 지우면 기존 URL도 지움
                  }
                }}
                disabled={saving}
                preview={true}
                initialPreview={awayTeamImageUrl}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">배너 이미지</label>
            <div className="w-full max-w-md">
              <FileUpload
                accept="image/*"
                onChange={(file) => {
                  setHomeTeamImage(file);
                  if (!file) {
                    setHomeTeamImageUrl(""); // 이미지를 지우면 기존 URL도 지움
                  }
                }}
                disabled={saving}
                preview={true}
                initialPreview={homeTeamImageUrl}
              />
            </div>
          </div>
        </div>
      )}

      {/* Match Information */}
      {contentType === "analysis" && (
        <div className="grid grid-cols-2 gap-8 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">경기 일시</label>
            <DatePicker
              value={matchDate}
              onChange={(value) => setMatchDate(value)}
              label=""
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">대회(리그)명</label>
            <Input
              value={leagueName}
              onChange={(e) => setLeagueName(e.target.value)}
              placeholder="대회(리그)명"
              className="w-full"
              disabled={saving}
            />
          </div>
        </div>
      )}

      {/* Content Editor */}
      {contentType === "banner" && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
          <Input
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="배너 제목을 입력하세요"
            className="w-full"
            disabled={saving}
          />
        </div>
      )}
      <div ref={editorContainerRef}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {contentType === "banner" ? "배너 내용" : "내용"}
        </label>
        <TextEditor content={content} setContent={setContent} height="400px" />
      </div>
    </div>
  );
};

export default SportsAnalysisDetail;
