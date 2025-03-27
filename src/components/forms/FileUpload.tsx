import React, { useState, useRef } from 'react';
import { CloudArrowUpIcon, XCircleIcon } from '@heroicons/react/24/outline';

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
}

const FileUpload: React.FC<FileUploadProps> = ({
  label,
  error,
  helperText,
  onChange,
  id,
  name,
  required = false,
  disabled = false,
  className = '',
  accept = 'image/png, image/jpeg',
  preview = true,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    onChange(selectedFile);

    if (selectedFile && preview) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreviewUrl(null);
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      <div className="mt-1 flex flex-col items-center">
        <div className={`w-full flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md ${error ? 'border-red-500' : ''} ${className}`}>
          <div className="space-y-1 text-center">
            <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div className="flex text-sm text-gray-600">
              <label
                htmlFor={id}
                className={`relative cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span>파일 업로드</span>
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
              </label>
              <p className="pl-1">또는 드래그 앤 드롭</p>
            </div>
            <p className="text-xs text-gray-500">PNG, JPG 파일만 지원</p>
          </div>
        </div>

        {file && (
          <div className="mt-2 flex items-center justify-between w-full">
            <div className="flex items-center">
              <span className="text-sm text-gray-500">{file.name}</span>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="text-red-500 hover:text-red-700"
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
          </div>
        )}

        {previewUrl && preview && (
          <div className="mt-2 w-full">
            <img
              src={previewUrl}
              alt="Preview"
              className="h-32 w-auto object-contain mx-auto"
            />
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {helperText && !error && <p className="mt-1 text-sm text-gray-500">{helperText}</p>}
    </div>
  );
};

export default FileUpload;
