import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", lazy: async () => ({ Component: (await import("./pages/Dashboard")).Dashboard }) },
      { path: "market", element: <Navigate to="/charts" replace /> },
      { path: "charts", lazy: async () => ({ Component: (await import("./pages/Charts")).default }) },
      { path: "dex", element: <Navigate to="/charts?tab=dex" replace /> },
      { path: "groups", lazy: async () => ({ Component: (await import("./pages/Groups")).Groups }) },
      { path: "community", lazy: async () => ({ Component: (await import("./pages/Community")).Community }) },
      { path: "settings", lazy: async () => ({ Component: (await import("./pages/Settings")).default }) },
      { path: "public-groups", lazy: async () => ({ Component: (await import("./pages/PublicGroups")).default }) },
      { path: "exchanges", lazy: async () => ({ Component: (await import("./pages/Exchanges")).default }) },
      { path: "profile", lazy: async () => ({ Component: (await import("./pages/Profile")).Profile }) },
      { path: "profile/:username", lazy: async () => ({ Component: (await import("./pages/Profile")).Profile }) },
      { path: "coin/:symbol", lazy: async () => ({ Component: (await import("./pages/CoinDetails")).default }) },
    ],
  },
]);
