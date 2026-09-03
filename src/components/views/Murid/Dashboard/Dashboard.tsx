import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardBody, Spinner, Button, Checkbox } from "@nextui-org/react";
import { FiBook, FiClock, FiFileText } from "react-icons/fi";

import PageContainer from "../../../commons/PageContainer";
import PageHeader from "../../../commons/PageHeader";
import NotificationAlert from "../../../commons/NotificationAlert/NotificationAlert";
import UserProfileCard from "../../../commons/Dashboard/UserProfileCard";
import SubjectCard from "../../../commons/Dashboard/SubjectCard";
import SubjectSearch from "../../../commons/Dashboard/SubjectSearch";
import StatisticsCard from "../../../commons/Dashboard/StatisticsCard";
import CatatanSaya from "../../../commons/Dashboard/CatatanSaya";
import NotificationBell, { NotificationBellItem } from "../../../commons/Dashboard/NotificationBell";
import { getEnrolledMataPelajaran, getNotifications, markNotificationAsRead, markAllNotificationsAsRead, getStudentAssignments, markAssignmentCompletion, Notification, Assignment } from "../../../../services/student.service";
import { SessionExtended } from "../../../../types/Auth";
import { useProfile } from "../../../../hooks/useProfile";
import { formatTanggal } from "@/utils/date";


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

/** Where a notification points: the mata pelajaran, or the tugas/materi inside it. */
const notificationHref = (notification: Notification) => {
  const base = `/murid/matapelajaran/${notification.mataPelajaran._id}`;
  if (!notification.relatedItem) return base;
  return `${base}/${notification.type === "tugas" ? "tugas" : "materi"}/${notification.relatedItem}`;
};

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
  const flashError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 3000);
  };

  // --- enrolled subjects + active assignments -------------------------------

  const { data: enrolledSubjects = [], isLoading: loadingSubjects } = useQuery({
    queryKey: ["enrolledSubjects"],
    queryFn: async (): Promise<Subject[]> => (await getEnrolledMataPelajaran()).data || [],
    enabled,
  });

  const { data: pendingAssignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ["studentAssignments"],
    queryFn: async (): Promise<Assignment[]> => (await getStudentAssignments()).data || [],
    // cache the full list — `/murid/tugas` reads the same key and needs the
    // overdue ones too; only this card narrows it down
    select: (all) => all.filter((a) => new Date(a.deadline) > new Date()),
    enabled,
  });

  const loading = loadingSubjects || loadingAssignments;

  const completionMutation = useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      markAssignmentCompletion(id, isCompleted),
    onSuccess: (_data, { isCompleted }) => {
      flashSuccess(isCompleted ? "Tugas berhasil ditandai sebagai selesai" : "Tugas ditandai sebagai belum selesai");
      queryClient.invalidateQueries({ queryKey: ["studentAssignments"] });
    },
    onError: (err: Error) => flashError(err.message || "Gagal mengubah status tugas"),
  });

  const handleToggleAssignmentStatus = (assignmentId: string) => {
    const assignment = pendingAssignments.find((a) => a._id === assignmentId);
    if (!assignment) return;

    // nothing handed in yet — send them to the tugas page instead of toggling
    if (!assignment.isSubmitted && !assignment.submission) {
      const mataPelajaranId = assignment.mataPelajaran?._id || assignment.mataPelajaranId;
      router.push(`/murid/matapelajaran/${mataPelajaranId}/tugas/${assignment._id}`);
      return;
    }

    if (assignment.submission) {
      const isCompleted = !(assignment.isCompleted !== undefined ? assignment.isCompleted : assignment.isSubmitted);
      completionMutation.mutate({ id: assignmentId, isCompleted });
    }
  };

  // --- subject search (client-side over the enrolled list) -------------------

  const [searchTerm, setSearchTerm] = useState("");
  const searchResults: Subject[] | null = searchTerm
    ? enrolledSubjects.filter(
        (subject) =>
          subject.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
          subject.deskripsi.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : null;

  const handleViewAll = () => router.push("/murid/matapelajaran");

  // --- notifications --------------------------------------------------------

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const { data: notifications = [], isLoading: loadingNotifications, refetch: refetchNotifications } = useQuery({
    queryKey: ["studentNotifications"],
    queryFn: async (): Promise<Notification[]> => (await getNotifications()).data || [],
    enabled,
  });

  const unreadNotifications = notifications.filter((n) => !n.isRead).length;

  const invalidateNotifications = () =>
    queryClient.invalidateQueries({ queryKey: ["studentNotifications"] });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationAsRead(id),
    onSuccess: invalidateNotifications,
    onError: (err) => console.error("Error marking notification as read:", err),
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      flashSuccess("Semua notifikasi telah ditandai sebagai dibaca");
      invalidateNotifications();
    },
    onError: (err) => {
      console.error("Error marking all notifications as read:", err);
      flashError("Gagal menandai semua notifikasi sebagai dibaca");
    },
  });

  const handleMarkAllAsRead = () => {
    if (unreadNotifications === 0) {
      flashSuccess("Tidak ada notifikasi yang perlu ditandai");
      return;
    }
    markAllAsReadMutation.mutate();
  };

  // navigation happens either way — a failed mark-as-read must not block it
  const handleNotificationClick = (id: string) => {
    const notification = notifications.find((item) => item._id === id);
    if (!notification) return;
    if (!notification.isRead) markAsReadMutation.mutate(notification._id);
    router.push(notificationHref(notification));
  };

  // --- render helpers -------------------------------------------------------

  const renderSubjects = () => {
    const subjects = searchResults ?? enrolledSubjects;

    if (subjects.length === 0) {
      return (
        <Card>
          <CardBody className="py-8">
            <p className="text-center text-gray-500">
              {searchResults
                ? "Tidak ada mata pelajaran yang sesuai dengan pencarian Anda."
                : "Anda belum terdaftar di mata pelajaran apapun."}
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
            viewPath="/murid/matapelajaran"
          />
        ))}
      </div>
    );
  };

  const VISIBLE_NOTIFICATIONS = 3;

  const notificationItems: NotificationBellItem[] = notifications
    .slice(0, VISIBLE_NOTIFICATIONS)
    .map((notification) => ({
      id: notification._id,
      title: notification.title,
      description: notification.description,
      createdAt: notification.createdAt,
      isRead: notification.isRead,
      icon: notification.type === 'tugas' ? <FiFileText size={22} /> : <FiBook size={22} />,
      iconClassName:
        notification.type === 'tugas' ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600",
      badgeLabel: notification.type === 'tugas' ? 'Tugas' : 'Materi',
      badgeColor: notification.type === 'tugas' ? 'warning' : 'primary',
      context: notification.mataPelajaran?.judul,
    }));

  if (!session?.user) {
    return null;
  }

  return (
    <PageContainer>
      <div className="flex flex-row justify-between items-center mb-6 md:flex-row md:items-center md:mb-6">
        <div className="flex-1">
          <PageHeader
            title="Dashboard Murid"
            description="Selamat datang di halaman Dashboard Murid"
          />
        </div>
        <div className="flex items-center gap-4 pr-2 md:pr-2">
          <NotificationBell
            isOpen={isNotificationOpen}
            onOpenChange={(open) => {
              setIsNotificationOpen(open);
              if (open) refetchNotifications();
            }}
            unreadCount={unreadNotifications}
            isLoading={loadingNotifications}
            items={notificationItems}
            onItemClick={handleNotificationClick}
            onMarkAllRead={handleMarkAllAsRead}
            isMarkingAllRead={markAllAsReadMutation.isPending}
            footer={
              notifications.length > VISIBLE_NOTIFICATIONS ? (
                <div className="text-center p-2 text-xs text-gray-500">
                  {notifications.length - VISIBLE_NOTIFICATIONS} notifikasi lainnya
                </div>
              ) : null
            }
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 md:mb-4">
          <NotificationAlert
            type="error"
            message={error}
            onClose={() => setError(null)}
          />
        </div>
      )}

      {successMessage && (
        <div className="mb-6 md:mb-4">
          <NotificationAlert
            type="success"
            message={successMessage}
            onClose={() => setSuccessMessage(null)}
          />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center my-12">
          <Spinner size="lg" color="primary" />
        </div>
      ) : (
        <>
          <div className="block md:hidden mb-6">
            <UserProfileCard
              user={profile ? {
                ...session.user,
                profilePicture: profile.profilePicture,
                fullName: profile.fullName,
                email: profile.email
              } : session.user}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 mb-6 md:hidden">
            <StatisticsCard
              title="Mata Pelajaran"
              value={enrolledSubjects.length}
              icon={<FiBook size={24} />}
              color="primary"
            />
            <StatisticsCard
              title="Tugas Aktif"
              value={pendingAssignments.length}
              icon={<FiFileText size={24} />}
              color="warning"
            />
          </div>

          <div className="hidden md:grid md:grid-cols-3 md:gap-5 md:mb-5">
            <div className="col-span-1">
              <UserProfileCard
                user={profile ? {
                  ...session.user,
                  profilePicture: profile.profilePicture,
                  fullName: profile.fullName,
                  email: profile.email
                } : session.user}
              />
            </div>
            <div className="col-span-2">
              <div className="grid grid-cols-2 gap-4">
                <StatisticsCard
                  title="Mata Pelajaran"
                  value={enrolledSubjects.length}
                  icon={<FiBook size={18} className="text-xl" />}
                  color="primary"
                />
                <StatisticsCard
                  title="Tugas Aktif"
                  value={pendingAssignments.length}
                  icon={<FiFileText size={18} className="text-xl" />}
                  color="warning"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-6 md:mb-5">
            <CatatanSaya enabled={enabled} onSuccess={flashSuccess} onError={setError} />

            <Card>
              <CardBody className="p-4 md:p-3">
                <div className="flex items-center justify-between mb-4 md:mb-3">
                  <div className="flex items-center">
                    <FiClock size={24} className="text-warning mr-2 md:text-xl" />
                    <h3 className="text-lg font-semibold md:text-base">Tugas Aktif</h3>
                  </div>
                  <Button
                    color="primary"
                    variant="light"
                    size="sm"
                    onClick={() => router.push('/murid/tugas')}
                    className="md:min-w-0 md:px-3 md:text-xs"
                  >
                    Lihat Semua
                  </Button>
                </div>
                <div>
                  {pendingAssignments.length > 0 ? (
                    <div className="space-y-2 sm:space-y-3">
                      {pendingAssignments.slice(0, 5).map((assignment) => (
                        <div
                          key={assignment._id}
                          className={`relative p-2 sm:p-3 border rounded-md ${assignment.isSubmitted ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'} hover:bg-gray-50 transition-colors`}
                        >
                          <div
                            className="absolute inset-0 cursor-pointer"
                            onClick={() => router.push(`/murid/matapelajaran/${assignment.mataPelajaran?._id}/tugas/${assignment._id}`)}
                            aria-label={`Lihat tugas ${assignment.title}`}
                          />
                          <div className="flex items-start gap-2 sm:gap-3 relative z-10">
                            <div className="mt-0.5 sm:mt-0">
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleAssignmentStatus(assignment._id);
                                }}
                                className="relative z-20 p-1"
                              >
                                <Checkbox
                                  isSelected={assignment.isCompleted || assignment.isSubmitted}
                                  className="cursor-pointer scale-110"
                                  size="md"
                                  color="success"
                                />
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between">
                                <div className="pr-0 sm:pr-3 mb-3 sm:mb-0 flex-1">
                                  <h4 className={`text-sm sm:text-base font-medium ${assignment.isSubmitted ? 'line-through text-gray-500' : ''}`}>{assignment.title}</h4>
                                  <p className={`text-xs sm:text-sm mt-0.5 ${assignment.isSubmitted ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {assignment.mataPelajaran?.judul || 'Mata Pelajaran tidak tersedia'}
                                  </p>
                                  <div className="flex items-center mt-1.5 text-xs text-gray-500">
                                    <FiClock size={10} className="mr-1" />
                                    <span>Tenggat: {formatTanggal(assignment.deadline)}</span>
                                  </div>
                                </div>
                                <div className="self-start sm:self-center flex justify-end w-full sm:w-auto">
                                  <div onClick={(e) => e.stopPropagation()} className="w-full sm:w-auto">
                                    <Button
                                      size="sm"
                                      color="primary"
                                      variant="flat"
                                      onClick={() => router.push(`/murid/matapelajaran/${assignment.mataPelajaran?._id}/tugas/${assignment._id}`)}
                                      className="min-w-[110px] h-10 px-8 text-xs sm:text-sm relative z-10 w-full sm:w-auto"
                                    >
                                      Lihat
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {pendingAssignments.length > 5 && (
                        <div className="flex justify-center mt-2">
                          <Button
                            size="sm"
                            variant="flat"
                            color="primary"
                            onClick={() => router.push('/murid/tugas')}
                            className="text-xs sm:text-sm"
                          >
                            Lihat Semua ({pendingAssignments.length}) Tugas
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-center py-2 sm:py-3 text-sm sm:text-base text-gray-500">Tidak ada tugas aktif saat ini.</p>
                  )}
                </div>
            </CardBody>
          </Card>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:gap-5 mb-3 sm:mb-5">
            <Card>
              <CardBody className="p-3 sm:p-4">
                <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Cari Mata Pelajaran</h3>
                <SubjectSearch onSearch={(term) => setSearchTerm(term.trim())} />
                {searchResults !== null && (
                  <div className="mt-2 text-xs sm:text-sm">
                    <button
                      onClick={() => setSearchTerm("")}
                      className="text-primary hover:underline"
                    >
                      Bersihkan pencarian
                    </button>
                  </div>
                )}
              </CardBody>
            </Card>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {searchResults !== null ? "Hasil Pencarian" : "Mata Pelajaran Saya"}
                </h3>
                <button
                  onClick={handleViewAll}
                  className="text-sm text-primary hover:underline"
                >
                  Lihat Semua
                </button>
              </div>

              {renderSubjects()}
            </div>
          </div>
        </>
      )}

    </PageContainer>
  );
};

export default Dashboard;
