export interface MataPelajaran {
  _id?: string;
  judul: string;
  deskripsi: string;
  tingkatKelas: string;
  kategori: string;
  guru: string | TeacherData;
  enrolledStudents?: EnrolledStudent[];
}

export interface EnrolledStudent {
  _id: string;
  fullName: string;
  email: string;
  nis: string;
  kelas: string;
}

export interface TeacherData {
  _id: string;
  fullName: string;
  email?: string;
  nip?: string;
}

export const tingkatKelasList = [
  '7-A', '7-B', '7-C', '7-D', '7-E', '7-F', '7-G', '7-H',
  '8-A', '8-B', '8-C', '8-D', '8-E', '8-F', '8-G', '8-H',
  '9-A', '9-B', '9-C', '9-D', '9-E', '9-F', '9-G', '9-H'
] as const;

export const kategoriList = [
  'Matematika',
  'IPA',
  'IPS',
  'Bahasa Indonesia',
  'Bahasa Inggris',
  'Pendidikan Agama',
  'PPKN',
  'Seni Budaya',
  'Pendidikan Jasmani',
  'Prakarya',
  'Informatika'
] as const;

export interface TeacherOption {
  _id: string;
  fullName: string;
}
