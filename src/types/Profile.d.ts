export interface IProfile {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  role: string;
  profilePicture: string;
  isActive: boolean;
  createdAt: string;
}

export interface IProfileUpdate {
  fullName: string;
  username: string;
  email: string;
  profilePicture?: string;
}
