import React from 'react';
import { Student, AttendanceStatus, ClassAttendance, StudentStats, EnrollmentStatus } from '../types';
import { STATUS_COLORS, ENROLLMENT_COLORS } from '../constants';
import { Check, X, Clock } from 'lucide-react';

interface AttendanceGridProps {
  students: Student[];
  dates: string[];
  attendance: ClassAttendance;
  subjectId: string;
  dailyLessonCounts: Record<string, number>;
  onToggleStatus: (studentId: string, date: string, lessonIndex: number) => void;
  onSelectStudent: (student: Student) => void;
  onUpdateLessonCount: (date: string, newCount: number) => void;
}

const AttendanceGrid: React.FC<AttendanceGridProps> = ({
  students,
  dates,
  attendance,
  subjectId,
  dailyLessonCounts,
  onToggleStatus,
  onSelectStudent,
  onUpdateLessonCount
}) => {

  const calculateStats = (studentId: string): StudentStats => {
    const subjectAttendance = attendance[subjectId] || {};
    const record = subjectAttendance[studentId] || {};
    let present = 0;
    let absent = 0;
    let excused = 0;
    let lessonsCounted = 0;

    // Only calculate stats based on the currently visible month dates
    dates.forEach(date => {
      const statuses = record[date] || [];
      const limit = dailyLessonCounts[date] || 1;

      // Flatten checks based on the *configured* limit for the day
      for (let i = 0; i < limit; i++) {
        const status = statuses[i];
        if (status === AttendanceStatus.PRESENT) present++;
        else if (status === AttendanceStatus.ABSENT) absent++;
        else if (status === AttendanceStatus.EXCUSED) excused++;

        if (status && status !== AttendanceStatus.UNDEFINED) {
          lessonsCounted++;
        }
      }
    });

    const totalConsidered = lessonsCounted === 0 ? 1 : lessonsCounted;
    const percentage = ((present + excused) / totalConsidered) * 100;

    return { totalLessons: lessonsCounted, present, absent, excused, percentage };
  };

  const getDayLabel = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00'); // Force noon to avoid timezone shift
    const day = date.getDate().toString().padStart(2, '0');
    const weekDay = date.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3);
    return { day, weekDay };
  };

  if (students.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white rounded-lg border border-dashed border-slate-300 m-4">
        <p>Nenhum aluno nesta turma ou filtro selecionado.</p>
        <p className="text-sm">Adicione protagonistas na aba "Protagonistas".</p>
      </div>
    );
  }

  // Dimensions for sticky columns
  const IDX_WIDTH = 50;
  const NAME_WIDTH = 250;
  const STATUS_WIDTH = 120;
  const NAME_LEFT = IDX_WIDTH;
  const STATUS_LEFT = IDX_WIDTH + NAME_WIDTH;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col h-full overflow-hidden">

      {/* Scrollable Container */}
      <div className="overflow-auto custom-scrollbar flex-1 relative">
        <table className="min-w-max border-collapse text-sm text-left">
          <thead className="bg-slate-800 text-white sticky top-0 z-20">
            <tr>
              <th
                className="sticky bg-slate-800 p-3 border-b border-slate-700 text-center font-medium z-30"
                style={{ left: 0, minWidth: IDX_WIDTH }}
              >
                #
              </th>
              <th
                className="sticky bg-slate-800 p-3 border-b border-slate-700 font-medium z-30"
                style={{ left: NAME_LEFT, minWidth: NAME_WIDTH }}
              >
                Nome do Protagonista
              </th>
              <th
                className="sticky bg-slate-800 p-3 border-b border-slate-700 font-medium border-r border-slate-600 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.3)] z-30"
                style={{ left: STATUS_LEFT, minWidth: STATUS_WIDTH }}
              >
                Situação
              </th>
              {dates.map((date) => {
                const { day, weekDay } = getDayLabel(date);
                const isWeekend = weekDay === 'sáb' || weekDay === 'dom';
                const count = dailyLessonCounts[date] || 1;

                return (
                  <th key={date} className={`p-1 min-w-[60px] border-b border-slate-700 text-center relative group/th ${isWeekend ? 'bg-slate-700 text-slate-300' : ''}`}>
                    <div className="flex flex-col items-center justify-center gap-1 py-1">
                      <div className="flex flex-col items-center leading-tight">
                        <span className="text-[10px] uppercase opacity-70">{weekDay}</span>
                        <span className="font-bold text-lg">{day}</span>
                      </div>

                      {!isWeekend && (
                        <button
                          onClick={() => {
                            const next = count >= 5 ? 1 : count + 1;
                            onUpdateLessonCount(date, next);
                          }}
                          className="flex items-center justify-center gap-1 bg-slate-700 hover:bg-slate-600 text-xs px-2 py-0.5 rounded-full transition-colors border border-slate-600 hover:border-slate-500"
                          title={`Configurar aulas: ${count} (Clique para alterar)`}
                        >
                          <Clock size={10} className="text-indigo-400" />
                          <span className="font-mono font-bold text-indigo-200">{count}</span>
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}
              {/* Summary Columns Header */}
              <th className="sticky right-[120px] bg-slate-700 p-2 min-w-[60px] text-center text-xs font-semibold border-l border-slate-600 z-20">Faltas</th>
              <th className="sticky right-[60px] bg-slate-700 p-2 min-w-[60px] text-center text-xs font-semibold z-20">Pres.</th>
              <th className="sticky right-0 bg-slate-700 p-2 min-w-[60px] text-center text-xs font-semibold z-20">% Mês</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.map((student, index) => {
              const stats = calculateStats(student.id);
              const isLowAttendance = stats.percentage < 75 && stats.totalLessons > 0;

              return (
                <tr key={student.id} className="hover:bg-blue-50 transition-colors group">
                  <td
                    className="sticky bg-white group-hover:bg-blue-50 p-2 text-center text-gray-500 border-r border-gray-100 font-mono text-xs z-10"
                    style={{ left: 0 }}
                  >
                    {(index + 1).toString().padStart(2, '0')}
                  </td>
                  <td
                    className="sticky bg-white group-hover:bg-blue-50 p-2 border-r border-gray-200 z-10"
                    style={{ left: NAME_LEFT }}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectStudent(student)}
                        className="flex-1 text-left focus:outline-none truncate"
                      >
                        <span className="font-medium text-slate-700 block truncate" title={student.name}>{student.name}</span>
                      </button>

                      {isLowAttendance && (
                        <span className="flex h-2 w-2 relative flex-shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td
                    className="sticky bg-white group-hover:bg-blue-50 p-2 border-r border-gray-200 z-10 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]"
                    style={{ left: STATUS_LEFT }}
                  >
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${ENROLLMENT_COLORS[student.status] || ENROLLMENT_COLORS[EnrollmentStatus.OTHER]}`}>
                      {student.status}
                    </span>
                  </td>
                  {dates.map((date) => {
                    const subjectAttendance = attendance[subjectId] || {};
                    const studentRecord = subjectAttendance[student.id] || {};
                    const statuses = studentRecord[date] || [];
                    const { weekDay } = getDayLabel(date);
                    const isWeekend = weekDay === 'sáb' || weekDay === 'dom';
                    const isLocked = student.status === EnrollmentStatus.DROPOUT || student.status === EnrollmentStatus.TRANSFERRED;
                    const lessonsCount = dailyLessonCounts[date] || 1;

                    return (
                      <td
                        key={`${student.id}-${date}`}
                        className={`p-1 text-center border-r border-gray-50 ${isWeekend ? 'bg-gray-50/50' : ''}`}
                      >
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {Array.from({ length: lessonsCount }).map((_, idx) => {
                            const status = statuses[idx] || AttendanceStatus.UNDEFINED;
                            return (
                              <button
                                key={idx}
                                onClick={() => !isWeekend && onToggleStatus(student.id, date, idx)}
                                disabled={isWeekend || isLocked}
                                title={`Aula ${idx + 1}`}
                                className={`
                                          w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center transition-all duration-150
                                          ${STATUS_COLORS[status]}
                                          ${isWeekend || isLocked ? 'opacity-30 cursor-not-allowed' : 'shadow-sm hover:scale-110 active:scale-95 border'}
                                        `}
                              >
                                {status === AttendanceStatus.PRESENT && <Check size={10} strokeWidth={3} />}
                                {status === AttendanceStatus.ABSENT && <X size={10} strokeWidth={3} />}
                                {status === AttendanceStatus.EXCUSED && <Clock size={10} strokeWidth={3} />}
                                {status === AttendanceStatus.UNDEFINED && <span className="w-1 h-1 rounded-full bg-gray-300" />}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    );
                  })}

                  {/* Summary Columns Body */}
                  <td className="sticky right-[120px] bg-white group-hover:bg-blue-50 p-2 text-center text-sm font-medium text-rose-600 border-l border-gray-200 z-10">
                    {stats.absent}
                  </td>
                  <td className="sticky right-[60px] bg-white group-hover:bg-blue-50 p-2 text-center text-sm font-medium text-emerald-600 z-10">
                    {stats.present}
                  </td>
                  <td className={`sticky right-0 bg-white group-hover:bg-blue-50 p-2 text-center text-sm font-bold z-10 ${isLowAttendance ? 'text-rose-600' : 'text-slate-700'}`}>
                    {stats.totalLessons === 0 ? '-' : `${stats.percentage.toFixed(0)}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceGrid;