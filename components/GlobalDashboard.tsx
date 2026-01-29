import React, { useMemo, useState } from 'react';
import { Student, ClassGroup, ClassAttendance, BimesterConfig, AttendanceStatus, EnrollmentStatus, Subject } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { AlertTriangle, TrendingUp, Users, Calendar, Filter, UserCheck, UserMinus, ArrowRightLeft, HelpCircle, BookOpen, Search, LayoutList, ShieldAlert } from 'lucide-react';
import { ENROLLMENT_COLORS } from '../constants';

interface Props {
    students: Student[];
    classes: ClassGroup[];
    subjects: Subject[];
    attendance: ClassAttendance;
    bimesters: BimesterConfig[];
    year: number;
}

const GlobalDashboard: React.FC<Props> = ({ students, classes, subjects, attendance, bimesters, year }) => {
    const [classFilter, setClassFilter] = useState('ALL');
    const [subjectFilter, setSubjectFilter] = useState('ALL');
    const [bimesterFilter, setBimesterFilter] = useState('ALL');
    const [displayMode, setDisplayMode] = useState<'RISKS' | 'INDIVIDUAL'>('RISKS');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredStudents = useMemo(() => {
        let list = classFilter === 'ALL'
            ? students
            : students.filter(s => s.classId === classFilter);

        if (searchTerm) {
            list = list.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        return list;
    }, [students, classFilter, searchTerm]);

    const stats = useMemo(() => {
        let totalPresent = 0;
        let totalAbsent = 0;
        let totalExcused = 0;
        let totalRecordedLessons = 0;

        // Status Counts
        const statusCounts = {
            [EnrollmentStatus.ACTIVE]: 0,
            [EnrollmentStatus.DROPOUT]: 0,
            [EnrollmentStatus.TRANSFERRED]: 0,
            [EnrollmentStatus.OTHER]: 0
        };

        filteredStudents.forEach(s => {
            if (statusCounts[s.status] !== undefined) {
                statusCounts[s.status]++;
            } else {
                statusCounts[EnrollmentStatus.OTHER]++;
            }
        });

        // Bimester Stats
        const bimesterData = bimesters.map(bim => {
            let bimPresent = 0;
            let bimAbsent = 0;
            let bimTotal = 0;
            const start = new Date(bim.start);
            const end = new Date(bim.end);

            filteredStudents.forEach(student => {
                Object.entries(attendance).forEach(([subId, subjectRecord]) => {
                    if (subjectFilter !== 'ALL' && subId !== subjectFilter) return;

                    const record = subjectRecord[student.id] || {};
                    Object.entries(record).forEach(([dateStr, statuses]: [string, AttendanceStatus[]]) => {
                        const date = new Date(dateStr + 'T12:00:00');
                        if (date >= start && date <= end) {
                            statuses.forEach(status => {
                                // Important: We only count EXPLICIT statuses. UNDEFINED is ignored.
                                if (status !== AttendanceStatus.UNDEFINED) {
                                    if (status === AttendanceStatus.PRESENT) bimPresent++;
                                    if (status === AttendanceStatus.ABSENT) bimAbsent++;
                                    if (status === AttendanceStatus.EXCUSED) bimPresent++; // Excused counts as presence for frequency

                                    bimTotal++;

                                    // Global totals respect bimester filter
                                    const isBimesterMatch = bimesterFilter === 'ALL' || bim.id === bimesterFilter;
                                    if (isBimesterMatch) {
                                        if (status === AttendanceStatus.PRESENT) totalPresent++;
                                        if (status === AttendanceStatus.ABSENT) totalAbsent++;
                                        if (status === AttendanceStatus.EXCUSED) totalExcused++;
                                        totalRecordedLessons++;
                                    }
                                }
                            });
                        }
                    });
                });
            });

            return {
                id: bim.id,
                name: bim.name,
                Presenças: bimPresent,
                Faltas: bimAbsent,
                Taxa: bimTotal > 0 ? ((bimPresent / bimTotal) * 100).toFixed(1) : 0
            };
        });

        // Protagonista Details
        const protagonistaDetails = filteredStudents.map(student => {
            let globalPresent = 0;
            let globalTotal = 0;
            let globalAbsentCount = 0;

            const individualBimesterStats = bimesters.map(bim => {
                let bimP = 0, bimA = 0, bimT = 0;
                const start = new Date(bim.start);
                const end = new Date(bim.end);

                Object.entries(attendance).forEach(([subId, subjectRecord]) => {
                    if (subjectFilter !== 'ALL' && subId !== subjectFilter) return;
                    const record = subjectRecord[student.id] || {};
                    Object.entries(record).forEach(([dateStr, statuses]: [string, AttendanceStatus[]]) => {
                        const date = new Date(dateStr + 'T12:00:00');
                        if (date >= start && date <= end) {
                            statuses.forEach(status => {
                                if (status !== AttendanceStatus.UNDEFINED) {
                                    if (status === AttendanceStatus.PRESENT || status === AttendanceStatus.EXCUSED) bimP++;
                                    if (status === AttendanceStatus.ABSENT) bimA++;
                                    bimT++;
                                }
                            });
                        }
                    });
                });
                return {
                    name: bim.name,
                    percentage: bimT > 0 ? (bimP / bimT) * 100 : 100,
                    absent: bimA,
                    total: bimT
                };
            });

            Object.entries(attendance).forEach(([subId, subjectRecord]) => {
                const record = subjectRecord[student.id] || {};
                Object.entries(record).forEach(([dateStr, statuses]: [string, AttendanceStatus[]]) => {
                    const date = new Date(dateStr + 'T12:00:00');
                    let inBimester = true;
                    if (bimesterFilter !== 'ALL') {
                        const bim = bimesters.find(b => b.id === bimesterFilter);
                        if (bim) {
                            const start = new Date(bim.start);
                            const end = new Date(bim.end);
                            inBimester = date >= start && date <= end;
                        }
                    }
                    if (!inBimester) return;

                    statuses.forEach(status => {
                        if (status !== AttendanceStatus.UNDEFINED) {
                            if (status === AttendanceStatus.PRESENT || status === AttendanceStatus.EXCUSED) globalPresent++;
                            if (status === AttendanceStatus.ABSENT) globalAbsentCount++;
                            globalTotal++;
                        }
                    });
                });
            });

            const presencePercentage = globalTotal > 0 ? (globalPresent / globalTotal) * 100 : 100;
            const absencePercentage = globalTotal > 0 ? (globalAbsentCount / globalTotal) * 100 : 0;

            return {
                ...student,
                stats: {
                    percentage: presencePercentage,
                    absencePercentage: absencePercentage,
                    absent: globalAbsentCount,
                    total: globalTotal,
                    bimesters: individualBimesterStats
                }
            };
        });

        const risktList = protagonistaDetails
            .filter(s => {
                const isAtRisk = s.stats.percentage < 75;
                return isAtRisk && s.status === EnrollmentStatus.ACTIVE;
            })
            .sort((a, b) => a.stats.percentage - b.stats.percentage);

        const listToShow = displayMode === 'RISKS' ? risktList : protagonistaDetails;

        // Class Frequency Chart Data
        const relevantClasses = classFilter === 'ALL' ? classes : classes.filter(c => c.id === classFilter);
        const classChartData = relevantClasses.map(cls => {
            const clsStudents = students.filter(s => s.classId === cls.id);
            let cPresent = 0, cTotal = 0;
            clsStudents.forEach(s => {
                Object.entries(attendance).forEach(([subId, subjectRecord]) => {
                    if (subjectFilter !== 'ALL' && subId !== subjectFilter) return;
                    const record = subjectRecord[s.id] || {};
                    Object.entries(record).forEach(([dateStr, statuses]: [string, AttendanceStatus[]]) => {
                        const date = new Date(dateStr + 'T12:00:00');
                        let inBimester = true;
                        if (bimesterFilter !== 'ALL') {
                            const bim = bimesters.find(b => b.id === bimesterFilter);
                            if (bim) {
                                const start = new Date(bim.start);
                                const end = new Date(bim.end);
                                inBimester = date >= start && date <= end;
                            }
                        }
                        if (!inBimester) return;
                        statuses.forEach(status => {
                            if (status !== AttendanceStatus.UNDEFINED) {
                                if (status === AttendanceStatus.PRESENT || status === AttendanceStatus.EXCUSED) cPresent++;
                                cTotal++;
                            }
                        });
                    });
                });
            });
            return { name: cls.name, percentage: cTotal > 0 ? (cPresent / cTotal) * 100 : 0 };
        });

        return {
            bimesterData,
            listToShow,
            totalPresent,
            totalAbsent,
            totalExcused,
            totalRecordedLessons,
            statusCounts,
            classChartData
        };
    }, [students, attendance, bimesters, filteredStudents, classes, subjects, subjectFilter, bimesterFilter, displayMode]);

    const globalRate = stats.totalRecordedLessons > 0
        ? ((stats.totalPresent + stats.totalExcused) / stats.totalRecordedLessons * 100).toFixed(1)
        : "0.0";

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 custom-scrollbar">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Dashboard Header & Filters */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Painel de Indicadores</h2>
                            <p className="text-sm text-slate-500">Inteligência de dados para o sucesso dos Protagonistas</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 flex-1 sm:flex-none">
                            <Filter size={16} className="text-slate-400 ml-2" />
                            <select
                                value={classFilter}
                                onChange={(e) => setClassFilter(e.target.value)}
                                className="bg-transparent text-slate-700 text-sm font-semibold rounded-lg p-1.5 outline-none cursor-pointer w-full"
                            >
                                <option value="ALL">Todas as Turmas</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 flex-1 sm:flex-none">
                            <BookOpen size={16} className="text-slate-400 ml-2" />
                            <select
                                value={subjectFilter}
                                onChange={(e) => setSubjectFilter(e.target.value)}
                                className="bg-transparent text-slate-700 text-sm font-semibold rounded-lg p-1.5 outline-none cursor-pointer w-full"
                            >
                                <option value="ALL">Todas as Disciplinas</option>
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 flex-1 sm:flex-none">
                            <Calendar size={16} className="text-slate-400 ml-2" />
                            <select
                                value={bimesterFilter}
                                onChange={(e) => setBimesterFilter(e.target.value)}
                                className="bg-transparent text-slate-700 text-sm font-semibold rounded-lg p-1.5 outline-none cursor-pointer w-full"
                            >
                                <option value="ALL">Todos os Bimestres</option>
                                {bimesters.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Enrollment Status Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: EnrollmentStatus.ACTIVE, icon: UserCheck, color: ENROLLMENT_COLORS[EnrollmentStatus.ACTIVE] },
                        { label: EnrollmentStatus.DROPOUT, icon: UserMinus, color: ENROLLMENT_COLORS[EnrollmentStatus.DROPOUT] },
                        { label: EnrollmentStatus.TRANSFERRED, icon: ArrowRightLeft, color: ENROLLMENT_COLORS[EnrollmentStatus.TRANSFERRED] },
                        { label: EnrollmentStatus.OTHER, icon: HelpCircle, color: ENROLLMENT_COLORS[EnrollmentStatus.OTHER] }
                    ].map((item) => (
                        <div key={item.label} className={`p-4 rounded-2xl shadow-sm border transition-all hover:scale-105 ${item.color}`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{item.label}</span>
                                <item.icon size={18} className="opacity-50" />
                            </div>
                            <div className="text-3xl font-black tracking-tighter">{stats.statusCounts[item.label]}</div>
                        </div>
                    ))}
                </div>

                {/* Main Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                        <p className="text-slate-500 text-xs font-bold uppercase mb-2">Protagonistas</p>
                        <div className="text-4xl font-black text-indigo-600 tracking-tighter">{filteredStudents.length}</div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                        <p className="text-slate-500 text-xs font-bold uppercase mb-2">Frequência</p>
                        <div className="text-4xl font-black text-emerald-600 tracking-tighter">{globalRate}%</div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                        <p className="text-slate-500 text-xs font-bold uppercase mb-2">Faltas Totais</p>
                        <div className="text-4xl font-black text-amber-500 tracking-tighter">{stats.totalAbsent}</div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                        <p className="text-slate-500 text-xs font-bold uppercase mb-2">Alerta Crítico</p>
                        <div className="text-4xl font-black text-rose-500 tracking-tighter">{stats.listToShow.filter(s => s.stats.percentage < 75).length}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Bimester Evolution */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="text-lg font-black text-slate-800 mb-6 uppercase tracking-tight text-center md:text-left">Desempenho por Bimestre</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.bimesterData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
                                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#f8fafc' }} />
                                    <Bar dataKey="Presenças" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
                                    <Bar dataKey="Faltas" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={32} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Class Comparison */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="text-lg font-black text-slate-800 mb-6 uppercase tracking-tight text-center md:text-left">Média das Turmas (%)</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.classChartData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" domain={[0, 100]} hide />
                                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                    <Bar dataKey="percentage" radius={[0, 4, 4, 0]} barSize={20}>
                                        {stats.classChartData.map((e, i) => <Cell key={i} fill={e.percentage >= 75 ? '#10b981' : '#f43f5e'} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Individual/Risk List */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200">
                                {displayMode === 'RISKS' ? <ShieldAlert className="text-rose-500" /> : <LayoutList className="text-indigo-500" />}
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">Acompanhamento e Monitoramento</h3>
                                <p className="text-xs text-slate-500 font-medium">Análise focada no aproveitamento individual</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {/* Search */}
                            <div className="relative flex-1 md:w-64">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar protagonista..."
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Range Toggle */}
                            <div className="flex p-1 bg-slate-200 rounded-xl">
                                <button
                                    onClick={() => setDisplayMode('RISKS')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${displayMode === 'RISKS' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    RISCOS
                                </button>
                                <button
                                    onClick={() => setDisplayMode('INDIVIDUAL')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${displayMode === 'INDIVIDUAL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    INDIVIDUAL
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar">
                        {stats.listToShow.length === 0 ? (
                            <div className="p-20 text-center">
                                <HelpCircle size={48} className="mx-auto text-slate-200 mb-4" />
                                <p className="text-slate-400 font-bold italic">Nenhum dado encontrado com os filtros atuais.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-100">
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Protagonista / Status</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Turma</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest min-w-[300px]">Evolução Bimestral</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">Métricas do Período</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {stats.listToShow.map(s => {
                                        const sClass = classes.find(c => c.id === s.classId)?.name || 'Sem Turma';
                                        return (
                                            <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-700">{s.name}</span>
                                                        <span className="text-[10px] text-slate-400 font-black uppercase">{s.status}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-xs text-slate-500 font-bold">{sClass}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-3">
                                                        {s.stats.bimesters.map((bim, idx) => (
                                                            <div key={idx} className="flex flex-col items-center p-2 rounded-xl bg-white border border-slate-200/50 min-w-[70px]">
                                                                <span className="text-[8px] font-black text-slate-400 uppercase mb-1">{bim.name}</span>
                                                                <div className={`text-xs font-black ${bim.total === 0 ? 'text-slate-300' :
                                                                        bim.percentage < 75 ? 'text-rose-500' : 'text-emerald-500'
                                                                    }`}>
                                                                    {bim.total === 0 ? '---' : `${bim.percentage.toFixed(0)}%`}
                                                                </div>
                                                                <span className="text-[9px] text-slate-400 font-bold">{bim.absent}F</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                                                                P: {s.stats.percentage.toFixed(0)}%
                                                            </div>
                                                            <div className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                                                                F: {s.stats.absencePercentage.toFixed(0)}%
                                                            </div>
                                                        </div>
                                                        <span className="text-[9px] text-slate-400 font-black uppercase mt-1">Total {s.stats.total} aulas</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlobalDashboard;