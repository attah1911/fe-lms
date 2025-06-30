export interface Teacher {
  _id?: string;
  fullName: string;
  email: string;
  nrk: string;
  noTelp: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TeacherInput {
  fullName: string;
  email: string;
  nrk: string;
  noTelp: string;
}

export interface TeacherUpdateData {
  nrk: string;
  noTelp: string;
}
