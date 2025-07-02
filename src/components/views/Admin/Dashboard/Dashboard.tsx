import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardBody, Spinner, Button } from "@nextui-org/react";
import { FiUsers, FiBook, FiUserCheck, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import PageContainer from "../../../commons/PageContainer";
import PageHeader from "../../../commons/PageHeader";
import NotificationAlert from "../../../commons/NotificationAlert/NotificationAlert";
import StatisticsCard from "../../../commons/Dashboard/StatisticsCard";
import UserProfileCard from "../../../commons/Dashboard/UserProfileCard";
import SubjectCard from "../../../commons/Dashboard/SubjectCard";
import SubjectSearch from "../../../commons/Dashboard/SubjectSearch";
import statsService, { DashboardStats } from "../../../../services/stats.service";
import authServices from "../../../../services/auth.service";
import { getMataPelajaran } from "../../../../services/admin.service";
import { SessionExtended } from "../../../../types/Auth";
import { IProfile } from "../../../../types/Profile";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [profileData, setProfileData] = useState<IProfile | null>(null);
  const [searchResults, setSearchResults] = useState<Subject[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    totalPages: 0,
    current: 1
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch dashboard stats
        const statsData = await statsService.getDashboardStats();
        setStats(statsData);
        
        // Fetch user profile data
        const profileResponse = await authServices.getProfile();
        setProfileData(profileResponse.data.data);
        
        setError(null);
      } catch (err: any) {
        setError(err.message || "Failed to fetch dashboard data");
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchData();
    }
  }, [session]);

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
    // If searching, show search results
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

    // Otherwise, show recent subjects from stats
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

  // Render pagination
  const renderPagination = () => {
    if (!searchResults || pagination.total === 0) return null;

    return (
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4">
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              {pagination.total > 0 ? (
                <>
                  Showing{" "}
                  <span className="font-medium">
                    {(pagination.current - 1) * 6 + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(pagination.current * 6, pagination.total)}
                  </span>{" "}
                  of <span className="font-medium">{pagination.total}</span>{" "}
                  results
                </>
              ) : (
                "No results found"
              )}
            </p>
          </div>
          <div className="mt-2 sm:mt-0">
            <nav className="flex items-center gap-1">
              <Button
                isIconOnly
                size="sm"
                variant="flat"
                onPress={() => handlePageChange(pagination.current - 1)}
                isDisabled={pagination.current <= 1}
                className={`min-w-8 h-8 ${
                  pagination.current <= 1 ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <FiChevronLeft className="h-4 w-4" />
              </Button>
              
              {pagination.totalPages > 0 && [...Array(pagination.totalPages)].map((_, index) => {
                const pageNum = index + 1;
                const isFirst = pageNum === 1;
                const isLast = pageNum === pagination.totalPages;
                const isCurrent = pageNum === pagination.current;
                const isNearCurrent = Math.abs(pageNum - pagination.current) <= 1;
                
                if (isFirst || isLast || isCurrent || isNearCurrent) {
                  return (
                    <Button
                      key={pageNum}
                      size="sm"
                      variant={isCurrent ? "solid" : "flat"}
                      onPress={() => handlePageChange(pageNum)}
                      className={`min-w-8 h-8 ${
                        isCurrent ? "bg-primary text-white" : ""
                      }`}
                    >
                      {pageNum}
                    </Button>
                  );
                } else if (
                  (index === 1 && pagination.current > 3) ||
                  (index === pagination.totalPages - 2 && pagination.current < pagination.totalPages - 2)
                ) {
                  return <span key={`ellipsis-${index}`} className="px-2">...</span>;
                }
                return null;
              })}

              <Button
                isIconOnly
                size="sm"
                variant="flat"
                onPress={() => handlePageChange(pagination.current + 1)}
                isDisabled={pagination.current >= pagination.totalPages}
                className={`min-w-8 h-8 ${
                  pagination.current >= pagination.totalPages
                    ? "opacity-50 cursor-not-allowed" 
                    : ""
                }`}
              >
                <FiChevronRight className="h-4 w-4" />
              </Button>
            </nav>
          </div>
        </div>
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

      {/* Notifications */}
      {error && (
        <div className="mb-6">
          <NotificationAlert
            type="error"
            message={error}
            onClose={() => setError(null)}
          />
        </div>
      )}

      {/* User Profile Card */}
      <div className="mb-6">
        <UserProfileCard 
          user={profileData ? {
            ...session.user,
            profilePicture: profileData.profilePicture
          } : session.user} 
        />
      </div>

      {/* Statistics Cards */}
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

          {/* Subject Search */}
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

          {/* Subjects */}
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
            
            {/* Render pagination */}
            {renderPagination()}
          </div>
        </>
      )}
    </PageContainer>
  );
};

export default Dashboard;
