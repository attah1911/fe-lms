import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardBody, Spinner, Button } from "@nextui-org/react";
import { FiUsers, FiBook, FiUserCheck } from "react-icons/fi";
import PageContainer from "../../../commons/PageContainer";
import PageHeader from "../../../commons/PageHeader";
import NotificationAlert from "../../../commons/NotificationAlert/NotificationAlert";
import StatisticsCard from "../../../commons/Dashboard/StatisticsCard";
import UserProfileCard from "../../../commons/Dashboard/UserProfileCard";
import SubjectCard from "../../../commons/Dashboard/SubjectCard";
import SubjectSearch from "../../../commons/Dashboard/SubjectSearch";
import TablePagination from "../../../commons/Table/TablePagination";
import statsService from "../../../../services/stats.service";
import { getMataPelajaran } from "../../../../services/admin.service";
import { SessionExtended } from "../../../../types/Auth";
import { useProfile } from "../../../../hooks/useProfile";
import { useRouter } from "next/router";

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
}

interface PaginationData {
  total: number;
  totalPages: number;
  current: number;
}

const Dashboard: React.FC = () => {
  const { data: session } = useSession() as { data: SessionExtended | null };
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Subject[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    totalPages: 0,
    current: 1
  });

  const { profile } = useProfile();
  const {
    data: stats,
    isLoading: loading,
    error: statsError,
  } = useQuery({
    queryKey: ["stats", "admin"],
    queryFn: statsService.getDashboardStats,
    enabled: !!session?.user,
  });

  const handleSearch = async (searchTerm: string) => {
    try {
      setIsSearching(true);
      setError(null);
      const response = await getMataPelajaran({ 
        search: searchTerm,
        page: 1,
        limit: 6 
      });
      setSearchResults(response.data);
      setPagination({
        total: response.pagination?.total || 0,
        totalPages: response.pagination?.totalPages || 0,
        current: 1
      });
    } catch (err: any) {
      setError(err.message || "Failed to search subjects");
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleViewAll = async () => {
    try {
      setIsSearching(true);
      setError(null);
      const response = await getMataPelajaran({
        page: 1,
        limit: 6
      });
      setSearchResults(response.data);
      setPagination({
        total: response.pagination?.total || 0,
        totalPages: response.pagination?.totalPages || 0,
        current: 1
      });
    } catch (err: any) {
      setError(err.message || "Failed to fetch all subjects");
      console.error("Fetch all subjects error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePageChange = async (newPage: number) => {
    if (newPage === pagination.current) return;

    try {
      setIsSearching(true);
      setError(null);
      const response = await getMataPelajaran({
        search: searchResults ? "": "",
        page: newPage,
        limit: 6
      });
      setSearchResults(response.data);
      setPagination(prev => ({
        ...prev,
        current: newPage
      }));
    } catch (err: any) {
      setError(err.message || "Failed to fetch page data");
      console.error("Pagination error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const renderSubjects = () => {
    if (searchResults !== null) {
      if (searchResults.length === 0) {
        return (
          <Card>
            <CardBody className="py-8">
              <p className="text-center text-gray-500">
                Tidak ada mata pelajaran yang sesuai dengan pencarian Anda.
              </p>
            </CardBody>
          </Card>
        );
      }

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {searchResults.map((subject) => (
            <SubjectCard
              key={subject._id}
              id={subject._id}
              title={subject.judul}
              description={subject.deskripsi}
              category={subject.kategori}
              teacher={subject.guru?.fullName || 'Unknown'}
              createdAt={subject.createdAt}
            />
          ))}
        </div>
      );
    }

    if (!stats?.recentSubjects || stats.recentSubjects.length === 0) {
      return (
        <Card>
          <CardBody className="py-8">
            <p className="text-center text-gray-500">
              Belum ada mata pelajaran yang tersedia.
            </p>
          </CardBody>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.recentSubjects.map((subject) => (
          <SubjectCard
            key={subject._id}
            id={subject._id}
            title={subject.judul}
            description={subject.deskripsi}
            category={subject.kategori}
            teacher={subject.guru?.fullName || 'Unknown'}
            createdAt={subject.createdAt}
          />
        ))}
      </div>
    );
  };


  if (!session?.user) {
    return null;
  }

  return (
    <PageContainer>
      <PageHeader 
        title="Dashboard Admin" 
        description="Selamat datang di halaman Dashboard Admin" 
      />

      {(error || statsError) && (
        <div className="mb-6">
          <NotificationAlert
            type="error"
            message={error ?? (statsError as Error).message}
            onClose={() => setError(null)}
          />
        </div>
      )}

      <div className="mb-6">
        <UserProfileCard
          user={profile ? {
            ...session.user,
            profilePicture: profile.profilePicture
          } : session.user}
        />
      </div>

      {loading ? (
        <div className="flex justify-center my-12">
          <Spinner size="lg" color="primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatisticsCard
              title="Total Murid"
              value={stats?.studentCount || 0}
              icon={<FiUsers size={24} />}
              color="primary"
            />
            <StatisticsCard
              title="Total Guru"
              value={stats?.teacherCount || 0}
              icon={<FiUserCheck size={24} />}
              color="secondary"
            />
            <StatisticsCard
              title="Total Mata Pelajaran"
              value={stats?.subjectCount || 0}
              icon={<FiBook size={24} />}
              color="success"
            />
          </div>

          <Card className="mb-6">
            <CardBody>
              <h3 className="text-lg font-semibold mb-3">Cari Mata Pelajaran</h3>
              <SubjectSearch onSearch={handleSearch} />
              {searchResults !== null && (
                <div className="mt-2 text-sm">
                  <button 
                    onClick={() => setSearchResults(null)} 
                    className="text-primary hover:underline"
                  >
                    Bersihkan pencarian
                  </button>
                </div>
              )}
            </CardBody>
          </Card>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {searchResults !== null ? "Hasil Pencarian" : "Mata Pelajaran"}
              </h3>
              <button 
                onClick={handleViewAll}
                className="text-sm text-primary hover:underline"
              >
                Lihat Semua
              </button>
            </div>
            
            {isSearching ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" color="primary" />
              </div>
            ) : (
              renderSubjects()
            )}
            
            {searchResults && pagination.total > 0 && (
              <TablePagination
                total={pagination.total}
                totalPages={pagination.totalPages}
                current={pagination.current}
                pageSize={6}
                onPageChange={handlePageChange}
                className="mt-4"
              />
            )}
          </div>
        </>
      )}
    </PageContainer>
  );
};

export default Dashboard;
