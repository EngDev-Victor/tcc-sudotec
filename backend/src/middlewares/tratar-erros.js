export function tratarErros(error, req, res, next) {
  if (error.status) {
    return res.status(error.status).json({ error: error.message });
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