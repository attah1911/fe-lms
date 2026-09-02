import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardBody, Spinner, Button, Chip, Divider, Input, Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Popover, PopoverTrigger, PopoverContent, Checkbox } from "@nextui-org/react";
import { FiBook, FiClock, FiAlertCircle, FiBell, FiFileText, FiPlus, FiCheckCircle, FiList, FiCheck } from "react-icons/fi";

import PageContainer from "../../../commons/PageContainer";
import PageHeader from "../../../commons/PageHeader";
import NotificationAlert from "../../../commons/NotificationAlert/NotificationAlert";
import UserProfileCard from "../../../commons/Dashboard/UserProfileCard";
import SubjectCard from "../../../commons/Dashboard/SubjectCard";
import SubjectSearch from "../../../commons/Dashboard/SubjectSearch";
import StatisticsCard from "../../../commons/Dashboard/StatisticsCard";
import todoService, { Todo } from "../../../../services/todo.service";
import { getEnrolledMataPelajaran, getNotifications, markNotificationAsRead, markAllNotificationsAsRead, getStudentAssignments, markAssignmentCompletion, Notification, Assignment } from "../../../../services/student.service";
import { SessionExtended } from "../../../../types/Auth";
import { useProfile } from "../../../../hooks/useProfile";
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
    queryFn: async (): Promise<Assignment[]> => {
      const response = await getStudentAssignments();
      const now = new Date();
      return (response.data || []).filter((a: Assignment) => new Date(a.deadline) > now);
    },
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
      flashSuccess(isEdit ? "Berhasil memperbarui catatan" : "Berhasil menambahkan catatan");
      onClose();
      resetTodoForm();
      invalidateTodos();
    },
    onError: (err: Error) => setError(err.message || "Gagal menyimpan catatan"),
  });

  const deleteTodoMutation = useMutation({
    mutationFn: (id: string) => todoService.deleteTodo(id),
    onSuccess: () => {
      flashSuccess("Berhasil menghapus catatan");
      onCloseDeleteModal();
      setTodoToDelete(null);
      invalidateTodos();
    },
    onError: (err: Error) => setError(err.message || "Gagal menghapus catatan"),
  });

  const toggleTodoMutation = useMutation({
    mutationFn: (id: string) => todoService.toggleTodoStatus(id),
    onSuccess: invalidateTodos,
    onError: (err: Error) => setError(err.message || "Gagal mengubah status catatan"),
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
      setError("Judul catatan harus diisi");
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
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) markAsReadMutation.mutate(notification._id);
    router.push(notificationHref(notification));
  };

  const toggleNotificationPopover = () => setIsNotificationOpen((open) => !open);

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

  const renderNotifications = () => {
    if (loadingNotifications) {
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

    const displayNotifications = notifications.slice(0, 3);

    return (
      <div>
        {displayNotifications.map((notification, index) => (
          <React.Fragment key={notification._id}>
            <div
              className={`p-3 sm:p-4 cursor-pointer hover:bg-gray-50 ${!notification.isRead ? 'bg-blue-50' : ''} relative`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  {notification.type === 'tugas' ? (
                    <div className="bg-amber-100 text-amber-600 rounded-full w-11 h-11 flex items-center justify-center">
                      <FiFileText size={22} />
                    </div>
                  ) : (
                    <div className="bg-blue-100 text-blue-600 rounded-full w-11 h-11 flex items-center justify-center">
                      <FiBook size={22} />
                    </div>
                  )}
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
                      color={notification.type === 'tugas' ? 'warning' : 'primary'}
                      className="h-5 text-xs"
                    >
                      {notification.type === 'tugas' ? 'Tugas' : 'Materi'}
                    </Chip>
                    <span className="text-xs text-gray-500 truncate">
                      {notification.mataPelajaran?.judul}
                    </span>
                  </div>
                </div>
                {!notification.isRead && (
                  <div className="absolute top-4 right-2 w-3 h-3 rounded-full bg-red-500"></div>
                )}
              </div>
            </div>
            {index < displayNotifications.length - 1 && <Divider />}
          </React.Fragment>
        ))}
        {notifications.length > 3 && (
          <div className="text-center p-2 text-xs text-gray-500">
            {notifications.length - 3} notifikasi lainnya
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
      <div className="flex flex-row justify-between items-center mb-6 md:flex-row md:items-center md:mb-6">
        <div className="flex-1">
          <PageHeader
            title="Dashboard Murid"
            description="Selamat datang di halaman Dashboard Murid"
          />
        </div>
        <div className="flex items-center gap-4 pr-2 md:pr-2">
          <Popover
            placement="bottom-end"
            showArrow={true}
            isOpen={isNotificationOpen}
            onOpenChange={(open) => {
              setIsNotificationOpen(open);
              if (open) refetchNotifications();
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
                {unreadNotifications > 0 && (
                  <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full z-20 flex items-center justify-center text-white text-xs font-bold px-1">
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
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
                    onPress={handleMarkAllAsRead}
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
            <Card>
              <CardBody className="p-4 md:p-3">
                <div className="flex items-center justify-between mb-4 md:mb-3">
                  <div className="flex items-center">
                    <FiList size={24} className="text-primary mr-2 md:text-xl" />
                    <h3 className="text-lg font-semibold md:text-base">Catatan Saya</h3>
                  </div>
                  <Button
                    color="primary"
                    variant="light"
                    startContent={<FiPlus className="md:text-sm" />}
                    onClick={handleAddTodo}
                    size="sm"
                    className="md:min-w-0 md:px-3 md:text-xs"
                  >
                    <span className="block md:hidden">Tambah Catatan</span>
                    <span className="hidden md:block">Tambah</span>
                  </Button>
                </div>

                {loadingTodos ? (
                  <div className="flex justify-center py-8 md:py-4">
                    <Spinner size="sm" />
                  </div>
                ) : todos.length === 0 ? (
                  <p className="text-center text-gray-500 py-4 md:py-2 md:text-sm">
                    <span className="block md:hidden">Belum ada Catatan yang tersedia. Klik &quot;Tambah Catatan&quot; untuk membuat Note baru.</span>
                    <span className="hidden md:block">Belum ada Notes. Klik &quot;Tambah&quot; untuk membuat baru.</span>
                  </p>
                ) : (
                  <div className="space-y-3 md:space-y-2">
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

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader>{isEdit ? 'Edit Catatan' : 'Tambah Catatan Baru'}</ModalHeader>
          <ModalBody>
            <Input
              label="Judul"
              placeholder="Masukkan judul catatan"
              value={todoTitle}
              onValueChange={setTodoTitle}
              isRequired
            />
            <Textarea
              label="Deskripsi (opsional)"
              placeholder="Masukkan deskripsi catatan"
              value={todoDescription}
              onValueChange={setTodoDescription}
            />
            <Input
              label="Tenggat Waktu (opsional)"
              placeholder="Pilih tanggal"
              type="date"
              value={todoDueDate}
              onValueChange={setTodoDueDate}
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
            <FiAlertCircle className="text-danger" size={24} />
            Konfirmasi Hapus
          </ModalHeader>
          <ModalBody>
            <p>Apakah Anda yakin ingin menghapus catatan ini?</p>
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
    </PageContainer>
  );
};

export default Dashboard;
