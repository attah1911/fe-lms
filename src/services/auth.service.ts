import instance from "../libs/axios/instance";
import endpoint from "./endpoint.constant";
import { IActivation, ILogin, IRegister, IStudentData } from "../types/Auth";
import { IProfileUpdate } from "../types/Profile";

interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

const authServices = {
  register: (payload: IRegister) =>
    instance.post(`${endpoint.AUTH}/register`, payload),
  resendActivation: (email: string) =>
    instance.post(`${endpoint.AUTH}/resend-activation`, { email }),
  activation: (payload: IActivation) =>
    instance.post(`${endpoint.AUTH}/activation`, payload),
  login: (payload: ILogin) => instance.post(`${endpoint.AUTH}/login`, payload),
  getProfile: () => instance.get(`${endpoint.AUTH}/me`),
  updateProfile: (payload: IProfileUpdate) =>
    instance.put(`${endpoint.AUTH}/me`, payload),
  submitStudentData: (payload: IStudentData, token: string) =>
    instance.post(`${endpoint.AUTH}/submit-student-data`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getStudentData: (token: string) =>
    instance.get(`${endpoint.AUTH}/student-data`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  changePassword: (payload: ChangePasswordPayload) =>
    instance.post(`${endpoint.AUTH}/change-password`, payload),
};

export default authServices;
