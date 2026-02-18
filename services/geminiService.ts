import { GoogleGenAI, Type } from "@google/genai";
import { ProgramMetadata, ProgramSections, SECTION_LABELS, GenerationStats } from "../types";
import { DEFAULT_MODEL } from "../constants";

// Initialize Gemini Client
const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

// --- Configuration Structures ---

const SYSTEM_INSTRUCTION = "Ты опытный методист. Формируй валидный JSON. Будь лаконичен и точен.";

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    titlePage: { type: Type.STRING },
    explanatoryNote: { type: Type.STRING },
    goal: { type: Type.STRING },
    tasks: { type: Type.STRING },
    results: { type: Type.STRING },
    curriculum: { type: Type.STRING },
    assessment: { type: Type.STRING },
    literature: { type: Type.STRING },
  },
  required: [
    "titlePage",
    "explanatoryNote",
    "goal",
    "tasks",
    "results",
    "curriculum",
    "assessment",
    "literature",
  ],
};

const createPrompt = (metadata: ProgramMetadata) => `
    Составь программу дополнительного образования (РФ).
    
    Параметры:
    - Название: ${metadata.name}
    - Часы: ${metadata.hours}
    - Уровень: ${metadata.level}
    - Код учреждения: ${metadata.institutionCode || 'Не указан'}
    - Автор: ${metadata.author}

    Требуемый контент (JSON):
    1. titlePage: Текст титульного листа (без оформления).
    2. explanatoryNote: Пояснительная записка (актуальность, новизна). Кратко, до 150 слов.
    3. goal: Цель (1 предложение).
    4. tasks: Задачи (Обучающие, Развивающие, Воспитательные). Каждую группу начни с новой строки.
    5. results: Результаты (Личностные, Метапредметные, Предметные). Кратко.
    6. curriculum: Учебный план (Markdown таблица: № п/п | Тема | Всего | Теория | Практика | Форма контроля).
    7. assessment: Формы контроля (кратко).
    8. literature: Литература (3-5 источников ГОСТ).
    9

    Важно: Не повторяй названия разделов внутри текста значений.
`;

// --- Service Function ---

export const generateProgramContent = async (
  metadata: ProgramMetadata
): Promise<{ sections: ProgramSections; stats: GenerationStats }> => {
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  const modelName = metadata.modelId || DEFAULT_MODEL;
  const prompt = createPrompt(metadata);

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text) as ProgramSections;

    const cleanData = {} as ProgramSections;
    (Object.keys(data) as Array<keyof ProgramSections>).forEach((key) => {
        let content = data[key] || "";
        const label = SECTION_LABELS[key];
        
        // Remove repeated headers at the start.
        const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`^(\\s*${escapedLabel}[:.]?\\s*)+`, 'i');
        
        content = content.replace(regex, '').trim();

        // Enforce newlines for Tasks types
        if (key === 'tasks') {
            // Ensure there is a newline before key task groups if they are inline
            content = content
                .replace(/([.!;])\s*(Развивающие:)/i, '$1\n$2')
                .replace(/([.!;])\s*(Воспитательные:)/i, '$1\n$2')
                // Fallback for no punctuation
                .replace(/(Обучающие:)/i, '$1') // Just to ensure it exists
                .replace(/([^\n])\s*(Развивающие:)/i, '$1\n$2')
                .replace(/([^\n])\s*(Воспитательные:)/i, '$1\n$2');
        }

        cleanData[key] = content;
    });

    const stats: GenerationStats = {
        modelName: modelName,
        totalTokens: response.usageMetadata?.totalTokenCount || 0,
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        candidatesTokens: response.usageMetadata?.candidatesTokenCount || 0,
    };

    return { sections: cleanData, stats };

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};