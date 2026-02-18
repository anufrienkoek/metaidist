export enum ProgramLevel {
  BASIC = 'Базовый',
  ADVANCED = 'Продвинутый',
  IN_DEPTH = 'Углублённый',
}

export interface ProgramMetadata {
  id: string;
  name: string;
  hours: number;
  level: ProgramLevel;
  institutionCode: string;
  author: string;
  modelId?: string; // Added model selection
  createdAt: string;
  updatedAt: string;
}

export interface ProgramSections {
  titlePage: string;
  explanatoryNote: string;
  goal: string;
  tasks: string;
  results: string;
  curriculum: string;
  assessment: string;
  literature: string;
}

export interface FormattingOptions {
  fontFamily: string;
  fontSize: number;
  lineSpacing: number;
  alignment: 'left' | 'center' | 'justified';
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  showPageNumbers: boolean;
  titlePageColor: string;
  headingBold: boolean;
  headingSize: number;
}

export interface GenerationStats {
  modelName: string;
  totalTokens: number;
  promptTokens: number;
  candidatesTokens: number;
}

export interface Program extends ProgramMetadata {
  sections: ProgramSections;
  formatting: FormattingOptions;
  stats?: GenerationStats;
}

export type SectionKey = keyof ProgramSections;

export const SECTION_LABELS: Record<SectionKey, string> = {
  titlePage: 'Титульный лист',
  explanatoryNote: 'Пояснительная записка',
  goal: 'Цель программы',
  tasks: 'Задачи',
  results: 'Планируемые результаты',
  curriculum: 'Учебный план',
  assessment: 'Контрольно-измерительные материалы',
  literature: 'Список литературы',
};