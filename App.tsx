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
    Coins,
    Info,
    Cloud,
    Database,
    Trash2
} from 'lucide-react';
import { Program, ProgramMetadata, ProgramLevel, ProgramSections, SECTION_LABELS, SectionKey } from './types';
import { DEFAULT_FORMATTING, LEVEL_OPTIONS, AVAILABLE_MODELS, DEFAULT_MODEL } from './constants';
import { generateProgramContent } from './services/geminiService';
import { exportToDocx } from './services/docxService';
import { supabase, isSupabaseConfigured, programService } from './services/supabaseService';
import Button from './components/Button';
import { Input, Select } from './components/Input';
import FormattingPanel from './components/FormattingPanel';
import TermsOfReferenceModal from './components/TermsOfReferenceModal';

// --- Types ---
type ViewState = 'login' | 'dashboard' | 'editor';

// --- Mock Data ---
const MOCK_USER = { name: 'Гость (Демо)', email: 'guest@demo.local' };

import { Toaster, toast } from 'sonner';

// ... (imports remain the same)

import { startTokenAutoRefresh } from './services/gigaChatService';

// ... (imports)

// --- Main App ---
const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('login');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [currentProgram, setCurrentProgram] = useState<Program | null>(null);
  const [isFormattingOpen, setIsFormattingOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTZOpen, setIsTZOpen] = useState(false);
  
  // Auth State
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  // Editor State (Draft)
  const [draftMetadata, setDraftMetadata] = useState<Partial<ProgramMetadata>>({
    name: '',
    hours: 36,
    level: ProgramLevel.BASIC,
    institutionCode: '',
    author: '',
    modelId: DEFAULT_MODEL
  });

  const [activeSection, setActiveSection] = useState<SectionKey>('explanatoryNote');
  const [usageStats, setUsageStats] = useState({ programsCount: 0, tokensUsed: 0 });

  // --- Effects ---
  
  // Initialize GigaChat Token Refresh
  useEffect(() => {
      startTokenAutoRefresh();
  }, []);

  // Check Auth Session
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
        // Initial check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                setView('dashboard');
            } else {
                setView('login');
            }
        });

        // Listener for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                setView('dashboard');
            } else {
                setView('login');
            }
        });

        return () => subscription.unsubscribe();
    }
  }, []);

  // Load Programs and Usage Stats
  useEffect(() => {
    const loadData = async () => {
        if (isSupabaseConfigured && user) {
            try {
                const [programsData, usageData] = await Promise.all([
                    programService.getAll(),
                    programService.getUserUsage()
                ]);
                setPrograms(programsData);
                setUsageStats(usageData);
            } catch (error) {
                console.error("Failed to load data:", error);
            }
        } else {
            // Fallback to LocalStorage
            const saved = localStorage.getItem('edu_programs');
            if (saved) {
                const parsed = JSON.parse(saved);
                setPrograms(parsed);
                // Mock usage for local demo
                setUsageStats({ 
                    programsCount: parsed.length, 
                    tokensUsed: parsed.reduce((acc: number, p: any) => acc + (p.stats?.totalTokens || 0), 0) 
                });
            }
        }
    };

    if (view === 'dashboard') {
        loadData();
    }
  }, [view, user]);

  const saveToStorage = async (updatedPrograms: Program[], programToSave?: Program) => {
      if (isSupabaseConfigured && user && programToSave) {
          try {
              const saved = await programService.save(programToSave);
              // Refresh list from server to be safe, or update local state
              if (saved) {
                  const newPrograms = programs.map(p => p.id === saved.id ? saved : p);
                  if (!programs.find(p => p.id === saved.id)) newPrograms.push(saved);
                  setPrograms(newPrograms);
                  
                  // Update usage stats
                  const usage = await programService.getUserUsage();
                  setUsageStats(usage);
              }
          } catch (e) {
              toast.error("Ошибка сохранения в облако: " + e);
          }
      } else {
          // Local Storage
          localStorage.setItem('edu_programs', JSON.stringify(updatedPrograms));
          setPrograms(updatedPrograms);
          setUsageStats({ 
              programsCount: updatedPrograms.length, 
              tokensUsed: updatedPrograms.reduce((acc: number, p: any) => acc + (p.stats?.totalTokens || 0), 0) 
          });
      }
  };

  // --- Handlers ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    
    if (isSupabaseConfigured && supabase) {
        try {
            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({ 
                    email: loginEmail, 
                    password: loginPassword 
                });
                if (error) throw error;
                
                if (data.session) {
                    toast.success("Регистрация успешна! Добро пожаловать.");
                    // Session update will trigger useEffect -> setView('dashboard')
                } else {
                    toast.info("Регистрация прошла успешно. Пожалуйста, проверьте почту для подтверждения (если требуется).");
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({ 
                    email: loginEmail, 
                    password: loginPassword 
                });
                if (error) throw error;
                toast.success("Вход выполнен успешно!");
            }
        } catch (error: any) {
            console.error("Auth error:", error);
            const msg = error.message || "";
            
            if (msg.includes('rate limit')) {
                toast.error("Превышен лимит попыток. Подождите пару минут.");
            } else if (msg.includes('User already registered')) {
                toast.warning("Пользователь уже зарегистрирован. Переключаем на вход...");
                setIsSignUp(false);
            } else if (msg.includes('Invalid login credentials')) {
                const errorMsg = "Неправильный логин или пароль";
                toast.error(errorMsg);
                setLoginError(errorMsg);
            } else {
                toast.error("Ошибка: " + msg);
            }
        } finally {
            setAuthLoading(false);
        }
    } else {
        // Demo Login
        if(loginEmail && loginPassword) {
            setUser({ email: loginEmail, user_metadata: { name: 'Demo User' }});
            setView('dashboard');
            toast.success("Вход в демо-режим выполнен");
        } else {
            toast.error("Введите Email и пароль");
        }
        setAuthLoading(false);
    }
  };

  const handleCreateNew = () => {
    const newProgram: Program = {
        id: crypto.randomUUID(),
        name: '',
        hours: 72,
        level: ProgramLevel.BASIC,
        institutionCode: '',
        author: user?.email || MOCK_USER.name,
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

  const handleExport = () => {
      if(currentProgram) {
          exportToDocx(currentProgram);
      }
  };

  const handleLogout = async () => {
      try {
          if (isSupabaseConfigured && supabase) {
              await supabase.auth.signOut();
          }
      } catch (error) {
          console.error("Logout error:", error);
      } finally {
          // Clear all user-related state
          setUser(null);
          setPrograms([]);
          setCurrentProgram(null);
          setUsageStats({ programsCount: 0, tokensUsed: 0 });
          setLoginEmail('');
          setLoginPassword('');
          setView('login');
          toast.info("Вы вышли из системы");
      }
  };

  // ... (other handlers)

  const handleGenerate = async () => {
      if (!draftMetadata.name) {
          toast.error("Пожалуйста, введите название программы");
          return;
      }

      // Check Limits
      const MAX_TOKENS = 10000;
      const MAX_PROGRAMS = 3;

      if (usageStats.tokensUsed >= MAX_TOKENS) {
          toast.error(`Лимит токенов исчерпан (${usageStats.tokensUsed}/${MAX_TOKENS}). Обратитесь к администратору.`);
          return;
      }

      // Only check program limit if creating a NEW program (not updating existing)
      const isNewProgram = !programs.find(p => p.id === currentProgram?.id);
      
      if (isNewProgram && usageStats.programsCount >= MAX_PROGRAMS) {
           toast.error(`Лимит программ исчерпан (${usageStats.programsCount}/${MAX_PROGRAMS}). Удалите старые программы.`);
           return;
      }

      setIsGenerating(true);
      try {
          const { sections, stats } = await generateProgramContent(draftMetadata as ProgramMetadata);
          
          if (currentProgram) {
              const updatedProgram: Program = {
                  ...currentProgram,
                  ...draftMetadata as ProgramMetadata,
                  sections: sections,
                  stats: stats,
                  updatedAt: new Date().toISOString()
              };
              
              setCurrentProgram(updatedProgram);
              
              const newProgramsList = programs.map(p => p.id === updatedProgram.id ? updatedProgram : p);
              if (!programs.find(p => p.id === updatedProgram.id)) {
                  newProgramsList.push(updatedProgram);
              }
              
              saveToStorage(newProgramsList, updatedProgram);
              
              // Log generation history
              if (isSupabaseConfigured && user) {
                  await programService.logGeneration(
                      updatedProgram.id,
                      stats.modelName,
                      { 
                          total: stats.totalTokens, 
                          prompt: stats.promptTokens, 
                          completion: stats.candidatesTokens 
                      },
                      draftMetadata,
                      sections
                  );
                  // Refresh stats
                  const usage = await programService.getUserUsage();
                  setUsageStats(usage);
              }

              toast.success("Программа успешно сгенерирована!");
          }
      } catch (error: any) {
          console.error("Generation failed:", error);
          toast.error(`Ошибка генерации: ${error.message || "Проверьте API ключ или интернет соединение."}`);
      } finally {
          setIsGenerating(false);
      }
  };

  const handleSave = () => {
      if(!currentProgram) return;
      
      const finalProgram: Program = {
          ...currentProgram,
          ...draftMetadata as ProgramMetadata,
          updatedAt: new Date().toISOString()
      };
      
      const updatedList = programs.map(p => p.id === finalProgram.id ? finalProgram : p);
      if (!programs.find(p => p.id === finalProgram.id)) {
          updatedList.push(finalProgram);
      }
      
      saveToStorage(updatedList, finalProgram);
      setCurrentProgram(finalProgram); 
      toast.success('Программа сохранена!');
  };

  const handleDeleteProgram = async (id: string) => {
      if (window.confirm("Вы уверены, что хотите удалить эту программу? Это действие необратимо.")) {
          try {
              if (isSupabaseConfigured && user) {
                  await programService.delete(id);
              }
              
              const newPrograms = programs.filter(p => p.id !== id);
              setPrograms(newPrograms);
              
              if (!isSupabaseConfigured) {
                  localStorage.setItem('edu_programs', JSON.stringify(newPrograms));
              }
              
              // Update stats
              if (isSupabaseConfigured && user) {
                  const usage = await programService.getUserUsage();
                  setUsageStats(usage);
              } else {
                  setUsageStats({ 
                      programsCount: newPrograms.length, 
                      tokensUsed: newPrograms.reduce((acc: number, p: any) => acc + (p.stats?.totalTokens || 0), 0) 
                  });
              }
              
              toast.success("Программа удалена");
          } catch (error) {
              console.error("Failed to delete program:", error);
              toast.error("Не удалось удалить программу");
          }
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
          <p className="text-center text-gray-500 mb-8">
              {isSupabaseConfigured ? 'Вход в систему' : 'Демо-режим (Локальное хранилище)'}
          </p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <Input 
                id="email" 
                label="Email" 
                type="email" 
                placeholder="user@example.com"
                value={loginEmail}
                onChange={e => { setLoginEmail(e.target.value); setLoginError(null); }}
                required
                error={loginError ? true : undefined}
            />
            <Input 
                id="password" 
                label="Пароль" 
                type="password" 
                value={loginPassword}
                onChange={e => { setLoginPassword(e.target.value); setLoginError(null); }}
                required
                error={loginError}
            />
            <Button type="submit" className="w-full justify-center" isLoading={authLoading}>
                {isSignUp ? 'Зарегистрироваться' : 'Войти'}
            </Button>
          </form>

          {isSupabaseConfigured && (
              <div className="mt-4 text-center">
                  <button 
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                      {isSignUp ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Регистрация'}
                  </button>
              </div>
          )}

          {!isSupabaseConfigured && (
            <div className="mt-6 p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-xs text-yellow-700">
               <p className="font-bold mb-1">Режим Демо</p>
               Данные сохраняются только в браузере. Для подключения облачной базы данных см. инструкцию "О системе".
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Toaster position="top-center" richColors />
      {/* ... (rest of render) */}
      {/* Header */}
      <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <FileText className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-gray-800 text-lg hidden sm:inline">EduProgram GenAI</span>
          {isSupabaseConfigured ? (
              <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                  <Cloud size={12} /> Cloud
              </span>
          ) : (
              <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-200">
                  <Database size={12} /> Local
              </span>
          )}
        </div>
        
        {/* Usage Stats Display */}
        <div className="hidden md:flex items-center gap-6">
            <div className="flex flex-col items-end">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <span>Программы: {usageStats.programsCount}/3</span>
                    <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full ${usageStats.programsCount >= 3 ? 'bg-red-500' : 'bg-blue-500'}`} 
                            style={{ width: `${Math.min(100, (usageStats.programsCount / 3) * 100)}%` }}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Токены: {usageStats.tokensUsed}/10000</span>
                    <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full ${usageStats.tokensUsed >= 10000 ? 'bg-red-500' : 'bg-purple-500'}`} 
                            style={{ width: `${Math.min(100, (usageStats.tokensUsed / 10000) * 100)}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>

        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 py-1 px-3 rounded-full">
                <User size={16}/>
                {user?.email || MOCK_USER.name}
            </div>
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1" title="Выйти">
                <LogOut size={20} />
                <span className="hidden sm:inline">Выйти</span>
            </button>
        </div>
      </header>

      <TermsOfReferenceModal isOpen={isTZOpen} onClose={() => setIsTZOpen(false)} />

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
                                <button 
                                    onClick={() => handleDeleteProgram(prog.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Удалить программу"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {/* Footer with Info Link */}
            <div className="mt-auto pt-8 border-t border-gray-200 flex justify-center">
                <button 
                    onClick={() => setIsTZOpen(true)}
                    className="text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-1 text-sm"
                >
                    <Info size={16} />
                    <span>О системе / Техническое задание</span>
                </button>
            </div>
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
                    <div className="pt-2 border-t border-gray-100 mt-2">
                        <Button onClick={handleLogout} variant="secondary" className="w-full text-sm text-red-500 hover:bg-red-50 hover:text-red-700 hover:border-red-200">
                            <LogOut size={16} /> Выйти
                        </Button>
                    </div>
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