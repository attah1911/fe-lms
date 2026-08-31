import React from "react";
import {
  Button,
  Card,
  CardBody,
  Input,
} from "@nextui-org/react"; 
import Image from "next/image";
import Link from "next/link";
import useRegister from "./useRegister";
import { FaEye, FaEyeSlash } from "react-icons/fa6";
import { FaArrowLeft } from "react-icons/fa6";
import { Controller } from "react-hook-form";
import { cn } from "../../../../utils/cn";

const Register: React.FC = () => {
  const {
    visiblePassword,
    handleVisiblePassword,
    control,
    handleSubmit,
    handleRegister,
    isPendingRegister,
    errors,
  } = useRegister();

  return (
    <div className="flex w-full flex-col items-center justify-center gap-6 px-4 lg:flex-row lg:gap-20">
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors">
        <FaArrowLeft />
        <span>Kembali ke Homepage</span>
      </Link>
      
      <div className="hidden w-full max-w-[600px] items-center justify-center lg:flex">
        <Image
          src="/images/illustrations/register.svg"
          alt="register"
          className="w-full"
          width={600}
          height={600}
          priority
        />
      </div>
      <Card className="w-full max-w-[380px]">
        <CardBody className="p-8">
          <h2 className="text-2xl font-bold text-blue-500">
            Registrasi Akun
          </h2>
          <p className="mb-4 mt-2 text-small">
            Sudah punya Akun?&nbsp;
            <Link
              href="/auth/login"
              className="font-semibold text-blue-500"
            >
              Login Disini
            </Link>
          </p>
          {errors.root && (
            <p className="mb-2 font-medium text-danger">
              {errors?.root?.message}
            </p>
          )}
          <form
            className={cn(
              "flex w-full flex-col",
              Object.keys(errors).length > 0 ? "gap-2" : "gap-4",
            )}
            onSubmit={handleSubmit(handleRegister)}
          >
            <Controller
              name="fullName"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  type="text"
                  label="Nama Lengkap"
                  variant="bordered"
                  autoComplete="off"
                  isInvalid={Boolean(fieldState.error)}
                  errorMessage={fieldState.error?.message}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^A-Za-z\s]/g, '');
                    field.onChange(value);
                  }}
                  maxLength={50}
                />
              )}
            />
            <Controller
              name="username"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  type="text"
                  label="Username"
                  variant="bordered"
                  autoComplete="off"
                  isInvalid={Boolean(fieldState.error)}
                  errorMessage={fieldState.error?.message}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^A-Za-z0-9]/g, '');
                    field.onChange(value);
                  }}
                  maxLength={15}
                />
              )}
            />
            <Controller
              name="email"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  type="email"
                  label="Email"
                  variant="bordered"
                  autoComplete="off"
                  isInvalid={Boolean(fieldState.error)}
                  errorMessage={fieldState.error?.message}
                />
              )}
            />
            <Controller
              name="password"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  type={visiblePassword.password ? "text" : "password"}
                  label="Password"
                  variant="bordered"
                  autoComplete="off"
                  isInvalid={Boolean(fieldState.error)}
                  errorMessage={fieldState.error?.message}
                  endContent={
                    <button
                      className="focus:outline-none"
                      type="button"
                      onClick={() => handleVisiblePassword("password")}
                    >
                      {visiblePassword.password ? (
                        <FaEye className="pointer-events-none text-xl text-default-400" />
                      ) : (
                        <FaEyeSlash className="pointer-events-none text-xl text-default-400" />
                      )}
                    </button>
                  }
                />
              )}
            />
            <Controller
              name="confirmPassword"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  type={visiblePassword.confirmPassword ? "text" : "password"}
                  label="Password Confirmation"
                  variant="bordered"
                  autoComplete="off"
                  isInvalid={Boolean(fieldState.error)}
                  errorMessage={fieldState.error?.message}
                  endContent={
                    <button
                      className="focus:outline-none"
                      type="button"
                      onClick={() => handleVisiblePassword("confirmPassword")}
                    >
                      {visiblePassword.confirmPassword ? (
                        <FaEye className="pointer-events-none text-xl text-default-400" />
                      ) : (
                        <FaEyeSlash className="pointer-events-none text-xl text-default-400" />
                      )}
                    </button>
                  }
                />
              )}
            />

            <Button 
              color="primary" 
              size="lg" 
              type="submit"
              isLoading={isPendingRegister}
            >
              Register
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};

export default Register;
