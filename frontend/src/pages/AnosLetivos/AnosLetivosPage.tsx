import { useCallback, useEffect, useState } from "react";
import { Plus, Edit, Trash2, Power, Loader2, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";
import { Badge, type TomBadge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/PageHeader";
import { BTN_ICONE, BTN_PRIMARIO } from "@/components/estilos";
import { ativarAnoLetivo, excluirAnoLetivo, listarAnosLetivos } from "@/services/anosLetivos";
import type { AnoLetivoListagem } from "@/types/entidades";
import { mensagemDeErro } from "@/utils/erros";
import { formatarData } from "@/utils/formatacao";
import { AnoLetivoFormModal } from "@/pages/AnosLetivos/AnoLetivoFormModal";

/**
 * Situação em relação ao ano ativo (contrato 6.4, "Ano letivo encerrado"):
 * anterior ao ativo = encerrado; posterior = futuro (aceita rematrícula antecipada).
 */
function situacao(a: AnoLetivoListagem, anoAtivo: number | null): { tom: TomBadge; texto: string } {
  if (a.ativo) return { tom: "verde", texto: "Ativo" };
  if (anoAtivo === null) return { tom: "ambar", texto: "Inativo" };
  if (a.ano < anoAtivo) return { tom: "cinza", texto: "Encerrado" };
  return { tom: "azul", texto: "Futuro" };
}

/** Registros antigos podem ter o período fora do ano (a regra foi criada depois). */
function periodoForaDoAno(a: AnoLetivoListagem): boolean {
  return Number(a.dataInicio.slice(0, 4)) !== a.ano || Number(a.dataFim.slice(0, 4)) !== a.ano;
}

export function AnosLetivosPage() {
  const [anos, setAnos] = useState<AnoLetivoListagem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<AnoLetivoListagem | null>(null);
  const [paraAtivar, setParaAtivar] = useState<AnoLetivoListagem | null>(null);
  const [paraExcluir, setParaExcluir] = useState<AnoLetivoListagem | null>(null);
  const [processando, setProcessando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setAnos(await listarAnosLetivos());
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const ativo = anos.find((a) => a.ativo) ?? null;

  async function confirmarAtivacao() {
    if (!paraAtivar) return;
    setProcessando(true);
    try {
      await ativarAnoLetivo(paraAtivar.id);
      toast.success(`Ano letivo ${paraAtivar.ano} ativado.`);
      setParaAtivar(null);
      await carregar();
    } catch (e) {
      toast.error(mensagemDeErro(e));
    } finally {
      setProcessando(false);
    }
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return;
    setProcessando(true);
    try {
      await excluirAnoLetivo(paraExcluir.id);
      toast.success(`Ano letivo ${paraExcluir.ano} excluído.`);
      setParaExcluir(null);
      await carregar();
    } catch (e) {
      // 409: ano ativo ou com turmas — a mensagem da API explica o motivo
      toast.error(mensagemDeErro(e));
      setParaExcluir(null);
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Anos Letivos"
        subtitle={
          carregando
            ? "Carregando..."
            : `${anos.length} ano${anos.length !== 1 ? "s" : ""} cadastrado${anos.length !== 1 ? "s" : ""}` +
              (ativo ? ` • ${ativo.ano} ativo` : " • nenhum ativo")
        }
        actions={
          <button
            className={BTN_PRIMARIO}
            onClick={() => {
              setEditando(null);
              setFormAberto(true);
            }}
          >
            <Plus size={14} />
            Novo Ano Letivo
          </button>
        }
      />

      <div className="flex items-start gap-3 bg-sky-50 border border-sky-200 rounded-xl p-4 mb-6">
        <Info size={16} className="text-sky-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-sky-800 font-medium leading-relaxed">
          Só um ano letivo fica ativo por vez. Ao ativar um ano, os anteriores passam a ser considerados
          <strong> encerrados</strong> e deixam de aceitar matrículas. Anos <strong>futuros</strong> aceitam
          rematrícula antecipada. A data de término é apenas informativa: o ano só é encerrado quando o próximo
          for ativado.
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-[#F8FAFB]">
                {["Ano", "Período", "Turmas", "Situação", "Ações"].map((h) => (
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
              {carregando && anos.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    <Loader2 size={16} className="inline animate-spin mr-2" />
                    Carregando...
                  </td>
                </tr>
              )}
              {!carregando && !erro && anos.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    Nenhum ano letivo cadastrado.
                  </td>
                </tr>
              )}
              {anos.map((a) => {
                const s = situacao(a, ativo?.ano ?? null);
                return (
                  <tr key={a.id} className="hover:bg-[#F8FAFB] transition-colors">
                    <td className="px-5 py-3.5 text-sm font-black text-foreground">{a.ano}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        {formatarData(a.dataInicio)} a {formatarData(a.dataFim)}
                        {periodoForaDoAno(a) && (
                          <span title={`O período não pertence ao ano ${a.ano}. Corrija em "Editar".`}>
                            <AlertTriangle size={14} className="text-amber-500" />
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-bold text-foreground">{a._count.turmas}</td>
                    <td className="px-5 py-3.5">
                      <Badge tom={s.tom}>{s.texto}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        {!a.ativo && (
                          <button
                            onClick={() => setParaAtivar(a)}
                            className="flex items-center gap-1.5 px-2.5 py-1 mr-1 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            <Power size={12} />
                            Ativar
                          </button>
                        )}
                        <button
                          title="Editar"
                          onClick={() => {
                            setEditando(a);
                            setFormAberto(true);
                          }}
                          className={BTN_ICONE}
                        >
                          <Edit size={14} className="text-muted-foreground" />
                        </button>
                        <button
                          title={a.ativo ? "O ano letivo ativo não pode ser excluído" : "Excluir"}
                          onClick={() => setParaExcluir(a)}
                          disabled={a.ativo}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={14} className="text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <AnoLetivoFormModal
        aberto={formAberto}
        anoLetivo={editando}
        aoFechar={() => setFormAberto(false)}
        aoSalvar={() => {
          setFormAberto(false);
          carregar();
        }}
      />

      <ConfirmDialog
        aberto={paraAtivar !== null}
        titulo={`Ativar o ano letivo ${paraAtivar?.ano ?? ""}?`}
        mensagem={
          ativo
            ? `O ano ${ativo.ano} será desativado. ${
                paraAtivar && paraAtivar.ano > ativo.ano
                  ? `Com isso, ${ativo.ano} passa a ser considerado encerrado e deixa de aceitar matrículas.`
                  : "Anos anteriores ao novo ano ativo passam a ser considerados encerrados."
              }`
            : "Ele passará a ser o ano letivo ativo do sistema."
        }
        textoConfirmar="Ativar"
        carregando={processando}
        aoConfirmar={confirmarAtivacao}
        aoCancelar={() => setParaAtivar(null)}
      />

      <ConfirmDialog
        aberto={paraExcluir !== null}
        titulo={`Excluir o ano letivo ${paraExcluir?.ano ?? ""}?`}
        mensagem="Esta ação não pode ser desfeita. Anos letivos com turmas não podem ser excluídos."
        textoConfirmar="Excluir"
        perigo
        carregando={processando}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setParaExcluir(null)}
      />
    </div>
  );
}