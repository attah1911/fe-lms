import React, { useRef } from "react";
import Image from "next/image";

interface ProfilePictureProps {
  src: string;
  alt: string;
  uploading: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ProfilePicture: React.FC<ProfilePictureProps> = ({ src, alt, uploading, onFileSelect }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div 
      className="relative cursor-pointer group" 
      onClick={handleClick}
    >
      <div className="w-40 h-40 relative rounded-full border-4 border-white shadow-lg">
        <Image
          src={(!src || src === "user.jpg") 
            ? "/images/general/icon_default.png"
            : src}
          alt={alt}
          fill
          sizes="160px"
          style={{ objectFit: "cover" }}
          className="rounded-full transition duration-300 group-hover:opacity-90"
        />
      </div>
      {/* Edit Icon Overlay */}
      <div className="absolute bottom-2 right-2 bg-blue-600 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <svg className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
          <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
          <path fillRule="evenodd" d="M2 15a1 1 0 011-1h10a1 1 0 110 2H3a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      </div>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileSelect}
        className="hidden"
      />
      {/* Upload Loading Spinner */}
      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 rounded-full">
          <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}
    </div>
  );
};

export default ProfilePicture;
