import React from "react";
import { cn } from "@/utils/cn";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

const PageContainer: React.FC<PageContainerProps> = ({ children, className }) => {
  return (
    <div className={cn("pt-1 pb-4 px-3 md:pt-1 md:pb-6 md:px-6 overflow-hidden w-full", className)}>
      <div className="max-w-full">
        {children}
      </div>
    </div>
  );
};

export default PageContainer;
