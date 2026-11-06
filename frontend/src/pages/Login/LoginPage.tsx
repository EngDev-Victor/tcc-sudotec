import { useState } from "react";
import {
  AlertCircle, Lock, Mail, Check,
} from "lucide-react";
import { AuthLeftPanel } from "@/components/AuthLeftPanel";
import { SkollaLogo } from "@/components/SkollaLogo";

export function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Credenciais de demonstração — substituídas pelo login real (POST /auth/login) na etapa de autenticação
  const DEMO = { email: "admin@skolla.edu.br", password: "admin123", label: "Gestor" };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === DEMO.email && password === DEMO.password) {
      onLogin();
    } else {
      setError("E-mail ou senha incorretos. Use as credenciais de demonstração abaixo.");
      setTimeout(() => setError(""), 4500);
    }
  };

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

          {/* Demo hint */}
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 mb-5 flex gap-3">
            <div className="w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check size={11} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-sky-800 mb-0.5">
                Credenciais — {DEMO.label}
              </p>
              <p className="text-xs text-sky-700 font-mono">{DEMO.email}</p>
              <p className="text-xs text-sky-700 font-mono">{DEMO.password}</p>
            </div>
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
                  placeholder={DEMO.email}
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0D2C3A]/20 focus:border-[#0D2C3A] transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertCircle
                  size={14}
                  className="text-red-500 flex-shrink-0 mt-0.5"
                />
                <p className="text-xs text-red-700 font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-[#0D2C3A] text-white rounded-xl font-bold text-sm hover:bg-[#1A4A60] transition-colors mt-1"
            >
              Entrar na plataforma
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}