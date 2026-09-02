import React from "react";
import { Checkbox, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@nextui-org/react";
import { FiEdit2, FiTrash2, FiClock } from "react-icons/fi";
import { formatTanggal } from "@/utils/date";

export interface Note {
  _id?: string;
  title: string;
  description?: string;
  dueDate?: string | Date;
  completed: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface NoteCardProps {
  note: Note;
  onToggleStatus: (id: string) => void;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  formatDate?: (date: string | Date) => string;
}

const NoteCard: React.FC<NoteCardProps> = ({
  note,
  onToggleStatus,
  onEdit,
  onDelete,
  formatDate = formatTanggal
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const description = note.description || "";
  const shouldTruncate = description.length > 100;
  const truncatedDescription = shouldTruncate 
    ? `${description.substring(0, 100)}...` 
    : description;
  
  const formattedDate = note.dueDate ? formatDate(note.dueDate) : "";
  
  return (
    <>
      <div 
        className={`flex items-start p-2 sm:p-3 rounded-md border ${
          note.completed ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
        }`}
      >
        <div className="p-1">
          <Checkbox 
            isSelected={note.completed}
            onValueChange={() => note._id && onToggleStatus(note._id)}
            className="mt-1 scale-110"
            size="md"
            color="success"
          />
        </div>
        <div className="ml-2 sm:ml-3 flex-1 min-w-0">
          <div className="flex items-start justify-between w-full">
            <div 
              className="flex-1 pr-2 cursor-pointer min-w-0"
              onClick={onOpen}
            >
              <p className={`text-sm sm:text-base font-medium ${note.completed ? 'line-through text-gray-500' : ''} break-words`}>
                {note.title}
              </p>
              {description && (
                <p className={`text-xs sm:text-sm mt-1 ${note.completed ? 'text-gray-400' : 'text-gray-600'} line-clamp-2 overflow-hidden break-words`}>
                  {truncatedDescription}
                </p>
              )}
              {note.dueDate && (
                <div className="flex items-center mt-1 text-xs text-gray-500">
                  <FiClock size={10} className="mr-1 flex-shrink-0" />
                  <span className="truncate">{formattedDate}</span>
                </div>
              )}
            </div>
            <div className="flex space-x-1 sm:space-x-2 flex-shrink-0">
              <Button 
                isIconOnly
                size="sm" 
                color="primary" 
                variant="light"
                onClick={() => note._id && onEdit(note)}
                className="h-6 w-6 sm:h-8 sm:w-8 min-w-0"
              >
                <FiEdit2 size={14} />
              </Button>
              <Button 
                isIconOnly
                size="sm" 
                color="danger" 
                variant="light"
                onClick={() => note._id && onDelete(note._id)}
                className="h-6 w-6 sm:h-8 sm:w-8 min-w-0"
              >
                <FiTrash2 size={14} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalContent>
          <ModalHeader>
            <p className={note.completed ? "line-through text-gray-500" : ""}>{note.title}</p>
          </ModalHeader>
          <ModalBody>
            {description && (
              <div className="whitespace-pre-wrap break-words">
                {description}
              </div>
            )}
            {note.dueDate && (
              <div className="flex items-center mt-4 text-sm text-gray-500">
                <FiClock size={14} className="mr-1" />
                <span>{formattedDate}</span>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="primary" variant="light" onPress={onClose}>
              Tutup
            </Button>
            <Button 
              color="primary" 
              onPress={() => {
                onClose();
                note._id && onEdit(note);
              }}
            >
              Edit
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default NoteCard; 