import React from "react";
import { Card, CardBody, CardFooter, Chip, Button } from "@nextui-org/react";
import { useRouter } from "next/router";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import { FiExternalLink } from "react-icons/fi";

interface SubjectCardProps {
  id: string;
  title: string;
  description: string;
  category: string;
  teacher: string;
  createdAt: string;
}

const SubjectCard: React.FC<SubjectCardProps> = ({
  id,
  title,
  description,
  category,
  teacher,
  createdAt
}) => {
  const router = useRouter();
  
  const truncatedDescription = description.length > 100 
    ? `${description.substring(0, 100)}...` 
    : description;
  
  const formattedDate = format(new Date(createdAt), "d MMMM yyyy", { locale: idLocale });
  
  const handleClick = () => {
    router.push(`/admin/matapelajaran/${id}`);
  };
  
  return (
    <Card 
      className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
      isHoverable
    >
      <CardBody className="p-4">
        <Chip size="sm" color="primary" variant="flat" className="mb-2">
          {category}
        </Chip>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-gray-500 text-sm mb-4">{truncatedDescription}</p>
        <div className="text-xs text-gray-400">
          Pengajar: <span className="font-medium text-gray-600">{teacher}</span>
        </div>
        
        <div className="mt-3">
          <Button 
            size="sm" 
            color="primary" 
            variant="flat"
            startContent={<FiExternalLink size={14} />}
            onPress={handleClick}
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
