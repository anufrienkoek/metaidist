import React from 'react';
import { FormattingOptions } from '../types';
import { FONT_OPTIONS, DEFAULT_FORMATTING } from '../constants';
import { X, RotateCcw } from 'lucide-react';
import Button from './Button';

interface FormattingPanelProps {
  options: FormattingOptions;
  onChange: (options: FormattingOptions) => void;
  isOpen: boolean;
  onClose: () => void;
}

const FormattingPanel: React.FC<FormattingPanelProps> = ({
  options,
  onChange,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleChange = (key: keyof FormattingOptions, value: any) => {
    onChange({ ...options, [key]: value });
  };

  const reset = () => {
    onChange(DEFAULT_FORMATTING);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out border-l border-gray-200 z-50 flex flex-col">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-800">Форматирование</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Шрифт */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Текст</h3>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">Шрифт</label>
            <select
              value={options.fontFamily}
              onChange={(e) => handleChange('fontFamily', e.target.value)}
              className="w-full border-gray-300 rounded-md shadow-sm text-sm p-2 border"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Размер (pt)</label>
              <input
                type="number"
                min="8"
                max="24"
                value={options.fontSize}
                onChange={(e) => handleChange('fontSize', Number(e.target.value))}
                className="w-full border-gray-300 rounded-md shadow-sm text-sm p-2 border"
              />
            </div>
            <div>
               <label className="block text-sm text-gray-600 mb-1">Интервал</label>
               <select
                  value={options.lineSpacing}
                  onChange={(e) => handleChange('lineSpacing', Number(e.target.value))}
                  className="w-full border-gray-300 rounded-md shadow-sm text-sm p-2 border"
               >
                 <option value={1}>1.0</option>
                 <option value={1.5}>1.5</option>
                 <option value={2}>2.0</option>
               </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">Выравнивание</label>
            <div className="flex rounded-md shadow-sm" role="group">
              {(['left', 'center', 'justified'] as const).map((align) => (
                <button
                  key={align}
                  type="button"
                  onClick={() => handleChange('alignment', align)}
                  className={`flex-1 px-4 py-2 text-sm font-medium border first:rounded-l-lg last:rounded-r-lg ${
                    options.alignment === align
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {align === 'left' ? 'Left' : align === 'center' ? 'Center' : 'Justify'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Поля */}
        <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Поля страницы (см)</h3>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs text-gray-500">Верхнее</label>
                    <input type="number" step="0.1" value={options.marginTop} onChange={(e) => handleChange('marginTop', Number(e.target.value))} className="w-full border p-1 rounded text-sm"/>
                </div>
                <div>
                    <label className="text-xs text-gray-500">Нижнее</label>
                    <input type="number" step="0.1" value={options.marginBottom} onChange={(e) => handleChange('marginBottom', Number(e.target.value))} className="w-full border p-1 rounded text-sm"/>
                </div>
                <div>
                    <label className="text-xs text-gray-500">Левое</label>
                    <input type="number" step="0.1" value={options.marginLeft} onChange={(e) => handleChange('marginLeft', Number(e.target.value))} className="w-full border p-1 rounded text-sm"/>
                </div>
                <div>
                    <label className="text-xs text-gray-500">Правое</label>
                    <input type="number" step="0.1" value={options.marginRight} onChange={(e) => handleChange('marginRight', Number(e.target.value))} className="w-full border p-1 rounded text-sm"/>
                </div>
            </div>
        </div>

        {/* Заголовки */}
        <div className="space-y-3">
             <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Заголовки</h3>
             <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700">Жирный шрифт</label>
                <input 
                    type="checkbox" 
                    checked={options.headingBold} 
                    onChange={(e) => handleChange('headingBold', e.target.checked)} 
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
             </div>
             <div>
                <label className="text-sm text-gray-600 mb-1">Размер (pt)</label>
                <input
                    type="number"
                    value={options.headingSize}
                    onChange={(e) => handleChange('headingSize', Number(e.target.value))}
                    className="w-full border-gray-300 rounded-md shadow-sm text-sm p-2 border"
                />
             </div>
        </div>
        
        {/* Дополнительно */}
        <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Дополнительно</h3>
            <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700">Нумерация страниц</label>
                <input 
                    type="checkbox" 
                    checked={options.showPageNumbers} 
                    onChange={(e) => handleChange('showPageNumbers', e.target.checked)} 
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
            </div>
        </div>

      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <Button variant="secondary" onClick={reset} className="w-full">
            <RotateCcw size={16} /> Сбросить настройки
        </Button>
      </div>
    </div>
  );
};

export default FormattingPanel;
