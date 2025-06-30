import React from "react";
import { Card, CardBody, Input, Button } from "@nextui-org/react";
import { Controller } from "react-hook-form";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { FaArrowLeft } from "react-icons/fa6";
import { useLogin } from "./useLogin";
import Image from "next/image";
import Link from "next/link";
import { cn } from "../../../../utils/cn";

const Login: React.FC = () => {
  const {
    isVisible,
    toggleVisibility,
    control,
    handleSubmit,
    handleLogin,
    isPendingLogin,
    errors,
    handleResendActivation,
    isResending,
    lastAttemptedEmail,
  } = useLogin();

  return (
    <div className="flex w-full flex-col items-center justify-center gap-6 px-4 lg:flex-row lg:gap-20">
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors">
        <FaArrowLeft />
        <span>Kembali ke Homepage</span>
      </Link>
      
      <div className="hidden w-full max-w-[600px] items-center justify-center lg:flex">
        <Image
          src="/images/illustrations/login.svg"
          alt="login"
          className="w-full"
          width={600}
          height={600}
          priority
        />
      </div>
      <Card className="w-full max-w-[380px]">
        <CardBody className="p-8">
          <h2 className="text-2xl font-bold text-blue-500">Login</h2>
          <p className="mb-4 mt-2 text-small">
            Belum punya akun?&nbsp;
            <Link href="/auth/register" className="font-semibold text-blue-500">
              Register Disini
            </Link>
          </p>
          {errors.root && (
            <div className="mb-4 rounded-lg bg-danger-50 p-4">
              <p className="text-sm text-danger">
                {errors.root.message}
                {errors.root.message?.includes("Akun belum diaktivasi") && lastAttemptedEmail && (
                  <Button
                    className="ml-2 h-auto min-w-0 bg-transparent p-0 text-sm font-semibold text-blue-500 hover:text-blue-600"
                    onClick={() => handleResendActivation(lastAttemptedEmail)}
                    isDisabled={isResending}
                    isLoading={isResending}
                    size="sm"
                    variant="light"
                  >
                    Kirim ulang email aktivasi
                  </Button>
                )}
              </p>
            </div>
          )}
          <form
            className={cn(
              "flex w-full flex-col",
              Object.keys(errors).length > 0 ? "gap-2" : "gap-4"
            )}
            onSubmit={handleSubmit(handleLogin)}
          >
            <Controller
              name="identifier"
              control={control}
              defaultValue=""
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  type="text"
                  label="Email / Username"
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
              defaultValue=""
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  type={isVisible ? "text" : "password"}
                  label="Password"
                  variant="bordered"
                  autoComplete="off"
                  isInvalid={Boolean(fieldState.error)}
                  errorMessage={fieldState.error?.message}
                  endContent={
                    <button
                      className="focus:outline-none"
                      type="button"
                      onClick={toggleVisibility}
                    >
                      {isVisible ? (
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
              isLoading={isPendingLogin}
            >
              Login
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};

export default Login;
