import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import authServices from "../services/auth.service";
import { IProfile } from "../types/Profile";

// Shared query for GET /auth/me. Every dashboard (and the settings pages) needs
// the current user's profile — this keeps it to one request, cached across navigation.
export const useProfile = () => {
  const { data: session } = useSession();
  const query = useQuery({
    queryKey: ["profile"],
    queryFn: async () => (await authServices.getProfile()).data.data as IProfile,
    enabled: !!session?.user,
  });
  return { profile: query.data ?? null, isProfileLoading: query.isLoading };
};
