import { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

export interface UserExtended extends DefaultUser {
  id: string;
  _id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  accessToken?: string;
  profilePicture?: string;
}

export interface SessionExtended extends DefaultSession {
  user?: UserExtended;
  accessToken?: string;
  error?: "TokenExpired";
}

export interface JWTExtended extends JWT {
  user?: UserExtended;
  iat?: number;
  error?: string;
}

export interface ILogin {
  identifier: string;
  password: string;
}

// Form data interface
export interface IRegisterForm {
  fullName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// API request interface
export interface IRegister extends IRegisterForm {
  role: string;
}

export interface IActivation {
  token: string;  // Changed from 'code' to 'token' to match the email link parameter
}

export interface IStudentData {
  nis: string;
  kelas: string;
  noTelp: string;
}
