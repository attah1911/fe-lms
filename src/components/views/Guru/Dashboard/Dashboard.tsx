import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardBody, Spinner, Button, Checkbox, Input, Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Badge, Chip, Divider, Popover, PopoverTrigger, PopoverContent } from "@nextui-org/react";
import { FiUsers, FiBook, FiCheckSquare, FiChevronLeft, FiChevronRight, FiList, FiPlus, FiEdit2, FiTrash2, FiClock, FiAlertTriangle, FiBell, FiCheckCircle, FiUserPlus, FiFileText, FiCheck } from "react-icons/fi";
import PageContainer from "../../../commons/PageContainer";
import PageHeader from "../../../commons/PageHeader";
import NotificationAlert from "../../../commons/NotificationAlert/NotificationAlert";
import StatisticsCard from "../../../commons/Dashboard/StatisticsCard";
import UserProfileCard from "../../../commons/Dashboard/UserProfileCard";
import SubjectCard from "../../../commons/Dashboard/SubjectCard";
import SubjectSearch from "../../../commons/Dashboard/SubjectSearch";
import statsService from "../../../../services/stats.service";
import authServices from "../../../../services/auth.service";
import todoService, { Todo } from "../../../../services/todo.service";
import notificationService, { Notification as NotificationType } from "../../../../services/notification.service";
import { getGuruMataPelajaran } from "../../../../services/guru.service";
import { SessionExtended } from "../../../../types/Auth";
import { IProfile } from "../../../../types/Profile";
import { useRouter } from "next/router";
import { format } from "date-fns";
import { id } from "date-fns/locale";
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

interface PaginationData {
  total: number;
  totalPages: number;
  current: number;
  limit?: number;
}

interface GuruStats {
  mataPelajaranCount: number;
  muridCount: number;
  materiCount: number;
  recentSubjects: Subject[];
}

interface Notification {
  _id: string;
  type: string;
  title: string;
  description: string;
  mataPelajaran: {
    _id: string;
    judul: string;
  };
  relatedItem?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NotificationResponse {
  data: Notification[];
  pagination: {
    total: number;
    totalPages: number;
    current: number;
    limit: number;
  };
}

const Dashboard: React.FC = () => {
  const { data: session } = useSession() as { data: SessionExtended | null };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<GuruStats | null>(null);
  const [profileData, setProfileData] = useState<IProfile | null>(null);
  const [searchResults, setSearchResults] = useState<Subject[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    totalPages: 0,
    current: 1
  });
  
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loadingTodos, setLoadingTodos] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDeleteModalOpen, onOpen: onOpenDeleteModal, onClose: onCloseDeleteModal } = useDisclosure();
  const [isEdit, setIsEdit] = useState(false);
  const [currentTodo, setCurrentTodo] = useState<Todo | null>(null);
  const [todoToDelete, setTodoToDelete] = useState<string | null>(null);
  const [todoTitle, setTodoTitle] = useState('');
  const [todoDescription, setTodoDescription] = useState('');
  const [todoDueDate, setTodoDueDate] = useState('');
  
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationPage, setNotificationPage] = useState(1);
  const [notificationHasMore, setNotificationHasMore] = useState(true);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  
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
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const profileResponse = await authServices.getProfile();
        setProfileData(profileResponse.data.data);
        
        try {
          const guruStats = await statsService.getGuruStats();
          setStats(guruStats);
        } catch (statsErr) {
          console.error("Error fetching guru stats:", statsErr);
          const mataPelajaranResponse = await getGuruMataPelajaran({ page: 1, limit: 6 });
          
          setStats({
            mataPelajaranCount: mataPelajaranResponse.pagination?.total || 0,
            muridCount: 0,
            materiCount: 0,
            recentSubjects: mataPelajaranResponse.data || []
          });
        }
        
        await fetchTodos();
        
        fetchNotifications(1);
        
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

  const resetTodoForm = () => {
    setTodoTitle('');
    setTodoDescription('');
    setTodoDueDate('');
    setCurrentTodo(null);
    setIsEdit(false);
  };

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

  const handleDeleteTodo = async () => {
    if (!todoToDelete) return;
    
    try {
      await todoService.deleteTodo(todoToDelete);
      setSuccessMessage("Berhasil menghapus tugas");
      fetchTodos();
      onCloseDeleteModal();
      setTodoToDelete(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || "Gagal menghapus tugas");
    }
  };

  const handleToggleTodoStatus = async (id: string) => {
    try {
      await todoService.toggleTodoStatus(id);
      fetchTodos();
    } catch (err: any) {
      setError(err.message || "Gagal mengubah status tugas");
    }
  };

  const handleSaveTodo = async () => {
    try {
      if (!todoTitle) {
        setError("Judul tugas harus diisi");
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
        setSuccessMessage("Berhasil memperbarui tugas");
      } else {
        await todoService.createTodo(todoData);
        setSuccessMessage("Berhasil menambahkan tugas");
      }
      
      onClose();
      resetTodoForm();
      fetchTodos();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan tugas");
    }
  };

  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd MMMM yyyy', { locale: id });
    } catch (e) {
      return dateString.toString();
    }
  };

  const handleSearch = async (searchTerm: string) => {
    try {
      setIsSearching(true);
      setError(null);
      const response = await getGuruMataPelajaran({ 
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
      const response = await getGuruMataPelajaran({
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
      const response = await getGuruMataPelajaran({
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
              viewPath="/guru/matapelajaran"
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
            viewPath="/guru/matapelajaran"
          />
        ))}
      </div>
    );
  };

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

  const fetchNotifications = async (page = 1) => {
    try {
      setLoadingNotifications(true);
      
      try {
        const count = await notificationService.getUnreadCount();
        setUnreadCount(count);
      } catch (countErr) {
        console.error("Failed to fetch unread count:", countErr);
      }
      
      try {
        const response = await notificationService.getTeacherNotifications({ 
          page, 
          limit: 5
        });
        
        if (response && Array.isArray(response.data) && response.data.length > 0) {
          if (page === 1) {
            setNotifications(response.data);
          } else {
            setNotifications(prev => [...prev, ...response.data]);
          }
          
          setNotificationPage(page);
          setNotificationHasMore(page < (response.pagination?.totalPages || 1));
        } else {
          if (page === 1) {
            try {
              const unreadNotifs = await notificationService.getUnreadTeacherNotifications();
              if (unreadNotifs && unreadNotifs.length > 0) {
                setNotifications(unreadNotifs);
                setNotificationHasMore(false);
              } else {
                setNotifications([]);
                setNotificationHasMore(false);
              }
            } catch (unreadErr) {
              console.error('Failed to get unread notifications as fallback:', unreadErr);
              setNotifications([]);
              setNotificationHasMore(false);
            }
          } else {
            setNotificationHasMore(false);
          }
        }
      } catch (notifErr) {
        console.error("Failed to fetch notifications:", notifErr);
        if (page === 1) {
          setNotifications([]);
        }
        setNotificationHasMore(false);
      }
    } catch (err) {
      console.error("Error in fetchNotifications:", err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => 
        prev.map(notification => 
          notification._id === id ? { ...notification, isRead: true } : notification
        )
      );
      fetchUnreadCount();
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  const handleLoadMoreNotifications = () => {
    if (notificationHasMore && !loadingNotifications) {
      fetchNotifications(notificationPage + 1);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch(type) {
      case 'submission':
        return <FiFileText className="text-primary text-lg" />;
      case 'enrollment':
        return <FiUserPlus className="text-success text-lg" />;
      case 'grading_reminder':
        return <FiAlertTriangle className="text-warning text-lg" />;
      default:
        return <FiBell className="text-default-500 text-lg" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch(type) {
      case 'submission':
        return 'primary';
      case 'enrollment':
        return 'success';
      case 'grading_reminder':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Hari ini';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Kemarin';
    } else {
      return format(date, 'd MMMM yyyy', { locale: id });
    }
  };

  const renderNotifications = () => {
    if (loadingNotifications) {
      return (
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      );
    }

    if (!notifications || notifications.length === 0) {
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
                        {formatRelativeTime(notification.createdAt)}
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
        
        {notificationHasMore && (
          <div className="p-3 flex justify-center">
            <Button 
              size="sm" 
              variant="flat" 
              onPress={handleLoadMoreNotifications}
              isLoading={loadingNotifications}
              isDisabled={loadingNotifications}
            >
              Muat lebih banyak
            </Button>
          </div>
        )}
      </div>
    );
  };

  const toggleNotificationPopover = () => {
    const newState = !isNotificationOpen;
    setIsNotificationOpen(newState);
  };

  const handleNotificationClick = async (notification: NotificationType) => {
    try {
      if (!notification.isRead) {
        await notificationService.markAsRead(notification._id);
        
        setNotifications(prevNotifications => 
          prevNotifications.map(n => 
            n._id === notification._id ? { ...n, isRead: true } : n
          )
        );
        
        fetchUnreadCount();
      }
      
      if (notification.type === 'submission' && notification.relatedItem) {
        router.push(`/guru/matapelajaran/${notification.mataPelajaran._id}/tugas/${notification.relatedItem}`);
      } else if (notification.type === 'enrollment' && notification.mataPelajaran) {
        router.push(`/guru/matapelajaran/${notification.mataPelajaran._id}`);
      } else if (notification.type === 'grading_reminder' && notification.relatedItem) {
        router.push(`/guru/matapelajaran/${notification.mataPelajaran._id}/tugas/${notification.relatedItem}`);
      }
    } catch (error) {
      console.error("Error handling notification click:", error);
    }
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
              if (open) {
                fetchNotifications(1);
                
                const intervalId = setInterval(() => {
                  if (document.visibilityState === 'visible') {
                    fetchNotifications(1);
                  }
                }, 10000);
                
                (window as any).notificationRefreshInterval = intervalId;
              } else {
                if ((window as any).notificationRefreshInterval) {
                  clearInterval((window as any).notificationRefreshInterval);
                  (window as any).notificationRefreshInterval = null;
                }
              }
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

      {error && (
        <div className="mb-6">
          <NotificationAlert
            type="error"
            message={error}
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
          user={profileData ? {
            ...session.user,
            profilePicture: profileData.profilePicture,
            fullName: profileData.fullName,
            email: profileData.email
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
                        onToggleStatus={handleToggleTodoStatus}
                        onEdit={handleEditTodo}
                        onDelete={handleConfirmDelete}
                        formatDate={formatDate}
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
                <Button color="primary" onPress={handleSaveTodo}>
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
                <Button color="danger" onPress={handleDeleteTodo}>
                  Hapus
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>

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
            
            {renderPagination()}
          </div>
        </>
      )}
    </PageContainer>
  );
};

export default Dashboard;
