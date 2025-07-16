import React from "react";
import ExcelDownloadButton from "../components/ExcelDownloadButton";
import { validExcelTypes } from "../services/ExcelDownloadService";

const ExcelTestPage: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">엑셀 다운로드 테스트</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {validExcelTypes.map((type) => (
          <div key={type} className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">{type}</h3>
            <ExcelDownloadButton type={type} size="sm">
              다운로드
            </ExcelDownloadButton>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExcelTestPage;
