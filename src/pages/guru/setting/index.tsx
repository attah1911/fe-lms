import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { 
  Card, 
  CardBody, 
  CardHeader, 
  Button, 
  Spinner, 
  Input,
  Avatar,
  Divider,
  Tabs,
  Tab
} from "@nextui-org/react";
import { FiUser, FiMail, FiLock, FiEdit2, FiSave, FiUpload, FiPhone, FiBookOpen } from "react-icons/fi";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { toast } from "sonner";

import DashboardLayout from "../../../components/layouts/DashboardLayout";
import PageContainer from "../../../components/commons/PageContainer";
import PageHeader from "../../../components/commons/PageHeader";
import NotificationAlert from "../../../components/commons/NotificationAlert/NotificationAlert";
import authServices from "../../../services/auth.service";
import { IProfile, IProfileUpdate } from "../../../types/Profile";
import mediaServices from "../../../services/media.service";
import guruService from "../../../services/guru.service";
import { Teacher, TeacherUpdateData } from "../../../types/TeacherTypes";
import { SessionExtended } from "../../../types/Auth";

interface UpdateData {
  fullName: string;
  username: string;
  email: string;
}

interface PasswordUpdate {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

const TeacherSettingsPage: React.FC = () => {
  const { data: session, update: updateSession } = useSession() as { data: SessionExtended | null, update: any };
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [profile, setProfile] = useState<IProfile | null>(null);
  const [teacherData, setTeacherData] = useState<Teacher | null>(null);
  const [updateData, setUpdateData] = useState<UpdateData>({
    fullName: "",
    username: "",
    email: "",
  });
  const [teacherUpdateData, setTeacherUpdateData] = useState<TeacherUpdateData>({
    nrk: "",
    noTelp: "",
  });
  const [passwordData, setPasswordData] = useState<PasswordUpdate>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("profile");
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  
  const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] = useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  
  const fetchProfileAndTeacherData = async () => {
    try {
      setLoading(true);
      
      const profileResponse = await authServices.getProfile();
      
      if (profileResponse && profileResponse.data) {
        const profileData = profileResponse.data.data || profileResponse.data;
        setProfile(profileData);
        setUpdateData({
          fullName: profileData.fullName || "",
          username: profileData.username || "",
          email: profileData.email || "",
        });
        
        if (profileData.profilePicture) {
          setImagePreview(profileData.profilePicture);
        }
      }
      
      try {
        const teacherResponse = await guruService.getTeacherProfile();
        
        if (teacherResponse && teacherResponse.data) {
          const teacherData = teacherResponse.data.data || teacherResponse.data;
          setTeacherData(teacherData);
          setTeacherUpdateData({
            nrk: teacherData.nrk || "",
            noTelp: teacherData.noTelp || "",
          });
        }
      } catch (teacherErr: any) {
        console.error("Error fetching teacher data:", teacherErr);
        setTeacherData(null);
        setTeacherUpdateData({
          nrk: "",
          noTelp: "",
        });
      }
      
      setError(null);
    } catch (err: any) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (session?.user) {
      fetchProfileAndTeacherData();
    }
  }, [session]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.includes('image/')) {
      toast.error('Pilih file gambar yang valid');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran gambar terlalu besar (max 2MB)');
      return;
    }
    
    setSelectedImage(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleProfileUpdate = async () => {
    try {
      setSaving(true);
      
      if (!updateData.fullName || !updateData.username || !updateData.email) {
        toast.error('Mohon isi semua field profil');
        setSaving(false);
        return;
      }
      
      const usernameChanged = updateData.username !== profile?.username;
      const emailChanged = updateData.email !== profile?.email;
      
      let profilePicture = profile?.profilePicture || undefined;
      if (selectedImage) {
        try {
          const formData = new FormData();
          formData.append('file', selectedImage);
          
          const uploadResponse = await mediaServices.uploadSingle(selectedImage);
          if (uploadResponse && uploadResponse.data && uploadResponse.data.data) {
            profilePicture = uploadResponse.data.data.url;
          } else {
            profilePicture = imagePreview || undefined;
          }
        } catch (uploadErr) {
          console.error("Failed to upload image:", uploadErr);
          toast.error('Gagal mengupload gambar');
        }
      }
      
      try {
        const response = await authServices.updateProfile({
          ...updateData,
          profilePicture,
        });
        
        if (response && response.data) {
          if (session?.user) {
            await updateSession({
              ...session,
              user: {
                ...session.user,
                fullName: updateData.fullName,
                username: updateData.username,
                email: updateData.email,
                profilePicture: profilePicture || session.user.profilePicture,
              }
            });
          }
          
          toast.success('Profil berhasil diperbarui');
          fetchProfileAndTeacherData();
        }
      } catch (updateErr: any) {
        console.error("Error updating profile:", updateErr);
        
        if (usernameChanged) {
          toast.error('Username mungkin sudah digunakan oleh pengguna lain');
        } else if (emailChanged) {
          toast.error('Email mungkin sudah digunakan oleh pengguna lain');
        } else {
          toast.error(updateErr.response?.data?.message || updateErr.message || 'Gagal memperbarui profil');
        }
      }
    } catch (err: any) {
      console.error("General error:", err);
      toast.error('Terjadi kesalahan saat memperbarui profil');
    } finally {
      setSaving(false);
    }
  };

  const handleTeacherDataUpdate = async () => {
    try {
      setSaving(true);
      
      if (!teacherUpdateData.nrk) {
        toast.error('Mohon isi NRK');
        setSaving(false);
        return;
      }
      
      if (!teacherUpdateData.noTelp) {
        toast.error('Mohon isi Nomor Telepon');
        setSaving(false);
        return;
      }
      
      try {
        const response = await guruService.updateTeacherProfile(teacherUpdateData);
        
        if (response && response.data) {
          toast.success('Data guru berhasil diperbarui');
          fetchProfileAndTeacherData();
        }
      } catch (updateErr: any) {
        console.error("Error updating teacher data:", updateErr);
        toast.error(updateErr.response?.data?.message || updateErr.message || 'Gagal memperbarui data guru');
      }
    } catch (err: any) {
      console.error("General error:", err);
      toast.error('Terjadi kesalahan saat memperbarui data guru');
    } finally {
      setSaving(false);
    }
  };
  
  const validatePassword = () => {
    const errors: PasswordErrors = {};
    
    if (!passwordData.currentPassword) {
      errors.currentPassword = "Password saat ini tidak boleh kosong";
    }
    
    if (!passwordData.newPassword) {
      errors.newPassword = "Password baru tidak boleh kosong";
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = "Password baru minimal 8 karakter";
    }
    
    if (!passwordData.confirmPassword) {
      errors.confirmPassword = "Konfirmasi password tidak boleh kosong";
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "Konfirmasi password tidak sesuai";
    }
    
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  type PasswordField = keyof PasswordErrors;
  
  const resetErrorField = (field: PasswordField) => {
    if (passwordErrors[field]) {
      setPasswordErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };
  
  const handlePasswordUpdate = async () => {
    try {
      setSaving(true);
      
      if (!validatePassword()) {
        setSaving(false);
        return;
      }
      
      try {
        const response = await authServices.changePassword({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        });
        
        if (response && response.data) {
          toast.success('Password berhasil diubah');
          
          setPasswordData({
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          });
          
          setPasswordErrors({});
        }
      } catch (updateErr: any) {
        console.error("Error changing password:", updateErr);
        
        setPasswordErrors(prev => ({
          ...prev,
          currentPassword: 'Password yang Anda masukkan tidak valid'
        }));
        
        if (updateErr.response?.status !== 500) {
          toast.error(updateErr.response?.data?.message || 'Gagal mengubah password');
        }
      }
    } catch (err: any) {
      console.error("General password error:", err);
      toast.error('Terjadi kesalahan saat mengubah password');
    } finally {
      setSaving(false);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const toggleCurrentPasswordVisibility = () => setIsCurrentPasswordVisible(!isCurrentPasswordVisible);
  const toggleNewPasswordVisibility = () => setIsNewPasswordVisible(!isNewPasswordVisible);
  const toggleConfirmPasswordVisibility = () => setIsConfirmPasswordVisible(!isConfirmPasswordVisible);

  return (
    <DashboardLayout type="guru">
      <PageContainer>
        <div className="mb-6">
          <PageHeader 
            title="Pengaturan" 
            description="Kelola pengaturan akun dan profil Anda" 
          />
        </div>
        
        {loading ? (
          <div className="flex justify-center my-10">
            <Spinner size="lg" color="primary" />
          </div>
        ) : (
          <Tabs aria-label="Settings options" className="mt-4">
            <Tab key="profile" title="Informasi Akun">
              <Card className="mt-5">
                <CardHeader className="border-b border-divider">
                  <div className="flex flex-col">
                    <h2 className="text-lg font-semibold">Profil Akun</h2>
                    <p className="text-small text-default-500">Ubah informasi profil dan foto Anda</p>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="flex flex-col md:flex-row gap-5">
                    <div className="flex flex-col items-center gap-3 mb-4 md:mb-0">
                      <Avatar
                        src={imagePreview || profile?.profilePicture || "/images/general/icon_default.png"}
                        className="w-24 h-24 text-large"
                        showFallback
                        fallback={
                          <FiUser className="w-12 h-12 text-default-500" />
                        }
                      />
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                      <Button
                        color="primary"
                        startContent={<FiUpload />}
                        onClick={triggerFileInput}
                        className="mt-2"
                        size="sm"
                      >
                        Upload Foto
                      </Button>
                      <p className="text-tiny text-default-500 text-center mt-1">
                        JPG, PNG or GIF (max. 2MB)
                      </p>
                    </div>
                    
                    <div className="flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Nama Lengkap"
                          placeholder="Masukkan nama lengkap"
                          value={updateData.fullName}
                          onChange={(e) => setUpdateData({...updateData, fullName: e.target.value})}
                          startContent={<FiUser className="text-default-400" />}
                          isRequired
                        />
                        <Input
                          label="Username"
                          placeholder="Masukkan username"
                          value={updateData.username}
                          onChange={(e) => setUpdateData({...updateData, username: e.target.value})}
                          startContent={<FiUser className="text-default-400" />}
                          isRequired
                        />
                        <Input
                          type="email"
                          label="Email"
                          placeholder="Masukkan email"
                          value={updateData.email}
                          onChange={(e) => setUpdateData({...updateData, email: e.target.value})}
                          startContent={<FiMail className="text-default-400" />}
                          className="col-span-1 md:col-span-2"
                          isRequired
                        />
                      </div>
                      <div className="flex justify-end mt-4">
                        <Button
                          color="primary"
                          startContent={<FiSave />}
                          onClick={handleProfileUpdate}
                          isLoading={saving}
                        >
                          Simpan Perubahan
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Tab>

            <Tab key="teacher-data" title="Data Guru">
              <Card className="mt-5">
                <CardHeader className="border-b border-divider">
                  <div className="flex flex-col">
                    <h2 className="text-lg font-semibold">Informasi Guru</h2>
                    <p className="text-small text-default-500">Kelola data guru Anda</p>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Nama Lengkap"
                      placeholder="Masukkan nama lengkap"
                      value={profile?.fullName || ""}
                      startContent={<FiUser className="text-default-400" />}
                      isDisabled
                    />
                    <Input
                      type="email"
                      label="Email"
                      placeholder="Masukkan email"
                      value={profile?.email || ""}
                      startContent={<FiMail className="text-default-400" />}
                      isDisabled
                    />
                    <Input
                      label="NRK (Nomor Registrasi Kepegawaian)"
                      placeholder="Masukkan NRK"
                      value={teacherUpdateData.nrk}
                      onChange={(e) => setTeacherUpdateData({...teacherUpdateData, nrk: e.target.value})}
                      startContent={<FiBookOpen className="text-default-400" />}
                      isRequired
                    />
                    <Input
                      label="Nomor Telepon"
                      placeholder="Masukkan nomor telepon"
                      value={teacherUpdateData.noTelp}
                      onChange={(e) => setTeacherUpdateData({...teacherUpdateData, noTelp: e.target.value})}
                      startContent={<FiPhone className="text-default-400" />}
                      isRequired
                    />
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button
                      color="primary"
                      startContent={<FiSave />}
                      onClick={handleTeacherDataUpdate}
                      isLoading={saving}
                    >
                      Simpan Data Guru
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </Tab>

            <Tab key="security" title="Keamanan">
              <Card className="mt-5">
                <CardHeader className="border-b border-divider">
                  <div className="flex flex-col">
                    <h2 className="text-lg font-semibold">Ubah Password</h2>
                    <p className="text-small text-default-500">Perbarui password untuk keamanan akun Anda</p>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-1 gap-4">
                    <Input
                      label="Password Saat Ini"
                      placeholder="Masukkan password saat ini"
                      value={passwordData.currentPassword}
                      onChange={(e) => {
                        setPasswordData({...passwordData, currentPassword: e.target.value});
                        resetErrorField("currentPassword");
                      }}
                      type={isCurrentPasswordVisible ? "text" : "password"}
                      startContent={<FiLock className="text-default-400" />}
                      endContent={
                        <Button variant="light" isIconOnly onPress={toggleCurrentPasswordVisibility}>
                          {isCurrentPasswordVisible ? <FaEyeSlash className="text-default-400" /> : <FaEye className="text-default-400" />}
                        </Button>
                      }
                      isInvalid={!!passwordErrors.currentPassword}
                      errorMessage={passwordErrors.currentPassword}
                      isRequired
                    />
                    <Input
                      label="Password Baru"
                      placeholder="Masukkan password baru"
                      value={passwordData.newPassword}
                      onChange={(e) => {
                        setPasswordData({...passwordData, newPassword: e.target.value});
                        resetErrorField("newPassword");
                      }}
                      type={isNewPasswordVisible ? "text" : "password"}
                      startContent={<FiLock className="text-default-400" />}
                      endContent={
                        <Button variant="light" isIconOnly onPress={toggleNewPasswordVisibility}>
                          {isNewPasswordVisible ? <FaEyeSlash className="text-default-400" /> : <FaEye className="text-default-400" />}
                        </Button>
                      }
                      isInvalid={!!passwordErrors.newPassword}
                      errorMessage={passwordErrors.newPassword}
                      isRequired
                    />
                    <Input
                      label="Konfirmasi Password Baru"
                      placeholder="Konfirmasi password baru"
                      value={passwordData.confirmPassword}
                      onChange={(e) => {
                        setPasswordData({...passwordData, confirmPassword: e.target.value});
                        resetErrorField("confirmPassword");
                      }}
                      type={isConfirmPasswordVisible ? "text" : "password"}
                      startContent={<FiLock className="text-default-400" />}
                      endContent={
                        <Button variant="light" isIconOnly onPress={toggleConfirmPasswordVisibility}>
                          {isConfirmPasswordVisible ? <FaEyeSlash className="text-default-400" /> : <FaEye className="text-default-400" />}
                        </Button>
                      }
                      isInvalid={!!passwordErrors.confirmPassword}
                      errorMessage={passwordErrors.confirmPassword}
                      isRequired
                    />
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button
                      color="primary"
                      startContent={<FiSave />}
                      onClick={handlePasswordUpdate}
                      isLoading={saving}
                    >
                      Perbarui Password
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </Tab>
          </Tabs>
        )}
      </PageContainer>
    </DashboardLayout>
  );
};

export default TeacherSettingsPage;
