import React, { useState, useCallback, useEffect } from 'react';
import { 
    Layout, 
    FileText, 
    Settings, 
    Download, 
    Save, 
    Plus, 
    ChevronLeft, 
    LogOut,
    Sparkles,
    User,
    Cpu,
    Coins
} from 'lucide-react';
import { Program, ProgramMetadata, ProgramLevel, ProgramSections, SECTION_LABELS, SectionKey } from './types';
import { DEFAULT_FORMATTING, LEVEL_OPTIONS, AVAILABLE_MODELS, DEFAULT_MODEL } from './constants';
import { generateProgramContent } from './services/geminiService';
import { exportToDocx } from './services/docxService';
import Button from './components/Button';
import { Input, Select } from './components/Input';
import FormattingPanel from './components/FormattingPanel';

// --- Types ---
type ViewState = 'login' | 'dashboard' | 'editor';

// --- Mock Data ---
const MOCK_USER = { name: 'Иванов И.И.', email: 'teacher@edu.ru' };

// --- Main App ---
const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('login');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [currentProgram, setCurrentProgram] = useState<Program | null>(null);
  const [isFormattingOpen, setIsFormattingOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Editor State (Draft)
  const [draftMetadata, setDraftMetadata] = useState<Partial<ProgramMetadata>>({
    name: '',
    hours: 36,
    level: ProgramLevel.BASIC,
    institutionCode: '',
    author: MOCK_USER.name,
    modelId: DEFAULT_MODEL
  });

  const [activeSection, setActiveSection] = useState<SectionKey>('explanatoryNote');

  // --- Effects ---
  useEffect(() => {
    // Simulate loading programs
    const saved = localStorage.getItem('edu_programs');
    if (saved) {
        setPrograms(JSON.parse(saved));
    }
  }, []);

  const saveToStorage = (updatedPrograms: Program[]) => {
      localStorage.setItem('edu_programs', JSON.stringify(updatedPrograms));
      setPrograms(updatedPrograms);
  };

  // --- Handlers ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if(loginEmail && loginPassword) setView('dashboard');
  };

  const handleCreateNew = () => {
    const newProgram: Program = {
        id: crypto.randomUUID(),
        name: '',
        hours: 72,
        level: ProgramLevel.BASIC,
        institutionCode: '',
        author: MOCK_USER.name,
        modelId: DEFAULT_MODEL,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sections: {
            titlePage: '',
            explanatoryNote: '',
            goal: '',
            tasks: '',
            results: '',
            curriculum: '',
            assessment: '',
            literature: ''
        },
        formatting: { ...DEFAULT_FORMATTING }
    };
    setDraftMetadata(newProgram);
    setCurrentProgram(newProgram);
    setView('editor');
  };

  const handleEditProgram = (id: string) => {
      const prog = programs.find(p => p.id === id);
      if(prog) {
          setCurrentProgram(prog);
          setDraftMetadata({
              ...prog,
              modelId: prog.modelId || DEFAULT_MODEL // Ensure modelId exists
          });
          setView('editor');
      }
  };

  const handleMetadataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { id, value } = e.target;
      setDraftMetadata(prev => ({ ...prev, [id]: value }));
  };

  const handleGenerate = async () => {
      if (!draftMetadata.name) {
          alert("Пожалуйста, введите название программы");
          return;
      }
      setIsGenerating(true);
      try {
          // Prepare clean metadata for AI
          const meta: ProgramMetadata = {
              ...(draftMetadata as ProgramMetadata),
              updatedAt: new Date().toISOString()
          };

          const { sections: generatedSections, stats } = await generateProgramContent(meta);
          
          if (currentProgram) {
              const updatedProgram: Program = {
                  ...currentProgram,
                  ...meta,
                  sections: generatedSections,
                  stats // Save the stats
              };
              setCurrentProgram(updatedProgram);
              // Auto-save
              const exists = programs.find(p => p.id === updatedProgram.id);
              const newProgramsList = exists 
                  ? programs.map(p => p.id === updatedProgram.id ? updatedProgram : p)
                  : [...programs, updatedProgram];
              saveToStorage(newProgramsList);
          }
      } catch (error) {
          alert("Ошибка генерации. Проверьте API ключ или интернет соединение.");
      } finally {
          setIsGenerating(false);
      }
  };

  const handleSectionEdit = (text: string) => {
      if(!currentProgram) return;
      const updated = {
          ...currentProgram,
          sections: {
              ...currentProgram.sections,
              [activeSection]: text
          }
      };
      setCurrentProgram(updated);
  };

  const handleSave = () => {
      if(!currentProgram) return;
      // Merge draft metadata (like name/model) into current program before saving
      const finalProgram = {
          ...currentProgram,
          ...draftMetadata
      } as Program;

      const updatedList = programs.map(p => p.id === finalProgram.id ? finalProgram : p);
      if(!programs.find(p => p.id === finalProgram.id)) updatedList.push(finalProgram);
      saveToStorage(updatedList);
      setCurrentProgram(finalProgram); // Update current view
      alert('Программа сохранена!');
  };

  const handleExport = () => {
      if(currentProgram) {
          exportToDocx(currentProgram);
      }
  };

  // --- Render Views ---

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-600 p-3 rounded-xl">
                <FileText className="text-white w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">EduProgram GenAI</h1>
          <p className="text-center text-gray-500 mb-8">Автоматизация образовательных программ</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <Input 
                id="email" 
                label="Email" 
                type="email" 
                placeholder="user@example.com"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                required
            />
            <Input 
                id="password" 
                label="Пароль" 
                type="password" 
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                required
            />
            <Button type="submit" className="w-full justify-center">Войти</Button>
          </form>
          <div className="mt-4 text-center text-xs text-gray-400">
             Демо-режим: введите любые данные
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <FileText className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-gray-800 text-lg hidden sm:inline">EduProgram GenAI</span>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 py-1 px-3 rounded-full">
                <User size={16}/>
                {MOCK_USER.name}
            </div>
            <button onClick={() => setView('login')} className="text-gray-400 hover:text-red-500 transition-colors">
                <LogOut size={20} />
            </button>
        </div>
      </header>

      {/* Main Content */}
      {view === 'dashboard' && (
        <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Мои программы</h1>
                    <p className="text-gray-500 mt-1">Управление образовательными программами</p>
                </div>
                <Button onClick={handleCreateNew}>
                    <Plus size={20} /> Создать новую
                </Button>
            </div>

            {programs.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-200">
                    <Layout className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">Нет созданных программ</h3>
                    <p className="text-gray-500 mb-6">Начните с создания вашей первой программы</p>
                    <Button variant="secondary" onClick={handleCreateNew}>Создать программу</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {programs.map(prog => (
                        <div key={prog.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col">
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{prog.name || 'Без названия'}</h3>
                                <div className="text-sm text-gray-500 space-y-1">
                                    <p>Уровень: <span className="text-gray-700">{prog.level}</span></p>
                                    <p>Часов: <span className="text-gray-700">{prog.hours}</span></p>
                                    <p>Обновлено: {new Date(prog.updatedAt).toLocaleDateString()}</p>
                                    {prog.stats && (
                                        <div className="flex items-center gap-2 pt-2 text-xs text-gray-400">
                                            <Cpu size={12}/> {prog.stats.modelName}
                                            <span className="mx-1">•</span>
                                            <Coins size={12}/> {prog.stats.totalTokens} токенов
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="mt-6 pt-4 border-t border-gray-100 flex gap-2">
                                <Button variant="secondary" className="flex-1 text-sm" onClick={() => handleEditProgram(prog.id)}>
                                    Редактировать
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
      )}

      {view === 'editor' && currentProgram && (
          <div className="flex flex-1 overflow-hidden relative">
             {/* Left Sidebar: Navigation */}
             <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                    <button onClick={() => setView('dashboard')} className="flex items-center text-sm text-gray-500 hover:text-blue-600 transition-colors mb-4">
                        <ChevronLeft size={16} className="mr-1"/> Назад
                    </button>
                    <h2 className="font-bold text-gray-800 truncate" title={draftMetadata.name}>{draftMetadata.name || 'Новая программа'}</h2>
                </div>
                <nav className="flex-1 overflow-y-auto p-2 space-y-1">
                    {(Object.keys(SECTION_LABELS) as SectionKey[]).map(key => (
                        <button
                            key={key}
                            onClick={() => setActiveSection(key)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                activeSection === key 
                                ? 'bg-blue-50 text-blue-700' 
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {SECTION_LABELS[key]}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-gray-200 space-y-2">
                    <Button onClick={handleSave} variant="secondary" className="w-full text-sm">
                        <Save size={16} /> Сохранить
                    </Button>
                    <Button onClick={() => setIsFormattingOpen(true)} variant="secondary" className="w-full text-sm">
                        <Settings size={16} /> Форматирование
                    </Button>
                    <Button onClick={handleExport} className="w-full text-sm bg-green-600 hover:bg-green-700 focus:ring-green-500">
                        <Download size={16} /> Экспорт DOCX
                    </Button>
                </div>
             </aside>

             {/* Center: Content Area */}
             <main className="flex-1 overflow-y-auto bg-gray-100 p-8 relative">
                {/* Generation/Input Panel */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <Input 
                            id="name" 
                            label="Название программы" 
                            value={draftMetadata.name} 
                            onChange={handleMetadataChange}
                            className="md:col-span-2"
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input 
                                id="hours" 
                                type="number" 
                                label="Часы" 
                                value={draftMetadata.hours} 
                                onChange={handleMetadataChange}
                            />
                            <Select 
                                id="level" 
                                label="Уровень" 
                                options={LEVEL_OPTIONS} 
                                value={draftMetadata.level} 
                                onChange={handleMetadataChange}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input 
                                id="institutionCode" 
                                label="Код учреждения" 
                                value={draftMetadata.institutionCode} 
                                onChange={handleMetadataChange}
                            />
                            <div className="flex flex-col gap-2">
                                <Select
                                    id="modelId"
                                    label="Модель ИИ"
                                    options={AVAILABLE_MODELS}
                                    value={draftMetadata.modelId || DEFAULT_MODEL}
                                    onChange={handleMetadataChange}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                             {currentProgram.stats && (
                                <>
                                    <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded">
                                        <Cpu size={14} className="text-purple-600"/>
                                        <span>Модель: {currentProgram.stats.modelName}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded">
                                        <Coins size={14} className="text-yellow-600"/>
                                        <span>Токенов: {currentProgram.stats.totalTokens}</span>
                                    </div>
                                </>
                             )}
                        </div>
                        <Button onClick={handleGenerate} isLoading={isGenerating}>
                            <Sparkles size={18} />
                            {currentProgram.sections.titlePage ? 'Перегенерировать' : 'Сгенерировать программу'}
                        </Button>
                    </div>
                </div>

                {/* Editor Area */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[500px] flex flex-col">
                    <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl flex justify-between items-center">
                        <h3 className="font-bold text-gray-700">{SECTION_LABELS[activeSection]}</h3>
                        <span className="text-xs text-gray-400 uppercase tracking-wider">Редактор</span>
                    </div>
                    <div className="flex-1 p-0">
                        <textarea 
                            className="w-full h-full min-h-[500px] p-6 resize-none focus:outline-none text-gray-800 leading-relaxed"
                            value={currentProgram.sections[activeSection]}
                            onChange={(e) => handleSectionEdit(e.target.value)}
                            placeholder={`Здесь будет текст раздела "${SECTION_LABELS[activeSection]}". Нажмите "Сгенерировать", чтобы заполнить автоматически.`}
                            style={{
                                fontFamily: currentProgram.formatting.fontFamily,
                                fontSize: `${currentProgram.formatting.fontSize}pt`,
                            }}
                        />
                    </div>
                </div>
             </main>

             {/* Right Sidebar: Formatting */}
             <FormattingPanel 
                isOpen={isFormattingOpen}
                onClose={() => setIsFormattingOpen(false)}
                options={currentProgram.formatting}
                onChange={(newOpts) => setCurrentProgram({...currentProgram, formatting: newOpts})}
             />
          </div>
      )}

    </div>
  );
};

export default App;