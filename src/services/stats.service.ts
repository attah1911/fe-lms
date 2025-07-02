import instance from "../libs/axios/instance";

export interface DashboardStats {
  studentCount: number;
  teacherCount: number;
  subjectCount: number;
  recentSubjects: Array<{
    _id: string;
    judul: string;
    deskripsi: string;
    kategori: string;
    tingkatKelas: string;
    guru: {
      _id: string;
      fullName: string;
    };
    createdAt: string;
  }>;
}

export interface GuruStats {
  mataPelajaranCount: number;
  muridCount: number;
  materiCount: number;
  recentSubjects: Array<{
    _id: string;
    judul: string;
    deskripsi: string;
    kategori: string;
    tingkatKelas: string;
    guru: {
      _id: string;
      fullName: string;
    };
    createdAt: string;
  }>;
}

const statsService = {
  /**
   * Mendapatkan statistik untuk dashboard admin
   */
  getDashboardStats: async (): Promise<DashboardStats> => {
    try {
      const response = await instance.get('/stats/dashboard');
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to fetch dashboard statistics");
    }
  },
  
  /**
   * Mendapatkan statistik untuk dashboard guru
   */
  getGuruStats: async (): Promise<GuruStats> => {
    try {
      const response = await instance.get('/stats/guru/dashboard');
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to fetch guru dashboard statistics");
    }
  },
};

export default statsService; 
