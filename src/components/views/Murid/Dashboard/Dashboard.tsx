import React, { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { Card, CardBody, Spinner, Button, Avatar, Chip, Divider, Input, Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Badge, Popover, PopoverTrigger, PopoverContent, Checkbox } from "@nextui-org/react";
import { FiBook, FiClock, FiAlertCircle, FiBell, FiCalendar, FiFileText, FiEdit2, FiTrash2, FiPlus, FiCheckSquare, FiX, FiCheckCircle, FiList, FiCheck } from "react-icons/fi";

import PageContainer from "../../../commons/PageContainer";
import PageHeader from "../../../commons/PageHeader";
import NotificationAlert from "../../../commons/NotificationAlert/NotificationAlert";
import UserProfileCard from "../../../commons/Dashboard/UserProfileCard";
import SubjectCard from "../../../commons/Dashboard/SubjectCard";
import SubjectSearch from "../../../commons/Dashboard/SubjectSearch";
import StatisticsCard from "../../../commons/Dashboard/StatisticsCard";
import authServices from "../../../../services/auth.service";
import todoService, { Todo } from "../../../../services/todo.service";
import { getEnrolledMataPelajaran, getNotifications, markNotificationAsRead, markAllNotificationsAsRead, getStudentAssignments, markAssignmentCompletion, Notification, Assignment } from "../../../../services/student.service";
import { SessionExtended } from "../../../../types/Auth";
import { IProfile } from "../../../../types/Profile";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { PaginationMeta } from "../../../../types/common";

// Menggunakan interface Notification dan Assignment dari student.service.ts

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

// Menggunakan PaginationMeta dari common.ts sebagai PaginationData

const Dashboard: React.FC = () => {
  const { data: session } = useSession() as { data: SessionExtended | null };
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<IProfile | null>(null);
  
  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [loadingNotifications, setLoadingNotifications] = useState<boolean>(false);
  
  // Enrolled subjects state
  const [enrolledSubjects, setEnrolledSubjects] = useState<Subject[]>([]);
  const [searchResults, setSearchResults] = useState<Subject[] | null>(null);
  const [pendingAssignments, setPendingAssignments] = useState<Assignment[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    totalPages: 0,
    current: 1,
    size: 10
  });

  // Todo state
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loadingTodos, setLoadingTodos] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDeleteModalOpen, onOpen: onOpenDeleteModal, onClose: onCloseDeleteModal } = useDisclosure();
  const [isEdit, setIsEdit] = useState(false);
  const [currentTodo, setCurrentTodo] = useState<Todo | null>(null);
  const [todoToDelete, setTodoToDelete] = useState<string | null>(null);
  const [todoTitle, setTodoTitle] = useState('');
  const [todoDescription, setTodoDescription] = useState('');
  const [todoDueDate, setTodoDueDate] = useState('');

  // Fetch todos
  const fetchTodos = async () => {
    try {
      setLoadingTodos(true);
      const response = await todoService.getTodos();
      setTodos(response.data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch todos");
    } finally {
      setLoadingTodos(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch user profile data
          try {
        const profileResponse = await authServices.getProfile();
        setProfileData(profileResponse.data.data);
          } catch (error) {
            console.error('Error fetching profile:', error);
          }
        
          // Fetch enrolled subjects
        try {
          const enrolledResponse = await getEnrolledMataPelajaran();
          setEnrolledSubjects(enrolledResponse.data || []);
          setPagination({
            total: enrolledResponse.meta?.pagination?.total || 0,
            totalPages: enrolledResponse.meta?.pagination?.totalPages || 0,
            current: enrolledResponse.meta?.pagination?.current || 1,
            size: enrolledResponse.meta?.pagination?.size || 10
          });
          } catch (error) {
            console.error('Error fetching enrolled subjects:', error);
          }
          
          // Fetch assignments
          try {
            const assignmentsResponse = await getStudentAssignments();
            
            // Filter untuk tugas yang masih aktif (belum melewati deadline)
            const now = new Date();
            const pending = assignmentsResponse.data.filter((assignment: any) => {
              // Filter tugas yang deadlinenya belum terlewati
              const isDeadlineActive = new Date(assignment.deadline) > now;
              return isDeadlineActive;
            });
            
            setPendingAssignments(pending);
          } catch (error) {
            console.error('Error fetching assignments:', error);
          }
          
          // Fetch notifications
          await fetchNotifications();
          
          // Fetch todos
          await fetchTodos();
      } catch (err: any) {
          setError(err.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

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

  // Format relative time (today, yesterday, or date)
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return "Hari ini";
    } else if (diffDays === 1) {
      return "Kemarin";
    } else {
      return formatDate(dateString);
    }
  };

  // Reset form fields
  const resetTodoForm = () => {
    setTodoTitle('');
    setTodoDescription('');
    setTodoDueDate('');
    setCurrentTodo(null);
    setIsEdit(false);
  };

  // Open modal for adding new todo
  const handleAddTodo = () => {
    resetTodoForm();
    onOpen();
  };

  // Open modal for editing todo
  const handleEditTodo = (todo: Todo) => {
    setCurrentTodo(todo);
    setTodoTitle(todo.title);
    setTodoDescription(todo.description || '');
    setTodoDueDate(todo.dueDate ? new Date(todo.dueDate).toISOString().split('T')[0] : '');
    setIsEdit(true);
    onOpen();
  };

  // Open confirm modal for deleting todo
  const handleConfirmDelete = (id: string) => {
    setTodoToDelete(id);
    onOpenDeleteModal();
  };

  // Delete todo
  const handleDeleteTodo = async () => {
    if (!todoToDelete) return;
    
    try {
      await todoService.deleteTodo(todoToDelete);
      setSuccessMessage("Berhasil menghapus catatan");
      fetchTodos();
      onCloseDeleteModal();
      setTodoToDelete(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || "Gagal menghapus catatan");
    }
  };

  // Toggle todo completed status
  const handleToggleTodoStatus = async (id: string) => {
    try {
      await todoService.toggleTodoStatus(id);
      fetchTodos();
    } catch (err: any) {
      setError(err.message || "Gagal mengubah status catatan");
    }
  };

  // Save todo (create or update)
  const handleSaveTodo = async () => {
    try {
      if (!todoTitle) {
        setError("Judul catatan harus diisi");
        return;
      }

      const todoData = {
        title: todoTitle,
        description: todoDescription,
        dueDate: todoDueDate || undefined,
        completed: isEdit ? currentTodo?.completed || false : false
      };

      if (isEdit && currentTodo?._id) {
        await todoService.updateTodo(currentTodo._id, todoData);
        setSuccessMessage("Berhasil memperbarui catatan");
      } else {
        await todoService.createTodo(todoData);
        setSuccessMessage("Berhasil menambahkan catatan");
      }
      
      onClose();
      resetTodoForm();
      fetchTodos();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan catatan");
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Menandai notifikasi sebagai telah dibaca
      if (!notification.isRead) {
        await markNotificationAsRead(notification._id);
        
        // Update state notifikasi lokal
        setNotifications(prevNotifications => 
          prevNotifications.map(n => 
            n._id === notification._id ? { ...n, isRead: true } : n
          )
        );
      }
      
      // Mengarahkan ke halaman yang sesuai
      if (notification.type === "tugas") {
        if (notification.relatedItem) {
          router.push(`/murid/matapelajaran/${notification.mataPelajaran._id}/tugas/${notification.relatedItem}`);
        } else {
          router.push(`/murid/matapelajaran/${notification.mataPelajaran._id}`);
        }
      } else {
        if (notification.relatedItem) {
          router.push(`/murid/matapelajaran/${notification.mataPelajaran._id}/materi/${notification.relatedItem}`);
        } else {
          router.push(`/murid/matapelajaran/${notification.mataPelajaran._id}`);
        }
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      // Tetap navigasi meskipun gagal menandai sebagai telah dibaca
      if (notification.type === "tugas") {
        if (notification.relatedItem) {
          router.push(`/murid/matapelajaran/${notification.mataPelajaran._id}/tugas/${notification.relatedItem}`);
        } else {
          router.push(`/murid/matapelajaran/${notification.mataPelajaran._id}`);
        }
      } else {
        if (notification.relatedItem) {
          router.push(`/murid/matapelajaran/${notification.mataPelajaran._id}/materi/${notification.relatedItem}`);
        } else {
          router.push(`/murid/matapelajaran/${notification.mataPelajaran._id}`);
        }
      }
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      if (notifications.length === 0 || notifications.every(n => n.isRead)) {
        setSuccessMessage("Tidak ada notifikasi yang perlu ditandai");
        setTimeout(() => setSuccessMessage(null), 3000);
        return;
      }
      
      await markAllNotificationsAsRead();
      
      // Update state notifikasi lokal
      setNotifications(prevNotifications => 
        prevNotifications.map(n => ({ ...n, isRead: true }))
      );
      
      setSuccessMessage("Semua notifikasi telah ditandai sebagai dibaca");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      setError("Gagal menandai semua notifikasi sebagai dibaca");
      setTimeout(() => setError(null), 3000);
    }
  };

  // Handle search
  const handleSearch = async (searchTerm: string) => {
    try {
      setIsSearching(true);
      setError(null);
      
      // Jika searchTerm kosong, tampilkan semua mata pelajaran yang terdaftar
      if (!searchTerm.trim()) {
        setSearchResults(null);
        return;
      }
      
      // Pencarian mata pelajaran dari data yang sudah diambil
      // Pada implementasi lanjutan, ini bisa diganti dengan API endpoint khusus pencarian
      const filteredSubjects = enrolledSubjects.filter(subject => 
        subject.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subject.deskripsi.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      setSearchResults(filteredSubjects);
      setPagination({
        total: filteredSubjects.length,
        totalPages: 1,
        current: 1,
        size: 10
      });
    } catch (err: any) {
      setError(err.message || "Failed to search subjects");
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle view all subjects
  const handleViewAll = () => {
    router.push("/murid/matapelajaran");
  };

  // Handle view all notifications
  const handleViewAllNotifications = () => {
    router.push('/murid/notifikasi');
  };

  // Toggle notification popover
  const toggleNotificationPopover = () => {
    setIsNotificationOpen(!isNotificationOpen);
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const notificationsResponse = await getNotifications();
      setNotifications(notificationsResponse.data || []);
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Handle assignment click
  // Using any type here to avoid TypeScript issues with the import
  const handleAssignmentClick = (assignment: any): void => {
    if (assignment && assignment.mataPelajaranId && assignment._id) {
      router.push(`/murid/matapelajaran/${assignment.mataPelajaranId._id}/tugas/${assignment._id}`);
    }
  };

  // Handle marking assignment as completed/submitted
  const handleToggleAssignmentStatus = async (assignmentId: string) => {
    try {
      // Find assignment in the list
      const assignment = pendingAssignments.find((a: any) => a._id === assignmentId);
      if (!assignment) return;

      // Prevent toggling for assignments that haven't been submitted yet
      if (!assignment.isSubmitted && !assignment.submission) {
        // If the student hasn't submitted yet, navigate to the assignment page to submit
        router.push(`/murid/matapelajaran/${assignment.mataPelajaranId._id}/tugas/${assignment._id}`);
        return;
      }

      // Only toggle if already submitted
      if (assignment.submission) {
        const newStatus = assignment.isCompleted !== undefined ? !assignment.isCompleted : !assignment.isSubmitted;
        
        // Call the API to update the status in the database
        await markAssignmentCompletion(assignmentId, newStatus);
        
        // Update the local state to reflect the change
        setPendingAssignments(
          pendingAssignments.map((a: any) => 
            a._id === assignmentId ? { ...a, isCompleted: newStatus } : a
          )
        );
        
        if (newStatus) {
          setSuccessMessage("Tugas berhasil ditandai sebagai selesai");
      } else {
          setSuccessMessage("Tugas ditandai sebagai belum selesai");
        }
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      console.error("Error toggling assignment status:", err);
      setError(err.message || "Gagal mengubah status tugas");
      setTimeout(() => setError(null), 3000);
    }
  };

  // Render subjects
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
              viewPath="/murid/matapelajaran"
            />
          ))}
        </div>
      );
    }

    // Otherwise, show enrolled subjects
    if (!enrolledSubjects || enrolledSubjects.length === 0) {
      return (
        <Card>
          <CardBody className="py-8">
            <p className="text-center text-gray-500">
              Anda belum terdaftar di mata pelajaran apapun.
            </p>
          </CardBody>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {enrolledSubjects.map((subject) => (
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

  // Render notifications
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
    
    // Limit to showing only 3 notifications max
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
                        {formatRelativeTime(notification.createdAt)}
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

  const unreadNotifications = notifications.filter(n => !n.isRead).length;

  return (
    <PageContainer>
      {/* Header section with responsive design */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center -mt-2 mb-4">
        <div className="flex-1 mb-2 sm:mb-0">
        <PageHeader 
          title="Dashboard" 
          description="Selamat datang di halaman Dashboard Murid" 
        />
        </div>
        <div className="self-end sm:self-auto flex items-center gap-4 pr-1 sm:pr-6 mt-0 sm:mt-0">
          <Popover 
            placement="bottom-end" 
            showArrow={true}
            isOpen={isNotificationOpen}
            onOpenChange={setIsNotificationOpen}
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

      {/* Notifications */}
      {error && (
        <div className="mb-4 sm:mb-6">
          <NotificationAlert
            type="error"
            message={error}
            onClose={() => setError(null)}
          />
        </div>
      )}

      {successMessage && (
        <div className="mb-4 sm:mb-6">
          <NotificationAlert
            type="success"
            message={successMessage}
            onClose={() => setSuccessMessage(null)}
        />
      </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="flex justify-center my-12">
          <Spinner size="lg" color="primary" />
        </div>
      ) : (
        <>
          {/* User Profile Card and Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-5 mb-3 sm:mb-5">
            <div className="col-span-1">
              <UserProfileCard 
                user={profileData ? {
                  ...session.user,
                  profilePicture: profileData.profilePicture,
                  fullName: profileData.fullName,
                  email: profileData.email
                } : session.user} 
              />
            </div>
            <div className="col-span-1 md:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <StatisticsCard 
                  title="Mata Pelajaran" 
                  count={enrolledSubjects.length} 
                  icon={<FiBook size={18} className="sm:text-xl" />} 
                  color="primary"
                />
                <StatisticsCard 
                  title="Tugas Aktif" 
                  count={pendingAssignments.length} 
                  icon={<FiFileText size={18} className="sm:text-xl" />} 
                  color="warning"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5 mb-3 sm:mb-5">
            {/* Notes/Todos Section */}
            <Card>
              <CardBody className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="flex items-center">
                    <FiList size={20} className="text-primary mr-2" />
                    <h3 className="text-base sm:text-lg font-semibold">Catatan Saya</h3>
                  </div>
                  <Button 
                    color="primary" 
                    variant="light" 
                    startContent={<FiPlus size={16} />}
                    onClick={handleAddTodo}
                    size="sm"
                    className="min-w-0 px-2 sm:px-3 text-xs sm:text-sm"
                  >
                    <span className="hidden xs:inline">Tambah Catatan</span>
                    <span className="inline xs:hidden">Tambah</span>
                  </Button>
                </div>
                
                {loadingTodos ? (
                  <div className="flex justify-center py-4 sm:py-6">
                    <Spinner size="sm" />
                  </div>
                ) : todos.length === 0 ? (
                  <p className="text-center text-gray-500 py-2 sm:py-3 text-sm sm:text-base">
                    Belum ada Notes. Klik &quot;Tambah&quot; untuk membuat baru.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {todos.map(todo => (
                      <div 
                        key={todo._id} 
                        className={`flex items-start p-2 sm:p-3 rounded-md border ${
                          todo.completed ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
                        }`}
                      >
                        <div className="p-1"> {/* Added padding to increase hit area */}
                          <Checkbox 
                            isSelected={todo.completed}
                            onValueChange={() => handleToggleTodoStatus(todo._id!)}
                            className="mt-1 scale-110" /* Increased scale by 10% */
                            size="md" /* Changed from sm to md */
                            color="success"
                          />
                        </div>
                        <div className="ml-2 sm:ml-3 flex-1">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 pr-2">
                              <p className={`text-sm sm:text-base font-medium ${todo.completed ? 'line-through text-gray-500' : ''}`}>
                                {todo.title}
                              </p>
                              {todo.description && (
                                <p className={`text-xs sm:text-sm mt-1 ${todo.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {todo.description}
                                </p>
                              )}
                              {todo.dueDate && (
                                <div className="flex items-center mt-1 text-xs text-gray-500">
                                  <FiClock size={10} className="mr-1" />
                                  <span>{formatDate(todo.dueDate)}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex space-x-1 sm:space-x-2">
                              <Button 
                                isIconOnly
                                size="sm" 
                                color="primary" 
                                variant="light"
                                onClick={() => handleEditTodo(todo)}
                                className="h-6 w-6 sm:h-8 sm:w-8 min-w-0"
                              >
                                <FiEdit2 size={14} />
                              </Button>
                              <Button 
                                isIconOnly
                                size="sm" 
                                color="danger" 
                                variant="light"
                                onClick={() => handleConfirmDelete(todo._id!)}
                                className="h-6 w-6 sm:h-8 sm:w-8 min-w-0"
                              >
                                <FiTrash2 size={14} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Pending Assignments */}
            <Card>
              <CardBody className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex items-center">
                    <FiClock size={20} className="text-warning mr-2" />
                    <h3 className="text-base sm:text-lg font-semibold">Tugas Aktif</h3>
                </div>
                <Button 
                  color="primary" 
                  variant="light" 
                  size="sm"
                    onClick={() => router.push('/murid/tugas')}
                    className="min-w-0 px-2 sm:px-3 text-xs sm:text-sm"
                >
                  Lihat Semua
                </Button>
              </div>
                <div>
                  {pendingAssignments.length > 0 ? (
                    <div className="space-y-2 sm:space-y-3">
                      {pendingAssignments.slice(0, 5).map((assignment: any) => (
                        <div 
                          key={assignment._id}
                          className={`relative p-2 sm:p-3 border rounded-md ${assignment.isSubmitted ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'} hover:bg-gray-50 transition-colors`}
                        >
                          <div 
                            className="absolute inset-0 cursor-pointer" 
                            onClick={() => router.push(`/murid/matapelajaran/${assignment.mataPelajaranId._id}/tugas/${assignment._id}`)}
                            aria-label={`Lihat tugas ${assignment.title}`}
                          />
                          <div className="flex items-start gap-2 sm:gap-3 relative z-10">
                            <div className="mt-0.5 sm:mt-0">
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleAssignmentStatus(assignment._id);
                                }} 
                                className="relative z-20 p-1" // Added padding to increase hit area
                              >
                                <Checkbox
                                  isSelected={assignment.isCompleted || assignment.isSubmitted}
                                  className="cursor-pointer scale-110" // Increased scale by 10%
                                  size="md" // Changed from sm to md
                                  color="success"
                                />
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between">
                                <div className="pr-0 sm:pr-3 mb-3 sm:mb-0 flex-1">
                                  <h4 className={`text-sm sm:text-base font-medium ${assignment.isSubmitted ? 'line-through text-gray-500' : ''}`}>{assignment.title}</h4>
                                  <p className={`text-xs sm:text-sm mt-0.5 ${assignment.isSubmitted ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {assignment.mataPelajaranId?.judul || 'Mata Pelajaran tidak tersedia'}
                                  </p>
                                  <div className="flex items-center mt-1.5 text-xs text-gray-500">
                                    <FiClock size={10} className="mr-1" />
                                    <span>Tenggat: {formatDate(assignment.deadline)}</span>
                                  </div>
                                </div>
                                <div className="self-start sm:self-center flex justify-end w-full sm:w-auto">
                                  <div onClick={(e) => e.stopPropagation()} className="w-full sm:w-auto">
                                                                          <Button 
                                        size="sm" 
                                        color="primary" 
                                        variant="flat"
                                        onClick={() => router.push(`/murid/matapelajaran/${assignment.mataPelajaranId._id}/tugas/${assignment._id}`)}
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
          {/* Subject Search */}
            <Card>
              <CardBody className="p-3 sm:p-4">
                <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Cari Mata Pelajaran</h3>
              <SubjectSearch onSearch={handleSearch} />
              {searchResults !== null && (
                  <div className="mt-2 text-xs sm:text-sm">
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
            
            {isSearching ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" color="primary" />
              </div>
            ) : (
              renderSubjects()
            )}
            </div>
          </div>
        </>
      )}

      {/* Todo Modal */}
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
            <Button color="primary" onPress={handleSaveTodo}>
              Simpan
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
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
            <Button color="danger" onPress={handleDeleteTodo}>
              Hapus
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </PageContainer>
  );
};

export default Dashboard;
