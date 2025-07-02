import instance from "../libs/axios/instance";
import endpoint from "./endpoint.constant";
import { UserSubmitData } from "../components/views/Admin/DataAkun/CreateEditUserModal";
import { getSession } from "next-auth/react";
import { SessionExtended } from "../types/Auth";

interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const getUsers = async (params?: PaginationParams) => {
  try {
    const response = await instance.get(endpoint.USERS, { params });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch user data");
  }
};

export const getTeachers = async (params?: PaginationParams) => {
  try {
    const response = await instance.get(endpoint.TEACHERS, { params });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch teacher data");
  }
};

export const getStudents = async (params?: PaginationParams) => {
  try {
    const response = await instance.get(endpoint.STUDENTS, { params });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch student data");
  }
};

export const getMataPelajaran = async (params?: PaginationParams) => {
  try {
    const response = await instance.get(endpoint.MATA_PELAJARAN, { params });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch mata pelajaran data");
  }
};

export const getMataPelajaranById = async (id: string) => {
  try {
    const response = await instance.get(`${endpoint.MATA_PELAJARAN}/${id}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch mata pelajaran detail");
  }
};

export const createUser = async (data: UserSubmitData) => {
  try {
    const response = await instance.post(endpoint.USERS, data);
    return response.data;
  } catch (error: any) {
    console.error('Create User Error:', {
      status: error.response?.status,
      data: error.response?.data,
      requestData: data
    });

    if (error.response?.data?.meta?.errors) {
      const errors = error.response.data.meta.errors;
      const messages = Object.values(errors).flat().join(", ");
      throw new Error(messages);
    }

    if (error.response?.status === 400) {
      const message = error.response?.data?.message || "Data yang dimasukkan tidak valid. Pastikan semua field required telah diisi dengan benar.";
      throw new Error(message);
    }
    if (error.response?.status === 409) {
      throw new Error("Username atau email sudah digunakan. Silakan gunakan yang lain.");
    }
    
    throw new Error(error.response?.data?.message || "Gagal membuat akun. Silakan coba lagi.");
  }
};

export const createTeacher = async (data: any) => {
  try {
    const response = await instance.post(endpoint.TEACHERS, data);
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.meta?.errors) {
      const errors = error.response.data.meta.errors;
      const messages = Object.values(errors).flat().join(", ");
      throw new Error(messages);
    }
    throw new Error(error.response?.data?.message || "Failed to create teacher");
  }
};

export const createStudent = async (data: any) => {
  try {
    const response = await instance.post(endpoint.STUDENTS, data);
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.meta?.errors) {
      const errors = error.response.data.meta.errors;
      const messages = Object.values(errors).flat().join(", ");
      throw new Error(messages);
    }
    throw new Error(error.response?.data?.message || "Failed to create student");
  }
};

export const createMataPelajaran = async (data: any) => {
  try {
    const response = await instance.post(endpoint.MATA_PELAJARAN, data);
    return response.data;
  } catch (error: any) {
    console.error('Create MataPelajaran Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.response?.data?.message,
      requestData: data
    });
    
    if (error.response?.data?.meta?.errors) {
      const errors = error.response.data.meta.errors;
      const messages = Object.values(errors).flat().join(", ");
      throw new Error(messages);
    }
    throw new Error(error.response?.data?.message || "Failed to create mata pelajaran");
  }
};

export const updateUser = async (id: string, data: UserSubmitData) => {
  try {
    const response = await instance.put(`${endpoint.USERS}/${id}`, data);
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.meta?.errors) {
      const errors = error.response.data.meta.errors;
      const messages = Object.values(errors).flat().join(", ");
      throw new Error(messages);
    }
    throw new Error(error.response?.data?.message || "Failed to update user");
  }
};

export const updateTeacher = async (id: string, data: any) => {
  try {
    const response = await instance.put(`${endpoint.TEACHERS}/${id}`, data);
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.meta?.errors) {
      const errors = error.response.data.meta.errors;
      const messages = Object.values(errors).flat().join(", ");
      throw new Error(messages);
    }
    throw new Error(error.response?.data?.message || "Failed to update teacher");
  }
};

export const updateStudent = async (id: string, data: any) => {
  try {
    const response = await instance.put(`${endpoint.STUDENTS}/${id}`, data);
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.meta?.errors) {
      const errors = error.response.data.meta.errors;
      const messages = Object.values(errors).flat().join(", ");
      throw new Error(messages);
    }
    throw new Error(error.response?.data?.message || "Failed to update student");
  }
};

export const updateMataPelajaran = async (id: string, data: any) => {
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

export const deleteUser = async (id: string) => {
  try {
    const response = await instance.delete(`${endpoint.USERS}/${id}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to delete user");
  }
};

export const deleteTeacher = async (id: string) => {
  try {
    const response = await instance.delete(`${endpoint.TEACHERS}/${id}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to delete teacher");
  }
};

export const deleteStudent = async (id: string) => {
  try {
    const response = await instance.delete(`${endpoint.STUDENTS}/${id}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to delete student");
  }
};

export const deleteMataPelajaran = async (id: string) => {
  try {
    const response = await instance.delete(`${endpoint.MATA_PELAJARAN}/${id}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to delete mata pelajaran");
  }
};

export const getEnrolledStudents = async (mataPelajaranId: string) => {
  try {
    const { getEnrolledStudents } = await import('./mataPelajaran.service');
    return getEnrolledStudents(mataPelajaranId);
  } catch (error: any) {
    throw new Error(error.message || "Failed to fetch enrolled students");
  }
};

export const enrollStudent = async (mataPelajaranId: string, studentId: string) => {
  try {
    const { enrollStudent } = await import('./mataPelajaran.service');
    return enrollStudent(mataPelajaranId, studentId);
  } catch (error: any) {
    throw new Error(error.message || "Failed to enroll student");
  }
};

export const unenrollStudent = async (mataPelajaranId: string, studentId: string) => {
  try {
    const { unenrollStudent } = await import('./mataPelajaran.service');
    return unenrollStudent(mataPelajaranId, studentId);
  } catch (error: any) {
    throw new Error(error.message || "Failed to unenroll student");
  }
};
