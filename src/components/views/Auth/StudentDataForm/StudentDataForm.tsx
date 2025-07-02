import React, { ChangeEvent, FormEvent } from "react";
import { Button, Input, Select, SelectItem, Card, CardBody, Spinner } from "@nextui-org/react";
import { useRouter } from "next/router";
import { useState } from "react";
import authServices from "../../../../services/auth.service";
import { IStudentData } from "../../../../types/Auth";
import { kelasList } from "../../../../types/Student";
import { toast } from "sonner";

interface Props {
  email: string;
}

const StudentDataForm: React.FC<Props> = ({ email }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<IStudentData & { email: string }>({
    nis: "",
    kelas: "",
    noTelp: "",
    email
  });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!formData.nis.trim()) {
        throw new Error("NIS harus diisi");
      }
      if (!formData.kelas) {
        throw new Error("Kelas harus dipilih");
      }
      if (!formData.noTelp.trim()) {
        throw new Error("Nomor Telepon harus diisi");
      }

      if (!/^\d+$/.test(formData.nis)) {
        throw new Error("NIS hanya boleh berisi angka");
      }

      if (!/^[0-9+()-\s]+$/.test(formData.noTelp)) {
        throw new Error("Nomor Telepon hanya boleh berisi angka");
      }

      await authServices.submitStudentData(formData);
      
      toast.success("Data murid berhasil ditambahkan", {
        description: "Silakan login menggunakan akun Anda",
      });

      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);
      
    } catch (error: any) {
      console.error("Error submitting student data:", error);
      
      const errorMessage = error.response?.data?.meta?.message 
        || error.message 
        || "Terjadi kesalahan saat menyimpan data";
      
      setError(errorMessage);
      toast.error("Gagal menyimpan data", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      kelas: value,
    }));
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md mb-6 bg-blue-500 p-8 rounded-lg shadow-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Lengkapi Data Murid</h1>
          <p className="text-blue-100">
            Silakan lengkapi data diri Anda untuk melanjutkan
          </p>
        </div>

        <Card className="w-full bg-white shadow-xl">
          <CardBody className="gap-6 p-6">
            {error && (
              <div className="w-full p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 w-full">
              <Input
                type="text"
                label="NIS (Nomor Induk Siswa)"
                placeholder="Masukkan NIS"
                name="nis"
                value={formData.nis}
                onChange={handleChange}
                isRequired
                variant="bordered"
                classNames={{
                  label: "text-default-600",
                  input: "text-default-800",
                  inputWrapper: "border-blue-200 hover:border-blue-400",
                }}
                errorMessage={!formData.nis.trim() ? "NIS harus diisi" : ""}
                isDisabled={isLoading}
              />

              <Select
                label="Kelas"
                placeholder="Pilih Kelas"
                selectedKeys={formData.kelas ? [formData.kelas] : []}
                onChange={(e) => handleSelectChange(e.target.value)}
                isRequired
                variant="bordered"
                classNames={{
                  label: "text-default-600",
                  value: "text-default-800",
                  trigger: "border-blue-200 hover:border-blue-400",
                }}
                errorMessage={!formData.kelas ? "Kelas harus dipilih" : ""}
                isDisabled={isLoading}
              >
                {kelasList.map((kelas) => (
                  <SelectItem key={kelas} value={kelas}>
                    {kelas}
                  </SelectItem>
                ))}
              </Select>

              <Input
                type="tel"
                label="Nomor Telepon"
                placeholder="Masukkan Nomor Telepon"
                name="noTelp"
                value={formData.noTelp}
                onChange={handleChange}
                isRequired
                variant="bordered"
                classNames={{
                  label: "text-default-600",
                  input: "text-default-800",
                  inputWrapper: "border-blue-200 hover:border-blue-400",
                }}
                errorMessage={!formData.noTelp.trim() ? "Nomor Telepon harus diisi" : ""}
                isDisabled={isLoading}
              />

              <Button
                type="submit"
                color="primary"
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
                isLoading={isLoading}
                spinner={
                  <Spinner 
                    color="white"
                    size="sm"
                    className="mr-2"
                  />
                }
                disabled={isLoading}
              >
                {isLoading ? 'Menyimpan...' : 'Simpan Data'}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default StudentDataForm;
