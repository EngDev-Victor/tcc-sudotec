import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/contexts/AuthContext";
import { TelaCarregando } from "@/components/TelaCarregando";

/** Libera as rotas filhas só para gestor autenticado; senão, manda para /login. */
export function RotaProtegida() {
  const { usuario, carregando } = useAuth();
  const location = useLocation();

  if (carregando) return <TelaCarregando />;
  if (!usuario) return <Navigate to="/login" replace state={{ de: location.pathname + location.search }} />;
  return <Outlet />;
}