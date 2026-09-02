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
  Tab,
  Select,
  SelectItem
} from "@nextui-org/react";
import { FiUser, FiMail, FiLock, FiSave, FiUpload, FiPhone, FiBookOpen } from "react-icons/fi";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { toast } from "sonner";

import DashboardLayout from "@/components/layouts/DashboardLayout";
import PageContainer from "@/components/commons/PageContainer";
import PageHeader from "@/components/commons/PageHeader";
import authServices from "@/services/auth.service";
import { IProfile } from "@/types/Profile";
import mediaServices from "@/services/media.service";
import guruService from "@/services/guru.service";
import studentServices from "@/services/student.service";
import { kelasList } from "@/types/Student";
import { SessionExtended } from "@/types/Auth";

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

export type SettingPageRole = "admin" | "guru" | "murid";

type RoleData = Record<string, string>;

interface RoleDataConfig {
  tabTitle: string;
  heading: string;
  subtitle: string;
  saveLabel: string;
  empty: RoleData;
  fetch: () => Promise<any>;
  update: (data: RoleData) => Promise<any>;
  /** returns an error message, or null when valid */
  validate: (data: RoleData) => string | null;
  successMessage: string;
  errorMessage: string;
}

/** admin has no extra data tab, so it is absent here */
const ROLE_DATA: Partial<Record<SettingPageRole, RoleDataConfig>> = {
  guru: {
    tabTitle: "Data Guru",
    heading: "Informasi Guru",
    subtitle: "Kelola data guru Anda",
    saveLabel: "Simpan Data Guru",
    empty: { nrk: "", noTelp: "" },
    fetch: guruService.getTeacherProfile,
    update: (data) => guruService.updateTeacherProfile({ nrk: data.nrk, noTelp: data.noTelp }),
    validate: (data) =>
      !data.nrk ? "Mohon isi NRK" : !data.noTelp ? "Mohon isi Nomor Telepon" : null,
    successMessage: "Data guru berhasil diperbarui",
    errorMessage: "Gagal memperbarui data guru",
  },
  murid: {
    tabTitle: "Data Murid",
    heading: "Informasi Murid",
    subtitle: "Kelola data murid Anda",
    saveLabel: "Simpan Data Murid",
    empty: { nis: "", kelas: "", noTelp: "" },
    fetch: studentServices.getStudentProfile,
    update: (data) =>
      studentServices.updateStudentProfile({
        nis: data.nis,
        kelas: data.kelas,
        noTelp: data.noTelp,
      }),
    validate: (data) => (!data.nis || !data.kelas ? "Mohon isi NIS dan kelas" : null),
    successMessage: "Data murid berhasil diperbarui",
    errorMessage: "Gagal memperbarui data murid",
  },
};

interface PropTypes {
  role: SettingPageRole;
}

const SettingPage: React.FC<PropTypes> = ({ role }) => {
  const roleData = ROLE_DATA[role];
  const { data: session, update: updateSession } = useSession() as { data: SessionExtended | null, update: any };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<IProfile | null>(null);
  const [updateData, setUpdateData] = useState<UpdateData>({
    fullName: "",
    username: "",
    email: "",
  });
  const [roleUpdateData, setRoleUpdateData] = useState<RoleData>(roleData?.empty ?? {});
  const [passwordData, setPasswordData] = useState<PasswordUpdate>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});

  const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] = useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  const fetchProfileAndRoleData = async () => {
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

      if (!roleData) {
        setLoading(false);
        return;
      }

      try {
        const response = await roleData.fetch();

        if (response && response.data) {
          const data = response.data.data || response.data;
          setRoleUpdateData(
            Object.fromEntries(
              Object.keys(roleData.empty).map((key) => [key, data[key] || ""])
            )
          );
        }
      } catch (roleErr: any) {
        console.error(`Error fetching ${role} data:`, roleErr);
        setRoleUpdateData(roleData.empty);
      }
    } catch (err: any) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchProfileAndRoleData();
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
          fetchProfileAndRoleData();
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

  const handleRoleDataUpdate = async () => {
    if (!roleData) return;

    try {
      setSaving(true);

      const validationError = roleData.validate(roleUpdateData);
      if (validationError) {
        toast.error(validationError);
        setSaving(false);
        return;
      }

      try {
        const response = await roleData.update(roleUpdateData);

        if (response && response.data) {
          toast.success(roleData.successMessage);
          fetchProfileAndRoleData();
        }
      } catch (updateErr: any) {
        console.error(`Error updating ${role} data:`, updateErr);
        toast.error(updateErr.response?.data?.message || updateErr.message || roleData.errorMessage);
      }
    } catch (err: any) {
      console.error("General error:", err);
      toast.error(`Terjadi kesalahan saat memperbarui ${roleData.tabTitle.toLowerCase()}`);
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

        const status = updateErr.response?.status;
        const message = updateErr.response?.data?.meta?.message;

        if (status === 401) {
          // the current password is wrong
          setPasswordErrors(prev => ({
            ...prev,
            currentPassword: message || 'Password yang Anda masukkan tidak valid'
          }));
        } else if (status === 400) {
          // the new password broke one of the backend's rules
          setPasswordErrors(prev => ({
            ...prev,
            newPassword: message || 'Password baru tidak memenuhi ketentuan'
          }));
        } else {
          toast.error(message || 'Gagal mengubah password');
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

  const setRoleField = (field: string, value: string) =>
    setRoleUpdateData(prev => ({ ...prev, [field]: value }));

  const toggleCurrentPasswordVisibility = () => setIsCurrentPasswordVisible(!isCurrentPasswordVisible);
  const toggleNewPasswordVisibility = () => setIsNewPasswordVisible(!isNewPasswordVisible);
  const toggleConfirmPasswordVisibility = () => setIsConfirmPasswordVisible(!isConfirmPasswordVisible);

  return (
    <DashboardLayout type={role}>
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

            {roleData ? (
            <Tab key="role-data" title={roleData.tabTitle}>
              <Card className="mt-5">
                <CardHeader className="border-b border-divider">
                  <div className="flex flex-col">
                    <h2 className="text-lg font-semibold">{roleData.heading}</h2>
                    <p className="text-small text-default-500">{roleData.subtitle}</p>
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
                    {role === "guru" ? (
                      <>
                        <Input
                          label="NRK (Nomor Registrasi Kepegawaian)"
                          placeholder="Masukkan NRK"
                          value={roleUpdateData.nrk}
                          onChange={(e) => setRoleField("nrk", e.target.value)}
                          startContent={<FiBookOpen className="text-default-400" />}
                          isRequired
                        />
                        <Input
                          label="Nomor Telepon"
                          placeholder="Masukkan nomor telepon"
                          value={roleUpdateData.noTelp}
                          onChange={(e) => setRoleField("noTelp", e.target.value)}
                          startContent={<FiPhone className="text-default-400" />}
                          isRequired
                        />
                      </>
                    ) : (
                      <>
                        <Input
                          label="NIS (Nomor Induk Siswa)"
                          placeholder="Masukkan NIS"
                          value={roleUpdateData.nis}
                          onChange={(e) => setRoleField("nis", e.target.value)}
                          startContent={<FiBookOpen className="text-default-400" />}
                          isRequired
                        />
                        <Select
                          label="Kelas"
                          placeholder="Pilih kelas"
                          selectedKeys={roleUpdateData.kelas ? [roleUpdateData.kelas] : []}
                          onChange={(e) => setRoleField("kelas", e.target.value)}
                          startContent={<FiBookOpen className="text-default-400" />}
                          isRequired
                        >
                          {kelasList.map((kelas) => (
                            <SelectItem key={kelas} value={kelas}>
                              {kelas}
                            </SelectItem>
                          ))}
                        </Select>
                        <Input
                          label="Nomor Telepon"
                          placeholder="Masukkan nomor telepon"
                          value={roleUpdateData.noTelp}
                          onChange={(e) => setRoleField("noTelp", e.target.value)}
                          startContent={<FiPhone className="text-default-400" />}
                        />
                      </>
                    )}
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button
                      color="primary"
                      startContent={<FiSave />}
                      onClick={handleRoleDataUpdate}
                      isLoading={saving}
                    >
                      {roleData.saveLabel}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </Tab>
            ) : null}

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

export default SettingPage;
