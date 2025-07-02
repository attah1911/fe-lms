import React from "react";
import { Card, CardBody } from "@nextui-org/react";
import { IconType } from "react-icons";

interface StatisticsCardProps {
  title: string;
  count?: number;
  value?: number;
  icon: React.ReactNode;
  color: "primary" | "secondary" | "success" | "warning" | "danger";
}

const StatisticsCard: React.FC<StatisticsCardProps> = ({
  title,
  count,
  value,
  icon,
  color
}) => {
  const colorClasses = {
    primary: "bg-primary-50 text-primary-500",
    secondary: "bg-purple-50 text-purple-500",
    success: "bg-green-50 text-green-500",
    warning: "bg-amber-50 text-amber-500",
    danger: "bg-red-50 text-red-500"
  };

  const displayValue = count !== undefined ? count : (value || 0);

  return (
    <Card className="border border-gray-200 shadow-sm h-full">
      <CardBody className="flex flex-row items-center gap-4 py-5 h-full">
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <h3 className="text-2xl font-bold">{displayValue.toLocaleString()}</h3>
        </div>
      </CardBody>
    </Card>
  );
};

export default StatisticsCard; 
