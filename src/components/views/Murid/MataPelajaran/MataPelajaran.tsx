import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Card, CardBody, Spinner, Input, Button, Pagination } from '@nextui-org/react';
import { FiSearch } from 'react-icons/fi';

import PageContainer from '../../../commons/PageContainer';
import PageHeader from '../../../commons/PageHeader';
import NotificationAlert from '../../../commons/NotificationAlert/NotificationAlert';
import SubjectCard from '../../../commons/Dashboard/SubjectCard';
import { SessionExtended } from '../../../../types/Auth';
import { getEnrolledMataPelajaran } from '../../../../services/student.service';
import { getMataPelajaran } from '../../../../services/mataPelajaran.service';

interface Subject {
  _id: string;
  judul: string;
  deskripsi: string;
  kategori: string;
  guru: {
    _id: string;
    fullName: string;
  };
  createdAt: string;
  enrolled?: boolean;
}

interface PaginationData {
  total: number;
  totalPages: number;
  current: number;
  size?: number;
}

const MataPelajaran: React.FC = () => {
  const { data: session } = useSession() as { data: SessionExtended | null };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [enrolledSubjectsIds, setEnrolledSubjectsIds] = useState<string[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[] | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    totalPages: 0,
    current: 1
  });
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all mata pelajaran first
        const allSubjectsResponse = await getMataPelajaran();
        

        let allSubjectsData: Subject[] = [];
        if (allSubjectsResponse && allSubjectsResponse.data) {
          allSubjectsData = allSubjectsResponse.data;
        }

        // Then fetch enrolled mata pelajaran to mark which ones are enrolled
        const enrolledResponse = await getEnrolledMataPelajaran();
        
        
        let enrolledIds: string[] = [];
        if (enrolledResponse && enrolledResponse.data) {
          enrolledIds = enrolledResponse.data.map((subject: Subject) => subject._id);
        }
        setEnrolledSubjectsIds(enrolledIds);
        
        // Mark enrolled subjects
        const markedSubjects = allSubjectsData.map(subject => ({
          ...subject,
          enrolled: enrolledIds.includes(subject._id)
        }));
        
        setAllSubjects(markedSubjects);
        
        // Set pagination data from response
        setPagination({
          total: allSubjectsResponse.meta?.pagination?.total || markedSubjects.length,
          totalPages: allSubjectsResponse.meta?.pagination?.totalPages || Math.ceil(markedSubjects.length / 6),
          current: allSubjectsResponse.meta?.pagination?.current || 1,
          size: allSubjectsResponse.meta?.pagination?.size || 6
        });
        
        setError(null);
      } catch (err: any) {
        setError(err.message || "Failed to fetch subjects data");
        console.error("MataPelajaran error:", err);
        setAllSubjects([]);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchData();
    }
  }, [session]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) {
      setFilteredSubjects(null);
      return;
    }
    
    const filtered = allSubjects.filter(subject => 
      subject.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.deskripsi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.kategori.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.guru.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredSubjects(filtered);
    setPagination({
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / (pagination.size || 6)),
      current: 1,
      size: pagination.size
    });
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchTerm('');
    setFilteredSubjects(null);
    setPagination({
      total: allSubjects.length,
      totalPages: Math.ceil(allSubjects.length / (pagination.size || 6)),
      current: 1,
      size: pagination.size
    });
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setPagination(prev => ({
      ...prev,
      current: page
    }));
  };

  // Get current subjects based on pagination
  const getCurrentSubjects = () => {
    const subjects = filteredSubjects !== null ? filteredSubjects : allSubjects;
    const pageSize = pagination.size || 6;
    const startIndex = (pagination.current - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return subjects.slice(startIndex, endIndex);
  };

  // Render subjects
  const renderSubjects = () => {
    const currentSubjects = getCurrentSubjects();
    
    if (currentSubjects.length === 0) {
      return (
        <Card>
          <CardBody className="py-8">
            <p className="text-center text-gray-500">
              {filteredSubjects !== null 
                ? "Tidak ada mata pelajaran yang sesuai dengan pencarian Anda."
                : "Tidak ada mata pelajaran yang tersedia."}
            </p>
          </CardBody>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentSubjects.map((subject) => (
          <SubjectCard
            key={subject._id}
            id={subject._id}
            title={subject.judul}
            description={subject.deskripsi}
            category={subject.kategori}
            teacher={subject.guru?.fullName || 'Unknown'}
            createdAt={subject.createdAt}
            enrolled={subject.enrolled}
            viewPath="/murid/matapelajaran"
          />
        ))}
      </div>
    );
  };

  // Render pagination
  const renderPagination = () => {
    if (pagination.totalPages <= 1) return null;
    
    return (
      <div className="flex justify-center mt-6">
        <Pagination
          total={pagination.totalPages}
          initialPage={1}
          page={pagination.current}
          onChange={handlePageChange}
        />
      </div>
    );
  };

  if (!session?.user) {
    return null;
  }

  return (
    <PageContainer>
      <div className="mb-6">
        <PageHeader 
          title="Mata Pelajaran" 
          description="Daftar semua mata pelajaran yang tersedia." 
        />
      </div>
      
      <div className="flex flex-col gap-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="mb-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Cari mata pelajaran..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              startContent={<FiSearch />}
              className="flex-grow"
            />
            <Button type="submit" color="primary">
              Cari
            </Button>
            {filteredSubjects !== null && (
              <Button type="button" color="secondary" onClick={handleClearSearch}>
                Reset
              </Button>
            )}
          </div>
        </form>

        {/* Status message */}
        {error && (
          <NotificationAlert
            type="error"
            message={error}
            onClose={() => setError(null)}
          />
        )}

        {/* Loading state */}
        {loading ? (
          <div className="flex justify-center my-12">
            <Spinner size="lg" color="primary" />
          </div>
        ) : (
          <>
            {/* Subjects grid */}
            {renderSubjects()}
            
            {/* Pagination */}
            {renderPagination()}
          </>
        )}
      </div>
    </PageContainer>
  );
};

export default MataPelajaran;
