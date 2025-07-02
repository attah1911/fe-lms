import instance, { CustomRequestConfig } from "../libs/axios/instance";
import endpoint from "./endpoint.constant";
import { PaginationParams } from "../types/common";
import { Student, StudentUpdateData } from "../types/Student";

/**
 * Service untuk mengambil mata pelajaran yang diikuti oleh murid
 * @param params Parameter paginasi (opsional)
 * @returns Data mata pelajaran yang diikuti oleh murid
 */
export const getEnrolledMataPelajaran = async (params?: PaginationParams) => {
  try {
    const response = await instance.get(`${endpoint.STUDENTS}/me/mata-pelajaran`, { params });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch enrolled mata pelajaran");
  }
};

/**
 * Interface untuk notifikasi
 */
export interface Notification {
  _id: string;
  type: "tugas" | "materi";
  title: string;
  description: string;
  mataPelajaran: {
    _id: string;
    judul: string;
  };
  relatedItem?: string;
  createdAt: string;
  isRead: boolean;
}

/**
 * Interface for student assignments
 */
export interface Assignment {
  _id: string;
  title: string;
  description: string;
  deadline: string;
  materiId: {
    _id: string;
    judul: string;
  };
  mataPelajaranId: {
    _id: string;
    judul: string;
  };
  isSubmitted: boolean;
  isCompleted?: boolean;
  submission?: {
    status: string;
    score?: number;
    feedback?: string;
  };
}

/**
 * Service untuk mengambil notifikasi murid
 * @param params Parameter paginasi (opsional)
 * @returns Data notifikasi murid
 */
export const getNotifications = async (params?: PaginationParams) => {
  try {
    const response = await instance.get(`/notifications`, { params });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch notifications");
  }
};

/**
 * Service untuk menandai notifikasi sebagai telah dibaca
 * @param notificationId ID notifikasi
 * @returns Status operasi
 */
export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const response = await instance.put(`/notifications/${notificationId}/read`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to mark notification as read");
  }
};

/**
 * Service untuk menandai semua notifikasi sebagai telah dibaca
 * @returns Status operasi
 */
export const markAllNotificationsAsRead = async () => {
  try {
    const response = await instance.put(`/notifications/read/all`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to mark all notifications as read");
  }
};

/**
 * Service untuk mengambil tugas murid
 * @param params Parameter paginasi (opsional)
 * @returns Data tugas murid
 */
export const getStudentAssignments = async (params?: PaginationParams) => {
  try {
    const response = await instance.get(`${endpoint.STUDENTS}/me/assignments`, { params });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch student assignments");
  }
};

/**
 * Service untuk menandai tugas sebagai selesai atau belum selesai
 * @param assignmentId ID tugas
 * @param isCompleted Status penyelesaian (true untuk selesai, false untuk belum selesai)
 * @returns Status operasi
 */
export const markAssignmentCompletion = async (assignmentId: string, isCompleted: boolean) => {
  try {
    const config: CustomRequestConfig = {
      noRedirect: true
    };
    const response = await instance.put(`${endpoint.STUDENTS}/me/assignments/${assignmentId}/completion`, {
      isCompleted
    }, config);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.meta?.message || error.message || "Failed to update assignment completion status");
  }
};

/**
 * Service untuk mengambil data profil murid
 * @returns Data profil murid
 */
export const getStudentProfile = async () => {
  try {
    const config: CustomRequestConfig = {
      noRedirect: true
    };
    const response = await instance.get(`${endpoint.STUDENTS}/me`, config);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch student profile");
  }
};

/**
 * Service untuk memperbarui data profil murid
 * @param data Data profil yang akan diperbarui
 * @returns Status operasi
 */
export const updateStudentProfile = async (data: StudentUpdateData) => {
  try {
    const response = await instance.put(`${endpoint.STUDENTS}/me`, data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to update student profile");
  }
};

const studentServices = {
  getEnrolledMataPelajaran,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getStudentAssignments,
  getStudentProfile,
  updateStudentProfile,
  markAssignmentCompletion
};

export default studentServices;
