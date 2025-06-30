import React, { useState } from "react";
import { Input, Button } from "@nextui-org/react";
import { FiSearch } from "react-icons/fi";

interface SubjectSearchProps {
  onSearch: (term: string) => void;
}

const SubjectSearch: React.FC<SubjectSearchProps> = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      onSearch(searchTerm);
    }
  };

  return (
    <form onSubmit={handleSearch} className="w-full">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Cari mata pelajaran..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
          startContent={<FiSearch className="text-default-400" />}
        />
        <Button 
          type="submit" 
          color="primary"
          isDisabled={!searchTerm.trim()}
        >
          Cari
        </Button>
      </div>
    </form>
  );
};

export default SubjectSearch; 
