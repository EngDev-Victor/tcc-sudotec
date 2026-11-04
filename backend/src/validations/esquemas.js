import { z } from 'zod';

const OBRIGATORIO = 'Campo obrigatório.';

const texto = (max = 120) =>
  z
    .string({ required_error: OBRIGATORIO, invalid_type_error: 'Deve ser um texto.' })
    .trim()
    .min(1, 'Não pode ficar vazio.')
    .max(max, `Máximo de ${max} caracteres.`);

const email = () =>
  z
    .string({ required_error: OBRIGATORIO, invalid_type_error: 'Deve ser um texto.' })
    .trim()
    .toLowerCase()
    .email('E-mail inválido.')
    .max(160, 'Máximo de 160 caracteres.');

// IDs de referência: precisam vir como número inteiro positivo
const idRef = z
  .number({ required_error: OBRIGATORIO, invalid_type_error: 'Deve ser um número inteiro.' })
  .int('Deve ser um número inteiro.')
  .positive('Deve ser maior que zero.');

const data = z
  .string({ required_error: OBRIGATORIO, invalid_type_error: 'Deve ser um texto no formato AAAA-MM-DD.' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD.')
  .refine((valor) => !Number.isNaN(Date.parse(valor)), 'Data inválida.');

// Na atualização todos os campos viram opcionais, mas é preciso mandar ao menos um
const atualizacao = (base) =>
  base
    .partial()
    .refine((dados) => Object.keys(dados).length > 0, {
      message: 'Informe ao menos um campo para atualizar.',
    });

const alunoBase = z.object({
  nome: texto(120),
  email: email(),
  matricula: texto(30),
});

const professorBase = z.object({
  nome: texto(120),
  email: email(),
  especialidade: texto(80),
});

const disciplinaBase = z.object({
  nome: texto(80),
  cargaHoraria: z
    .number({ required_error: OBRIGATORIO, invalid_type_error: 'Deve ser um número inteiro.' })
    .int('Deve ser um número inteiro.')
    .positive('Deve ser maior que zero.')
    .max(2000, 'Máximo de 2000 horas.'),
});

const turmaBase = z.object({
  nome: texto(40),
  anoLetivoId: idRef,
});

const alocacaoBase = z.object({
  professorId: idRef,
  turmaId: idRef,
  disciplinaId: idRef,
});

const anoLetivoBase = z.object({
  ano: z
    .number({ required_error: OBRIGATORIO, invalid_type_error: 'Deve ser um número inteiro.' })
    .int('Deve ser um número inteiro.')
    .min(2000, 'Ano mínimo: 2000.')
    .max(2100, 'Ano máximo: 2100.'),
  dataInicio: data,
  dataFim: data,
});

const PAPEIS = ['GESTOR', 'PROFESSOR', 'ALUNO', 'RESPONSAVEL'];

export const esquemas = {
  login: z.object({
    email: z
      .string({ required_error: OBRIGATORIO, invalid_type_error: 'Deve ser um texto.' })
      .trim()
      .toLowerCase()
      .min(1, 'Não pode ficar vazio.'),
    senha: z
      .string({ required_error: OBRIGATORIO, invalid_type_error: 'Deve ser um texto.' })
      .min(1, 'Não pode ficar vazio.'),
  }),

  usuario: {
    criar: z.object({
      nome: texto(120),
      email: email(),
      senha: z
        .string({ required_error: OBRIGATORIO, invalid_type_error: 'Deve ser um texto.' })
        .min(8, 'A senha deve ter no mínimo 8 caracteres.')
        .max(72, 'A senha deve ter no máximo 72 caracteres.'),
      papel: z.enum(PAPEIS, {
        errorMap: () => ({ message: `Papel inválido. Use: ${PAPEIS.join(', ')}.` }),
      }),
    }),
    ativo: z.object({
      ativo: z.boolean({ required_error: OBRIGATORIO, invalid_type_error: 'Deve ser true ou false.' }),
    }),
  },

  aluno: { criar: alunoBase, atualizar: atualizacao(alunoBase) },
  professor: { criar: professorBase, atualizar: atualizacao(professorBase) },
  disciplina: { criar: disciplinaBase, atualizar: atualizacao(disciplinaBase) },
  turma: { criar: turmaBase, atualizar: atualizacao(turmaBase) },
  alocacao: { criar: alocacaoBase, atualizar: atualizacao(alocacaoBase) },

  anoLetivo: {
    criar: anoLetivoBase.refine((d) => new Date(d.dataFim) > new Date(d.dataInicio), {
      message: 'A data de fim deve ser posterior à data de início.',
      path: ['dataFim'],
    }),
    atualizar: atualizacao(anoLetivoBase),
  },

  matricula: {
    criar: z.object({ alunoId: idRef, turmaId: idRef }),
    transferir: z.object({ turmaDestinoId: idRef }),
  },
};