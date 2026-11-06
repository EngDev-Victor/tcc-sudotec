import { BrowserRouter } from "react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppRoutes } from "@/routes/AppRoutes";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" richColors closeButton theme="light" />
      </AuthProvider>
    </BrowserRouter>
  );
}