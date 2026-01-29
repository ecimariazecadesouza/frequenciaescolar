import React, { useMemo, useState } from 'react';
import { Student, ClassGroup, ClassAttendance, BimesterConfig, AttendanceStatus, EnrollmentStatus, Subject } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { AlertTriangle, TrendingUp, Users, Calendar, Filter, UserCheck, UserMinus, ArrowRightLeft, HelpCircle, BookOpen } from 'lucide-react';
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

    const filteredStudents = useMemo(() => {
        return classFilter === 'ALL'
            ? students
            : students.filter(s => s.classId === classFilter);
    }, [students, classFilter]);

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
                // Filter by subject if needed
                Object.entries(attendance).forEach(([subId, subjectRecord]) => {
                    if (subjectFilter !== 'ALL' && subId !== subjectFilter) return;

                    const record = subjectRecord[student.id] || {};
                    Object.entries(record).forEach(([dateStr, statuses]: [string, AttendanceStatus[]]) => {
                        const date = new Date(dateStr + 'T12:00:00');
                        if (date >= start && date <= end) {
                            statuses.forEach(status => {
                                if (status === AttendanceStatus.PRESENT) bimPresent++;
                                if (status === AttendanceStatus.ABSENT) bimAbsent++;
                                if (status === AttendanceStatus.EXCUSED) bimPresent++; // Excused counts as frequency but track separately if needed

                                if (status !== AttendanceStatus.UNDEFINED) {
                                    bimTotal++;
                                    // Global totals (Bug fix: calculating here)
                                    if (status === AttendanceStatus.PRESENT) totalPresent++;
                                    if (status === AttendanceStatus.ABSENT) totalAbsent++;
                                    if (status === AttendanceStatus.EXCUSED) totalExcused++;
                                    totalRecordedLessons++;
                                }
                            });
                        }
                    });
                });
            });

            return {
                name: bim.name,
                Presenças: bimPresent,
                Faltas: bimAbsent,
                Taxa: bimTotal > 0 ? ((bimPresent / bimTotal) * 100).toFixed(1) : 0
            };
        });

        // Protagonistas at risk (Attendance < 75%)
        const protagonistsAtRisk = filteredStudents.map(student => {
            const subjectRisks: { subjectId: string, name: string, percentage: number, absent: number }[] = [];
            let globalPresent = 0;
            let globalTotal = 0;
            let globalAbsentCount = 0;

            Object.entries(attendance).forEach(([subId, subjectRecord]) => {
                const subject = subjects.find(s => s.id === subId);
                const record = subjectRecord[student.id] || {};
                let sPresent = 0;
                let sExcused = 0;
                let sTotal = 0;
                let sAbsent = 0;

                Object.values(record).forEach((statuses: AttendanceStatus[]) => {
                    statuses.forEach(status => {
                        if (status === AttendanceStatus.PRESENT) sPresent++;
                        if (status === AttendanceStatus.EXCUSED) sExcused++;
                        if (status === AttendanceStatus.ABSENT) sAbsent++;
                        if (status !== AttendanceStatus.UNDEFINED) sTotal++;
                    });
                });

                const subPercentage = sTotal > 0 ? ((sPresent + sExcused) / sTotal) * 100 : 100;

                if (subPercentage < 75 && sTotal > 0) {
                    subjectRisks.push({
                        subjectId: subId,
                        name: subject?.name || 'Desconhecida',
                        percentage: subPercentage,
                        absent: sAbsent
                    });
                }

                globalPresent += (sPresent + sExcused);
                globalTotal += sTotal;
                globalAbsentCount += sAbsent;
            });

            const globalPercentage = globalTotal > 0 ? (globalPresent / globalTotal) * 100 : 100;

            return {
                ...student,
                stats: {
                    percentage: globalPercentage,
                    absent: globalAbsentCount,
                    total: globalTotal,
                    risks: subjectRisks
                }
            };
        }).filter(s => (s.stats.risks.length > 0) && s.status === EnrollmentStatus.ACTIVE)
            .sort((a, b) => {
                // Sort by lowest percentage in any subject
                const minA = Math.min(...a.stats.risks.map(r => r.percentage));
                const minB = Math.min(...b.stats.risks.map(r => r.percentage));
                return minA - minB;
            });

        // Class Frequency Chart Data
        const relevantClasses = classFilter === 'ALL'
            ? classes
            : classes.filter(c => c.id === classFilter);

        const classChartData = relevantClasses.map(cls => {
            const clsStudents = students.filter(s => s.classId === cls.id);
            let cPresent = 0;
            let cTotal = 0;

            clsStudents.forEach(s => {
                Object.entries(attendance).forEach(([subId, subjectRecord]) => {
                    if (subjectFilter !== 'ALL' && subId !== subjectFilter) return;

                    const record = subjectRecord[s.id] || {};
                    Object.values(record).forEach((statuses: AttendanceStatus[]) => {
                        statuses.forEach(status => {
                            if (status === AttendanceStatus.PRESENT || status === AttendanceStatus.EXCUSED) cPresent++;
                            if (status !== AttendanceStatus.UNDEFINED) cTotal++;
                        });
                    });
                });
            });

            return {
                name: cls.name,
                percentage: cTotal > 0 ? (cPresent / cTotal) * 100 : 0
            };
        });

        return {
            bimesterData,
            protagonistsAtRisk,
            totalPresent,
            totalAbsent,
            totalExcused,
            totalRecordedLessons,
            statusCounts,
            classChartData
        };
    }, [students, attendance, bimesters, filteredStudents, classes, subjects, subjectFilter]);

    const globalRate = stats.totalRecordedLessons > 0
        ? ((stats.totalPresent + stats.totalExcused) / stats.totalRecordedLessons * 100).toFixed(1)
        : "0.0";

    return (
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Dashboard Header & Filters */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Painel de Indicadores</h2>
                        <p className="text-sm text-slate-500">Visão analítica do desempenho dos Protagonistas</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                            <Filter size={16} className="text-slate-400 ml-2" />
                            <select
                                value={classFilter}
                                onChange={(e) => setClassFilter(e.target.value)}
                                className="bg-transparent text-slate-700 text-sm font-medium rounded-lg p-1.5 outline-none cursor-pointer"
                            >
                                <option value="ALL">Todas as Turmas</option>
                                {classes.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                            <BookOpen size={16} className="text-slate-400 ml-2" />
                            <select
                                value={subjectFilter}
                                onChange={(e) => setSubjectFilter(e.target.value)}
                                className="bg-transparent text-slate-700 text-sm font-medium rounded-lg p-1.5 outline-none cursor-pointer"
                            >
                                <option value="ALL">Todas as Disciplinas</option>
                                {subjects.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
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
                        <div key={item.label} className={`p-4 rounded-2xl shadow-sm border transition-all hover:shadow-md ${item.color}`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold uppercase tracking-wider opacity-80">{item.label}</span>
                                <item.icon size={18} className="opacity-60" />
                            </div>
                            <div className="text-3xl font-extrabold tracking-tight">{stats.statusCounts[item.label]}</div>
                        </div>
                    ))}
                </div>

                {/* Main Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-200 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><Users size={20} /></div>
                            <span className="text-slate-500 text-sm font-semibold">Total Protagonistas</span>
                        </div>
                        <div className="text-3xl font-bold text-slate-800">{filteredStudents.length}</div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-emerald-200 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><TrendingUp size={20} /></div>
                            <span className="text-slate-500 text-sm font-semibold">Frequência Média</span>
                        </div>
                        <div className="text-3xl font-bold text-slate-800">{globalRate}%</div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-rose-200 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-rose-50 rounded-xl text-rose-600"><AlertTriangle size={20} /></div>
                            <span className="text-slate-500 text-sm font-semibold">Prioridade Alta</span>
                        </div>
                        <div className="text-3xl font-bold text-rose-600">{stats.protagonistsAtRisk.length}</div>
                        <div className="text-xs text-slate-400 mt-1">Disciplinas em alerta</div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-amber-200 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-amber-50 rounded-xl text-amber-600"><Calendar size={20} /></div>
                            <span className="text-slate-500 text-sm font-semibold">Faltas Totais</span>
                        </div>
                        <div className="text-3xl font-bold text-slate-800">{stats.totalAbsent}</div>
                        <div className="text-xs text-slate-400 mt-1">Registros no período</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Chart: Bimester Evolution */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-h-[400px]">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-800">Frequência por Bimestre</h3>
                            <div className="text-xs font-medium text-slate-400">VALORES AGREGADOS</div>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stats.bimesterData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#f8fafc' }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="Presenças" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} />
                                <Bar dataKey="Faltas" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Chart: Frequency By Class */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-h-[400px]">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-800">Média por Turma</h3>
                            <div className="text-xs font-medium text-slate-400">META: 75%</div>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stats.classChartData} layout="vertical" margin={{ left: 40, right: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" domain={[0, 100]} hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fontWeight: 500, fill: '#475569' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none' }}
                                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Frequência']}
                                />
                                <Bar dataKey="percentage" radius={[0, 6, 6, 0]} barSize={24}>
                                    {stats.classChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.percentage >= 75 ? '#10b981' : '#f43f5e'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Risk List (Updated with Subject Info) */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <AlertTriangle className="text-rose-500" size={22} />
                            Atenção Prioritária (Riscos por Disciplina)
                        </h3>
                        <div className="px-3 py-1 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-full border border-rose-100 uppercase tracking-tighter">
                            Intervenção Pedagógica Necessária
                        </div>
                    </div>

                    <div className="overflow-x-auto -mx-6 px-6">
                        {stats.protagonistsAtRisk.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-slate-400 italic bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                <UserCheck size={48} className="mb-3 opacity-20" />
                                <p>Nenhum Protagonista em situação de risco crítico nos filtros selecionados.</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm text-left border-separate border-spacing-y-2">
                                <thead>
                                    <tr className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                                        <th className="px-4 py-2">Protagonista</th>
                                        <th className="px-4 py-2">Turma</th>
                                        <th className="px-4 py-2">Disciplinas em Alerta</th>
                                        <th className="px-4 py-2 text-right">Média Global</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.protagonistsAtRisk.map(protagonist => {
                                        const protagonistClass = classes.find(c => c.id === protagonist.classId)?.name || 'Sem Turma';
                                        return (
                                            <tr key={protagonist.id} className="group hover:bg-slate-50 transition-all duration-200">
                                                <td className="px-4 py-4 bg-white border-y border-l border-slate-100 rounded-l-xl">
                                                    <span className="font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{protagonist.name}</span>
                                                </td>
                                                <td className="px-4 py-4 bg-white border-y border-slate-100">
                                                    <span className="text-slate-500 font-medium">{protagonistClass}</span>
                                                </td>
                                                <td className="px-4 py-4 bg-white border-y border-slate-100">
                                                    <div className="flex flex-wrap gap-2">
                                                        {protagonist.stats.risks.map(risk => (
                                                            <div key={risk.subjectId} className="flex items-center gap-1.5 px-2 py-1 bg-rose-50 text-rose-700 rounded-lg border border-rose-100 text-[10px] font-bold">
                                                                <span className="max-w-[100px] truncate">{risk.name}</span>
                                                                <span className="px-1 bg-rose-200/50 rounded">{risk.percentage.toFixed(0)}%</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 bg-white border-y border-r border-slate-100 rounded-r-xl text-right">
                                                    <span className={`text-sm font-black ${protagonist.stats.percentage < 75 ? 'text-rose-600' : 'text-slate-700'}`}>
                                                        {protagonist.stats.percentage.toFixed(1)}%
                                                    </span>
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