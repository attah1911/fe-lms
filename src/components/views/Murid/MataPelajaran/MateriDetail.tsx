import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Card, CardBody, CardHeader, Spinner, Button, Link, Chip } from '@nextui-org/react';
import { FiArrowLeft, FiDownload, FiCalendar, FiFileText } from 'react-icons/fi';
import { format, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';

import PageContainer from '../../../commons/PageContainer';
import NotificationAlert from '../../../commons/NotificationAlert/NotificationAlert';
import { getMateriPelajaranById } from '../../../../services/materiPelajaran.service';
import { getMataPelajaranById } from '../../../../services/mataPelajaran.service';
import { getFileNameFromUrl, downloadFile } from "@/utils/fileUtils";

interface MateriDetailProps {
  mataPelajaranId: string;
  materiId: string;
}

interface Attachment {
  _id: string;
  originalName: string;
  url: string;
  mimetype: string;
}

interface MateriPelajaran {
  _id: string;
  judul: string;
  deskripsi: string;
  konten: {
    teks: string;
    files?: Array<string | { url: string; name: string }>;
  };
  mataPelajaran: string;
  createdAt: string;
}

interface MataPelajaran {
  _id: string;
  judul: string;
}

const formatDate = (dateString: string): string => {
  if (!dateString) return 'Tanggal tidak tersedia';
  
  const date = new Date(dateString);
  if (!isValid(date)) return 'Format tanggal tidak valid';
  
  try {
    return format(date, "d MMMM yyyy", { locale: idLocale });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Tanggal tidak valid';
  }
};

const MateriDetail: React.FC<MateriDetailProps> = ({ mataPelajaranId, materiId }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [materi, setMateri] = useState<MateriPelajaran | null>(null);
  const [mataPelajaran, setMataPelajaran] = useState<MataPelajaran | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!materiId || !mataPelajaranId) return;
      
      try {
        setLoading(true);
        
        const mataPelajaranResponse = await getMataPelajaranById(mataPelajaranId);
        if (mataPelajaranResponse && mataPelajaranResponse.data) {
          setMataPelajaran({
            _id: mataPelajaranResponse.data._id,
            judul: mataPelajaranResponse.data.judul
          });
        }
        
        const response = await getMateriPelajaranById(materiId);
        if (response && response.data) {
          setMateri(response.data);
        }
        
        setError(null);
      } catch (err: any) {
        setError(err.message || "Gagal memuat detail materi pelajaran");
        console.error("Error fetching materi detail:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [materiId, mataPelajaranId]);

  const handleBack = () => {
    router.push(`/murid/matapelajaran/${mataPelajaranId}`);
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.includes('image')) return <FiFileText />;
    if (mimetype.includes('pdf')) return <FiFileText />;
    if (mimetype.includes('word') || mimetype.includes('document')) return <FiFileText />;
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return <FiFileText />;
    return <FiFileText />;
  };

  const handleDownloadFile = (file: string | { url: string; name: string }) => {
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

  if (!materiId || !mataPelajaranId) {
    return (
      <PageContainer>
        <NotificationAlert 
          type="error"
          message="ID materi atau mata pelajaran tidak valid" 
          onClose={() => {}}
        />
        <Button color="primary" variant="light" startContent={<FiArrowLeft />} onClick={() => router.push('/murid/matapelajaran')}>
          Kembali
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="-mt-20">
      {error && (
        <NotificationAlert
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      <div className="mb-3 relative z-40 pointer-events-auto">
        <Button 
          color="default" 
          variant="solid" 
          startContent={<FiArrowLeft />} 
          onClick={handleBack} 
          className="mb-3"
        >
          Kembali
        </Button>
        
        {mataPelajaran && (
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
              {materi?.judul || 'Detail Materi'}
            </h1>
            <div className="mt-1">
              <Chip color="primary" variant="flat" size="sm">
                {mataPelajaran.judul}
              </Chip>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <Spinner size="lg" color="primary" />
        </div>
      ) : materi ? (
        <>
          <Card className="mb-6 mt-2">
            <CardHeader className="border-b border-divider pb-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                <FiCalendar size={14} />
                  <span>
                    {formatDate(materi.createdAt)}
                  </span>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-6">
                {materi.deskripsi && (
                  <div>
                    <h2 className="text-lg font-semibold mb-2">Deskripsi:</h2>
                    <p className="text-gray-700 whitespace-pre-line">{materi.deskripsi}</p>
                  </div>
                )}
                
                {materi.konten && materi.konten.teks && (
                  <div>
                    <h2 className="text-lg font-semibold mb-2">Konten Materi:</h2>
                    <div className="prose prose-sm max-w-none whitespace-pre-line">{materi.konten.teks}</div>
                  </div>
                )}
                
                {materi.konten && materi.konten.files && materi.konten.files.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-2">File Terlampir:</h2>
                    <div className="flex flex-wrap gap-2">
                      {materi.konten.files.map((file, index) => {
                        const fileUrl = typeof file === 'string' ? file : file.url;
                        const fileName = typeof file === 'string' ? 
                          getFileNameFromUrl(fileUrl) : 
                          file.name;
                        
                        return (
                          <Button
                            key={index}
                            size="sm"
                            variant="flat"
                            color="primary"
                            startContent={<FiDownload size={16} />}
                            onPress={() => handleDownloadFile(file)}
                            className="min-w-[120px]"
                          >
                            {fileName}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </>
      ) : (
        <Card>
          <CardBody className="py-8">
            <p className="text-center text-gray-500">Materi pelajaran tidak ditemukan.</p>
          </CardBody>
        </Card>
      )}
    </PageContainer>
  );
};

export default MateriDetail; 
