import instance, { CustomRequestConfig } from "../libs/axios/instance";
import endpoint from "./endpoint.constant";
import { MataPelajaran } from "../types/MataPelajaran";
import authServices from "./auth.service";
import { Teacher, TeacherUpdateData } from "../types/TeacherTypes";

interface GetGuruMataPelajaranParams {
  page?: number;
  limit?: number;
  search?: string;
}

// Get mata pelajaran for guru
export const getGuruMataPelajaran = async ({
  page = 1,
  limit = 10,
  search = "",
}: GetGuruMataPelajaranParams = {}) => {
  try {
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
    const response = await instance.get(
      `/guru/mata-pelajaran?page=${page}&limit=${limit}${searchParam}`
    );
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch guru mata pelajaran");
  }
};

// Create mata pelajaran for guru
export const createGuruMataPelajaran = async (data: MataPelajaran) => {
  try {
    const response = await instance.post(endpoint.MATA_PELAJARAN, data);
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.meta?.errors) {
      const errors = error.response.data.meta.errors;
      const messages = Object.values(errors).flat().join(", ");
      throw new Error(messages);
    }
    throw new Error(error.response?.data?.message || "Failed to create mata pelajaran");
  }
};

// Update mata pelajaran for guru
export const updateGuruMataPelajaran = async (id: string, data: MataPelajaran) => {
  try {
    const response = await instance.put(`${endpoint.MATA_PELAJARAN}/${id}`, data);
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.meta?.errors) {
      const errors = error.response.data.meta.errors;
      const messages = Object.values(errors).flat().join(", ");
      throw new Error(messages);
    }
    throw new Error(error.response?.data?.message || "Failed to update mata pelajaran");
  }
};

// Delete mata pelajaran for guru
export const deleteGuruMataPelajaran = async (id: string) => {
  try {
    const response = await instance.delete(`${endpoint.MATA_PELAJARAN}/${id}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to delete mata pelajaran");
  }
};

// Get teacher by current user ID (for pre-populating the form)
export const getCurrentTeacher = async (): Promise<{ _id: string; fullName: string }> => {
  try {
    // Get the first mata pelajaran for the current user to extract teacher info
    const response = await getGuruMataPelajaran({ page: 1, limit: 1 });
    
    if (response.data && response.data.length > 0) {
      // Extract teacher info from the first mata pelajaran
      const firstSubject = response.data[0];
      if (firstSubject.guru && typeof firstSubject.guru === 'object') {
        return {
          _id: firstSubject.guru._id,
          fullName: firstSubject.guru.fullName
        };
      }
    }
    
    // If we can't get data from mata pelajaran, throw an error
    throw new Error("No mata pelajaran found for current teacher");
  } catch (error: any) {
    console.error("Error in getCurrentTeacher:", error);
    throw new Error("Failed to get current teacher data. Please try again later.");
  }
};

/**
 * Service untuk mengambil data profil guru
 * @returns Data profil guru
 */
export const getTeacherProfile = async () => {
  try {
    const config: CustomRequestConfig = {
      noRedirect: true // Add flag to prevent automatic redirect on error
    };
    const response = await instance.get(`${endpoint.TEACHERS}/me`, config);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch teacher profile");
  }
};

/**
 * Service untuk memperbarui data profil guru
 * @param data Data profil yang akan diperbarui
 * @returns Status operasi
 */
export const updateTeacherProfile = async (data: TeacherUpdateData) => {
  try {
    const response = await instance.put(`${endpoint.TEACHERS}/me`, data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to update teacher profile");
  }
};

// Create default export for the service
const guruService = {
  getGuruMataPelajaran,
  createGuruMataPelajaran,
  updateGuruMataPelajaran,
  deleteGuruMataPelajaran,
  getCurrentTeacher,
  getTeacherProfile,
  updateTeacherProfile
};

export default guruService; 
