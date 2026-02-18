import { FormattingOptions, ProgramLevel } from './types';

export const DEFAULT_FORMATTING: FormattingOptions = {
  fontFamily: 'Times New Roman',
  fontSize: 14,
  lineSpacing: 1, // Single
  alignment: 'justified', // Width
  marginTop: 2, // cm
  marginBottom: 2, // cm
  marginLeft: 3, // cm (standard left margin is often larger for binding)
  marginRight: 1.5, // cm
  showPageNumbers: true,
  titlePageColor: '#FFFFFF',
  headingBold: true,
  headingSize: 16,
};

export const FONT_OPTIONS = [
  'Times New Roman',
  'Arial',
  'Calibri',
  'Verdana',
  'Helvetica',
];

export const LEVEL_OPTIONS = [
  { value: ProgramLevel.BASIC, label: 'Базовый' },
  { value: ProgramLevel.ADVANCED, label: 'Продвинутый' },
  { value: ProgramLevel.IN_DEPTH, label: 'Углублённый' },
];

// Available models configuration
export const AVAILABLE_MODELS = [
  { value: 'gemini-3-flash-preview', label: 'Gemini 3.0 Flash (Быстрая)' },
  { value: 'gemini-3-pro-preview', label: 'Gemini 3.0 Pro (Умная)' },
  { value: 'gemini-2.5-flash-latest', label: 'Gemini 2.5 Flash (Стабильная)' },
];

export const DEFAULT_MODEL = 'gemini-3-flash-preview';