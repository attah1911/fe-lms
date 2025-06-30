export interface Student {
  _id?: string;
  fullName: string;
  email: string;
  nis: string;
  kelas: string;
  noTelp: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentUpdateData {
  nis: string;
  kelas: string;
  noTelp: string;
}

export const kelasList = [
  '7-A', '7-B', '7-C', '7-D', '7-E', '7-F', '7-G', '7-H',
  '8-A', '8-B', '8-C', '8-D', '8-E', '8-F', '8-G', '8-H',
  '9-A', '9-B', '9-C', '9-D', '9-E', '9-F', '9-G', '9-H'
] as const;
