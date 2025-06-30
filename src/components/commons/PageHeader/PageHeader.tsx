import React from "react";

interface PageHeaderProps {
  title: string;
  description: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description }) => {
  return (
    <div className="-mt-12 mb-4">
      <h1 className="mb-1 text-2xl font-bold text-gray-800">{title}</h1>
      <p className="text-gray-600">{description}</p>
    </div>
  );
};

export default PageHeader;
