import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { Card, CardBody, Divider, Button, Spinner, Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Switch } from "@nextui-org/react";
import { FiArrowLeft, FiUpload, FiTrash2, FiDownload, FiEye } from "react-icons/fi";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import DashboardLayout from "../../../../../components/layouts/DashboardLayout";
import PageContainer from "../../../../../components/commons/PageContainer";
import NotificationAlert from "../../../../../components/commons/NotificationAlert/NotificationAlert";
import { getMateriPelajaranById, updateMateriPelajaran, deleteMateriPelajaran } from "../../../../../services/materiPelajaran.service";
import mediaServices from "../../../../../services/media.service";
import { downloadFile } from "@/utils/fileUtils";

interface Materi {
  _id: string;
  judul: string;
  konten: {
    teks: string;
    files: Array<string | {url: string; name: string}>;
  };
  order: number;
  createdAt: string;
  mataPelajaran: string;
}

const MateriPelajaranDetail: React.FC = () => {
  const router = useRouter();
  const { id, materiId } = router.query;
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [materi, setMateri] = useState<Materi | null>(null);
  const [kontenTeks, setKontenTeks] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStudentView, setIsStudentView] = useState(false);
  
  const hasPermission = session?.user?.role === 'admin' || session?.user?.role === 'guru';

  useEffect(() => {
    if (id) {
      localStorage.setItem('currentMataPelajaranId', id as string);
    }
    
    const fetchData = async () => {
      if (!materiId) return;
      
      try {
        setLoading(true);
        
        const materiResponse = await getMateriPelajaranById(materiId as string);
        
        if (materiResponse.data) {
          setMateri(materiResponse.data);
          setKontenTeks(materiResponse.data.konten.teks || "");
        }
        
        setError(null);
      } catch (err: any) {
        console.error("Error fetching materi data:", err);
        setError(err.message || "Gagal memuat data materi");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [materiId, id]);

  const handleBack = () => {
    router.push(`/admin/matapelajaran/${id}?tab=materi`);
  };

  const handleSaveContent = async () => {
    if (!materi) return;
    
    try {
      setSaving(true);
      
      const formattedFiles = Array.isArray(materi.konten.files)
        ? materi.konten.files.map(file => {
            if (typeof file === 'string') {
              return { 
                url: file, 
                name: getFileNameFromUrl(file)
              };
            }
            return file;
          })
        : [];
      
      const updateData = {
        ...materi,
        konten: {
          ...materi.konten,
          teks: kontenTeks,
          files: formattedFiles
        }
      };
      
      await updateMateriPelajaran(materi._id, updateData);
      
      setMateri({
        ...materi,
        konten: {
          ...materi.konten,
          teks: kontenTeks,
          files: formattedFiles
        }
      });
      
      toast.success("Konten berhasil disimpan!", {
        description: "Perubahan konten materi telah berhasil disimpan.",
        duration: 3000
      });
    } catch (err: any) {
      console.error("Error saving content:", err);
      
      toast.error("Gagal menyimpan konten", {
        description: err.message || "Terjadi kesalahan saat menyimpan konten.",
        duration: 5000
      });
      
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStudentView = () => {
    setIsStudentView(!isStudentView);
  };

  const handleDeleteMaterial = async () => {
    if (!materi) return;
    
    try {
      setDeleting(true);
      
      await deleteMateriPelajaran(materi._id);
      
      toast.success("Materi berhasil dihapus!", {
        description: "Materi pelajaran telah berhasil dihapus.",
        duration: 3000
      });
      
      router.push(`/admin/matapelajaran/${id}`);
    } catch (err: any) {
      console.error("Error deleting material:", err);
      
      toast.error("Gagal menghapus materi", {
        description: err.message || "Terjadi kesalahan saat menghapus materi.",
        duration: 5000
      });
      
      setError(err.message);
      setIsDeleteModalOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file || !materi) {
      toast.error("Tidak ada file yang dipilih");
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
        
        const currentFiles = materi.konten.files || [];
        const updatedFilesForBackend = [
          ...currentFiles.map(file => {
            if (typeof file === 'string') {
              return { 
                url: file, 
                name: getFileNameFromUrl(file)
              };
            }
            return file;
          }),
          newFileObject
        ];
        
        const updateData = {
          ...materi,
          konten: {
            ...materi.konten,
            files: updatedFilesForBackend
          }
        };
        
        await updateMateriPelajaran(materi._id, updateData);
        
        setMateri({
          ...materi,
          konten: {
            ...materi.konten,
            files: updatedFilesForBackend
          }
        });
        
        toast.success("File berhasil diunggah!", {
          description: "File telah berhasil ditambahkan ke materi.",
          duration: 3000
        });
      }
    } catch (err: any) {
      console.error("Error uploading file:", err);
      
      toast.error("Gagal mengunggah file", {
        description: err.message || "Terjadi kesalahan saat mengunggah file.",
        duration: 5000
      });
      
      setError(err.message);
    } finally {
      setUploading(false);
      setUploadingFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteFile = async (fileObj: any) => {
    if (!materi) return;
    
    try {
      const fileUrl = typeof fileObj === 'string' ? fileObj : fileObj.url;
      
      setDeletingFileId(fileUrl);
      
      await mediaServices.remove(fileUrl);
      
      const updatedFiles = Array.isArray(materi.konten.files) 
        ? materi.konten.files.filter(file => {
            if (typeof file === 'string') {
              return file !== fileUrl;
            }
            return file.url !== fileUrl;
          })
        : [];
      
      const formattedFiles = updatedFiles.map(file => {
        if (typeof file === 'string') {
          return { 
            url: file, 
            name: getFileNameFromUrl(file)
          };
        }
        return file;
      });
      
      const updateData = {
        ...materi,
        konten: {
          ...materi.konten,
          files: formattedFiles
        }
      };
      
      await updateMateriPelajaran(materi._id, updateData);
      
      setMateri({
        ...materi,
        konten: {
          ...materi.konten,
          files: formattedFiles
        }
      });
      
      toast.success("File berhasil dihapus!", {
        duration: 3000
      });
    } catch (err: any) {
      console.error("Error deleting file:", err);
      
      toast.error("Gagal menghapus file", {
        description: err.message || "Terjadi kesalahan saat menghapus file.",
        duration: 5000
      });
      
      setError(err.message);
    } finally {
      setDeletingFileId(null);
    }
  };

  const getFileNameFromUrl = (fileUrl: string) => {
    if (typeof fileUrl !== 'string') return 'File';
    
    const urlParts = fileUrl.split('/');
    const fullFileName = urlParts[urlParts.length - 1];
    
    let fileName = decodeURIComponent(fullFileName);
    const timestampRegex = /^\d+_/;
    fileName = fileName.replace(timestampRegex, '');
    
    fileName = fileName.replace(/_/g, ' ');
    
    return fileName;
  };

  const handleDownloadFile = (file: any) => {
    const fileUrl = typeof file === 'string' ? file : file.url;
    
    let fileName: string;
    
    if (typeof file === 'string') {
      fileName = getFileNameFromUrl(file);
    } else if (file.name) {
      fileName = file.name;
      
      if (fileUrl.includes('/documents/word/') && !fileName.toLowerCase().endsWith('.docx')) {
        fileName += '.docx';
      } else if (fileUrl.includes('/documents/pdf/') && !fileName.toLowerCase().endsWith('.pdf')) {
        fileName += '.pdf';
      } else if (fileUrl.includes('/documents/excel/') && !fileName.toLowerCase().endsWith('.xlsx')) {
        fileName += '.xlsx';
      } else if (fileUrl.includes('/documents/presentations/') && 
                !fileName.toLowerCase().endsWith('.pptx') && 
                !fileName.toLowerCase().endsWith('.ppt')) {
        fileName += '.pptx';
      }
    } else {
      fileName = 'file';
    }
    
    downloadFile(fileUrl, fileName);
  };

  const renderFileList = () => {
    if (!materi?.konten.files || materi.konten.files.length === 0) {
      return (
        <div className="text-center text-gray-500 py-4">
          Tidak ada file yang dilampirkan.
        </div>
      );
    }

    const files = [...materi.konten.files];
    
    if (uploading && uploadingFileName) {
      files.push({
        url: "uploading",
        name: uploadingFileName
      });
    }

    return (
      <div className="space-y-3">
        {files.map((file, index) => {
          const fileUrl = typeof file === 'string' ? file : file.url;
          const fileName = typeof file === 'string' ? getFileNameFromUrl(file) : file.name;
          
          const isDeleting = deletingFileId === fileUrl;
          
          const isUploading = fileUrl === "uploading";
          
          return (
            <div key={index} className="flex flex-col p-3 border rounded">
              <div className="w-full mb-2">
                <span className="text-sm font-medium break-all">{fileName}</span>
                {isUploading && (
                  <div className="mt-1">
                    <Spinner size="sm" color="primary" labelColor="primary" label="Sedang mengunggah..." />
                  </div>
                )}
              </div>
              
              {!isUploading && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    color="primary"
                    variant="flat"
                    startContent={<FiDownload size={16} />}
                    onPress={() => handleDownloadFile(file)}
                    isDisabled={isDeleting}
                    className="min-w-[100px] flex-grow"
                  >
                    Unduh
                  </Button>
                  {hasPermission && (
                    <Button
                      size="sm"
                      color="danger"
                      variant="flat"
                      startContent={isDeleting ? null : <FiTrash2 size={16} />}
                      onPress={() => handleDeleteFile(file)}
                      isLoading={isDeleting}
                      isDisabled={isDeleting}
                      className="min-w-[100px] flex-grow"
                    >
                      {isDeleting ? "" : "Hapus"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderStudentView = () => {
    if (!materi) return null;

    return (
      <div className="grid grid-cols-1 gap-6 mb-6">
        <Card>
          <CardBody className="p-6">
            <h2 className="text-xl font-semibold mb-4">Materi: {materi.judul}</h2>
            
            <div className="prose max-w-none mb-6">
              {materi.konten.teks ? (
                <div className="whitespace-pre-wrap">{materi.konten.teks}</div>
              ) : (
                <p className="text-gray-500">Tidak ada konten teks.</p>
              )}
            </div>
            
            {materi.konten.files && materi.konten.files.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">File Materi</h3>
                <div className="flex flex-wrap gap-2">
                  {materi.konten.files.map((file, index) => {
                    const fileUrl = typeof file === 'string' ? file : file.url;
                    const fileName = typeof file === 'string' ? getFileNameFromUrl(file) : file.name;
                    
                    return (
                      <Button
                        key={index}
                        size="sm"
                        variant="flat"
                        color="primary"
                        startContent={<FiDownload size={16} />}
                        onPress={() => handleDownloadFile(file)}
                        className="mb-2 min-w-[120px] flex-grow xs:flex-grow-0"
                      >
                        {fileName}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    );
  };

  const renderAdminView = () => {
    return (
      <div className="grid grid-cols-1 gap-6 mb-6">
        <Card>
          <CardBody className="p-6">
            <h2 className="text-xl font-semibold mb-4">Konten Materi</h2>
            
            <Textarea
              minRows={8}
              placeholder="Konten materi..."
              value={kontenTeks}
              onChange={(e) => setKontenTeks(e.target.value)}
              disabled={!hasPermission}
              className="mb-4"
            />
            
            {hasPermission && (
              <div className="flex justify-end">
                <Button
                  color="primary"
                  onPress={handleSaveContent}
                  isLoading={saving}
                  size="md"
                >
                  Simpan Perubahan
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
        
        <Card>
          <CardBody className="p-6">
            <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center mb-4 gap-2">
              <h2 className="text-xl font-semibold">File Terlampir</h2>
              
              {hasPermission && (
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
                    className="w-full xs:w-auto"
                    size="md"
                  >
                    Unggah File
                  </Button>
                </div>
              )}
            </div>
            
            {hasPermission && (
              <div className="text-xs text-gray-500 mb-3">
                <p>Format yang didukung: .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .jpg, .jpeg, .png, .gif, .mp3, .wav, .mp4, .zip, .rar</p>
                <p>Ukuran maksimal: 10MB per file</p>
              </div>
            )}
            
            <Divider className="my-3" />
            
            {renderFileList()}
          </CardBody>
        </Card>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <PageContainer className="-mt-12 lg:-mt-20">
        {error && (
          <div className="mb-4 relative z-10">
            <NotificationAlert
              type="error"
              message={error}
              onClose={() => setError(null)}
            />
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <Spinner size="lg" color="primary" />
          </div>
        ) : (
          <>
            <div className="mb-4 relative z-40 pointer-events-auto">
              <Button
                size="md"
                variant="solid"
                color="default"
                startContent={<FiArrowLeft size={16} />}
                onClick={handleBack}
                className="mb-5"
              >
                Kembali
              </Button>
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
                  {materi?.judul || 'Detail Materi Pelajaran'}
                </h1>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                  {hasPermission && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className="text-sm whitespace-nowrap">Tampilan Admin</span>
                      <Switch 
                        isSelected={isStudentView}
                        onValueChange={toggleStudentView}
                        size="sm"
                        color="primary"
                      />
                      <span className="text-sm whitespace-nowrap">Tampilan Murid</span>
                    </div>
                  )}
                  
                  {hasPermission && !isStudentView && (
                    <Button
                      color="danger"
                      variant="flat"
                      startContent={<FiTrash2 size={16} />}
                      onPress={() => setIsDeleteModalOpen(true)}
                      className="w-full sm:w-auto min-w-[140px]"
                      size="md"
                    >
                      Hapus Materi
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {isStudentView ? renderStudentView() : renderAdminView()}
            
            <Modal
              isOpen={isDeleteModalOpen}
              onClose={() => setIsDeleteModalOpen(false)}
              backdrop="blur"
            >
              <ModalContent>
                {(onClose) => (
                  <>
                    <ModalHeader className="flex flex-col gap-1">Konfirmasi Penghapusan</ModalHeader>
                    <ModalBody>
                      <p>Apakah Anda yakin ingin menghapus materi <strong>{materi?.judul}</strong>?</p>
                      <p className="text-gray-500 text-sm">Tindakan ini tidak dapat dibatalkan.</p>
                    </ModalBody>
                    <ModalFooter>
                      <Button variant="flat" onPress={onClose}>
                        Batal
                      </Button>
                      <Button 
                        color="danger" 
                        onPress={handleDeleteMaterial}
                        isLoading={deleting}
                      >
                        Hapus
                      </Button>
                    </ModalFooter>
                  </>
                )}
              </ModalContent>
            </Modal>
          </>
        )}
      </PageContainer>
    </DashboardLayout>
  );
};

export default MateriPelajaranDetail; 