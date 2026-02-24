import { ProgramMetadata, ProgramSections, SECTION_LABELS, GenerationStats } from '../types';
import { DEFAULT_MODEL } from '../constants';
import { generateGigaChatCompletion } from './gigaChatService';

const SYSTEM_INSTRUCTION = 'Ты опытный методист. Формируй валидный JSON. Будь лаконичен и точен.';

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

    Важно: Не повторяй названия разделов внутри текста значений.
    Ответ верни ТОЛЬКО в формате JSON.
`;

export const generateProgramContent = async (
  metadata: ProgramMetadata,
): Promise<{ sections: ProgramSections; stats: GenerationStats }> => {
  const modelName = metadata.modelId || DEFAULT_MODEL;
  const prompt = createPrompt(metadata);

  try {
    const response = await generateGigaChatCompletion(modelName, [
      { role: 'system', content: `${SYSTEM_INSTRUCTION} Ответ должен быть валидным JSON объектом.` },
      { role: 'user', content: prompt },
    ]);

    let text = response.choices[0]?.message?.content || '';
    const usage = {
      total: response.usage?.total_tokens || 0,
      prompt: response.usage?.prompt_tokens || 0,
      candidates: response.usage?.completion_tokens || 0,
    };

    text = text.replace(/```json\n?|\n?```/g, '').trim();

    if (!text) throw new Error('No response from AI');

    let data: ProgramSections;
    try {
      data = JSON.parse(text) as ProgramSections;
    } catch (e) {
      console.error('JSON Parse Error:', e, text);
      throw new Error(`Failed to parse AI response as JSON. Raw: ${text.substring(0, 100)}...`);
    }

    const cleanData = {} as ProgramSections;
    (Object.keys(data) as Array<keyof ProgramSections>).forEach((key) => {
      let content = data[key];

      if (typeof content !== 'string') {
        content = JSON.stringify(content);
      }

      const label = SECTION_LABELS[key];
      const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`^(\\s*${escapedLabel}[:.]?\\s*)+`, 'i');
      content = content.replace(regex, '').trim();

      if (key === 'tasks') {
        content = content
          .replace(/([.!;])\s*(Развивающие:)/i, '$1\n$2')
          .replace(/([.!;])\s*(Воспитательные:)/i, '$1\n$2')
          .replace(/([^\n])\s*(Развивающие:)/i, '$1\n$2')
          .replace(/([^\n])\s*(Воспитательные:)/i, '$1\n$2');
      }

      cleanData[key] = content;
    });

    return {
      sections: cleanData,
      stats: {
        modelName,
        totalTokens: usage.total,
        promptTokens: usage.prompt,
        candidatesTokens: usage.candidates,
      },
    };
  } catch (error) {
    console.error('Generation Error:', error);
    throw error;
  }
};
