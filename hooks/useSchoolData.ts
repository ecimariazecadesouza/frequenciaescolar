import { useState, useEffect, useMemo, useCallback } from 'react';
import { Student, ClassGroup, ClassAttendance, BimesterConfig, EnrollmentStatus, AttendanceStatus, Subject } from '../types';
import { schoolApi } from '../services/api';
import { MOCK_CLASSES, MOCK_STUDENTS_POOL, BIMESTERS as INITIAL_BIMESTERS } from '../constants';

const CACHE_KEY = 'frequencia_escolar_cache_v2';

export function useSchoolData() {
    const [classes, setClasses] = useState<ClassGroup[]>(MOCK_CLASSES);
    const [allStudents, setAllStudents] = useState<Student[]>(MOCK_STUDENTS_POOL);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [attendance, setAttendance] = useState<ClassAttendance>({});
    const [bimesters, setBimesters] = useState<BimesterConfig[]>(INITIAL_BIMESTERS);
    const [dailyLessonCounts, setDailyLessonCounts] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    // Load from LocalStorage Cache first for instant UI
    useEffect(() => {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (parsed.classes) setClasses(parsed.classes);
                if (parsed.allStudents) setAllStudents(parsed.allStudents);
                if (parsed.subjects) setSubjects(parsed.subjects);
                if (parsed.attendance) setAttendance(parsed.attendance);
                if (parsed.bimesters) setBimesters(parsed.bimesters);
                if (parsed.dailyLessonCounts) setDailyLessonCounts(parsed.dailyLessonCounts);
            } catch (e) {
                console.error("Cache parsing error", e);
            }
        }
    }, []);

    // Sync with Google Sheets
    const refreshData = useCallback(async () => {
        setIsLoading(true);
        const data = await schoolApi.getAllData();
        if (data) {
            const newClasses = data.classes?.length ? data.classes : [];
            const newStudents = data.students?.length ? data.students : [];
            const newSubjects = data.subjects?.length ? data.subjects : [];
            const newAttendance = data.attendance || {};
            const newBimesters = data.bimesters?.length ? data.bimesters : INITIAL_BIMESTERS;

            const counts: Record<string, number> = {};
            if (data.settings) {
                Object.entries(data.settings).forEach(([k, v]) => {
                    if (k.startsWith('lessonCount_')) counts[k.replace('lessonCount_', '')] = Number(v);
                });
            }

            setClasses(newClasses);
            setAllStudents(newStudents);
            setSubjects(newSubjects);
            setAttendance(newAttendance);
            setBimesters(newBimesters);
            setDailyLessonCounts(counts);

            // Update Cache
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                classes: newClasses,
                allStudents: newStudents,
                subjects: newSubjects,
                attendance: newAttendance,
                bimesters: newBimesters,
                dailyLessonCounts: counts
            }));
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    // --- ACTIONS ---

    const handleUpdateLessonCount = (date: string, newCount: number) => {
        setDailyLessonCounts(prev => {
            const next = { ...prev, [date]: newCount };
            localStorage.setItem(CACHE_KEY, JSON.stringify({ ...JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'), dailyLessonCounts: next }));
            return next;
        });
        schoolApi.updateSetting(`lessonCount_${date}`, newCount);
    };

    const handleToggleStatus = (studentId: string, date: string, lessonIndex: number, subjectId: string) => {
        setAttendance(prev => {
            const subjectAttendance = { ...(prev[subjectId] || {}) };
            const studentRecord = { ...(subjectAttendance[studentId] || {}) };

            const currentDayLimit = dailyLessonCounts[date] || 1;

            const currentDailyStatuses = studentRecord[date]
                ? [...studentRecord[date]]
                : Array(currentDayLimit).fill(AttendanceStatus.UNDEFINED);

            while (currentDailyStatuses.length <= lessonIndex) {
                currentDailyStatuses.push(AttendanceStatus.UNDEFINED);
            }

            const currentStatus = currentDailyStatuses[lessonIndex];
            let nextStatus: AttendanceStatus;

            if (currentStatus === AttendanceStatus.UNDEFINED) nextStatus = AttendanceStatus.PRESENT;
            else if (currentStatus === AttendanceStatus.PRESENT) nextStatus = AttendanceStatus.ABSENT;
            else if (currentStatus === AttendanceStatus.ABSENT) nextStatus = AttendanceStatus.EXCUSED;
            else nextStatus = AttendanceStatus.UNDEFINED;

            currentDailyStatuses[lessonIndex] = nextStatus;
            studentRecord[date] = currentDailyStatuses;
            subjectAttendance[studentId] = studentRecord;

            const next = { ...prev, [subjectId]: subjectAttendance };

            // Optimistic Write
            schoolApi.saveAttendance(studentId, date, currentDailyStatuses, subjectId);

            return next;
        });
    };

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
        newStudents.forEach(s => schoolApi.upsertStudent(s));
    };

    const handleUpsertClass = (classData: ClassGroup) => {
        setClasses(prev => {
            const exists = prev.find(c => c.id === classData.id);
            if (exists) return prev.map(c => c.id === classData.id ? classData : c);
            return [...prev, classData];
        });
        schoolApi.upsertClass(classData);
    };

    const handleDeleteClass = (id: string) => {
        setClasses(prev => prev.filter(c => c.id !== id));
        setAllStudents(prev => prev.map(s => s.classId === id ? { ...s, classId: undefined } : s));
        schoolApi.deleteClass(id);
    };

    const handleUpsertSubject = (subjectData: Subject) => {
        setSubjects(prev => {
            const exists = prev.find(s => s.id === subjectData.id);
            if (exists) return prev.map(s => s.id === subjectData.id ? subjectData : s);
            return [...prev, subjectData];
        });
        schoolApi.upsertSubject(subjectData);
    };

    const handleDeleteSubject = (id: string) => {
        setSubjects(prev => prev.filter(s => s.id !== id));
        schoolApi.deleteSubject(id);
    };

    const handleUpdateBimesters = (updated: BimesterConfig[]) => {
        setBimesters(updated);
        schoolApi.updateBimesters(updated);
    };

    return {
        classes,
        allStudents,
        subjects,
        attendance,
        bimesters,
        dailyLessonCounts,
        isLoading,
        isSyncing,
        refreshData,
        actions: {
            handleUpdateLessonCount,
            handleToggleStatus,
            handleAddStudent,
            handleUpdateStudent,
            handleDeleteStudent,
            handleBatchAddStudents,
            handleUpsertClass,
            handleDeleteClass,
            handleUpsertSubject,
            handleDeleteSubject,
            handleUpdateBimesters
        }
    };
}
