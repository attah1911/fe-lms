import React from "react";
import { Button } from "@nextui-org/react";
import { signOut } from "next-auth/react";
import { CiLogout } from "react-icons/ci";

const LogoutButton: React.FC = () => {
  const handleLogout = async () => {
    await signOut({ 
      callbackUrl: '/auth/login',
      redirect: true 
    });
  };

  return (
    <Button
      color="danger"
      fullWidth
      variant="light"
      className="flex justify-start rounded-lg px-2 py-1.5 transition-colors hover:bg-danger-100"
      size="lg"
      onClick={handleLogout}
    >
      <CiLogout />
      Logout
    </Button>
  );
};

export default LogoutButton;
