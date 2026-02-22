import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | boolean;
}

export const Input: React.FC<InputProps> = ({ label, id, className = '', error, ...props }) => {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={id}
        className={`px-3 py-2 border rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 ${
            error 
            ? 'border-red-500 focus:ring-red-200 focus:border-red-500' 
            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
        } ${className}`}
        {...props}
      />
      {typeof error === 'string' && (
          <span className="text-xs text-red-500">{error}</span>
      )}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, id, options, className = '', ...props }) => {
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
        <select
          id={id}
          className={`px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm ${className}`}
          {...props}
        >
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
      </div>
    );
  };
