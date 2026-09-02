import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardBody, Spinner, Button, Input, Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Chip, Divider, Popover, PopoverTrigger, PopoverContent } from "@nextui-org/react";
import { FiBook, FiChevronLeft, FiChevronRight, FiList, FiPlus, FiAlertTriangle, FiBell, FiCheckCircle, FiUserPlus, FiFileText, FiCheck } from "react-icons/fi";
import PageContainer from "../../../commons/PageContainer";
import PageHeader from "../../../commons/PageHeader";
import NotificationAlert from "../../../commons/NotificationAlert/NotificationAlert";
import StatisticsCard from "../../../commons/Dashboard/StatisticsCard";
import UserProfileCard from "../../../commons/Dashboard/UserProfileCard";
import SubjectCard from "../../../commons/Dashboard/SubjectCard";
import SubjectSearch from "../../../commons/Dashboard/SubjectSearch";
import statsService from "../../../../services/stats.service";
import todoService, { Todo } from "../../../../services/todo.service";
import notificationService, { Notification as NotificationType } from "../../../../services/notification.service";
import { getGuruMataPelajaran } from "../../../../services/guru.service";
import { SessionExtended } from "../../../../types/Auth";
import { useProfile } from "../../../../hooks/useProfile";
import { useRouter } from "next/router";
import { formatTanggal, formatWaktuRelatif } from "@/utils/date";
import NoteCard from "../../../commons/NoteCard";

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

  // --- todos ----------------------------------------------------------------

  const { data: todos = [], isLoading: loadingTodos } = useQuery({
    queryKey: ["todos"],
    queryFn: async () => (await todoService.getTodos()).data,
    enabled,
  });

  const invalidateTodos = () => queryClient.invalidateQueries({ queryKey: ["todos"] });

  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDeleteModalOpen, onOpen: onOpenDeleteModal, onClose: onCloseDeleteModal } = useDisclosure();
  const [isEdit, setIsEdit] = useState(false);
  const [currentTodo, setCurrentTodo] = useState<Todo | null>(null);
  const [todoToDelete, setTodoToDelete] = useState<string | null>(null);
  const [todoTitle, setTodoTitle] = useState('');
  const [todoDescription, setTodoDescription] = useState('');
  const [todoDueDate, setTodoDueDate] = useState('');

  const resetTodoForm = () => {
    setTodoTitle('');
    setTodoDescription('');
    setTodoDueDate('');
    setCurrentTodo(null);
    setIsEdit(false);
  };

  const saveTodoMutation = useMutation({
    mutationFn: (todo: Omit<Todo, "_id" | "createdAt" | "updatedAt">) =>
      isEdit && currentTodo?._id
        ? todoService.updateTodo(currentTodo._id, todo)
        : todoService.createTodo(todo),
    onSuccess: () => {
      flashSuccess(isEdit ? "Berhasil memperbarui tugas" : "Berhasil menambahkan tugas");
      onClose();
      resetTodoForm();
      invalidateTodos();
    },
    onError: (err: Error) => setError(err.message || "Gagal menyimpan tugas"),
  });

  const deleteTodoMutation = useMutation({
    mutationFn: (id: string) => todoService.deleteTodo(id),
    onSuccess: () => {
      flashSuccess("Berhasil menghapus tugas");
      onCloseDeleteModal();
      setTodoToDelete(null);
      invalidateTodos();
    },
    onError: (err: Error) => setError(err.message || "Gagal menghapus tugas"),
  });

  const toggleTodoMutation = useMutation({
    mutationFn: (id: string) => todoService.toggleTodoStatus(id),
    onSuccess: invalidateTodos,
    onError: (err: Error) => setError(err.message || "Gagal mengubah status tugas"),
  });

  const handleAddTodo = () => {
    resetTodoForm();
    onOpen();
  };

  const handleEditTodo = (todo: Todo) => {
    setCurrentTodo(todo);
    setTodoTitle(todo.title);
    setTodoDescription(todo.description || '');
    setTodoDueDate(todo.dueDate ? new Date(todo.dueDate).toISOString().split('T')[0] : '');
    setIsEdit(true);
    onOpen();
  };

  const handleConfirmDelete = (id: string) => {
    setTodoToDelete(id);
    onOpenDeleteModal();
  };

  const handleSaveTodo = () => {
    if (!todoTitle) {
      setError("Judul tugas harus diisi");
      return;
    }

    saveTodoMutation.mutate({
      title: todoTitle,
      description: todoDescription,
      dueDate: todoDueDate || undefined,
      completed: isEdit ? currentTodo?.completed || false : false,
    });
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

  const handleNotificationClick = (notification: NotificationType) => {
    if (!notification.isRead) markAsReadMutation.mutate(notification._id);

    if (notification.type === 'submission' && notification.relatedItem) {
      router.push(`/guru/matapelajaran/${notification.mataPelajaran._id}/tugas/${notification.relatedItem}`);
    } else if (notification.type === 'enrollment' && notification.mataPelajaran) {
      router.push(`/guru/matapelajaran/${notification.mataPelajaran._id}`);
    } else if (notification.type === 'grading_reminder' && notification.relatedItem) {
      router.push(`/guru/matapelajaran/${notification.mataPelajaran._id}/tugas/${notification.relatedItem}`);
    }
  };

  const toggleNotificationPopover = () => setIsNotificationOpen((open) => !open);

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

  const renderPagination = () => {
    if (!subjectFilter || pagination.total === 0) return null;

    return (
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4">
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing{" "}
              <span className="font-medium">
                {(pagination.current - 1) * PAGE_SIZE + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium">
                {Math.min(pagination.current * PAGE_SIZE, pagination.total)}
              </span>{" "}
              of <span className="font-medium">{pagination.total}</span>{" "}
              results
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

  const renderNotifications = () => {
    if (notificationsQuery.isLoading) {
      return (
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      );
    }

    if (notifications.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-6">
          <FiCheckCircle className="text-3xl sm:text-4xl text-success mb-2" />
          <p className="text-gray-500 text-sm sm:text-base">Tidak ada notifikasi</p>
        </div>
      );
    }

    return (
      <div>
        {notifications.map((notification, index) => (
          <React.Fragment key={notification._id || index}>
            <div
              className={`p-3 sm:p-4 cursor-pointer hover:bg-gray-50 ${!notification.isRead ? 'bg-blue-50' : ''} relative`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-11 h-11 flex items-center justify-center">
                    {notification.type === 'enrollment' ? (
                      <FiUserPlus size={22} />
                    ) : notification.type === 'grading_reminder' ? (
                      <FiAlertTriangle size={22} />
                    ) : (
                      <FiFileText size={22} />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-sm sm:text-base text-gray-800 line-clamp-1">{notification.title}</h4>
                    <div className="flex-shrink-0 ml-2 mr-4">
                      <span className="text-xs text-gray-500 whitespace-nowrap inline-block bg-white px-1.5 py-0.5 rounded-md">
                        {formatWaktuRelatif(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5 line-clamp-2">{notification.description}</p>
                  <div className="flex items-center mt-1 gap-2">
                    <Chip
                      size="sm"
                      color={
                        notification.type === 'submission' ? 'primary' :
                        notification.type === 'enrollment' ? 'success' :
                        notification.type === 'grading_reminder' ? 'warning' :
                        'default'
                      }
                      className="h-5 text-xs"
                    >
                      {notification.type === 'submission' && 'Tugas'}
                      {notification.type === 'enrollment' && 'Pendaftaran'}
                      {notification.type === 'grading_reminder' && 'Pengingat'}
                      {!['submission', 'enrollment', 'grading_reminder'].includes(notification.type) && 'Info'}
                    </Chip>
                    {notification.mataPelajaran && (
                      <span className="text-xs text-gray-500 truncate">
                        {notification.mataPelajaran.judul}
                      </span>
                    )}
                  </div>
                </div>
                {!notification.isRead && (
                  <div className="absolute top-4 right-2 w-3 h-3 rounded-full bg-red-500"></div>
                )}
              </div>
            </div>
            {index < notifications.length - 1 && <Divider />}
          </React.Fragment>
        ))}

        {notificationsQuery.hasNextPage && (
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
        )}
      </div>
    );
  };

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
          <Popover
            placement="bottom-end"
            showArrow={true}
            isOpen={isNotificationOpen}
            onOpenChange={(open) => {
              setIsNotificationOpen(open);
              if (open) notificationsQuery.refetch();
            }}
          >
            <PopoverTrigger>
              <div className="relative inline-block">
                <Button
                  isIconOnly
                  variant="light"
                  radius="full"
                  onPress={toggleNotificationPopover}
                  className="z-10"
                >
                  <FiBell size={20} className="text-gray-700" />
                </Button>
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full z-20 flex items-center justify-center text-white text-xs font-bold px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </div>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] sm:w-[360px] p-0">
              <div className="p-3 sm:p-4 border-b">
                <div className="flex items-center justify-center">
                  <h3 className="font-semibold text-sm sm:text-base">Notifikasi</h3>
                </div>
                <div className="flex items-center justify-end mt-2">
                  <Button
                    size="sm"
                    variant="light"
                    color="primary"
                    onPress={() => markAllAsReadMutation.mutate()}
                    isLoading={markAllAsReadMutation.isPending}
                    className="text-xs sm:text-sm"
                    startContent={<FiCheck size={14} />}
                  >
                    Tandai semua dibaca
                  </Button>
                </div>
              </div>
              <div className="max-h-[280px] overflow-y-auto">
                {renderNotifications()}
              </div>
            </PopoverContent>
          </Popover>
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
            <Card className="col-span-2">
              <CardBody>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <FiList size={24} className="text-primary mr-2" />
                    <h3 className="text-lg font-semibold">Catatan Saya</h3>
                  </div>
                  <Button
                    color="primary"
                    variant="light"
                    startContent={<FiPlus />}
                    onClick={handleAddTodo}
                    size="sm"
                  >
                    Tambah Catatan
                  </Button>
                </div>

                {loadingTodos ? (
                  <div className="flex justify-center py-8">
                    <Spinner size="sm" />
                  </div>
                ) : todos.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">
                    Belum ada Catatan yang tersedia. Klik &quot;Tambah Catatan&quot; untuk membuat Note baru.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {todos.map(todo => (
                      <NoteCard
                        key={todo._id}
                        note={{
                          _id: todo._id,
                          title: todo.title,
                          description: todo.description,
                          dueDate: todo.dueDate,
                          completed: todo.completed
                        }}
                        onToggleStatus={(id) => toggleTodoMutation.mutate(id)}
                        onEdit={handleEditTodo}
                        onDelete={handleConfirmDelete}
                        formatDate={formatTanggal}
                      />
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          <Modal isOpen={isOpen} onClose={onClose}>
            <ModalContent>
              <ModalHeader>{isEdit ? 'Edit Tugas' : 'Tambah Tugas'}</ModalHeader>
              <ModalBody>
                <Input
                  label="Judul"
                  placeholder="Masukkan judul tugas"
                  value={todoTitle}
                  onChange={(e) => setTodoTitle(e.target.value)}
                  isRequired
                  className="mb-3"
                />
                <Textarea
                  label="Deskripsi (opsional)"
                  placeholder="Masukkan deskripsi tugas"
                  value={todoDescription}
                  onChange={(e) => setTodoDescription(e.target.value)}
                  className="mb-3"
                />
                <Input
                  type="date"
                  label="Tanggal Tenggat (opsional)"
                  placeholder="Pilih tanggal tenggat"
                  value={todoDueDate}
                  onChange={(e) => setTodoDueDate(e.target.value)}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  Batal
                </Button>
                <Button color="primary" onPress={handleSaveTodo} isLoading={saveTodoMutation.isPending}>
                  Simpan
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>

          <Modal isOpen={isDeleteModalOpen} onClose={onCloseDeleteModal}>
            <ModalContent>
              <ModalHeader className="flex gap-1">
                <FiAlertTriangle className="text-danger" size={24} />
                Konfirmasi Hapus
              </ModalHeader>
              <ModalBody>
                <p>Apakah Anda yakin ingin menghapus tugas ini?</p>
                <p className="text-sm text-gray-500">Tindakan ini tidak dapat dibatalkan.</p>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onCloseDeleteModal}>
                  Batal
                </Button>
                <Button
                  color="danger"
                  onPress={() => todoToDelete && deleteTodoMutation.mutate(todoToDelete)}
                  isLoading={deleteTodoMutation.isPending}
                >
                  Hapus
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>

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

            {renderPagination()}
          </div>
        </>
      )}
    </PageContainer>
  );
};

export default Dashboard;
