import React, { useState, useMemo } from 'react';
import {
    MOCK_STUDENTS_POOL,
    MOCK_CLASSES,
    CURRENT_YEAR,
    MONTH_NAMES,
    BIMESTERS as INITIAL_BIMESTERS
} from './constants';
import { Student, ClassAttendance, AttendanceStatus, ClassGroup, EnrollmentStatus, BimesterConfig } from './types';
import AttendanceGrid from './components/AttendanceGrid';
import StudentDetailModal from './components/StudentDetailModal';
import GlobalDashboard from './components/GlobalDashboard';
import StudentManager from './components/StudentManager';
import { ChevronLeft, ChevronRight, Plus, GraduationCap, School, X, Settings, Filter, CalendarRange, LayoutDashboard, Users, Pencil, Trash2, Check, Clock, Loader2 } from 'lucide-react';
import { schoolApi } from './services/api';

type ViewMode = 'CLASS' | 'DASHBOARD' | 'STUDENTS';

const App: React.FC = () => {
    // --- STATE ---

    // Data State
    const [classes, setClasses] = useState<ClassGroup[]>(MOCK_CLASSES);
    const [allStudents, setAllStudents] = useState<Student[]>(MOCK_STUDENTS_POOL);
    const [attendance, setAttendance] = useState<ClassAttendance>({});
    const [bimesters, setBimesters] = useState<BimesterConfig[]>(INITIAL_BIMESTERS);

    // Configuration State: Map date string -> number of lessons (default 1)
    const [dailyLessonCounts, setDailyLessonCounts] = useState<Record<string, number>>({});

    // API/Loading State
    const [isLoading, setIsLoading] = useState(true);

    // Load Data from API
    React.useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            const data = await schoolApi.getAllData();
            if (data) {
                if (data.classes?.length) setClasses(data.classes);
                if (data.students?.length) setAllStudents(data.students);
                if (data.attendance) setAttendance(data.attendance);
                if (data.bimesters?.length) setBimesters(data.bimesters);
                if (typeof data.settings === 'object') {
                    // Filter daily lesson counts from settings
                    const counts: Record<string, number> = {};
                    Object.entries(data.settings).forEach(([k, v]) => {
                        if (k.startsWith('lessonCount_')) counts[k.replace('lessonCount_', '')] = Number(v);
                    });
                    setDailyLessonCounts(counts);
                }
            }
            setIsLoading(false);
        };
        loadInitialData();
    }, []);

    // Navigation State
    const [viewMode, setViewMode] = useState<ViewMode>('CLASS');
    const [selectedClassId, setSelectedClassId] = useState<string>(MOCK_CLASSES[0]?.id || '');
    const [year, setYear] = useState<number>(CURRENT_YEAR);
    const [month, setMonth] = useState<number>(new Date().getMonth()); // 0-11

    // UI/Modal State
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isAddingClass, setIsAddingClass] = useState(false);
    const [isConfigBimesters, setIsConfigBimesters] = useState(false);

    // Edit Class State
    const [editingClassId, setEditingClassId] = useState<string | null>(null);
    const [editClassName, setEditClassName] = useState('');

    // Filters
    const [statusFilter, setStatusFilter] = useState<EnrollmentStatus | 'ALL'>('ALL');

    // Form State
    const [newEntryName, setNewEntryName] = useState('');

    // --- DERIVED DATA ---

    const currentClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);

    const classStudents = useMemo(() => {
        if (!currentClass) return [];

        // Filter by Student.classId
        let filtered = allStudents.filter(s => s.classId === currentClass.id);

        // Apply Status Filter
        if (statusFilter !== 'ALL') {
            filtered = filtered.filter(s => s.status === statusFilter);
        }

        return filtered;
    }, [currentClass, allStudents, statusFilter]);

    const daysInMonth = useMemo(() => {
        return new Date(year, month + 1, 0).getDate();
    }, [year, month]);

    const dateList = useMemo(() => {
        const dates: string[] = [];
        for (let i = 1; i <= daysInMonth; i++) {
            dates.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
        }
        return dates;
    }, [year, month, daysInMonth]);

    // --- HANDLERS ---

    const handleUpdateLessonCount = (date: string, newCount: number) => {
        setDailyLessonCounts(prev => ({
            ...prev,
            [date]: newCount
        }));
        schoolApi.updateSetting(`lessonCount_${date}`, newCount);
    };

    const handleToggleStatus = (studentId: string, date: string, lessonIndex: number) => {
        setAttendance(prev => {
            const studentRecord = prev[studentId] || {};

            const currentDayLimit = dailyLessonCounts[date] || 1;

            // Get existing array or create a new filled one based on current limit for that day
            const currentDailyStatuses = studentRecord[date]
                ? [...studentRecord[date]]
                : Array(currentDayLimit).fill(AttendanceStatus.UNDEFINED);

            // Ensure array is big enough for the index being toggled (in case config changed)
            while (currentDailyStatuses.length <= lessonIndex) {
                currentDailyStatuses.push(AttendanceStatus.UNDEFINED);
            }

            const currentStatus = currentDailyStatuses[lessonIndex] || AttendanceStatus.UNDEFINED;

            let nextStatus: AttendanceStatus;

            if (currentStatus === AttendanceStatus.UNDEFINED) nextStatus = AttendanceStatus.PRESENT;
            else if (currentStatus === AttendanceStatus.PRESENT) nextStatus = AttendanceStatus.ABSENT;
            else if (currentStatus === AttendanceStatus.ABSENT) nextStatus = AttendanceStatus.EXCUSED;
            else nextStatus = AttendanceStatus.UNDEFINED;

            currentDailyStatuses[lessonIndex] = nextStatus;

            const nextDaily = { ...studentRecord, [date]: currentDailyStatuses };

            // Persist to API
            schoolApi.saveAttendance(studentId, date, currentDailyStatuses);

            return { ...prev, [studentId]: nextDaily };
        });
    };

    // Student Management Handlers
    const handleAddStudent = (student: Student) => {
        setAllStudents(prev => [...prev, student]);
        schoolApi.upsertStudent(student);
    };

    const handleUpdateStudent = (updatedStudent: Student) => {
        setAllStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
        schoolApi.upsertStudent(updatedStudent);
    };

    const handleDeleteStudent = (id: string) => {
        setAllStudents(prev => prev.filter(s => s.id !== id));
        schoolApi.deleteStudent(id);
    };

    const handleBatchAddStudents = (names: string[], classId: string, status: EnrollmentStatus) => {
        const newStudents: Student[] = names.map((name, idx) => ({
            id: `s-${Date.now()}-${idx}`,
            name: name,
            classId: classId,
            status: status
        }));
        setAllStudents(prev => [...prev, ...newStudents]);
    };

    const handleCreateClass = () => {
        if (!newEntryName.trim()) return;
        const newClass: ClassGroup = {
            id: `c-${Date.now()}`,
            name: newEntryName,
            // Students start empty, populatd via StudentManager
        };
        setClasses([...classes, newClass]);
        setSelectedClassId(newClass.id);
        setViewMode('CLASS');
        setNewEntryName('');
        setIsAddingClass(false);
        schoolApi.upsertClass(newClass);
    };

    const handleStartEditClass = (c: ClassGroup) => {
        setEditingClassId(c.id);
        setEditClassName(c.name);
    };

    const handleSaveEditClass = () => {
        const updated = { ...classes.find(c => c.id === editingClassId)!, name: editClassName };
        setClasses(prev => prev.map(c => c.id === editingClassId ? updated : c));
        setEditingClassId(null);
        setEditClassName('');
        schoolApi.upsertClass(updated);
    };

    const handleDeleteClass = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta turma? Os alunos vinculados ficarão "Sem Turma".')) {
            setClasses(prev => prev.filter(c => c.id !== id));
            // Remove class association from students
            setAllStudents(prev => prev.map(s => s.classId === id ? { ...s, classId: undefined } : s));

            if (selectedClassId === id) {
                setViewMode('DASHBOARD');
                setSelectedClassId('');
            }
            schoolApi.deleteClass(id);
        }
    };

    const updateBimesterConfig = (id: number, field: 'start' | 'end', value: string) => {
        const updated = bimesters.map(b =>
            b.id === id ? { ...b, [field]: value } : b
        );
        setBimesters(updated);
        schoolApi.updateBimesters(updated);
    };

    return (
        <div className="flex h-screen bg-slate-100 overflow-hidden">

            {/* Sidebar - Class Management */}
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
                            <div className="flex items-center gap-3">
                                <div className="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200">
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
                                            <option value="ALL">Todos os Alunos</option>
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
                            dailyLessonCounts={dailyLessonCounts}
                            onToggleStatus={handleToggleStatus}
                            onSelectStudent={setSelectedStudent}
                            onUpdateLessonCount={handleUpdateLessonCount}
                        />
                    </main>
                ) : viewMode === 'STUDENTS' ? (
                    <StudentManager
                        students={allStudents}
                        classes={classes}
                        onAddStudent={handleAddStudent}
                        onUpdateStudent={handleUpdateStudent}
                        onDeleteStudent={handleDeleteStudent}
                        onBatchAdd={handleBatchAddStudents}
                    />
                ) : (
                    <GlobalDashboard
                        students={allStudents}
                        classes={classes}
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
                                                onChange={(e) => updateBimesterConfig(bim.id, 'start', e.target.value)}
                                            />
                                            <span className="text-slate-400 text-xs">até</span>
                                            <input
                                                type="date"
                                                className="flex-1 p-1 text-sm border rounded text-slate-600"
                                                value={bim.end}
                                                onChange={(e) => updateBimesterConfig(bim.id, 'end', e.target.value)}
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
                    attendanceRecord={attendance[selectedStudent.id] || {}}
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