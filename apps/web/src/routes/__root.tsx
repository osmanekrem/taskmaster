import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import type { trpc } from "@/utils/trpc";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  HeadContent,
  Outlet,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import "tanstack-shadcn-table/dist/styles.css";
import "../index.css";
import { authQueries } from "@/lib/queries";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";

export interface RouterAppContext {
  trpc: typeof trpc;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  beforeLoad: async ({ context }) => {
    const { data: userSession } = await context.queryClient.fetchQuery(
      authQueries.user()
    );

    return { userSession };
  },
  component: RootComponent,
  head: () => ({
    meta: [
      {
        title: "my-better-t-app",
      },
      {
        name: "description",
        content: "my-better-t-app is a web application",
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/favicon.ico",
      },
    ],
  }),
});

function RootComponent() {
  return (
    <NuqsAdapter>
      <HeadContent />
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        disableTransitionOnChange
        storageKey="vite-ui-theme"
      >
        <div className="antialiased w-full h-svh">
          <Outlet />
        </div>
        <Toaster richColors />
      </ThemeProvider>
      <TanStackRouterDevtools position="bottom-left" />
      <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
    </NuqsAdapter>
  );
}
