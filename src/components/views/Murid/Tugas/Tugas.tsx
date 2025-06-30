import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Card, CardBody, Spinner, Input, Button, Pagination, Chip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@nextui-org/react';
import { FiSearch, FiFilter, FiClock, FiCheckCircle, FiXCircle, FiCalendar, FiEye, FiChevronRight, FiClipboard } from 'react-icons/fi';

import PageContainer from '../../../commons/PageContainer';
import PageHeader from '../../../commons/PageHeader';
import NotificationAlert from '../../../commons/NotificationAlert/NotificationAlert';
import { SessionExtended } from '../../../../types/Auth';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { getStudentAssignments } from '../../../../services/student.service';

interface Assignment {
  _id: string;
  judul: string;
  deskripsi: string;
  mataPelajaran: {
    _id: string;
    judul: string;
    kategori: string;
  };
  deadline: string;
  status: 'belum_dikerjakan' | 'sedang_dikerjakan' | 'selesai';
  nilai?: number;
  createdAt: string;
}

import { PaginationMeta as PaginationData } from "../../../../types/common";

const Tugas: React.FC = () => {
  const { data: session } = useSession() as { data: SessionExtended | null };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    totalPages: 0,
    current: 1,
    size: 10
  });
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Mengambil data tugas dari API
        const response = await getStudentAssignments();
        setAssignments(response.data || []);
        
        // Set pagination data
        setPagination({
          total: response.meta?.pagination?.total || 0,
          totalPages: response.meta?.pagination?.totalPages || 0,
          current: response.meta?.pagination?.current || 1,
          size: response.meta?.pagination?.size || 10
        });
        
        setError(null);
      } catch (err: any) {
        setError(err.message || "Failed to fetch assignments data");
        console.error("Tugas error:", err);
        setAssignments([]);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchData();
    }
  }, [session]);

  // Format date
  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd MMMM yyyy', { locale: id });
    } catch (e) {
      return dateString.toString();
    }
  };

  // Check if deadline is passed
  const isDeadlinePassed = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    return deadlineDate < now;
  };

  // Get remaining days until deadline
  const getRemainingDays = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  // Handle clear search and filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter(null);
    setSortBy(null);
    setFilteredAssignments(null);
    setPagination({
      total: assignments.length,
      totalPages: Math.ceil(assignments.length / 6),
      current: 1,
      size: 6
    });
  };

  // Handle sort change
  const handleSortChange = (sort: string) => {
    setSortBy(sort === sortBy ? null : sort);
    setTimeout(() => applyFilters(), 0);
  };

  // Apply filters (search, status, and sorting)
  const applyFilters = () => {
    let filtered = [...assignments];
    
    // Apply search term filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(assignment => 
        assignment.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.deskripsi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.mataPelajaran.judul.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(assignment => assignment.status === statusFilter);
    }
    
    // Apply sorting
    if (sortBy) {
      switch (sortBy) {
        case 'deadline_asc':
          filtered.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
          break;
        case 'deadline_desc':
          filtered.sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime());
          break;
        case 'status':
          // Sort by status: belum_dikerjakan, sedang_dikerjakan, selesai
          filtered.sort((a, b) => {
            const statusOrder = {
              'belum_dikerjakan': 0,
              'sedang_dikerjakan': 1,
              'selesai': 2
            };
            return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
          });
          break;
        case 'matapelajaran':
          // Sort by mata pelajaran name
          filtered.sort((a, b) => a.mataPelajaran.judul.localeCompare(b.mataPelajaran.judul));
          break;
      }
    }
    
    setFilteredAssignments(filtered);
    setPagination({
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / 6),
      current: 1,
      size: 6
    });
  };

  // Handle status filter change
  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status === statusFilter ? null : status);
    setTimeout(() => applyFilters(), 0);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setPagination(prev => ({
      ...prev,
      current: page
    }));
  };

  // Get current assignments based on pagination
  const getCurrentAssignments = () => {
    const currentAssignments = filteredAssignments !== null ? filteredAssignments : assignments;
    const startIndex = (pagination.current - 1) * 6;
    const endIndex = startIndex + 6;
    
    return currentAssignments.slice(startIndex, endIndex);
  };

  // Handle view assignment
  const handleViewAssignment = (assignmentId: string, mataPelajaranId: string) => {
    router.push(`/murid/matapelajaran/${mataPelajaranId}/tugas/${assignmentId}`);
  };

  // Render status chip
  const renderStatusChip = (status: Assignment['status'], deadline: string) => {
    const isLate = isDeadlinePassed(deadline) && status !== 'selesai';
    
    if (isLate) {
      return (
        <Chip color="danger" variant="flat" size="sm">
          <div className="flex items-center gap-1">
            <FiXCircle size={14} />
            <span>Terlambat</span>
          </div>
        </Chip>
      );
    }
    
    switch (status) {
      case 'belum_dikerjakan':
        return (
          <Chip color="warning" variant="flat" size="sm">
            <div className="flex items-center gap-1">
              <FiClock size={14} />
              <span>Belum Dikerjakan</span>
            </div>
          </Chip>
        );
      case 'sedang_dikerjakan':
        return (
          <Chip color="primary" variant="flat" size="sm">
            <div className="flex items-center gap-1">
              <FiClock size={14} />
              <span>Sedang Dikerjakan</span>
            </div>
          </Chip>
        );
      case 'selesai':
        return (
          <Chip color="success" variant="flat" size="sm">
            <div className="flex items-center gap-1">
              <FiCheckCircle size={14} />
              <span>Selesai</span>
            </div>
          </Chip>
        );
      default:
        return null;
    }
  };

  // Render deadline info
  const renderDeadlineInfo = (deadline: string) => {
    const isPassed = isDeadlinePassed(deadline);
    const remainingDays = getRemainingDays(deadline);
    
    return (
      <div className={`flex items-center gap-1 text-sm ${isPassed ? 'text-danger' : 'text-gray-500'}`}>
        <FiCalendar size={14} />
        <span>
          {isPassed 
            ? `Deadline telah lewat (${formatDate(deadline)})` 
            : `${remainingDays} hari lagi (${formatDate(deadline)})`}
        </span>
      </div>
    );
  };

  // Render card with status indicator
  const renderCard = (assignment: Assignment) => {
    const isLate = isDeadlinePassed(assignment.deadline) && assignment.status !== 'selesai';
    const statusColor = isLate ? 'danger' : 
                       assignment.status === 'selesai' ? 'success' : 
                       assignment.status === 'sedang_dikerjakan' ? 'primary' : 'warning';
    
    return (
      <Card 
        key={assignment._id} 
        className="hover:shadow-md transition-shadow"
        style={{ borderLeft: `4px solid var(--nextui-${statusColor})` }}
      >
        <CardBody className="p-4">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-semibold">{assignment.judul}</h3>
              {renderStatusChip(assignment.status, assignment.deadline)}
            </div>
            
            <p className="text-gray-600 line-clamp-2">{assignment.deskripsi}</p>
            
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mt-2">
              <Chip size="sm" variant="flat" color="primary">
                {assignment.mataPelajaran.judul}
              </Chip>
              
              {renderDeadlineInfo(assignment.deadline)}
            </div>
            
            {assignment.nilai !== undefined && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm font-medium">Nilai:</span>
                <Chip size="sm" color="success" variant="flat">
                  {assignment.nilai}
                </Chip>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <Button 
                color={statusColor}
                size="sm"
                endContent={<FiChevronRight size={16} />}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent event bubbling
                  handleViewAssignment(assignment._id, assignment.mataPelajaran._id);
                }}
              >
                Lihat Detail
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  };

  // Render assignments
  const renderAssignments = () => {
    const currentAssignments = getCurrentAssignments();
    
    if (currentAssignments.length === 0) {
      return (
        <Card>
          <CardBody className="py-8">
            <p className="text-center text-gray-500">
              {filteredAssignments !== null 
                ? "Tidak ada tugas yang sesuai dengan filter Anda."
                : "Anda belum memiliki tugas apapun."}
            </p>
          </CardBody>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {currentAssignments.map((assignment) => renderCard(assignment))}
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

  // Get assignment stats
  const getAssignmentStats = () => {
    const total = assignments.length;
    const completed = assignments.filter(a => a.status === 'selesai').length;
    const inProgress = assignments.filter(a => a.status === 'sedang_dikerjakan').length;
    const notStarted = assignments.filter(a => a.status === 'belum_dikerjakan').length;
    const late = assignments.filter(a => isDeadlinePassed(a.deadline) && a.status !== 'selesai').length;
    
    return { total, completed, inProgress, notStarted, late };
  };

  // Render assignment stats
  const renderAssignmentStats = () => {
    const stats = getAssignmentStats();
    
    if (stats.total === 0) return null;
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Tugas</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="p-2 bg-primary-50 rounded-full">
                <FiClipboard size={20} className="text-primary" />
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Selesai</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
              <div className="p-2 bg-success-50 rounded-full">
                <FiCheckCircle size={20} className="text-success" />
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Belum Dikerjakan</p>
                <p className="text-2xl font-bold">{stats.notStarted}</p>
              </div>
              <div className="p-2 bg-warning-50 rounded-full">
                <FiClock size={20} className="text-warning" />
              </div>
            </div>
          </CardBody>
        </Card>
        
        {stats.late > 0 && (
          <Card>
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Terlambat</p>
                  <p className="text-2xl font-bold">{stats.late}</p>
                </div>
                <div className="p-2 bg-danger-50 rounded-full">
                  <FiXCircle size={20} className="text-danger" />
                </div>
              </div>
            </CardBody>
          </Card>
        )}
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
          title="Tugas" 
          description="Daftar tugas dari mata pelajaran yang Anda ikuti" 
        />
      </div>

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

      {/* Assignment Stats */}
      {!loading && renderAssignmentStats()}

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 flex-grow">
              <Input
                type="text"
                placeholder="Cari tugas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                startContent={<FiSearch className="text-gray-400" />}
                className="flex-grow"
              />
              <Button type="submit" color="primary">
                Cari
              </Button>
            </form>
            
            <div className="flex gap-2">
              <Dropdown>
                <DropdownTrigger>
                  <Button variant="flat" startContent={<FiFilter />}>
                    Filter
                  </Button>
                </DropdownTrigger>
                <DropdownMenu 
                  aria-label="Status Filter"
                  selectionMode="single"
                  selectedKeys={statusFilter ? new Set([statusFilter]) : new Set([])}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0];
                    handleStatusFilterChange(selected as string);
                  }}
                >
                  <DropdownItem key="belum_dikerjakan">Belum Dikerjakan</DropdownItem>
                  <DropdownItem key="sedang_dikerjakan">Sedang Dikerjakan</DropdownItem>
                  <DropdownItem key="selesai">Selesai</DropdownItem>
                </DropdownMenu>
              </Dropdown>
              
              <Dropdown>
                <DropdownTrigger>
                  <Button variant="flat" startContent={<FiFilter />}>
                    Urutkan
                  </Button>
                </DropdownTrigger>
                <DropdownMenu 
                  aria-label="Sort Options"
                  selectionMode="single"
                  selectedKeys={sortBy ? new Set([sortBy]) : new Set([])}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0];
                    handleSortChange(selected as string);
                  }}
                >
                  <DropdownItem key="deadline_asc">Deadline (Terdekat)</DropdownItem>
                  <DropdownItem key="deadline_desc">Deadline (Terjauh)</DropdownItem>
                  <DropdownItem key="status">Status</DropdownItem>
                  <DropdownItem key="matapelajaran">Mata Pelajaran</DropdownItem>
                </DropdownMenu>
              </Dropdown>
              
              {(filteredAssignments !== null || statusFilter || sortBy) && (
                <Button onClick={handleClearFilters} variant="flat">
                  Bersihkan
                </Button>
              )}
            </div>
          </div>
          
          {/* Active Filters */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {statusFilter && (
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500">Status:</span>
                <Chip 
                  size="sm" 
                  variant="flat" 
                  color={statusFilter === 'selesai' ? 'success' : statusFilter === 'sedang_dikerjakan' ? 'primary' : 'warning'}
                  onClose={() => {
                    setStatusFilter(null);
                    setTimeout(() => applyFilters(), 0);
                  }}
                >
                  {statusFilter === 'belum_dikerjakan' ? 'Belum Dikerjakan' : 
                   statusFilter === 'sedang_dikerjakan' ? 'Sedang Dikerjakan' : 'Selesai'}
                </Chip>
              </div>
            )}
            
            {sortBy && (
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500">Urutan:</span>
                <Chip 
                  size="sm" 
                  variant="flat" 
                  color="secondary"
                  onClose={() => {
                    setSortBy(null);
                    setTimeout(() => applyFilters(), 0);
                  }}
                >
                  {sortBy === 'deadline_asc' ? 'Deadline (Terdekat)' : 
                   sortBy === 'deadline_desc' ? 'Deadline (Terjauh)' : 
                   sortBy === 'status' ? 'Status' : 'Mata Pelajaran'}
                </Chip>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Assignments */}
      <div className="mb-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">
            {filteredAssignments !== null || statusFilter ? "Hasil Filter" : "Semua Tugas"}
          </h3>
          {(filteredAssignments !== null || statusFilter) && (
            <p className="text-sm text-gray-500">
              Menampilkan {(filteredAssignments || []).length} hasil
            </p>
          )}
        </div>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" color="primary" />
          </div>
        ) : (
          <>
            {renderAssignments()}
            {renderPagination()}
          </>
        )}
      </div>
    </PageContainer>
  );
};

export default Tugas;
