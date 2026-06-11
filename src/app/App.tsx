import { lazy, Suspense } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { UserProvider, useUser } from "./context/UserContext";
import { Web3ModalProvider } from "./components/Web3Modal";

const Onboarding = lazy(() =>
  import("./pages/Onboarding").then((mod) => ({ default: mod.Onboarding }))
);

function AppInner() {
  const { user } = useUser();

  // Показываем онбординг пока нет пользователя (ни гостя, ни зарегистрированного)
  if (!user) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#000000]" />}>
        <Onboarding />
      </Suspense>
    );
  }

  return (
    <Web3ModalProvider>
      <RouterProvider router={router} />
    </Web3ModalProvider>
  );
}

export default function App() {
  return (
    <UserProvider>
      <AppInner />
    </UserProvider>
  );
}