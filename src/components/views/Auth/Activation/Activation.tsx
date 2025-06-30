import { Button } from "@nextui-org/react";
import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { toast } from "sonner";

interface PropTypes {
  status: "success" | "failed";
}

const Activation = (props: PropTypes) => {
  const router = useRouter();
  const { status } = props;

  useEffect(() => {
    if (status === "success") {
      // Show success toast
      toast.success("Aktivasi Berhasil", {
        description: "Silahkan lengkapi data murid Anda",
      });

      // Add delay before redirecting to login
      const timer = setTimeout(() => {
        router.push("/auth/login");
      }, 4000); // 2 second delay

      return () => clearTimeout(timer);
    }
  }, [status, router]);

  return (
    <div className="flex flex-col items-center justify-center gap-10 p-4">
      <div className="flex flex-col items-center justify-center gap-10">
        <Image
          src={
            status === "success"
              ? "/images/illustrations/email-send.svg"
              : "/images/illustrations/pending.svg"
          }
          alt="success"
          width={300}
          height={300}
        />
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-bold text-blue-600">
          {status === 'success' ? 'Aktivasi Akun Berhasil' : 'Aktivasi Akun Gagal'}
        </h1>
        <p className="text-xl font-bold text-default-500">
          {status === 'success' 
            ? 'Selamat! Akun Anda telah berhasil diaktivasi.' 
            : 'Kode aktivasi tidak valid atau sudah kadaluarsa.'}
        </p>
        {status === 'success' ? (
          <p className="text-default-500">
            Anda akan diarahkan ke halaman login dalam beberapa detik...
          </p>
        ) : (
          <Button
            className="mt-4 w-fit"
            variant="bordered"
            color="primary"
            onClick={() => router.push("/")}
          >
            Kembali ke Home
          </Button>
        )}
      </div>
    </div>
  );
};

export default Activation;
