import React, { useState } from "react";
import Button from "./Button";
import { excelDownloadService, ExcelDownloadType } from "../services/ExcelDownloadService";

interface ExcelDownloadButtonProps {
  type: ExcelDownloadType;
  variant?: "primary" | "secondary" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}

const ExcelDownloadButton: React.FC<ExcelDownloadButtonProps> = ({
  type,
  variant = "outline",
  size = "md",
  className = "",
  children,
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    if (isLoading || disabled) return;

    setIsLoading(true);
    try {
      await excelDownloadService.downloadExcel(type);
    } catch (error) {
      console.error("엑셀 다운로드 중 오류 발생:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 엑셀 아이콘 SVG (Microsoft Excel 스타일)
  const excelIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
        fill="#217346"
        stroke="#217346"
        strokeWidth="1"
      />
      <path d="M14 2V8H20" fill="#217346" stroke="#217346" strokeWidth="1" />
      {/* Excel 로고 스타일의 X 모양 */}
      <path d="M8 6L10 8L8 10L6 8L8 6Z" fill="white" />
      <path d="M10 6L12 8L10 10L8 8L10 6Z" fill="white" />
      <path d="M12 6L14 8L12 10L10 8L12 6Z" fill="white" />
      <path d="M14 6L16 8L14 10L12 8L14 6Z" fill="white" />
    </svg>
  );

  return (
    <Button
      variant={variant}
      size={size}
      isLoading={isLoading}
      icon={excelIcon}
      className={className}
      disabled={disabled}
      onClick={handleDownload}
    >
      {children || ""}
    </Button>
  );
};

export default ExcelDownloadButton;
