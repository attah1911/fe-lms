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
  Tabs,
  Tab
} from "@nextui-org/react";
import { FiUser, FiMail, FiLock, FiEdit2, FiSave, FiUpload } from "react-icons/fi";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { toast } from "sonner";

import DashboardLayout from "../../../components/layouts/DashboardLayout";
import PageContainer from "../../../components/commons/PageContainer";
import PageHeader from "../../../components/commons/PageHeader";
import NotificationAlert from "../../../components/commons/NotificationAlert/NotificationAlert";
import authServices from "../../../services/auth.service";
import mediaServices from "../../../services/media.service";
import { IProfile, IProfileUpdate } from "../../../types/Profile";
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

const AdminSettingsPage: React.FC = () => {
  const { data: session, update: updateSession } = useSession() as { data: SessionExtended | null, update: any };
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [profile, setProfile] = useState<IProfile | null>(null);
  const [updateData, setUpdateData] = useState<UpdateData>({
    fullName: "",
    username: "",
    email: "",
  });
  const [passwordData, setPasswordData] = useState<PasswordUpdate>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  
  // Password visibility states
  const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] = useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  
  // Fetch user profile
  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      // Fetch user profile
      const profileResponse = await authServices.getProfile();
      
      if (profileResponse && profileResponse.data) {
        // Extract data correctly from response structure
        const profileData = profileResponse.data.data || profileResponse.data;
        
        setProfile(profileData);
        setUpdateData({
          fullName: profileData.fullName || "",
          username: profileData.username || "",
          email: profileData.email || "",
        });
        
        // Set image preview if profile has a picture
        if (profileData.profilePicture) {
          setImagePreview(profileData.profilePicture);
        }
      }
      
      setError(null);
    } catch (err: any) {
      console.error("Error fetching profile:", err);
      // Don't set error state to avoid showing error message
      // setError(err.response?.data?.message || err.message || "Gagal memuat profil");
      // setShowError(true);
    } finally {
      setLoading(false);
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    if (session?.user) {
      fetchProfile();
    }
  }, [session]);
  
  // Handle file change for profile picture
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.includes('image/')) {
      toast.error('Pilih file gambar yang valid');
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran gambar terlalu besar (max 2MB)');
      return;
    }
    
    setSelectedImage(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle profile update
  const handleProfileUpdate = async () => {
    try {
      setSaving(true);
      
      // Validate inputs
      if (!updateData.fullName || !updateData.username || !updateData.email) {
        toast.error('Mohon isi semua field profil');
        setSaving(false);
        return;
      }
      
      // Check if username or email has changed
      const usernameChanged = updateData.username !== profile?.username;
      const emailChanged = updateData.email !== profile?.email;
      
      // Upload image if selected
      let profilePicture = profile?.profilePicture || undefined;
      if (selectedImage) {
        try {
          const formData = new FormData();
          formData.append('file', selectedImage);
          
          // Use media service to upload the image
          const uploadResponse = await mediaServices.uploadSingle(selectedImage);
          if (uploadResponse && uploadResponse.data && uploadResponse.data.data) {
            profilePicture = uploadResponse.data.data.url;
          } else {
            // Fallback to image preview if upload fails
            profilePicture = imagePreview || undefined;
          }
        } catch (uploadErr) {
          console.error("Failed to upload image:", uploadErr);
          toast.error('Gagal mengupload gambar');
        }
      }
      
      try {
        // Update profile
        const response = await authServices.updateProfile({
          ...updateData,
          profilePicture,
        });
        
        if (response && response.data) {
          // Update session with new profile data
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
          // Refresh profile data
          fetchProfile();
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
  
  // Validate password
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

  // Reset error for specific field
  type PasswordField = keyof PasswordErrors;
  
  const resetErrorField = (field: PasswordField) => {
    if (passwordErrors[field]) {
      setPasswordErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };
  
  // Handle password update
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
          
          // Reset form
          setPasswordData({
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          });
          
          setPasswordErrors({});
        }
      } catch (updateErr: any) {
        console.error("Error changing password:", updateErr);
        
        // Set error message on the field regardless of error status
        setPasswordErrors(prev => ({
          ...prev,
          currentPassword: 'Password yang Anda masukkan tidak valid'
        }));
        
        // Only show toast for non-500 errors
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

  // Trigger file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Toggle password visibility
  const toggleCurrentPasswordVisibility = () => setIsCurrentPasswordVisible(!isCurrentPasswordVisible);
  const toggleNewPasswordVisibility = () => setIsNewPasswordVisible(!isNewPasswordVisible);
  const toggleConfirmPasswordVisibility = () => setIsConfirmPasswordVisible(!isConfirmPasswordVisible);

  return (
    <DashboardLayout type="admin">
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
                    {/* Profile picture section */}
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
                    
                    {/* Profile form */}
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

export default AdminSettingsPage;
