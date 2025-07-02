import environment from "../../../config/environment";
import NextAuth, { DefaultSession, NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { JWT } from "next-auth/jwt";
import { UserExtended } from "../../../types/Auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: UserExtended;
    accessToken?: string;
    error?: "TokenExpired";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    user: UserExtended;
    accessToken?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        identifier: { label: "identifier", type: "text" },
        password: { label: "password", type: "password" },
        userData: { label: "userData", type: "text" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.identifier || !credentials?.password || !credentials?.userData) {
            return null;
          }

          const userData = JSON.parse(credentials.userData);
          
          const user: UserExtended = {
            id: userData._id,
            _id: userData._id,
            email: userData.email,
            name: userData.fullName,
            fullName: userData.fullName,
            role: userData.role,
            isActive: userData.isActive,
            accessToken: credentials.password,
          };

          return user;
        } catch (error) {
          console.error('NextAuth authorize error:', error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
    signOut: '/auth/login',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.user = {
          ...user,
          role: (user as UserExtended).role
        } as UserExtended;
        token.accessToken = (user as UserExtended).accessToken;
      }

      if (trigger === "update" && session) {
        token.user = { 
          ...token.user, 
          ...session.user,
          role: token.user.role
        };
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...token.user,
          role: token.user.role
        };
        session.accessToken = token.accessToken;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) {
        if (url.includes('/api/auth/signout') || url.includes('/logout')) {
          return `${baseUrl}/auth/login`;
        }
        
        return `${baseUrl}${url}`;
      }
      
      if (url.startsWith(baseUrl)) {
        return url;
      }
      
      return baseUrl;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 12,
  },
  secret: environment.AUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions);
