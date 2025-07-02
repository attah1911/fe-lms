import React from "react";
import { Card, CardBody, CardFooter, Chip, Button } from "@nextui-org/react";
import { useRouter } from "next/router";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import { FiExternalLink, FiCheck } from "react-icons/fi";

interface SubjectCardProps {
  id: string;
  title: string;
  description: string;
  category: string;
  teacher: string;
  createdAt: string;
  enrolled?: boolean;
  viewPath?: string;
}

const SubjectCard: React.FC<SubjectCardProps> = ({
  id,
  title,
  description,
  category,
  teacher,
  createdAt,
  enrolled = false,
  viewPath = "/admin/matapelajaran"
}) => {
  const router = useRouter();
  
  const truncatedDescription = description.length > 100 
    ? `${description.substring(0, 100)}...` 
    : description;
  
  const formattedDate = format(new Date(createdAt), "d MMMM yyyy", { locale: idLocale });
  
  const handleClick = () => {
    router.push(`${viewPath}/${id}`);
  };
  
  return (
    <Card 
      className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
      isHoverable
    >
      <CardBody className="p-4">
        <div className="flex justify-between items-start">
          <Chip size="sm" color="primary" variant="flat" className="mb-2">
            {category}
          </Chip>
          {enrolled && (
            <Chip size="sm" color="success" variant="flat" startContent={<FiCheck size={14} />}>
              Terdaftar
            </Chip>
          )}
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-gray-500 text-sm mb-4">{truncatedDescription}</p>
        <div className="text-xs text-gray-400">
          Pengajar: <span className="font-medium text-gray-600">{teacher}</span>
        </div>
        
        <div className="mt-3">
          <Button 
            size="md" 
            color="primary" 
            variant="flat"
            startContent={<FiExternalLink size={16} />}
            onPress={handleClick}
            className="w-full xs:w-auto min-h-10 py-2 px-4"
          >
            Lihat Detail
          </Button>
        </div>
      </CardBody>
      <CardFooter className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400">
        Dibuat: {formattedDate}
      </CardFooter>
    </Card>
  );
};

export default SubjectCard; 
