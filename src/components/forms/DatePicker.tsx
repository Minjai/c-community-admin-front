import React from "react";
import { formatDateForInput, convertToISOString } from "../../utils/dateUtils";

interface DatePickerProps {
  label?: string;
  error?: string;
  helperText?: string;
  value: string;
  onChange: (value: string) => void;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  minDate?: string;
  maxDate?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({
  label,
  error,
  helperText,
  value,
  onChange,
  id,
  name,
  required = false,
  disabled = false,
  className = "",
  minDate,
  maxDate,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Convert the local datetime string to ISO format before calling onChange
    const isoDate = convertToISOString(e.target.value);
    onChange(isoDate);
  };

  // Convert ISO date to local datetime string for input
  const displayValue = formatDateForInput(value);

  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type="datetime-local"
          id={id}
          name={name}
          value={displayValue}
          onChange={handleChange}
          required={required}
          disabled={disabled}
          min={minDate ? formatDateForInput(minDate) : undefined}
          max={maxDate ? formatDateForInput(maxDate) : undefined}
          className={`input ${
            error ? "border-red-500 focus:ring-red-500 focus:border-red-500" : ""
          } ${className}`}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {helperText && !error && <p className="mt-1 text-sm text-gray-500">{helperText}</p>}
    </div>
  );
};

export default DatePicker;
