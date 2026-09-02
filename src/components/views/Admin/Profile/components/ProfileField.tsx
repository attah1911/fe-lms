import React from "react";
import { formatTanggal } from "@/utils/date";

interface ProfileFieldProps {
  label: string;
  name: string;
  value: string;
  isEditing: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  readOnly?: boolean;
  error?: string;
}

const ProfileField: React.FC<ProfileFieldProps> = ({
  label,
  name,
  value,
  isEditing,
  onChange,
  type = "text",
  readOnly = false,
  error
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {isEditing && !readOnly ? (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        />
      ) : (
        <p className="text-gray-900 py-2">
          {type === 'date' 
            ? formatTanggal(value)
            : value}
        </p>
      )}
      {error && isEditing && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default ProfileField;
