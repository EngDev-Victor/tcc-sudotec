// Estado de autenticação da aplicação.
// - Ao abrir: se houver token salvo, valida com GET /auth/me
// - Só o papel GESTOR acessa este front-end (contrato, seção 6)
// - Qualquer 401 em requisição autenticada encerra a sessão

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ApiError, definirAoNaoAutorizado, obterToken, removerToken, salvarToken } from "@/services/api";
import { buscarUsuarioAtual, login } from "@/services/auth";
import type { UsuarioLogado } from "@/types/entidades";

const MSG_SOMENTE_GESTOR = "Este sistema é exclusivo para gestores. Sua conta não tem acesso a este módulo.";
const MSG_SESSAO_ENCERRADA = "Sua sessão foi encerrada. Faça login novamente.";

type AuthContextValor = {
  usuario: UsuarioLogado | null;
  /** true enquanto a sessão salva está sendo validada ao abrir a aplicação */
  carregando: boolean;
  /** Mensagem exibida na tela de login (sessão expirada, acesso negado...) */
  aviso: string | null;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => void;
};

const AuthContext = createContext<AuthContextValor | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioLogado | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);

  const encerrarSessao = useCallback((mensagem: string | null) => {
    removerToken();
    setUsuario(null);
    setAviso(mensagem);
  }, []);

  // 401 em qualquer requisição autenticada (token expirado, usuário desativado ou apagado)
  useEffect(() => {
    definirAoNaoAutorizado(() => encerrarSessao(MSG_SESSAO_ENCERRADA));
    return () => definirAoNaoAutorizado(null);
  }, [encerrarSessao]);

  // Validação da sessão salva
  useEffect(() => {
    let ativo = true;
    if (!obterToken()) {
      setCarregando(false);
      return;
    }
    buscarUsuarioAtual()
      .then((me) => {
        if (!ativo) return;
        if (me.papel !== "GESTOR") {
          encerrarSessao(MSG_SOMENTE_GESTOR);
          return;
        }
        setUsuario({ id: me.id, nome: me.nome, email: me.email, papel: me.papel });
      })
      .catch((erro) => {
        if (!ativo) return;
        // 401 já foi tratado pelo definirAoNaoAutorizado.
        // Servidor fora do ar (status 0): mantém o token para tentar de novo depois.
        if (erro instanceof ApiError && erro.status === 0) setAviso(erro.message);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [encerrarSessao]);

  const entrar = useCallback(async (email: string, senha: string) => {
    const { token, usuario: logado } = await login(email, senha);
    if (logado.papel !== "GESTOR") throw new Error(MSG_SOMENTE_GESTOR);
    salvarToken(token);
    setAviso(null);
    setUsuario(logado);
  }, []);

  const sair = useCallback(() => encerrarSessao(null), [encerrarSessao]);

  return (
    <AuthContext.Provider value={{ usuario, carregando, aviso, entrar, sair }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValor {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>.");
  return ctx;
}