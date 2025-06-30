import React from 'react';
import { Card, CardBody, Button } from "@nextui-org/react";
import Image from "next/image";
import Link from "next/link";
import AuthLayout from '../../../../components/layouts/AuthLayout';
import { useRouter } from 'next/router';
import { useMutation } from '@tanstack/react-query';
import authServices from '../../../../services/auth.service';
import { toast } from 'sonner';

const RegisterSuccess = () => {
  const router = useRouter();
  const email = router.query.email as string;

  const { mutate: resendActivation, isPending } = useMutation({
    mutationFn: async () => {
      if (!email) {
        throw new Error('Email tidak ditemukan');
      }
      return await authServices.resendActivation(email);
    },
    onSuccess: () => {
      toast.success('Email Aktivasi Terkirim', {
        description: 'Silahkan cek email Anda untuk aktivasi akun',
      });
    },
    onError: (error: Error) => {
      toast.error('Gagal Mengirim Email', {
        description: error.message,
      });
    },
  });

  return (
    <AuthLayout title="Registrasi Berhasil">
      <div className="flex w-full flex-col items-center justify-center gap-6 px-4">
        <Card className="w-full max-w-[500px]">
          <CardBody className="flex flex-col items-center gap-6 p-8 text-center">
            <Image
              src="/images/illustrations/email-send.svg"
              alt="Email sent"
              width={200}
              height={200}
              priority
            />
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-blue-500">
                Registrasi Berhasil!
              </h1>
              <p className="text-gray-600">
                Silahkan cek email Anda untuk aktivasi akun. Jika Anda tidak menerima email dalam beberapa menit, 
                periksa folder spam Anda.
              </p>
              {email && (
                <p className="text-small text-gray-500">
                  Email aktivasi telah dikirim ke: <span className="font-medium">{email}</span>
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Link href="/auth/login" className="w-full">
                <Button 
                  color="primary"
                  size="lg"
                  className="w-full"
                >
                  Kembali ke Login
                </Button>
              </Link>
              <p className="text-small text-gray-500">
                Belum menerima email?{' '}
                <button 
                  onClick={() => resendActivation()}
                  disabled={isPending || !email}
                  className="text-blue-500 hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  {isPending ? 'Mengirim...' : 'Kirim ulang'}
                </button>
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </AuthLayout>
  );
};

export default RegisterSuccess;
