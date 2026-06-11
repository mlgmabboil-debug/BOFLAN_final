import { lazy, Suspense } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { UserProvider, useUser } from "./context/UserContext";

const Onboarding = lazy(() =>
  import("./pages/Onboarding").then((mod) => ({ default: mod.Onboarding }))
);
const Web3ModalProvider = lazy(() =>
  import("./components/Web3Modal").then((mod) => ({ default: mod.Web3ModalProvider }))
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
    <Suspense fallback={<div className="min-h-screen bg-[#000000]" />}>
      <Web3ModalProvider>
        <RouterProvider router={router} />
      </Web3ModalProvider>
    </Suspense>
  );
}

export default function App() {
  return (
    <UserProvider>
      <AppInner />
    </UserProvider>
  );
}