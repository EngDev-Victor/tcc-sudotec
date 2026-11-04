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

// ---------- CPF, telefone e data de nascimento ----------

const apenasDigitos = (valor) => valor.replace(/\D/g, '');

function cpfValido(cpf) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;

  const digito = (base) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * (base.length + 1 - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return (
    digito(cpf.slice(0, 9)) === Number(cpf[9]) &&
    digito(cpf.slice(0, 10)) === Number(cpf[10])
  );
}

function telefoneValido(telefone) {
  if (!/^\d{10,11}$/.test(telefone)) return false;
  if (!/^[1-9][1-9]/.test(telefone)) return false; // DDD
  if (telefone.length === 11 && telefone[2] !== '9') return false; // celular começa com 9
  return true;
}

// Aceita com ou sem máscara e guarda só os dígitos
const cpfCampo = () =>
  z
    .string({ required_error: OBRIGATORIO, invalid_type_error: 'Deve ser um texto.' })
    .transform(apenasDigitos)
    .refine(cpfValido, 'CPF inválido.');

const telefoneCampo = () =>
  z
    .string({ required_error: OBRIGATORIO, invalid_type_error: 'Deve ser um texto.' })
    .transform(apenasDigitos)
    .refine(telefoneValido, 'Telefone inválido. Informe DDD + número (10 ou 11 dígitos).');

// Entra como AAAA-MM-DD e sai como Date (UTC), que é o que o Prisma espera
const dataNascimentoCampo = () =>
  z
    .string({ required_error: OBRIGATORIO, invalid_type_error: 'Deve ser um texto no formato AAAA-MM-DD.' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD.')
    .refine((valor) => {
      const d = new Date(`${valor}T00:00:00.000Z`);
      return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === valor;
    }, 'Data inválida.')
    .refine(
      (valor) => valor <= new Date().toISOString().slice(0, 10),
      'A data de nascimento não pode estar no futuro.'
    )
    .refine((valor) => valor >= '1900-01-01', 'Data de nascimento anterior a 1900.')
    .transform((valor) => new Date(`${valor}T00:00:00.000Z`));

// ---------- Entidades ----------

const alunoBase = z.object({
  nome: texto(120),
  email: email(),
  matricula: texto(30),
  cpf: cpfCampo(),
  dataNascimento: dataNascimentoCampo(),
  nomeResponsavel: texto(120),
  telefone: telefoneCampo(),
});

const TITULACOES = ['GRADUACAO', 'ESPECIALIZACAO', 'MESTRADO', 'DOUTORADO'];

const professorBase = z.object({
  nome: texto(120),
  email: email(),
  especialidade: texto(80),
  telefone: telefoneCampo(),
  titulacao: z.enum(TITULACOES, {
    errorMap: () => ({ message: `Titulação inválida. Use: ${TITULACOES.join(', ')}.` }),
  }),
  disciplinaPrincipalId: idRef.nullable().optional(),
});

const disciplinaBase = z.object({
  nome: texto(80),
  cargaHoraria: z
    .number({ required_error: OBRIGATORIO, invalid_type_error: 'Deve ser um número inteiro.' })
    .int('Deve ser um número inteiro.')
    .positive('Deve ser maior que zero.')
    .max(2000, 'Máximo de 2000 horas.'),
});

const TURNOS = ['MANHA', 'TARDE'];

const turmaBase = z.object({
  nome: texto(40),
  anoLetivoId: idRef,
  turno: z.enum(TURNOS, {
    errorMap: () => ({ message: `Turno inválido. Use: ${TURNOS.join(', ')}.` }),
  }),
  sala: texto(30),
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

    ativo: z.object({
    ativo: z.boolean({ required_error: OBRIGATORIO, invalid_type_error: 'Deve ser true ou false.' }),
  }),

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