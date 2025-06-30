import axios from '../libs/axios/instance';
import endpoint from './endpoint.constant';

export interface Notification {
  _id: string;
  type: string;
  title: string;
  description: string;
  mataPelajaran: {
    _id: string;
    judul: string;
  };
  recipient: {
    type: string;
    id: string;
  };
  relatedItem?: any;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponse {
  data: Notification[];
  pagination: {
    total: number;
    totalPages: number;
    current: number;
    limit: number;
  };
}

const notificationService = {
  getTeacherNotifications: async (params: { page?: number; limit?: number; unread?: boolean } = {}) => {
    try {
      const query = new URLSearchParams();
      if (params.page) query.append('page', params.page.toString());
      if (params.limit) query.append('limit', params.limit.toString());
      if (params.unread) query.append('unread', params.unread.toString());
      
      const response = await axios.get(`${endpoint.NOTIFICATION}/teacher?${query.toString()}`);
      
      // Berdasarkan struktur respons API yang terlihat di log:
      // {"meta":{"status":200,"message":"..."},"data":{"data":[...],"pagination":{...}}}
      if (response.data?.meta?.status === 200 && response.data?.data) {
        // Struktur data yang benar berdasarkan log
        if (response.data.data.data && Array.isArray(response.data.data.data)) {
          return {
            data: response.data.data.data,
            pagination: response.data.data.pagination || {
              total: response.data.data.data.length,
              totalPages: 1,
              current: params.page || 1,
              limit: params.limit || 10
            }
          };
        }
      }
      
      // Default empty response
      return {
        data: [],
        pagination: {
          total: 0,
          totalPages: 0,
          current: params.page || 1,
          limit: params.limit || 10
        }
      };
    } catch (error: any) {
      console.error("Error fetching teacher notifications:", error);
      return {
        data: [],
        pagination: {
          total: 0,
          totalPages: 0,
          current: params.page || 1,
          limit: params.limit || 10
        }
      };
    }
  },
  
  getStudentNotifications: async () => {
    const response = await axios.get(endpoint.NOTIFICATION);
    return response.data.data as Notification[];
  },
  
  getUnreadCount: async () => {
    try {
      const response = await axios.get(`${endpoint.NOTIFICATION}/unread/count`);
      return response.data.data.count as number;
    } catch (error) {
      console.error("Error fetching unread count:", error);
      return 0;
    }
  },
  
  markAsRead: async (notificationId: string) => {
    const response = await axios.put(`${endpoint.NOTIFICATION}/${notificationId}/read`);
    return response.data.data;
  },
  
  markAllAsRead: async () => {
    try {
      const response = await axios.put(`${endpoint.NOTIFICATION}/read/all`);
      return response.data.data;
    } catch (error) {
      console.error("Error in markAllAsRead:", error);
      throw error;
    }
  },
  
  // Specifically for fetching unread notifications
  getUnreadTeacherNotifications: async () => {
    try {
      const response = await axios.get(`${endpoint.NOTIFICATION}/teacher?unread=true`);
      
      // Struktur respons yang sama dengan getTeacherNotifications
      if (response.data?.meta?.status === 200 && response.data?.data) {
        if (response.data.data.data && Array.isArray(response.data.data.data)) {
          return response.data.data.data;
        }
      }
      
      return [];
    } catch (error: any) {
      console.error("Error fetching unread teacher notifications:", error);
      return [];
    }
  }
};

export default notificationService; 
