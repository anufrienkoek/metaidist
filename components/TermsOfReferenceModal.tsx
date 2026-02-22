import React from 'react';
import { X, CheckCircle, FileText } from 'lucide-react';
import Button from './Button';

interface TermsOfReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TermsOfReferenceModal: React.FC<TermsOfReferenceModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="bg-blue-100 p-2 rounded-lg">
                <FileText className="text-blue-600 w-6 h-6" />
             </div>
             <h2 className="text-xl font-bold text-gray-900">Техническое Задание (ТЗ)</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-8 overflow-y-auto leading-relaxed text-gray-700 space-y-8 custom-scrollbar">
            
            <section>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                    Общие сведения
                </h3>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p className="mb-2"><strong>Наименование системы:</strong> Автоматизированная система генерации образовательных программ "EduProgram GenAI".</p>
                    <p><strong>Назначение:</strong> Автоматизация процесса создания, редактирования и экспорта рабочих программ дополнительного образования в соответствии с методическими требованиями РФ.</p>
                </div>
            </section>

            <section>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                    Функциональные требования
                </h3>
                <ul className="space-y-3">
                    {[
                        'Авторизация пользователей (преподавателей/методистов).',
                        'Создание, редактирование и удаление карточек программ.',
                        'Генерация содержания разделов программы с использованием ИИ (Gemini).',
                        'Поддержка структуры: Титульный лист, Пояснительная записка, Цели, Задачи, Результаты, Учебный план, Оценка, Литература.',
                        'Ручное редактирование сгенерированного текста.',
                        'Настройка форматирования (шрифты, отступы, размеры) для печати.',
                        'Экспорт готового документа в формат .docx (Word).'
                    ].map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </section>

            <section>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                    Технологический стек
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Frontend</h4>
                        <ul className="list-disc list-inside text-sm space-y-1 text-gray-600">
                            <li>React 19 (Functional Components, Hooks)</li>
                            <li>TypeScript (Strict typing)</li>
                            <li>Tailwind CSS (Styling)</li>
                            <li>Vite (Build tool)</li>
                            <li>Lucide React (Icons)</li>
                        </ul>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Integrations & Libs</h4>
                        <ul className="list-disc list-inside text-sm space-y-1 text-gray-600">
                            <li>Google GenAI SDK (Gemini Models)</li>
                            <li>docx (Document generation)</li>
                            <li>file-saver (Client-side download)</li>
                        </ul>
                    </div>
                </div>
            </section>

            <section>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">4</span>
                    Архитектура Backend (План)
                </h3>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
                    <p className="mb-3 text-gray-700">Для перевода в продакшн планируется реализация REST API на <strong>FastAPI (Python)</strong>:</p>
                    <ul className="space-y-2 text-gray-600">
                        <li className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                            <span><strong>Auth Service:</strong> JWT авторизация, управление ролями.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                            <span><strong>Core Service:</strong> CRUD операции с базой данных (PostgreSQL).</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                            <span><strong>AI Gateway:</strong> Безопасное проксирование запросов к Gemini API, валидация ответов.</span>
                        </li>
                    </ul>
                    <p className="mt-3 text-xs text-gray-400 italic">Подробности см. в файле BACKEND_ARCHITECTURE.md</p>
                </div>
            </section>

             <section>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">5</span>
                    Требования к интерфейсу
                </h3>
                <p>Интерфейс должен быть интуитивно понятным, адаптированным для настольных и мобильных устройств (Responsive Design). Цветовая гамма: светлая, профессиональная (оттенки синего и серого).</p>
            </section>

        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end bg-gray-50 rounded-b-2xl">
          <Button onClick={onClose}>Закрыть</Button>
        </div>
      </div>
    </div>
  );
};

export default TermsOfReferenceModal;
