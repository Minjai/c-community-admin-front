import React from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string }[];
}

const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  options,
  className = "",
  ...props
}) => {
  return (
    <div className="relative">
      {label && (
        <label htmlFor={props.id} className="label">
          {label}
        </label>
      )}
      <select
        className={`input ${
          error ? "border-red-500 focus:ring-red-500 focus:border-red-500" : ""
        } ${className}`}
        style={{
          maxHeight: "200px",
          overflowY: "auto",
        }}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {helperText && !error && <p className="mt-1 text-sm text-gray-500">{helperText}</p>}
    </div>
  );
};

export default Select;
