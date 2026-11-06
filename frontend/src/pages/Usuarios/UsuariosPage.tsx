import { useCallback, useEffect, useState } from "react";
import { Plus, Power, Loader2, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { AvatarIcon } from "@/components/AvatarIcon";
import { Badge, type TomBadge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FiltroSituacao, type Situacao } from "@/components/FiltroSituacao";
import { PageHeader } from "@/components/PageHeader";
import { SearchInput } from "@/components/SearchInput";
import { BTN_PRIMARIO } from "@/components/estilos";
import { useAuth } from "@/contexts/AuthContext";
import { alterarAtivoUsuario, listarUsuarios } from "@/services/usuarios";
import type { Usuario } from "@/types/entidades";
import { PAPEIS, ROTULO_PAPEL, type Papel } from "@/types/enums";
import { mensagemDeErro } from "@/utils/erros";
import { formatarData } from "@/utils/formatacao";
import { normalizar } from "@/utils/texto";
import { NovoUsuarioModal } from "@/pages/Usuarios/NovoUsuarioModal";

const TOM_PAPEL: Record<Papel, TomBadge> = {
  GESTOR: "azul",
  PROFESSOR: "verde",
  ALUNO: "cinza",
  RESPONSAVEL: "ambar",
};

export function UsuariosPage() {
  const { usuario: logado } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [busca, setBusca] = useState("");
  const [papel, setPapel] = useState<Papel | "">("");
  const [situacao, setSituacao] = useState<Situacao>("todas");

  const [novoAberto, setNovoAberto] = useState(false);
  const [paraDesativar, setParaDesativar] = useState<Usuario | null>(null);
  const [processando, setProcessando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setUsuarios(await listarUsuarios());
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Lista simples (sem paginação nem filtros na API): filtra aqui
  const termo = normalizar(busca.trim());
  const filtrados = usuarios.filter(
    (u) =>
      (!termo || normalizar(u.nome).includes(termo) || u.email.includes(termo)) &&
      (!papel || u.papel === papel) &&
      (situacao === "todas" || u.ativo === (situacao === "ativas")),
  );

  async function ativar(u: Usuario) {
    try {
      await alterarAtivoUsuario(u.id, true);
      toast.success(`Conta de ${u.nome} ativada.`);
      await carregar();
    } catch (e) {
      toast.error(mensagemDeErro(e));
    }
  }

  async function confirmarDesativacao() {
    if (!paraDesativar) return;
    setProcessando(true);
    try {
      await alterarAtivoUsuario(paraDesativar.id, false);
      toast.success(`Conta de ${paraDesativar.nome} desativada.`);
      setParaDesativar(null);
      await carregar();
    } catch (e) {
      toast.error(mensagemDeErro(e));
      setParaDesativar(null);
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Contas de Acesso"
        subtitle={carregando ? "Carregando..." : `${usuarios.length} conta${usuarios.length !== 1 ? "s" : ""} cadastrada${usuarios.length !== 1 ? "s" : ""}`}
        actions={
          <button className={BTN_PRIMARIO} onClick={() => setNovoAberto(true)}>
            <Plus size={14} />
            Nova Conta
          </button>
        }
      />

      <div className="flex items-start gap-3 bg-sky-50 border border-sky-200 rounded-xl p-4 mb-6">
        <Info size={16} className="text-sky-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-sky-800 font-medium leading-relaxed">
          Contas de acesso são os logins do sistema e não estão ligadas aos cadastros de alunos e professores.
          Neste MVP, só contas com papel <strong>Gestor</strong> entram no sistema. Desativar uma conta derruba o
          acesso na hora, inclusive de quem já estiver logado.
        </p>
      </div>

      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium flex-1">{erro}</p>
          <button onClick={carregar} className="text-xs font-bold text-red-700 hover:underline">
            Tentar novamente
          </button>
        </div>
      )}

      <Card>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <SearchInput value={busca} onChange={setBusca} placeholder="Buscar por nome ou e-mail..." />
            <select
              value={papel}
              onChange={(e) => setPapel(e.target.value as Papel | "")}
              className="px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0D2C3A]/20 focus:border-[#0D2C3A]"
              aria-label="Papel"
            >
              <option value="">Todos os papéis</option>
              {PAPEIS.map((p) => (
                <option key={p} value={p}>
                  {ROTULO_PAPEL[p]}
                </option>
              ))}
            </select>
          </div>
          <FiltroSituacao valor={situacao} onChange={setSituacao} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-[#F8FAFB]">
                {["Usuário", "Papel", "Situação", "Criada em", "Ações"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {carregando && usuarios.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    <Loader2 size={16} className="inline animate-spin mr-2" />
                    Carregando...
                  </td>
                </tr>
              )}
              {!carregando && filtrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    Nenhuma conta encontrada com esses filtros.
                  </td>
                </tr>
              )}
              {filtrados.map((u) => {
                const souEu = u.id === logado?.id;
                return (
                  <tr key={u.id} className="hover:bg-[#F8FAFB] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <AvatarIcon name={u.nome} size="sm" bg={u.ativo ? "bg-[#0D2C3A]" : "bg-gray-400"} />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground">
                            {u.nome}
                            {souEu && <span className="ml-2 text-xs font-semibold text-sky-600">(você)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tom={TOM_PAPEL[u.papel]}>{ROTULO_PAPEL[u.papel]}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tom={u.ativo ? "verde" : "vermelho"}>{u.ativo ? "Ativa" : "Desativada"}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{formatarData(u.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      {u.ativo ? (
                        <button
                          onClick={() => setParaDesativar(u)}
                          disabled={souEu}
                          title={souEu ? "Você não pode desativar a própria conta." : "Desativar conta"}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Power size={12} />
                          Desativar
                        </button>
                      ) : (
                        <button
                          onClick={() => ativar(u)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
                        >
                          <Power size={12} />
                          Ativar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <NovoUsuarioModal
        aberto={novoAberto}
        aoFechar={() => setNovoAberto(false)}
        aoSalvar={() => {
          setNovoAberto(false);
          carregar();
        }}
      />

      <ConfirmDialog
        aberto={paraDesativar !== null}
        titulo={`Desativar a conta de ${paraDesativar?.nome ?? ""}?`}
        mensagem="O acesso cai na hora: os logins já feitos com essa conta deixam de funcionar. Você pode ativá-la de novo depois."
        textoConfirmar="Desativar"
        perigo
        carregando={processando}
        aoConfirmar={confirmarDesativacao}
        aoCancelar={() => setParaDesativar(null)}
      />
    </div>
  );
}