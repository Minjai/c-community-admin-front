import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect } from "react";
import { CloudArrowUpIcon, XCircleIcon } from "@heroicons/react/24/outline";

interface FileUploadProps {
  label?: string;
  error?: string;
  helperText?: string;
  onChange: (file: File | null) => void;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  accept?: string;
  preview?: boolean;
  value?: string;
}

const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>(
  (
    {
      label,
      error,
      helperText,
      onChange,
      id,
      name,
      required = false,
      disabled = false,
      className = "",
      accept = ".png,.jpg,.jpeg,.gif,.webp,image/png,image/jpeg,image/gif,image/webp",
      preview = true,
      value,
    },
    ref
  ) => {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => fileInputRef.current as HTMLInputElement);

    useEffect(() => {
      setPreviewUrl(value || null);
    }, [value]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0] || null;

      if (selectedFile && accept) {
        const acceptedTypes = accept.split(",").map((type) => type.trim().toLowerCase());
        const fileType = selectedFile.type.toLowerCase();
        const fileName = selectedFile.name.toLowerCase();
        const fileExtension = "." + fileName.split(".").pop();

        const isAccepted = acceptedTypes.some((type) => {
          if (type.startsWith(".")) {
            return fileName.endsWith(type);
          } else if (type.includes("/*")) {
            return fileType.startsWith(type.replace("/*", ""));
          } else {
            return fileType === type;
          }
        });

        if (!isAccepted) {
          alert(`지원하지 않는 파일 형식입니다. (${accept} 형식만 지원)`);
          setFile(null);
          setPreviewUrl(value || null);
          onChange(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          return;
        }
      }

      setFile(selectedFile);
      onChange(selectedFile);

      if (selectedFile && preview) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else if (!value) {
        setPreviewUrl(null);
      } else {
        setPreviewUrl(value);
      }
    };

    const handleRemoveFile = (e: React.MouseEvent) => {
      e.stopPropagation();
      setFile(null);
      setPreviewUrl(null);
      onChange(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const droppedFile = e.dataTransfer.files?.[0] || null;

      if (droppedFile) {
        if (accept) {
          const acceptedTypes = accept.split(",").map((type) => type.trim());
          if (
            !acceptedTypes.some((type) => {
              if (type.includes("*")) {
                const mainType = type.split("/")[0];
                return droppedFile.type.startsWith(mainType);
              }
              return type === droppedFile.type;
            })
          ) {
            alert("지원하지 않는 파일 형식입니다.");
            return;
          }
        }

        setFile(droppedFile);
        onChange(droppedFile);

        if (preview) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setPreviewUrl(reader.result as string);
          };
          reader.readAsDataURL(droppedFile);
        }
      }
    };

    const handleImageClick = () => {
      if (!disabled) {
        fileInputRef.current?.click();
      }
    };

    return (
      <div className="mb-4">
        {label && (
          <label htmlFor={id} className="block mb-1 text-sm font-medium">
            {label}
          </label>
        )}

        <input
          id={id}
          name={name}
          type="file"
          ref={fileInputRef}
          className="sr-only"
          onChange={handleFileChange}
          required={required}
          disabled={disabled}
          accept={accept}
        />

        {previewUrl ? (
          <div className="relative">
            <div className="relative border border-gray-300 rounded-md overflow-hidden">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-auto max-h-64 object-contain cursor-pointer"
                onClick={handleImageClick}
              />
              <button
                type="button"
                onClick={handleRemoveFile}
                className="absolute top-2 right-2 bg-red-100 text-red-600 p-1 rounded-full hover:bg-red-200"
              >
                <XCircleIcon className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500 text-center">클릭하여 이미지 변경</p>
          </div>
        ) : (
          <div
            className={`w-full flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors cursor-pointer
            ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : error
                ? "border-red-500"
                : "border-gray-300"
            } 
            ${className}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleImageClick}
          >
            <div className="space-y-1 text-center">
              <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex flex-col text-sm text-gray-600">
                <span className="font-medium text-primary-600">파일 업로드</span>
                <p className="text-gray-500">또는 드래그 앤 드롭</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF, WEBP 파일 지원</p>
            </div>
          </div>
        )}

        {file && (
          <div className="mt-2 flex items-center">
            <span className="text-sm text-gray-500 truncate max-w-full">{file.name}</span>
          </div>
        )}

        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        {helperText && !error && <p className="mt-1 text-sm text-gray-500">{helperText}</p>}
      </div>
    );
  }
);

FileUpload.displayName = "FileUpload";

export default FileUpload;
