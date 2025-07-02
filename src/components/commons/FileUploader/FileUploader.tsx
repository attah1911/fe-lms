import React, { useRef, useState } from 'react';
import { Button, Chip, Spinner } from "@nextui-org/react";
import { FiUpload, FiDownload, FiTrash2 } from "react-icons/fi";
import mediaServices from "../../../services/media.service";
import { getFileNameFromUrl, downloadFile } from "../../../utils/fileUtils";

interface FileUploaderProps {
  files: Array<string | { url: string; name: string }>;
  onFilesChange: (files: Array<{ url: string; name: string }>) => void;
  maxFiles?: number;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  files = [],
  onFilesChange,
  maxFiles = 10
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalizedFiles = files.map(file => {
    if (typeof file === 'string') {
      return { 
        url: file, 
        name: getFileNameFromUrl(file)
      };
    }
    return file;
  });

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) {
      return;
    }
    
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    
    const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpeg', 'jpg'];
    
    if (!allowedExtensions.includes(fileExtension)) {
      setError("Format file tidak didukung. Hanya file dengan format .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .jpeg, dan .jpg yang diperbolehkan.");
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    
    try {
      setUploading(true);
      setUploadingFileName(file.name);
      
      const response = await mediaServices.uploadSingle(file);
      
      if (response.data && response.data.data) {
        const fileUrl = response.data.data.url;
        const fileName = file.name;
        
        const newFileObject = {
          url: fileUrl,
          name: fileName
        };
        
        const updatedFiles = [...normalizedFiles, newFileObject];
        onFilesChange(updatedFiles);
        
        setError(null);
      }
    } catch (err: any) {
      console.error("Error uploading file:", err);
      setError(err.message || "Gagal mengunggah file");
    } finally {
      setUploading(false);
      setUploadingFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteFile = async (index: number) => {
    try {
      const fileToRemove = normalizedFiles[index];
      
      const updatedFiles = [...normalizedFiles];
      updatedFiles.splice(index, 1);
      onFilesChange(updatedFiles);
      
      await mediaServices.remove(fileToRemove.url);
    } catch (err: any) {
      console.error("Error deleting file:", err);
      setError(err.message || "Gagal menghapus file");
    }
  };

  const handleDownloadFile = (file: { url: string, name: string }) => {
    downloadFile(file.url, file.name);
  };

  return (
    <div className="space-y-2">
      {error && (
        <div className="text-danger text-sm">{error}</div>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            color="primary"
            variant="flat"
            startContent={<FiUpload size={16} />}
            onPress={triggerFileInput}
            isLoading={uploading}
            isDisabled={normalizedFiles.length >= maxFiles}
            size="sm"
          >
            Unggah File
          </Button>
        </div>
        
        <div className="text-xs text-gray-500">
          {normalizedFiles.length} / {maxFiles} file
        </div>
      </div>
      
      <div className="text-xs text-gray-500 mb-1">
        <p className="text-xs leading-tight">Format: <span className="font-semibold">.pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .jpeg, .jpg</span> saja</p>
        <p className="text-xs leading-tight">Ukuran maks: 10MB</p>
      </div>
      
      <div className="space-y-1">
        {normalizedFiles.map((file, index) => (
          <div key={index} className="flex items-center justify-between p-1 border rounded-md">
            <div className="flex items-center overflow-hidden">
              <span className="text-xs truncate" title={file.name}>
                {file.name}
              </span>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                isIconOnly
                variant="light"
                color="primary"
                onPress={() => handleDownloadFile(file)}
                className="min-w-0 w-7 h-7"
              >
                <FiDownload size={14} />
              </Button>
              <Button
                size="sm"
                isIconOnly
                variant="light"
                color="danger"
                onPress={() => handleDeleteFile(index)}
                className="min-w-0 w-7 h-7"
              >
                <FiTrash2 size={14} />
              </Button>
            </div>
          </div>
        ))}
        
        {uploading && uploadingFileName && (
          <div className="flex items-center justify-between p-1 border rounded-md bg-gray-50">
            <div className="flex items-center">
              <Spinner size="sm" className="mr-1" />
              <span className="text-xs truncate">{uploadingFileName}</span>
            </div>
            <Chip size="sm" color="primary" variant="flat" className="text-xs py-0 h-5">Mengunggah...</Chip>
          </div>
        )}
        
        {normalizedFiles.length === 0 && !uploading && (
          <div className="text-center text-gray-500 py-2 text-xs">
            Tidak ada file yang dilampirkan.
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploader; 
