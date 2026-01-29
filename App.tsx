import React, { useState, useMemo, useEffect } from 'react';
import {
    Loader2, ChevronLeft, ChevronRight, Plus, GraduationCap, School, X, Settings, Filter, CalendarRange, LayoutDashboard, Users, Pencil, Trash2, Check, Clock, BookOpen
} from 'lucide-react';
import { useSchoolData } from './hooks/useSchoolData';
import {
    MOCK_STUDENTS_POOL,
    MOCK_CLASSES,
    CURRENT_YEAR,
    MONTH_NAMES,
    BIMESTERS as INITIAL_BIMESTERS
} from './constants';
import { Student, ClassAttendance, AttendanceStatus, ClassGroup, EnrollmentStatus, BimesterConfig, Subject } from './types';
import AttendanceGrid from './components/AttendanceGrid';
import StudentDetailModal from './components/StudentDetailModal';
import GlobalDashboard from './components/GlobalDashboard';
import StudentManager from './components/StudentManager';

type ViewMode = 'CLASS' | 'DASHBOARD' | 'STUDENTS';

const App: React.FC = () => {
    const {
        classes,
        allStudents,
        subjects,
        attendance,
        bimesters,
        dailyLessonCounts,
        isLoading,
        actions
    } = useSchoolData();

    // Navigation State
    const [viewMode, setViewMode] = useState<ViewMode>('DASHBOARD');
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const [year, setYear] = useState<number>(CURRENT_YEAR);
    const [month, setMonth] = useState<number>(new Date().getMonth()); // 0-11

    // Mobile Sidebar UI State
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // UI/Modal State
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isAddingClass, setIsAddingClass] = useState(false);
    const [isAddingSubject, setIsAddingSubject] = useState(false);
    const [isConfigBimesters, setIsConfigBimesters] = useState(false);

    // Edit State
    const [editingClassId, setEditingClassId] = useState<string | null>(null);
    const [editClassName, setEditClassName] = useState('');
    const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
    const [editSubjectName, setEditSubjectName] = useState('');

    // Filters
    const [statusFilter, setStatusFilter] = useState<EnrollmentStatus | 'ALL'>('ALL');

    // Form State
    const [newEntryName, setNewEntryName] = useState('');
    const [newSubjectName, setNewSubjectName] = useState('');

    // Set initial selections when data loads
    useEffect(() => {
        if (classes.length > 0 && !selectedClassId) {
            setSelectedClassId(classes[0].id);
        }
        if (subjects.length > 0 && !selectedSubjectId) {
            setSelectedSubjectId(subjects[0].id);
        }
    }, [classes, subjects, selectedClassId, selectedSubjectId]);

    // --- DERIVED DATA ---

    const currentClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);
    const currentSubject = useMemo(() => subjects.find(s => s.id === selectedSubjectId), [subjects, selectedSubjectId]);

    const classStudents = useMemo(() => {
        if (!currentClass) return [];
        let filtered = allStudents.filter(s => s.classId === currentClass.id);
        if (statusFilter !== 'ALL') {
            filtered = filtered.filter(s => s.status === statusFilter);
        }
        return filtered;
    }, [currentClass, allStudents, statusFilter]);

    const dateList = useMemo(() => {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const dates: string[] = [];
        for (let i = 1; i <= daysInMonth; i++) {
            dates.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
        }
        return dates;
    }, [year, month]);

    // --- HANDLERS (Wrapper) ---

    const handleCreateClass = () => {
        if (!newEntryName.trim()) return;
        const newClass: ClassGroup = { id: `c-${Date.now()}`, name: newEntryName };
        actions.handleUpsertClass(newClass);
        setSelectedClassId(newClass.id);
        setViewMode('CLASS');
        setNewEntryName('');
        setIsAddingClass(false);
        setIsSidebarOpen(false); // Close on mobile
    };

    const handleCreateSubject = () => {
        if (!newSubjectName.trim()) return;
        const newSub: Subject = { id: `s-${Date.now()}`, name: newSubjectName };
        actions.handleUpsertSubject(newSub);
        setSelectedSubjectId(newSub.id);
        setNewSubjectName('');
        setIsAddingSubject(false);
    };

    const handleSaveEditSubject = () => {
        if (!editSubjectName.trim() || !editingSubjectId) return;
        actions.handleUpsertSubject({ id: editingSubjectId, name: editSubjectName });
        setEditingSubjectId(null);
        setEditSubjectName('');
    };

    const handleStartEditClass = (c: ClassGroup) => {
        setEditingClassId(c.id);
        setEditClassName(c.name);
    };

    const handleSaveEditClass = () => {
        if (!editClassName.trim() || !editingClassId) return;
        const existing = classes.find(c => c.id === editingClassId);
        if (existing) {
            actions.handleUpsertClass({ ...existing, name: editClassName });
        }
        setEditingClassId(null);
        setEditClassName('');
    };

    const handleDeleteClass = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta turma? Os protagonistas vinculados ficarão "Sem Turma".')) {
            actions.handleDeleteClass(id);
            if (selectedClassId === id) {
                setViewMode('DASHBOARD');
                setSelectedClassId('');
            }
        }
    };

    const handleDeleteSubject = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta disciplina? Os registros de frequência vinculados serão mantidos na planilha, mas não aparecerão no app.')) {
            actions.handleDeleteSubject(id);
            if (selectedSubjectId === id) {
                setSelectedSubjectId(subjects.find(s => s.id !== id)?.id || '');
            }
        }
    };

    return (
        <div className="flex h-screen bg-slate-100 overflow-hidden relative">

            {/* Backdrop for mobile sidebar */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Class & Subject Management */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 flex flex-col shrink-0
                transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <School className="text-indigo-400" size={24} />
                        <h1 className="font-black text-white tracking-tighter text-lg uppercase">Frequência</h1>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-500 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 mb-4 mt-2">Visão Geral</div>

                    <button
                        onClick={() => { setViewMode('DASHBOARD'); setIsSidebarOpen(false); }}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 mb-1 ${viewMode === 'DASHBOARD'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 font-bold'
                            : 'hover:bg-slate-800 text-slate-400'
                            }`}
                    >
                        <LayoutDashboard size={20} />
                        <span className="text-sm">Dashboard</span>
                    </button>

                    <button
                        onClick={() => { setViewMode('STUDENTS'); setIsSidebarOpen(false); }}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${viewMode === 'STUDENTS'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 font-bold'
                            : 'hover:bg-slate-800 text-slate-400'
                            }`}
                    >
                        <Users size={20} />
                        <span className="text-sm">Protagonistas</span>
                    </button>

                    {/* Disciplinas Section */}
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 mb-4 mt-8">Disciplinas</div>
                    {subjects.map(s => (
                        <div key={s.id} className={`group flex items-center gap-1 w-full rounded-xl transition-all pr-2 mb-1 border ${selectedSubjectId === s.id
                            ? 'bg-slate-800 text-white border-slate-700/50'
                            : 'hover:bg-slate-800/50 border-transparent'
                            }`}>
                            {editingSubjectId === s.id ? (
                                <div className="flex items-center gap-1 flex-1 p-2">
                                    <input
                                        className="w-full bg-slate-700 text-white text-xs p-2 rounded-lg border border-slate-600 focus:outline-none focus:border-indigo-500"
                                        value={editSubjectName}
                                        onChange={e => setEditSubjectName(e.target.value)}
                                        autoFocus
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleSaveEditSubject();
                                            if (e.key === 'Escape') setEditingSubjectId(null);
                                        }}
                                    />
                                    <button onClick={handleSaveEditSubject} className="text-emerald-400 hover:text-emerald-300 p-1"><Check size={14} /></button>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={() => { setSelectedSubjectId(s.id); }}
                                        className="flex-1 text-left px-4 py-3 flex items-center gap-3 overflow-hidden"
                                    >
                                        <BookOpen size={18} className={selectedSubjectId === s.id ? "text-indigo-400" : "text-slate-500"} />
                                        <span className={`truncate text-sm ${selectedSubjectId === s.id ? 'font-bold' : 'font-medium'}`}>{s.name}</span>
                                    </button>
                                    <div className="hidden group-hover:flex items-center gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); setEditingSubjectId(s.id); setEditSubjectName(s.name); }} className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-slate-700"><Pencil size={14} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteSubject(s.id); }} className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-700"><Trash2 size={14} /></button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                    {isAddingSubject ? (
                        <div className="p-3 bg-slate-800 rounded-xl mt-3 animate-fade-in">
                            <input
                                autoFocus
                                className="w-full bg-slate-700 text-white text-sm p-2 rounded-lg border border-slate-600 mb-3 focus:outline-none focus:border-indigo-500"
                                placeholder="Nome da Disciplina"
                                value={newSubjectName}
                                onChange={e => setNewSubjectName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCreateSubject()}
                            />
                            <div className="flex gap-2">
                                <button onClick={handleCreateSubject} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-2 rounded-lg font-bold flex-1">Salvar</button>
                                <button onClick={() => setIsAddingSubject(false)} className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-2 rounded-lg font-bold flex-1">Cancelar</button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsAddingSubject(true)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all border border-dashed border-slate-700 mt-3"
                        >
                            <Plus size={18} /> Nova Disciplina
                        </button>
                    )}

                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 mb-4 mt-8">Turmas</div>
                    {classes.map(c => (
                        <div key={c.id} className={`group flex items-center gap-1 w-full rounded-xl transition-all pr-2 mb-1 border ${selectedClassId === c.id && viewMode === 'CLASS'
                            ? 'bg-indigo-600/20 text-white border-indigo-500/30'
                            : 'hover:bg-slate-800 border-transparent'
                            }`}>
                            {editingClassId === c.id ? (
                                <div className="flex items-center gap-1 flex-1 p-2">
                                    <input
                                        className="w-full bg-slate-700 text-white text-xs p-2 rounded-lg border border-slate-600 focus:outline-none focus:border-indigo-500"
                                        value={editClassName}
                                        onChange={e => setEditClassName(e.target.value)}
                                        autoFocus
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleSaveEditClass();
                                            if (e.key === 'Escape') setEditingClassId(null);
                                        }}
                                    />
                                    <button onClick={handleSaveEditClass} className="text-emerald-400 hover:text-emerald-300 p-1"><Check size={14} /></button>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={() => { setSelectedClassId(c.id); setViewMode('CLASS'); setIsSidebarOpen(false); }}
                                        className="flex-1 text-left px-4 py-3 flex items-center gap-3 overflow-hidden"
                                    >
                                        <GraduationCap size={18} className={selectedClassId === c.id && viewMode === 'CLASS' ? "text-indigo-400" : "text-slate-500"} />
                                        <span className={`truncate text-sm ${selectedClassId === c.id && viewMode === 'CLASS' ? 'font-bold underline decoration-indigo-500/50 underline-offset-4' : 'font-medium'}`}>{c.name}</span>
                                    </button>
                                    <div className="hidden group-hover:flex items-center gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); handleStartEditClass(c); }} className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-slate-700"><Pencil size={14} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteClass(c.id); }} className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-700"><Trash2 size={14} /></button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}

                    {isAddingClass ? (
                        <div className="p-3 bg-slate-800 rounded-xl mt-3 animate-fade-in">
                            <input
                                autoFocus
                                className="w-full bg-slate-700 text-white text-sm p-2 rounded-lg border border-slate-600 mb-3 focus:outline-none focus:border-indigo-500"
                                placeholder="Nome da Turma"
                                value={newEntryName}
                                onChange={e => setNewEntryName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCreateClass()}
                            />
                            <div className="flex gap-2">
                                <button onClick={handleCreateClass} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-2 rounded-lg font-bold flex-1">Salvar</button>
                                <button onClick={() => setIsAddingClass(false)} className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-2 rounded-lg font-bold flex-1">Cancelar</button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsAddingClass(true)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all border border-dashed border-slate-700 mt-3"
                        >
                            <Plus size={18} /> Nova Turma
                        </button>
                    )}

                    <div className="mt-12 px-2 border-t border-slate-800 pt-6 px-1">
                        <button
                            onClick={() => { setIsConfigBimesters(true); setIsSidebarOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                        >
                            <Settings size={20} /> Configurar Bimestres
                        </button>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-800 text-[10px] font-black text-center text-slate-600 uppercase tracking-widest">
                    v2.5 • Protagonismo Digital
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Top Navigation Bar */}
                <header className="bg-white border-b border-slate-200 h-16 md:h-20 shrink-0 flex items-center px-4 md:px-6 sticky top-0 z-30 justify-between gap-4">

                    <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-2 -ml-2 text-indigo-600 bg-indigo-50 rounded-xl transition-all active:scale-90 border border-indigo-100"
                        >
                            <LayoutDashboard size={20} className="md:size-6" />
                        </button>

                        {viewMode === 'CLASS' ? (
                            <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <h2 className="text-sm md:text-lg font-black text-slate-800 truncate">{currentClass?.name}</h2>
                                    <span className="text-slate-300 shrink-0">|</span>
                                    <h3 className="text-xs md:text-base font-bold text-indigo-600 truncate flex items-center gap-1">
                                        <BookOpen size={14} className="md:size-4 shrink-0" /> {currentSubject?.name || "Sem Disciplina"}
                                    </h3>
                                </div>
                                <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-200 w-fit mt-0.5">
                                    <button
                                        onClick={() => {
                                            if (month === 0) { setMonth(11); setYear(y => y - 1); }
                                            else { setMonth(m => m - 1); }
                                        }}
                                        className="p-1 hover:bg-white rounded-md transition-all"
                                    >
                                        <ChevronLeft size={16} className="text-slate-600" />
                                    </button>
                                    <div className="px-2 font-black text-[10px] md:text-xs text-slate-700 uppercase tracking-tighter min-w-[100px] text-center">
                                        {MONTH_NAMES[month]} {year}
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (month === 11) { setMonth(0); setYear(y => y + 1); }
                                            else { setMonth(m => m + 1); }
                                        }}
                                        className="p-1 hover:bg-white rounded-md transition-all"
                                    >
                                        <ChevronRight size={16} className="text-slate-600" />
                                    </button>
                                </div>
                            </div>
                        ) : viewMode === 'STUDENTS' ? (
                            <h2 className="text-sm md:text-lg font-black text-slate-800 flex items-center gap-2 truncate">
                                <Users size={20} className="text-indigo-600 shrink-0" />
                                <span className="truncate uppercase tracking-tight">Protagonistas</span>
                            </h2>
                        ) : (
                            <h2 className="text-sm md:text-lg font-black text-slate-800 flex items-center gap-2 truncate">
                                <LayoutDashboard size={20} className="text-indigo-600 shrink-0" />
                                <span className="truncate uppercase tracking-tight">Painel Analítico</span>
                            </h2>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {viewMode === 'CLASS' && (
                            <div className="hidden sm:flex items-center gap-2 bg-slate-50 h-10 border border-slate-200 rounded-xl px-3 group focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                                <Filter size={14} className="text-slate-400" />
                                <select
                                    className="bg-transparent text-xs font-bold text-slate-600 outline-none cursor-pointer"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as EnrollmentStatus | 'ALL')}
                                >
                                    <option value="ALL">Todos</option>
                                    {Object.values(EnrollmentStatus).map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="md:hidden">
                            {/* Additional mobile actions if needed */}
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden relative">
                    {viewMode === 'CLASS' ? (
                        <main className="h-full flex flex-col p-4 md:p-6 bg-slate-100/30">
                            <div className="flex flex-wrap gap-2 md:gap-4 mb-4 text-[10px] font-black uppercase tracking-widest px-1">
                                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    <span className="text-slate-600">Presente</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                    <span className="text-slate-600">Falta</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                    <span className="text-slate-600">Justificada</span>
                                </div>
                            </div>

                            <AttendanceGrid
                                students={classStudents}
                                dates={dateList}
                                attendance={attendance}
                                subjectId={selectedSubjectId}
                                dailyLessonCounts={dailyLessonCounts}
                                onToggleStatus={(sid, date, idx) => actions.handleToggleStatus(sid, date, idx, selectedSubjectId)}
                                onSelectStudent={setSelectedStudent}
                                onUpdateLessonCount={actions.handleUpdateLessonCount}
                            />
                        </main>
                    ) : viewMode === 'STUDENTS' ? (
                        <StudentManager
                            students={allStudents}
                            classes={classes}
                            onAddStudent={actions.handleAddStudent}
                            onUpdateStudent={actions.handleUpdateStudent}
                            onDeleteStudent={actions.handleDeleteStudent}
                            onBatchAdd={actions.handleBatchAddStudents}
                        />
                    ) : (
                        <GlobalDashboard
                            students={allStudents}
                            classes={classes}
                            subjects={subjects}
                            attendance={attendance}
                            bimesters={bimesters}
                            year={year}
                        />
                    )}
                </div>
            </div>

            {/* Bimester Config Modal */}
            {isConfigBimesters && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsConfigBimesters(false)} />
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in relative">
                        <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-lg uppercase tracking-tight flex items-center gap-2"><CalendarRange size={22} className="text-indigo-400" /> Ciclo Escolar</h3>
                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">Configuração de Bimestres</p>
                            </div>
                            <button onClick={() => setIsConfigBimesters(false)} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
                        </div>
                        <div className="p-6 md:p-8">
                            <div className="space-y-3">
                                {bimesters.map((bim) => (
                                    <div key={bim.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border border-slate-100 rounded-2xl bg-slate-50 transition-all hover:bg-slate-100/50">
                                        <span className="text-xs font-black text-slate-800 uppercase tracking-tight w-24 shrink-0">{bim.name}</span>
                                        <div className="flex items-center gap-2 flex-1">
                                            <input
                                                type="date"
                                                className="flex-1 p-2 bg-white text-sm font-bold border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                value={bim.start}
                                                onChange={(e) => {
                                                    const updated = bimesters.map(b => b.id === bim.id ? { ...b, start: e.target.value } : b);
                                                    actions.handleUpdateBimesters(updated);
                                                }}
                                            />
                                            <div className="w-4 h-px bg-slate-300 shrink-0" />
                                            <input
                                                type="date"
                                                className="flex-1 p-2 bg-white text-sm font-bold border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                value={bim.end}
                                                onChange={(e) => {
                                                    const updated = bimesters.map(b => b.id === bim.id ? { ...b, end: e.target.value } : b);
                                                    actions.handleUpdateBimesters(updated);
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8">
                                <button
                                    onClick={() => setIsConfigBimesters(false)}
                                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 text-sm font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98]"
                                >
                                    Salvar Alterações
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {selectedStudent && (
                <StudentDetailModal
                    student={selectedStudent}
                    attendanceRecord={(attendance[selectedSubjectId] || {})[selectedStudent.id] || {}}
                    year={year}
                    bimesters={bimesters}
                    onClose={() => setSelectedStudent(null)}
                />
            )}

            {/* Loading Overlay */}
            {isLoading && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/60 backdrop-blur-lg">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                        <School className="absolute inset-0 m-auto text-indigo-600" size={24} />
                    </div>
                    <p className="text-slate-800 font-black uppercase tracking-[0.2em] text-[10px] mt-6 animate-pulse">Sincronizando Dados</p>
                </div>
            )}
        </div>
    );
};

export default App;