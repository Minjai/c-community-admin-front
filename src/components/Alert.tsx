import React, { ReactNode } from 'react';

export interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose: () => void;
  className?: string;
}

const Alert: React.FC<AlertProps> = ({ type, message, onClose, className = '' }) => {
  let bgColor = 'bg-blue-100 border-blue-500 text-blue-700';
  
  if (type === 'success') {
    bgColor = 'bg-green-100 border-green-500 text-green-700';
  } else if (type === 'error') {
    bgColor = 'bg-red-100 border-red-500 text-red-700';
  } else if (type === 'warning') {
    bgColor = 'bg-yellow-100 border-yellow-500 text-yellow-700';
  }

  return (
    <div className={`${bgColor} border-l-4 p-4 rounded ${className}`} role="alert">
      <div className="flex justify-between items-center">
        <p>{message}</p>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 focus:outline-none"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Alert;
