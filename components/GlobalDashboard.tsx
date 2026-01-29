import React, { useMemo, useState } from 'react';
import { Student, ClassGroup, ClassAttendance, BimesterConfig, AttendanceStatus, EnrollmentStatus, Subject } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie, LabelList } from 'recharts';
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
        <div className="flex-1 overflow-y-auto p-3 md:p-6 bg-slate-50 custom-scrollbar">
            <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">

                {/* Dashboard Header & Filters */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="p-2.5 md:p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200 shrink-0">
                            <TrendingUp size={20} className="md:size-6" />
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight uppercase">Dashboard</h2>
                            <p className="text-[10px] md:text-sm text-slate-500 font-bold uppercase tracking-widest opacity-70">Inteligência de Dados</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 md:gap-3">
                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
                            <Filter size={14} className="text-slate-400 ml-2" />
                            <select
                                value={classFilter}
                                onChange={(e) => setClassFilter(e.target.value)}
                                className="bg-transparent text-slate-700 text-xs font-bold rounded-lg p-1.5 outline-none cursor-pointer w-full"
                            >
                                <option value="ALL">Turmas</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
                            <BookOpen size={14} className="text-slate-400 ml-2" />
                            <select
                                value={subjectFilter}
                                onChange={(e) => setSubjectFilter(e.target.value)}
                                className="bg-transparent text-slate-700 text-xs font-bold rounded-lg p-1.5 outline-none cursor-pointer w-full"
                            >
                                <option value="ALL">Disciplinas</option>
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
                            <Calendar size={14} className="text-slate-400 ml-2" />
                            <select
                                value={bimesterFilter}
                                onChange={(e) => setBimesterFilter(e.target.value)}
                                className="bg-transparent text-slate-700 text-xs font-bold rounded-lg p-1.5 outline-none cursor-pointer w-full"
                            >
                                <option value="ALL">Bimestres</option>
                                {bimesters.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Enrollment Status Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    {[
                        { label: EnrollmentStatus.ACTIVE, icon: UserCheck, color: ENROLLMENT_COLORS[EnrollmentStatus.ACTIVE] },
                        { label: EnrollmentStatus.DROPOUT, icon: UserMinus, color: ENROLLMENT_COLORS[EnrollmentStatus.DROPOUT] },
                        { label: EnrollmentStatus.TRANSFERRED, icon: ArrowRightLeft, color: ENROLLMENT_COLORS[EnrollmentStatus.TRANSFERRED] },
                        { label: EnrollmentStatus.OTHER, icon: HelpCircle, color: ENROLLMENT_COLORS[EnrollmentStatus.OTHER] }
                    ].map((item) => (
                        <div key={item.label} className={`p-4 rounded-2xl shadow-sm border transition-all hover:translate-y-[-2px] ${item.color}`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-70">{item.label}</span>
                                <item.icon size={16} className="opacity-50" />
                            </div>
                            <div className="text-2xl md:text-3xl font-black tracking-tighter">{stats.statusCounts[item.label]}</div>
                        </div>
                    ))}
                </div>

                {/* Main Stats Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200">
                        <p className="text-slate-500 text-[9px] md:text-xs font-black uppercase mb-1 md:mb-2 opacity-60">Protagonistas</p>
                        <div className="text-2xl md:text-4xl font-black text-indigo-600 tracking-tighter">{filteredStudents.length}</div>
                    </div>
                    <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200">
                        <p className="text-slate-500 text-[9px] md:text-xs font-black uppercase mb-1 md:mb-2 opacity-60">Frequência</p>
                        <div className="text-2xl md:text-4xl font-black text-emerald-600 tracking-tighter">{globalRate}%</div>
                    </div>
                    <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200">
                        <p className="text-slate-500 text-[9px] md:text-xs font-black uppercase mb-1 md:mb-2 opacity-60">Faltas</p>
                        <div className="text-2xl md:text-4xl font-black text-amber-500 tracking-tighter">{stats.totalAbsent}</div>
                    </div>
                    <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-rose-500">
                        <p className="text-slate-500 text-[9px] md:text-xs font-black uppercase mb-1 md:mb-2 opacity-60">Em Risco</p>
                        <div className="text-2xl md:text-4xl font-black text-rose-500 tracking-tighter">{stats.listToShow.filter(s => s.stats.percentage < 75).length}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    {/* Bimester Evolution */}
                    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="text-sm md:text-lg font-black text-slate-800 mb-6 uppercase tracking-tight text-center lg:text-left">Evolução por Bimestre</h3>
                        <div className="h-[250px] md:h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.bimesterData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} />
                                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px' }} cursor={{ fill: '#f8fafc' }} />
                                    <Bar dataKey="Presenças" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24}>
                                        <LabelList dataKey="Presenças" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#10b981' }} />
                                    </Bar>
                                    <Bar dataKey="Faltas" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={24}>
                                        <LabelList dataKey="Faltas" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#f43f5e' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Class Comparison */}
                    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="text-sm md:text-lg font-black text-slate-800 mb-6 uppercase tracking-tight text-center lg:text-left">Comparativo entre Turmas (%)</h3>
                        <div className="h-[250px] md:h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.classChartData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" domain={[0, 115]} hide />
                                    <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '12px' }} />
                                    <Bar dataKey="percentage" radius={[0, 4, 4, 0]} barSize={16}>
                                        <LabelList dataKey="percentage" position="right" formatter={(val: number) => `${val.toFixed(0)}%`} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#64748b' }} />
                                        {stats.classChartData.map((e, i) => <Cell key={i} fill={e.percentage >= 75 ? '#10b981' : '#f43f5e'} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Individual/Risk List */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4 md:gap-6 bg-slate-50/50">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="p-2 md:p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 shrink-0">
                                {displayMode === 'RISKS' ? <ShieldAlert className="text-rose-500 size-5 md:size-6" /> : <LayoutList className="text-indigo-500 size-5 md:size-6" />}
                            </div>
                            <div>
                                <h3 className="text-lg md:text-xl font-black text-slate-800 tracking-tight uppercase">Monitoramento</h3>
                                <p className="text-[10px] md:text-xs text-slate-500 font-black uppercase tracking-widest opacity-60">Acompanhamento Individual</p>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-3">
                            {/* Search */}
                            <div className="relative w-full md:w-64">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nome..."
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs md:text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Range Toggle */}
                            <div className="flex p-1 bg-slate-200 rounded-xl w-full md:w-auto">
                                <button
                                    onClick={() => setDisplayMode('RISKS')}
                                    className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] md:text-xs font-black transition-all ${displayMode === 'RISKS' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    RISCOS
                                </button>
                                <button
                                    onClick={() => setDisplayMode('INDIVIDUAL')}
                                    className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] md:text-xs font-black transition-all ${displayMode === 'INDIVIDUAL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    INDIVIDUAL
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar relative">
                        {stats.listToShow.length === 0 ? (
                            <div className="p-12 md:p-20 text-center">
                                <HelpCircle size={40} className="mx-auto text-slate-200 mb-4" />
                                <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] italic">Sem registros encontrados.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse min-w-[700px] md:min-w-full">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-100">
                                        <th className="px-4 md:px-6 py-4 text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest">Protagonista</th>
                                        <th className="px-4 md:px-6 py-4 text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest">Turma</th>
                                        <th className="px-4 md:px-6 py-4 text-center text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest min-w-[250px]">Frequência por Bimestre</th>
                                        <th className="px-4 md:px-6 py-4 text-right text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest">Média Período</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {stats.listToShow.map(s => {
                                        const sClass = classes.find(c => c.id === s.classId)?.name || 'Sem Turma';
                                        return (
                                            <tr key={s.id} className="hover:bg-indigo-50/30 transition-colors group">
                                                <td className="px-4 md:px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs md:text-sm font-black text-slate-700 leading-tight">{s.name}</span>
                                                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter mt-0.5">{s.status}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 md:px-6 py-4">
                                                    <span className="text-[10px] md:text-xs text-slate-500 font-black uppercase bg-slate-100 px-2 py-1 rounded-md">{sClass}</span>
                                                </td>
                                                <td className="px-4 md:px-6 py-4">
                                                    <div className="flex items-center justify-center gap-2 md:gap-3">
                                                        {s.stats.bimesters.map((bim, idx) => (
                                                            <div key={idx} className="flex flex-col items-center p-2 rounded-xl bg-white border border-slate-100 shadow-sm min-w-[55px] md:min-w-[65px]">
                                                                <span className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase mb-1 tracking-tighter">{bim.name}</span>
                                                                <div className={`text-[10px] md:text-xs font-black ${bim.total === 0 ? 'text-slate-200' :
                                                                    bim.percentage < 75 ? 'text-rose-600' : 'text-emerald-600'
                                                                    }`}>
                                                                    {bim.total === 0 ? '---' : `${bim.percentage.toFixed(0)}%`}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-4 md:px-6 py-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[10px] md:text-xs font-black text-slate-800 tracking-tighter">P: {s.stats.percentage.toFixed(1)}%</span>
                                                        <span className="text-[8px] md:text-[9px] font-black text-rose-500 uppercase mt-0.5">{s.stats.absent} Faltas</span>
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