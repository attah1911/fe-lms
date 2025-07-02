import React from "react";
import { Card, CardBody, Avatar } from "@nextui-org/react";
import { UserExtended } from "../../../types/Auth";

interface UserProfileCardProps {
  user: UserExtended;
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({ user }) => {
  const formatRole = (role: string): string => {
    switch (role) {
      case "ADMIN":
        return "Administrator";
      case "GURU":
        return "Guru";
      case "MURID":
        return "Murid";
      default:
        return role;
    }
  };

  return (
    <Card className="border border-gray-200 shadow-sm w-full">
      <CardBody className="flex flex-row items-center gap-4 p-4 overflow-hidden">
        <div className="w-16 h-16 min-w-[4rem] flex-shrink-0">
          <Avatar 
            src={user.profilePicture}
            className="w-full h-full object-cover"
            showFallback
            name={user.fullName?.substring(0, 2) || "User"}
            size="lg"
            radius="full"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold mb-1 lg:text-xl truncate">{user.fullName}</h2>
          <p className="text-sm text-gray-500 mb-1 lg:text-sm truncate">{user.email}</p>
          <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full font-medium">
            {formatRole(user.role)}
          </span>
        </div>
      </CardBody>
    </Card>
  );
};

export default UserProfileCard; 
