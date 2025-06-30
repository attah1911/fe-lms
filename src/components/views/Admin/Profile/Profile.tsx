import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import authServices from "../../../../services/auth.service";
import mediaServices from "../../../../services/media.service";
import { IProfile, IProfileUpdate } from "../../../../types/Profile";
import { SessionExtended } from "../../../../types/Auth";
import { toast } from "sonner";
import ProfileSidebar from "./components/ProfileSidebar";
import ProfileDetails from "./components/ProfileDetails";

const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const Profile: React.FC = () => {
  const { data: session } = useSession() as { data: SessionExtended | null };
  const [profile, setProfile] = useState<IProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorUpload, setErrorUpload] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [editableProfile, setEditableProfile] = useState<IProfileUpdate>({
    fullName: "",
    username: "",
    email: "",
    profilePicture: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{
    fullName?: string;
    username?: string;
    email?: string;
    general?: string;
  }>({});

  useEffect(() => {
    loadProfile();
  }, []);

  // Show toast notifications when errors or success messages change
  useEffect(() => {
    if (errorUpload) {
      toast.error(errorUpload);
    }
    if (successMessage) {
      toast.success(successMessage);
      // Clear success message after showing toast
      const timer = setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
      return () => clearTimeout(timer);
    }
    if (errors.general) {
      toast.error(errors.general);
    }
  }, [errorUpload, successMessage, errors]);

  const loadProfile = async () => {
    try {
      const response = await authServices.getProfile();
      const profileData = response.data.data || response.data;
      setProfile(profileData);
      setEditableProfile({
        fullName: profileData.fullName || "",
        username: profileData.username || "",
        email: profileData.email || "",
        profilePicture: profileData.profilePicture || ""
      });
      setLoading(false);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Gagal memuat data profil";
      setErrors({ general: errorMessage });
      setLoading(false);
      console.error("Error loading profile:", err);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorUpload("File harus berupa gambar");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorUpload("Ukuran file terlalu besar (maksimal 2MB)");
      return;
    }

    try {
      setUploading(true);
      setErrorUpload("");
      
      const response = await mediaServices.uploadSingle(file);
      const imageUrl = response.data.data.url;

      const updateResponse = await authServices.updateProfile({
        ...editableProfile,
        profilePicture: imageUrl
      });

      if (updateResponse.data) {
        setProfile(prev => prev ? { ...prev, profilePicture: imageUrl } : null);
        setEditableProfile(prev => ({ ...prev, profilePicture: imageUrl }));
        setSuccessMessage("Foto profil berhasil diperbarui");
      }
    } catch (error: any) {
      console.error("Error uploading image:", error);
      setErrorUpload(error.response?.data?.message || "Gagal mengupload gambar");
    } finally {
      setUploading(false);
    }
  };

  const handleEditToggle = () => {
    if (profile) {
      setEditableProfile({
        fullName: profile.fullName || "",
        username: profile.username || "",
        email: profile.email || "",
        profilePicture: profile.profilePicture || ""
      });
    }
    setIsEditing(!isEditing);
    setErrors({});
    setSuccessMessage(""); // Reset success message when toggling edit mode
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditableProfile({
      ...editableProfile,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const fullName = editableProfile.fullName.trim();
      const username = editableProfile.username.trim();
      const email = editableProfile.email.trim();

      // Reset errors
      setErrors({});

      // Validate fields
      const newErrors: { [key: string]: string } = {};
      
      if (!fullName.trim()) {
        newErrors.fullName = "Nama lengkap harus diisi";
      } else if (fullName.trim().length < 3) {
        newErrors.fullName = "Nama lengkap minimal 3 karakter";
      } else if (fullName.trim().length > 50) {
        newErrors.fullName = "Nama lengkap maksimal 50 karakter";
      } else if (!/^[a-zA-Z\s]+$/.test(fullName)) {
        newErrors.fullName = "Nama lengkap hanya boleh berisi huruf";
      }

      if (!username.trim()) {
        newErrors.username = "Username harus diisi";
      } else if (username.trim().length < 3) {
        newErrors.username = "Username minimal 3 karakter";
      } else if (username.trim().length > 20) {
        newErrors.username = "Username maksimal 20 karakter";
      } else if (!/^(?=.*[a-zA-Z])[a-zA-Z0-9_]+$/.test(username)) {
        newErrors.username = "Username harus mengandung huruf dan tidak boleh hanya angka/simbol";
      }

      if (!email) {
        newErrors.email = "Email harus diisi";
      } else if (!validateEmail(email)) {
        newErrors.email = "Format email tidak valid";
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors({
          ...newErrors,
          general: Object.values(newErrors)[0]
        });
        return;
      }

      const updateData: IProfileUpdate = {
        fullName,
        username,
        email,
        profilePicture: editableProfile.profilePicture
      };

      const response = await authServices.updateProfile(updateData);
      
      if (response.data) {
        setProfile(response.data.data || response.data);
        setIsEditing(false);
        setErrors({});
        setSuccessMessage("Profil berhasil diperbarui");
      }
    } catch (err: any) {
      const errorData = err.response?.data;
      
      
      if (errorData?.field === 'username') {
        setErrors({
          general: "Username sudah digunakan"
        });
      } else if (errorData?.field === 'email') {
        setErrors({
          general: "Email sudah digunakan"
        });
      } else {
        setErrors({ 
          general: errorData?.message || "Gagal menyimpan perubahan profil" 
        });
      }
      console.error("Error updating profile:", err.response?.data || err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center text-red-600 p-4">
        Data profil tidak ditemukan
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="md:flex">
          <ProfileSidebar
            profile={profile}
            uploading={uploading}
            onFileSelect={handleFileChange}
            errorUpload={errorUpload}
          />
          <ProfileDetails
            profile={profile}
            editableProfile={editableProfile}
            isEditing={isEditing}
            saving={saving}
            errors={errors}
            onChange={handleChange}
            onSave={handleSave}
            onCancel={handleEditToggle}
            onEdit={handleEditToggle}
          />
        </div>
      </div>
    </div>
  );
};

export default Profile;
