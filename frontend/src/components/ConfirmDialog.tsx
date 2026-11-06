import { Loader2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { BTN_PERIGO, BTN_PRIMARIO, BTN_SECUNDARIO } from "@/components/estilos";

/** Confirmação para ações importantes (ativar, inativar, cancelar, excluir...). */
export function ConfirmDialog({
  aberto,
  titulo,
  mensagem,
  textoConfirmar = "Confirmar",
  perigo = false,
  carregando = false,
  aoConfirmar,
  aoCancelar,
}: {
  aberto: boolean;
  titulo: string;
  mensagem: React.ReactNode;
  textoConfirmar?: string;
  perigo?: boolean;
  carregando?: boolean;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}) {
  return (
    <Modal
      aberto={aberto}
      aoFechar={() => !carregando && aoCancelar()}
      titulo={titulo}
      descricao={mensagem}
      largura="md"
      rodape={
        <>
          <button className={BTN_SECUNDARIO} onClick={aoCancelar} disabled={carregando}>
            Cancelar
          </button>
          <button className={perigo ? BTN_PERIGO : BTN_PRIMARIO} onClick={aoConfirmar} disabled={carregando}>
            {carregando && <Loader2 size={14} className="animate-spin" />}
            {textoConfirmar}
          </button>
        </>
      }
    />
  );
}