import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Card, CardBody, Spinner, Input, Button, Pagination, Chip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@nextui-org/react';
import { FiSearch, FiFilter, FiClock, FiCheckCircle, FiXCircle, FiCalendar, FiEye, FiChevronRight, FiClipboard } from 'react-icons/fi';

import PageContainer from '../../../commons/PageContainer';
import PageHeader from '../../../commons/PageHeader';
import NotificationAlert from '../../../commons/NotificationAlert/NotificationAlert';
import { SessionExtended } from '../../../../types/Auth';
import { formatTanggal } from '@/utils/date';
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
  status: 'belum_dikerjakan' | 'selesai';
  nilai?: number;
  createdAt: string;
}


const PAGE_SIZE = 6;

const STATUS_ORDER: Record<Assignment['status'], number> = {
  belum_dikerjakan: 0,
  selesai: 1,
};

const isDeadlinePassed = (deadline: string) => new Date(deadline) < new Date();

/** default order: still-open first (nearest deadline first), overdue last */
const byUrgency = (a: Assignment, b: Assignment) => {
  const aLate = isDeadlinePassed(a.deadline) && a.status !== 'selesai';
  const bLate = isDeadlinePassed(b.deadline) && b.status !== 'selesai';
  if (aLate !== bLate) return aLate ? 1 : -1;

  const aPassed = isDeadlinePassed(a.deadline);
  const bPassed = isDeadlinePassed(b.deadline);
  if (aPassed !== bPassed) return aPassed ? 1 : -1;

  return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
};

const Tugas: React.FC = () => {
  const { data: session } = useSession() as { data: SessionExtended | null };
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  /** the committed search — `searchTerm` is only the input box */
  const [appliedSearch, setAppliedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const router = useRouter();

  // shares the murid dashboard's cache — revisiting this page inside the
  // staleTime costs no request
  const { data: assignments = [], isLoading: loading, error } = useQuery({
    queryKey: ["studentAssignments"],
    queryFn: async (): Promise<Assignment[]> => (await getStudentAssignments()).data || [],
    enabled: !!session?.user,
  });

  const getRemainingDays = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchTerm.trim());
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setAppliedSearch('');
    setStatusFilter(null);
    setSortBy(null);
    setPage(1);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort === sortBy ? null : sort);
    setPage(1);
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status === statusFilter ? null : status);
    setPage(1);
  };

  // Derived on every render. This used to be `applyFilters()` writing to state
  // behind a `setTimeout(..., 0)`, which read the *previous* sortBy/statusFilter
  // out of a stale closure — so every filter click applied one click late.
  const isFiltering = !!appliedSearch || !!statusFilter || !!sortBy;

  const visibleAssignments = (() => {
    let filtered = [...assignments];

    if (appliedSearch) {
      const needle = appliedSearch.toLowerCase();
      filtered = filtered.filter(assignment =>
        assignment.judul.toLowerCase().includes(needle) ||
        assignment.deskripsi.toLowerCase().includes(needle) ||
        assignment.mataPelajaran.judul.toLowerCase().includes(needle)
      );
    }

    if (statusFilter === 'belum_dikerjakan') {
      filtered = filtered.filter(assignment =>
        assignment.status === 'belum_dikerjakan' && !isDeadlinePassed(assignment.deadline)
      );
    } else if (statusFilter === 'terlambat') {
      filtered = filtered.filter(assignment =>
        isDeadlinePassed(assignment.deadline) && assignment.status !== 'selesai'
      );
    } else if (statusFilter) {
      filtered = filtered.filter(assignment => assignment.status === statusFilter);
    }

    switch (sortBy) {
      case 'deadline_asc':
        return filtered.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
      case 'deadline_desc':
        return filtered.sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime());
      case 'status':
        return filtered.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
      default:
        return filtered.sort(byUrgency);
    }
  })();

  const totalPages = Math.ceil(visibleAssignments.length / PAGE_SIZE);

  const currentPageAssignments = visibleAssignments.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const handleViewAssignment = (assignmentId: string, mataPelajaranId: string) => {
    router.push(`/murid/matapelajaran/${mataPelajaranId}/tugas/${assignmentId}`);
  };

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

  const renderDeadlineInfo = (deadline: string) => {
    const isPassed = isDeadlinePassed(deadline);
    const remainingDays = getRemainingDays(deadline);
    
    return (
      <div className={`flex items-center gap-1 text-sm ${isPassed ? 'text-danger' : 'text-gray-500'}`}>
        <FiCalendar size={14} />
        <span>
          {isPassed 
            ? `Deadline telah lewat (${formatTanggal(deadline)})` 
            : `${remainingDays} hari lagi (${formatTanggal(deadline)})`}
        </span>
      </div>
    );
  };

  const renderCard = (assignment: Assignment) => {
    const isLate = isDeadlinePassed(assignment.deadline) && assignment.status !== 'selesai';
    const statusColor = isLate ? 'danger' : 
                       assignment.status === 'selesai' ? 'success' : 'warning';
    
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
                  e.stopPropagation();
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

  const renderAssignments = () => {
    const currentAssignments = currentPageAssignments;
    
    if (currentAssignments.length === 0) {
      return (
        <Card>
          <CardBody className="py-8">
            <p className="text-center text-gray-500">
              {isFiltering
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

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex justify-center mt-6">
        <Pagination
          total={totalPages}
          initialPage={1}
          page={page}
          onChange={setPage}
        />
      </div>
    );
  };

  const getAssignmentStats = () => {
    const total = assignments.length;
    const completed = assignments.filter(a => a.status === 'selesai').length;
    const notStarted = assignments.filter(a => a.status === 'belum_dikerjakan' && !isDeadlinePassed(a.deadline)).length;
    const late = assignments.filter(a => isDeadlinePassed(a.deadline) && a.status !== 'selesai').length;
    
    return { total, completed, notStarted, late };
  };

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

      {error && !errorDismissed && (
        <div className="mb-6">
          <NotificationAlert
            type="error"
            message={(error as Error).message}
            onClose={() => setErrorDismissed(true)}
          />
        </div>
      )}

      {!loading && renderAssignmentStats()}

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
                  <DropdownItem key="terlambat">Terlambat</DropdownItem>
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
                </DropdownMenu>
              </Dropdown>
              
              {isFiltering && (
                <Button onClick={handleClearFilters} variant="flat">
                  Bersihkan
                </Button>
              )}
            </div>
          </div>
          
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {statusFilter && (
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500">Status:</span>
                <Chip 
                  size="sm" 
                  variant="flat" 
                  color={statusFilter === 'selesai' ? 'success' : statusFilter === 'terlambat' ? 'danger' : 'warning'}
                  onClose={() => {
                    setStatusFilter(null);
                    setPage(1);
                  }}
                >
                  {statusFilter === 'belum_dikerjakan' ? 'Belum Dikerjakan' : 
                   statusFilter === 'terlambat' ? 'Terlambat' : 'Selesai'}
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
                    setPage(1);
                  }}
                >
                  {sortBy === 'deadline_asc' ? 'Deadline (Terdekat)' : 
                   sortBy === 'deadline_desc' ? 'Deadline (Terjauh)' : 'Status'}
                </Chip>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      <div className="mb-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">
            {isFiltering ? "Hasil Filter" : "Semua Tugas"}
          </h3>
          {isFiltering && (
            <p className="text-sm text-gray-500">
              Menampilkan {visibleAssignments.length} hasil
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
