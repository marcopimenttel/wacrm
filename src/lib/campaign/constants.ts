/** Choices e labels espelhados do O Candidato (lideranças/apoiadores). */

export const GENDER_OPTIONS = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Feminino" },
  { value: "O", label: "Outro" },
] as const;

export const LEADERSHIP_MARITAL_OPTIONS = [
  { value: "solteiro", label: "Solteiro(a)" },
  { value: "casado", label: "Casado(a)" },
  { value: "divorciado", label: "Divorciado(a)" },
  { value: "viuvo", label: "Viúvo(a)" },
  { value: "uniao_estavel", label: "União Estável" },
] as const;

export const SUPPORTER_MARITAL_OPTIONS = [
  { value: "single", label: "Solteiro(a)" },
  { value: "married", label: "Casado(a)" },
  { value: "widowed", label: "Viúvo(a)" },
  { value: "separated", label: "Separado(a)" },
  { value: "stable_union", label: "União Estável" },
] as const;

export const LEADERSHIP_STATUS_OPTIONS = [
  { value: "active", label: "Ativo" },
  { value: "inactive", label: "Inativo" },
  { value: "dismissed", label: "Desligado" },
  { value: "vacation", label: "Férias" },
] as const;

export const SUPPORTER_VALIDACAO_OPTIONS = [
  { value: "pendente", label: "Pendente" },
  { value: "valido", label: "Válido" },
  { value: "invalido", label: "Inválido" },
] as const;

export const SUPPORTER_CONQUISTA_OPTIONS = [
  { value: "positivo", label: "Positivo" },
  { value: "a_conquistar", label: "A conquistar" },
  { value: "negativo", label: "Negativo" },
  { value: "nao_informado", label: "Não Informado" },
] as const;

export const FAMILY_RELATIONSHIP_OPTIONS = [
  { value: "spouse", label: "Cônjuge" },
  { value: "father", label: "Pai" },
  { value: "mother", label: "Mãe" },
  { value: "son", label: "Filho(a)" },
  { value: "sibling", label: "Irmão(ã)" },
  { value: "other", label: "Outro" },
] as const;

export const BRAZIL_UF = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;

export const CATALOG_COLORS = [
  "slate", "red", "orange", "yellow", "green", "blue", "purple", "pink",
] as const;
