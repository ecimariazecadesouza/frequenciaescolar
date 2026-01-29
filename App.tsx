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
        <div className="flex h-screen bg-slate-100 overflow-hidden">

            {/* Sidebar - Class & Subject Management */}
            <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-800 flex items-center gap-2">
                    <School className="text-indigo-400" />
                    <h1 className="font-bold text-white tracking-tight">Frequência Escolar</h1>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2 mt-2">Visão Geral</div>

                    <button
                        onClick={() => setViewMode('DASHBOARD')}
                        className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-2 ${viewMode === 'DASHBOARD'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'hover:bg-slate-800 text-slate-300'
                            }`}
                    >
                        <LayoutDashboard size={18} />
                        <span className="text-sm font-medium">Dashboard</span>
                    </button>

                    <button
                        onClick={() => setViewMode('STUDENTS')}
                        className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-2 ${viewMode === 'STUDENTS'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'hover:bg-slate-800 text-slate-300'
                            }`}
                    >
                        <Users size={18} />
                        <span className="text-sm font-medium">Protagonistas</span>
                    </button>

                    {/* Disciplinas Section */}
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2 mt-6">Minhas Disciplinas</div>
                    {subjects.map(s => (
                        <div key={s.id} className={`group flex items-center gap-1 w-full rounded-md transition-colors pr-2 ${selectedSubjectId === s.id
                            ? 'bg-slate-800 text-white border border-slate-700'
                            : 'hover:bg-slate-800/50'
                            }`}>
                            {editingSubjectId === s.id ? (
                                <div className="flex items-center gap-1 flex-1 p-1">
                                    <input
                                        className="w-full bg-slate-700 text-white text-xs p-1.5 rounded border border-slate-600 focus:outline-none focus:border-indigo-500"
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
                                        onClick={() => setSelectedSubjectId(s.id)}
                                        className="flex-1 text-left px-3 py-2 flex items-center gap-2 overflow-hidden"
                                    >
                                        <BookOpen size={16} className={selectedSubjectId === s.id ? "text-indigo-400" : "text-slate-500"} />
                                        <span className={`truncate text-sm ${selectedSubjectId === s.id ? 'font-bold' : 'font-medium'}`}>{s.name}</span>
                                    </button>
                                    <div className="hidden group-hover:flex items-center gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); setEditingSubjectId(s.id); setEditSubjectName(s.name); }} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700"><Pencil size={12} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteSubject(s.id); }} className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-700"><Trash2 size={12} /></button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                    {isAddingSubject ? (
                        <div className="p-2 bg-slate-800 rounded mt-2">
                            <input
                                autoFocus
                                className="w-full bg-slate-700 text-white text-sm p-1.5 rounded border border-slate-600 mb-2 focus:outline-none focus:border-indigo-500"
                                placeholder="Nome da Disciplina"
                                value={newSubjectName}
                                onChange={e => setNewSubjectName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCreateSubject()}
                            />
                            <div className="flex gap-2">
                                <button onClick={handleCreateSubject} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-2 py-1 rounded flex-1">Salvar</button>
                                <button onClick={() => setIsAddingSubject(false)} className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-2 py-1 rounded flex-1">Cancelar</button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsAddingSubject(true)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-white hover:bg-slate-800 rounded-md transition-colors border border-dashed border-slate-700 mt-2"
                        >
                            <Plus size={16} /> Nova Disciplina
                        </button>
                    )}

                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2 mt-6">Minhas Turmas</div>
                    {classes.map(c => (
                        <div key={c.id} className={`group flex items-center gap-1 w-full rounded-md transition-colors pr-2 ${selectedClassId === c.id && viewMode === 'CLASS'
                            ? 'bg-indigo-600/50 text-white border border-indigo-500/50'
                            : 'hover:bg-slate-800'
                            }`}>
                            {editingClassId === c.id ? (
                                <div className="flex items-center gap-1 flex-1 p-1">
                                    <input
                                        className="w-full bg-slate-700 text-white text-xs p-1.5 rounded border border-slate-600 focus:outline-none focus:border-indigo-500"
                                        value={editClassName}
                                        onChange={e => setEditClassName(e.target.value)}
                                        autoFocus
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleSaveEditClass();
                                            if (e.key === 'Escape') setEditingClassId(null);
                                        }}
                                    />
                                    <button onClick={handleSaveEditClass} className="text-emerald-400 hover:text-emerald-300 p-1"><Check size={14} /></button>
                                    <button onClick={() => setEditingClassId(null)} className="text-rose-400 hover:text-rose-300 p-1"><X size={14} /></button>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={() => { setSelectedClassId(c.id); setViewMode('CLASS'); }}
                                        className="flex-1 text-left px-3 py-2 flex items-center gap-2 overflow-hidden"
                                    >
                                        <GraduationCap size={16} className="shrink-0" />
                                        <span className="truncate text-sm font-medium">{c.name}</span>
                                    </button>
                                    <div className="hidden group-hover:flex items-center gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); handleStartEditClass(c); }} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700"><Pencil size={12} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteClass(c.id); }} className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-700"><Trash2 size={12} /></button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}

                    {isAddingClass ? (
                        <div className="p-2 bg-slate-800 rounded mt-2">
                            <input
                                autoFocus
                                className="w-full bg-slate-700 text-white text-sm p-1.5 rounded border border-slate-600 mb-2 focus:outline-none focus:border-indigo-500"
                                placeholder="Nome da Turma"
                                value={newEntryName}
                                onChange={e => setNewEntryName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCreateClass()}
                            />
                            <div className="flex gap-2">
                                <button onClick={handleCreateClass} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-2 py-1 rounded flex-1">Salvar</button>
                                <button onClick={() => setIsAddingClass(false)} className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-2 py-1 rounded flex-1">Cancelar</button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsAddingClass(true)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors border border-dashed border-slate-700 mt-2"
                        >
                            <Plus size={16} /> Nova Turma
                        </button>
                    )}

                    <div className="mt-8 px-2 border-t border-slate-800 pt-4">
                        <button
                            onClick={() => setIsConfigBimesters(true)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                        >
                            <Settings size={16} /> Configurar Bimestres
                        </button>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-800 text-xs text-center text-slate-500">
                    © 2026 Frequência Escolar
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Top Navigation Bar */}
                <header className="bg-white border-b border-gray-200 p-4 flex flex-wrap items-center justify-between gap-4">

                    <div className="flex items-center gap-4">
                        {viewMode === 'CLASS' ? (
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold text-slate-800">{currentClass?.name}</h2>
                                    <span className="text-slate-300">|</span>
                                    <h3 className="text-base font-medium text-indigo-600 flex items-center gap-1">
                                        <BookOpen size={16} /> {currentSubject?.name || "Sem Disciplina"}
                                    </h3>
                                </div>
                                <div className="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200 w-fit">
                                    <button
                                        onClick={() => {
                                            if (month === 0) { setMonth(11); setYear(y => y - 1); }
                                            else { setMonth(m => m - 1); }
                                        }}
                                        className="p-1 hover:bg-white rounded-md transition-shadow shadow-sm"
                                    >
                                        <ChevronLeft size={18} className="text-gray-600" />
                                    </button>
                                    <div className="px-4 font-semibold text-gray-700 min-w-[140px] text-center">
                                        {MONTH_NAMES[month]} {year}
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (month === 11) { setMonth(0); setYear(y => y + 1); }
                                            else { setMonth(m => m + 1); }
                                        }}
                                        className="p-1 hover:bg-white rounded-md transition-shadow shadow-sm"
                                    >
                                        <ChevronRight size={18} className="text-gray-600" />
                                    </button>
                                </div>
                            </div>
                        ) : viewMode === 'STUDENTS' ? (
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Users size={20} className="text-indigo-600" />
                                Gerenciar Protagonistas
                            </h2>
                        ) : (
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <LayoutDashboard size={20} className="text-indigo-600" />
                                Painel Geral de Frequência
                            </h2>
                        )}
                    </div>

                    {viewMode === 'CLASS' && (
                        <div className="flex items-center gap-3">
                            {currentClass && (
                                <>
                                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                                        <Filter size={14} className="text-gray-400" />
                                        <select
                                            className="bg-transparent text-sm text-gray-600 outline-none cursor-pointer"
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value as EnrollmentStatus | 'ALL')}
                                        >
                                            <option value="ALL">Todos os Protagonistas</option>
                                            {Object.values(EnrollmentStatus).map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </header>

                {/* Content Area */}
                {viewMode === 'CLASS' ? (
                    <main className="flex-1 overflow-hidden flex flex-col p-4 bg-slate-50/50">
                        <div className="flex flex-wrap gap-4 mb-3 text-xs font-medium px-1">
                            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                <span className="text-slate-600">Presente (P)</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                                <span className="text-slate-600">Falta (F)</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                <span className="text-slate-600">Justificada (J)</span>
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

            {/* Bimester Config Modal */}
            {isConfigBimesters && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2"><CalendarRange size={18} /> Configuração de Bimestres</h3>
                            <button onClick={() => setIsConfigBimesters(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-500 mb-4">Defina as datas de início e fim para cada período escolar. Isso afetará os cálculos dos relatórios.</p>

                            <div className="space-y-4">
                                {bimesters.map((bim) => (
                                    <div key={bim.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 border border-gray-200 rounded-lg bg-gray-50">
                                        <span className="text-sm font-bold text-slate-700 w-24">{bim.name}</span>
                                        <div className="flex items-center gap-2 flex-1">
                                            <input
                                                type="date"
                                                className="flex-1 p-1 text-sm border rounded text-slate-600"
                                                value={bim.start}
                                                onChange={(e) => {
                                                    const updated = bimesters.map(b => b.id === bim.id ? { ...b, start: e.target.value } : b);
                                                    actions.handleUpdateBimesters(updated);
                                                }}
                                            />
                                            <span className="text-slate-400 text-xs">até</span>
                                            <input
                                                type="date"
                                                className="flex-1 p-1 text-sm border rounded text-slate-600"
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

                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={() => setIsConfigBimesters(false)}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                                >
                                    Concluir
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
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                    <p className="text-slate-600 font-medium italic">Sincronizando com Google Sheets...</p>
                </div>
            )}
        </div>
    );
};

export default App;