import { useState } from "react";
import {
  AlertCircle, Lock, Mail, Loader2,
} from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { AuthLeftPanel } from "@/components/AuthLeftPanel";
import { SkollaLogo } from "@/components/SkollaLogo";
import { useAuth } from "@/contexts/AuthContext";
import { mensagemDeErro } from "@/utils/erros";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario, carregando, aviso, entrar } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Página que o usuário tentou abrir antes de ser mandado para o login
  const destino = (location.state as { de?: string } | null)?.de ?? "/dashboard";

  if (!carregando && usuario) return <Navigate to={destino} replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Informe o e-mail e a senha.");
      return;
    }
    setError("");
    setEnviando(true);
    try {
      await entrar(email.trim(), password);
      navigate(destino, { replace: true });
    } catch (erro) {
      setError(mensagemDeErro(erro));
      setPassword("");
    } finally {
      setEnviando(false);
    }
  };

  const mensagem = error || aviso;

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AuthLeftPanel
        title="A plataforma ideal para sua escola"
        subtitle="Alunos, professores, turmas e matrículas — organizados para escolas que ainda vivem de planilhas e grupos de WhatsApp."
      />
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <SkollaLogo />
          </div>
          <div className="mb-7">
            <h1 className="text-2xl font-black text-foreground">Bem-vindo de volta</h1>
            <p className="text-sm text-muted-foreground mt-1">Acesse sua conta SKOLLA</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@escola.com"
                  autoComplete="username"
                  disabled={enviando}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0D2C3A]/20 focus:border-[#0D2C3A] transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={enviando}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0D2C3A]/20 focus:border-[#0D2C3A] transition-all"
                />
              </div>
            </div>

            {mensagem && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertCircle
                  size={14}
                  className="text-red-500 flex-shrink-0 mt-0.5"
                />
                <p className="text-xs text-red-700 font-medium">{mensagem}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0D2C3A] text-white rounded-xl font-bold text-sm hover:bg-[#1A4A60] transition-colors mt-1 disabled:opacity-70 disabled:cursor-wait"
            >
              {enviando && <Loader2 size={15} className="animate-spin" />}
              {enviando ? "Entrando..." : "Entrar na plataforma"}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}