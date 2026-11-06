import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { AvatarIcon } from "@/components/AvatarIcon";
import { useDebounce } from "@/hooks/useDebounce";
import { listarAlunos } from "@/services/alunos";
import type { Aluno } from "@/types/entidades";

/**
 * Campo de busca de aluno pelo nome (GET /alunos?busca=), com sugestões abaixo.
 * Ao escolher um aluno, chama onEscolher e limpa o campo.
 */
export function BuscaAluno({
  onEscolher,
  somenteAtivos = false,
  placeholder = "Buscar aluno pelo nome...",
  erro,
  className = "w-full",
  disabled,
}: {
  onEscolher: (aluno: Aluno) => void;
  somenteAtivos?: boolean;
  placeholder?: string;
  erro?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [busca, setBusca] = useState("");
  const buscaAtrasada = useDebounce(busca.trim(), 300);
  const [sugestoes, setSugestoes] = useState<Aluno[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [buscou, setBuscou] = useState(false);

  useEffect(() => {
    if (buscaAtrasada.length < 2) {
      setSugestoes([]);
      setBuscou(false);
      return;
    }
    let atual = true;
    setBuscando(true);
    listarAlunos({ busca: buscaAtrasada, ativo: somenteAtivos ? true : undefined, limite: 8 })
      .then((r) => atual && setSugestoes(r.dados))
      .catch(() => atual && setSugestoes([]))
      .finally(() => {
        if (atual) {
          setBuscando(false);
          setBuscou(true);
        }
      });
    return () => {
      atual = false;
    };
  }, [buscaAtrasada, somenteAtivos]);

  const escolher = (a: Aluno) => {
    onEscolher(a);
    setBusca("");
    setSugestoes([]);
    setBuscou(false);
  };

  return (
    <div className={`relative ${className}`}>
      <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 transition-all ${
          erro ? "border-red-400 focus:ring-red-200" : "border-border focus:ring-[#0D2C3A]/20 focus:border-[#0D2C3A]"
        }`}
      />
      {busca.trim().length >= 2 && (buscando || buscou) && (
        <div className="absolute z-20 mt-1 w-full min-w-64 bg-white border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {buscando && sugestoes.length === 0 && <p className="px-3 py-2.5 text-xs text-muted-foreground">Buscando...</p>}
          {!buscando && sugestoes.length === 0 && (
            <p className="px-3 py-2.5 text-xs text-muted-foreground">
              Nenhum aluno{somenteAtivos ? " ativo" : ""} encontrado.
            </p>
          )}
          {sugestoes.map((s) => (
            <button
              type="button"
              key={s.id}
              onClick={() => escolher(s)}
              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[#F8FAFB] transition-colors"
            >
              <AvatarIcon name={s.nome} size="sm" bg={s.ativo ? "bg-[#0D2C3A]" : "bg-gray-400"} />
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{s.nome}</p>
                <p className="text-xs text-muted-foreground">
                  Matrícula {s.matricula}
                  {s.ativo ? "" : " • inativo"}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}