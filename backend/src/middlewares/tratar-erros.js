// Mensagens para campos únicos do schema (chave = campos em ordem, separados por vírgula)
const MENSAGENS_DUPLICIDADE = {
  cpf: 'Já existe um aluno com esse CPF.',
  matricula: 'Já existe um aluno com esse número de matrícula.',
  ano: 'Já existe um ano letivo com esse ano.',
  usuarioId: 'Esse usuário já está vinculado a outro cadastro.',
  'nome,anoLetivoId': 'Já existe uma turma com esse nome neste ano letivo.',
  'professorId,turmaId,disciplinaId': 'Esse professor já está alocado nessa turma para essa disciplina.',
};

const DONO_DO_EMAIL = { Usuario: 'um usuário', Aluno: 'um aluno', Professor: 'um professor' };

// O Prisma 7 com adaptador informa o campo de formas diferentes; tenta todas
function lerDuplicidade(error) {
  const meta = error.meta || {};
  const causa = meta.driverAdapterError?.cause || {};
  const texto = `${causa.originalMessage || ''} ${error.message || ''}`;
  let campos = meta.target ?? causa.constraint?.fields;

  if (typeof campos === 'string') {
    // Nome de índice, ex.: "Aluno_cpf_key" ou "Turma_nome_anoLetivoId_key"
    campos = /_key$/.test(campos)
      ? campos.replace(/^[A-Za-z]+_/, '').replace(/_key$/, '').split('_')
      : [campos];
  }

  if (!Array.isArray(campos) || campos.length === 0) {
    const sqlite = texto.match(/UNIQUE constraint failed: ([\w.,\s]+)/i);
    const prisma = texto.match(/fields?: \(([^)]+)\)/i);
    if (sqlite) campos = sqlite[1].split(',').map((c) => c.trim().split('.').pop());
    else if (prisma) campos = prisma[1].split(',').map((c) => c.replace(/[`"\s]/g, ''));
    else campos = [];
  }

  const modelo = meta.modelName || texto.match(/UNIQUE constraint failed: (\w+)\./i)?.[1];
  return { campos: campos.map(String).filter(Boolean), modelo };
}

function mensagemDuplicidade({ campos, modelo }) {
  if (campos.length === 1 && campos[0] === 'email') {
    return `Já existe ${DONO_DO_EMAIL[modelo] || 'um cadastro'} com esse e-mail.`;
  }
  return MENSAGENS_DUPLICIDADE[campos.join(',')] || 'Já existe um registro com esse valor único.';
}

export function tratarErros(error, req, res, next) {
  // JSON malformado no corpo da requisição
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido no corpo da requisição.' });
  }

  if (error.status) {
    const corpo = { error: error.message };
    if (error.detalhes) corpo.detalhes = error.detalhes;
    return res.status(error.status).json(corpo);
  }

  if (error.code === 'P2002') {
    const duplicidade = lerDuplicidade(error);
    const corpo = { error: mensagemDuplicidade(duplicidade) };
    if (duplicidade.campos.length) corpo.campos = duplicidade.campos;
    return res.status(409).json(corpo);
  }

  if (error.code === 'P2025') {
    return res.status(404).json({ error: 'Registro não encontrado.' });
  }

  if (error.code === 'P2003') {
    return res.status(409).json({
      error: 'Operação bloqueada: referência inválida ou registro com vínculos.',
    });
  }

  console.error(error);
  return res.status(500).json({ error: 'Erro interno do servidor.' });
}