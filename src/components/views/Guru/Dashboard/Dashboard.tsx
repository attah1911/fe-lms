import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardBody, Spinner, Button } from "@nextui-org/react";
import { FiBook, FiAlertTriangle, FiUserPlus, FiFileText } from "react-icons/fi";
import PageContainer from "../../../commons/PageContainer";
import PageHeader from "../../../commons/PageHeader";
import NotificationAlert from "../../../commons/NotificationAlert/NotificationAlert";
import StatisticsCard from "../../../commons/Dashboard/StatisticsCard";
import UserProfileCard from "../../../commons/Dashboard/UserProfileCard";
import SubjectCard from "../../../commons/Dashboard/SubjectCard";
import SubjectSearch from "../../../commons/Dashboard/SubjectSearch";
import TablePagination from "../../../commons/Table/TablePagination";
import CatatanSaya from "../../../commons/Dashboard/CatatanSaya";
import NotificationBell, { NotificationBellItem } from "../../../commons/Dashboard/NotificationBell";
import statsService from "../../../../services/stats.service";
import notificationService, { Notification as NotificationType } from "../../../../services/notification.service";
import { getGuruMataPelajaran } from "../../../../services/guru.service";
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

interface GuruStats {
  mataPelajaranCount: number;
  muridCount: number;
  materiCount: number;
  recentSubjects: Subject[];
}

const PAGE_SIZE = 6;

const Dashboard: React.FC = () => {
  const { data: session } = useSession() as { data: SessionExtended | null };
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const enabled = !!session?.user;

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const flashSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // --- stats ----------------------------------------------------------------

  const {
    data: stats,
    isLoading: loading,
    error: statsError,
  } = useQuery({
    queryKey: ["stats", "guru"],
    queryFn: async (): Promise<GuruStats> => {
      try {
        return await statsService.getGuruStats();
      } catch (statsErr) {
        // stats endpoint is optional — fall back to just the subject list
        console.error("Error fetching guru stats:", statsErr);
        const response = await getGuruMataPelajaran({ page: 1, limit: PAGE_SIZE });
        return {
          mataPelajaranCount: response.pagination?.total || 0,
          muridCount: 0,
          materiCount: 0,
          recentSubjects: response.data || [],
        };
      }
    },
    enabled,
  });

  // --- subject search / pagination ------------------------------------------

  // null = not searching, show stats.recentSubjects. The filter object doubles
  // as the query key, so paging keeps the search term (it used to be dropped).
  const [subjectFilter, setSubjectFilter] = useState<{ search: string; page: number } | null>(null);

  const { data: subjectPage, isFetching: isSearching } = useQuery({
    queryKey: ["guruMataPelajaran", subjectFilter],
    queryFn: () => getGuruMataPelajaran({ ...subjectFilter!, limit: PAGE_SIZE }),
    enabled: enabled && !!subjectFilter,
    placeholderData: keepPreviousData,
  });

  const searchResults: Subject[] | null = subjectFilter ? subjectPage?.data ?? null : null;
  const pagination = {
    total: subjectPage?.pagination?.total ?? 0,
    totalPages: subjectPage?.pagination?.totalPages ?? 0,
    current: subjectFilter?.page ?? 1,
  };

  const handleSearch = (searchTerm: string) => setSubjectFilter({ search: searchTerm, page: 1 });
  const handleViewAll = () => setSubjectFilter({ search: "", page: 1 });
  const handlePageChange = (newPage: number) => {
    if (newPage === pagination.current) return;
    setSubjectFilter((prev) => (prev ? { ...prev, page: newPage } : prev));
  };

  // --- notifications --------------------------------------------------------

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  // while the popover is open, poll like the old setInterval did. React Query
  // already skips the refetch when the tab is in the background.
  const notificationPoll = isNotificationOpen ? 10000 : false;

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications", "unreadCount"],
    queryFn: notificationService.getUnreadCount,
    enabled,
    refetchInterval: notificationPoll,
  });

  const notificationsQuery = useInfiniteQuery({
    queryKey: ["notifications", "guru"],
    queryFn: ({ pageParam }) => notificationService.getTeacherNotifications({ page: pageParam, limit: 5 }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.current < last.pagination.totalPages ? last.pagination.current + 1 : undefined,
    enabled,
    refetchInterval: notificationPoll,
  });

  const notifications: NotificationType[] = notificationsQuery.data?.pages.flatMap((page) => page.data) ?? [];

  const invalidateNotifications = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: invalidateNotifications,
    onError: (err) => console.error("Failed to mark notification as read:", err),
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: invalidateNotifications,
    onError: (err) => console.error("Failed to mark all notifications as read:", err),
  });

  const handleNotificationClick = (id: string) => {
    const notification = notifications.find((item) => item._id === id);
    if (!notification) return;
    if (!notification.isRead) markAsReadMutation.mutate(notification._id);

    if (notification.type === 'submission' && notification.relatedItem) {
      router.push(`/guru/matapelajaran/${notification.mataPelajaran._id}/tugas/${notification.relatedItem}`);
    } else if (notification.type === 'enrollment' && notification.mataPelajaran) {
      router.push(`/guru/matapelajaran/${notification.mataPelajaran._id}`);
    } else if (notification.type === 'grading_reminder' && notification.relatedItem) {
      router.push(`/guru/matapelajaran/${notification.mataPelajaran._id}/tugas/${notification.relatedItem}`);
    }
  };

  // --- render helpers -------------------------------------------------------

  const renderSubjects = () => {
    const subjects = searchResults ?? stats?.recentSubjects ?? [];

    if (subjects.length === 0) {
      return (
        <Card>
          <CardBody className="py-8">
            <p className="text-center text-gray-500">
              {searchResults
                ? "Tidak ada mata pelajaran yang sesuai dengan pencarian Anda."
                : "Belum ada mata pelajaran yang tersedia."}
            </p>
          </CardBody>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((subject) => (
          <SubjectCard
            key={subject._id}
            id={subject._id}
            title={subject.judul}
            description={subject.deskripsi}
            category={subject.kategori}
            teacher={subject.guru?.fullName || 'Unknown'}
            createdAt={subject.createdAt}
            viewPath="/guru/matapelajaran"
          />
        ))}
      </div>
    );
  };


  const NOTIFICATION_STYLE: Record<string, { icon: React.ReactNode; iconClassName: string; label: string; color: "primary" | "success" | "warning" | "default" }> = {
    submission: { icon: <FiFileText size={22} />, iconClassName: "bg-blue-100 text-blue-600", label: "Tugas", color: "primary" },
    enrollment: { icon: <FiUserPlus size={22} />, iconClassName: "bg-blue-100 text-blue-600", label: "Pendaftaran", color: "success" },
    grading_reminder: { icon: <FiAlertTriangle size={22} />, iconClassName: "bg-blue-100 text-blue-600", label: "Pengingat", color: "warning" },
  };

  const notificationItems: NotificationBellItem[] = notifications.map((notification) => {
    const style = NOTIFICATION_STYLE[notification.type] ?? {
      icon: <FiFileText size={22} />,
      iconClassName: "bg-blue-100 text-blue-600",
      label: "Info",
      color: "default" as const,
    };

    return {
      id: notification._id,
      title: notification.title,
      description: notification.description,
      createdAt: notification.createdAt,
      isRead: notification.isRead,
      icon: style.icon,
      iconClassName: style.iconClassName,
      badgeLabel: style.label,
      badgeColor: style.color,
      context: notification.mataPelajaran?.judul,
    };
  });

  if (!session?.user) {
    return null;
  }

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-6">
        <div className="flex-1">
          <PageHeader
            title="Dashboard Guru"
            description="Selamat datang di halaman Dashboard Guru"
          />
        </div>
        <div className="flex items-center gap-4 pr-2">
          <NotificationBell
            isOpen={isNotificationOpen}
            onOpenChange={(open) => {
              setIsNotificationOpen(open);
              if (open) notificationsQuery.refetch();
            }}
            unreadCount={unreadCount}
            isLoading={notificationsQuery.isLoading}
            items={notificationItems}
            onItemClick={handleNotificationClick}
            onMarkAllRead={() => markAllAsReadMutation.mutate()}
            isMarkingAllRead={markAllAsReadMutation.isPending}
            footer={
              notificationsQuery.hasNextPage ? (
                <div className="p-3 flex justify-center">
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={() => notificationsQuery.fetchNextPage()}
                    isLoading={notificationsQuery.isFetchingNextPage}
                    isDisabled={notificationsQuery.isFetchingNextPage}
                  >
                    Muat lebih banyak
                  </Button>
                </div>
              ) : null
            }
          />
        </div>
      </div>

      {(error || statsError) && (
        <div className="mb-6">
          <NotificationAlert
            type="error"
            message={error ?? (statsError as Error).message}
            onClose={() => setError(null)}
          />
        </div>
      )}

      {successMessage && (
        <div className="mb-6">
          <NotificationAlert
            type="success"
            message={successMessage}
            onClose={() => setSuccessMessage(null)}
          />
        </div>
      )}

      <div className="mb-6">
        <UserProfileCard
          user={profile ? {
            ...session.user,
            profilePicture: profile.profilePicture,
            fullName: profile.fullName,
            email: profile.email
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
              title="Total Mata Pelajaran"
              value={stats?.mataPelajaranCount || 0}
              icon={<FiBook size={24} />}
              color="success"
            />
            <div className="col-span-2">
              <CatatanSaya enabled={enabled} onSuccess={flashSuccess} onError={setError} />
            </div>
          </div>

          <Card className="mb-6">
            <CardBody>
              <h3 className="text-lg font-semibold mb-3">Cari Mata Pelajaran</h3>
              <SubjectSearch onSearch={handleSearch} />
              {subjectFilter && (
                <div className="mt-2 text-sm">
                  <button
                    onClick={() => setSubjectFilter(null)}
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
                {subjectFilter ? "Hasil Pencarian" : "Mata Pelajaran"}
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

            {subjectFilter && pagination.total > 0 && (
              <TablePagination
                total={pagination.total}
                totalPages={pagination.totalPages}
                current={pagination.current}
                pageSize={PAGE_SIZE}
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
