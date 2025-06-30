import React from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@nextui-org/react";

export interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isLoading?: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  isLoading = false
}) => {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      backdrop="opaque"
      placement="center"
      classNames={{
        backdrop: "bg-black/50"
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              {title}
            </ModalHeader>
            <ModalBody>
              <p>
                {message}
              </p>
            </ModalBody>
            <ModalFooter>
              <Button 
                color="default" 
                variant="light" 
                onPress={onClose}
                isDisabled={isLoading}
              >
                Batal
              </Button>
              <Button 
                color="danger" 
                onPress={onConfirm}
                isLoading={isLoading}
                isDisabled={isLoading}
              >
                Hapus
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default DeleteConfirmationModal; 
