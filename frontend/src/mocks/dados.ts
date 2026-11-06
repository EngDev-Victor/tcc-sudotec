// Dados TEMPORÁRIOS do protótipo. Cada tela deixa de usar este arquivo quando for integrada à API.
// Quando nenhuma tela usar mais, este arquivo será removido.

export const STUDENTS = [
  { id: 1, name: "João Gabriel Silva", class: "9º Ano A", status: "ativo", freq: 92, email: "joao.silva@skolla.edu.br" },
  { id: 2, name: "Maria Clara Santos", class: "8º Ano B", status: "ativo", freq: 88, email: "maria.santos@skolla.edu.br" },
  { id: 3, name: "Pedro Henrique Oliveira", class: "7º Ano A", status: "ativo", freq: 76, email: "pedro.oliveira@skolla.edu.br" },
  { id: 4, name: "Ana Beatriz Costa", class: "9º Ano B", status: "ativo", freq: 95, email: "ana.costa@skolla.edu.br" },
  { id: 5, name: "Lucas Ferreira Lima", class: "8º Ano A", status: "inativo", freq: 60, email: "lucas.lima@skolla.edu.br" },
  { id: 6, name: "Isabella Rodrigues", class: "7º Ano B", status: "ativo", freq: 84, email: "isabella.rodrigues@skolla.edu.br" },
  { id: 7, name: "Matheus Alves Neto", class: "9º Ano A", status: "ativo", freq: 97, email: "matheus.alves@skolla.edu.br" },
  { id: 8, name: "Sophia Pereira Castro", class: "8º Ano B", status: "ativo", freq: 91, email: "sophia.castro@skolla.edu.br" },
];

export const TEACHERS = [
  { id: 1, name: "Carlos Eduardo Mendes", subject: "Matemática", classes: 4, status: "ativo", email: "carlos.mendes@skolla.edu.br", degree: "Mestre em Educação Matemática" },
  { id: 2, name: "Fernanda Lima Rocha", subject: "Português", classes: 5, status: "ativo", email: "fernanda.rocha@skolla.edu.br", degree: "Especialista em Linguística" },
  { id: 3, name: "Roberto Alves Neto", subject: "Ciências", classes: 3, status: "ativo", email: "roberto.neto@skolla.edu.br", degree: "Licenciado em Ciências Biológicas" },
  { id: 4, name: "Luciana Pereira Castro", subject: "História", classes: 4, status: "ativo", email: "luciana.castro@skolla.edu.br", degree: "Mestre em História Social" },
  { id: 5, name: "André Santos Moreira", subject: "Inglês", classes: 6, status: "ativo", email: "andre.moreira@skolla.edu.br", degree: "Certificado CELTA" },
  { id: 6, name: "Camila Dias Ferreira", subject: "Ed. Física", classes: 3, status: "inativo", email: "camila.ferreira@skolla.edu.br", degree: "Licenciada em Ed. Física" },
];

export const CLASSES_DATA = [
  { id: 1, name: "7º Ano A", period: "Manhã", students: 34, teachers: 8, room: "Sala 04" },
  { id: 2, name: "7º Ano B", period: "Tarde", students: 31, teachers: 8, room: "Sala 08" },
  { id: 3, name: "8º Ano A", period: "Manhã", students: 35, teachers: 8, room: "Sala 06" },
  { id: 4, name: "8º Ano B", period: "Tarde", students: 29, teachers: 7, room: "Sala 10" },
  { id: 5, name: "9º Ano A", period: "Manhã", students: 36, teachers: 8, room: "Sala 12" },
  { id: 6, name: "9º Ano B", period: "Tarde", students: 33, teachers: 8, room: "Sala 15" },
];

export const CHART_DATA = [
  { month: "Mar", freq: 96 },
  { month: "Abr", freq: 94 },
  { month: "Mai", freq: 92 },
  { month: "Jun", freq: 89 },
  { month: "Jul", freq: 94 },
  { month: "Ago", freq: 94 },
];

export const CLASS_TEACHERS_MAP: Record<number, number[]> = {
  1: [1, 2, 3, 4, 5], 2: [1, 2, 3, 4, 5],
  3: [1, 2, 3, 4, 6], 4: [1, 2, 3, 4, 6],
  5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5],
};

export const CLASS_STUDENTS_MAP: Record<number, number[]> = {
  1: [3, 6], 2: [2, 8], 3: [2, 5],
  4: [4, 8], 5: [1, 7], 6: [4],
};