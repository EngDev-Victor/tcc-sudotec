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
    return res.status(409).json({ error: 'Já existe um registro com esse valor único.' });
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