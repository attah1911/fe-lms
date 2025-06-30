import "../styles/globals.css";
import { cn } from "../utils/cn";
import { NextUIProvider } from "@nextui-org/react";
import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import { Inter } from "next/font/google";
import SessionCheck from "../components/commons/SessionCheck/SessionCheck";
import PageLoading from "../components/commons/PageLoading/PageLoading";

const inter = Inter({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function AppContent({ Component, pageProps }: { Component: AppProps['Component'], pageProps: any }) {
  return (
      <NextUIProvider>
        <Toaster richColors position="top-right" />
      <main className={cn(inter.className)}>
        <SessionCheck />
        <PageLoading />
        <Component {...pageProps} />
      </main>
    </NextUIProvider>
  );
}

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  return (
    <SessionProvider
      session={session}
      refetchInterval={0}
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
    >
      <QueryClientProvider client={queryClient}>
        <AppContent Component={Component} pageProps={pageProps} />
      </QueryClientProvider>
    </SessionProvider>
  );
}
