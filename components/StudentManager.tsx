import React, { useState } from 'react';
import { Student, ClassGroup, EnrollmentStatus } from '../types';
import { ENROLLMENT_COLORS } from '../constants';
import { Plus, Pencil, Trash2, Search, X, UserPlus, Users, Filter } from 'lucide-react';

interface Props {
    students: Student[];
    classes: ClassGroup[];
    onAddStudent: (student: Student) => void;
    onUpdateStudent: (student: Student) => void;
    onDeleteStudent: (id: string) => void;
    onBatchAdd: (names: string[], classId: string, status: EnrollmentStatus) => void;
}

const StudentManager: React.FC<Props> = ({
    students,
    classes,
    onAddStudent,
    onUpdateStudent,
    onDeleteStudent,
    onBatchAdd
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [classFilter, setClassFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);

    // Single Student Form State
    const [formData, setFormData] = useState<{ name: string, classId: string, status: EnrollmentStatus }>({
        name: '',
        classId: classes[0]?.id || '',
        status: EnrollmentStatus.ACTIVE
    });

    // Batch Form State
    const [batchData, setBatchData] = useState<{ names: string, classId: string, status: EnrollmentStatus }>({
        names: '',
        classId: classes[0]?.id || '',
        status: EnrollmentStatus.ACTIVE
    });

    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesClass = classFilter === 'ALL' || s.classId === classFilter;
        const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
        return matchesSearch && matchesClass && matchesStatus;
    });

    const handleOpenEdit = (student: Student) => {
        setEditingStudent(student);
        setFormData({
            name: student.name,
            classId: student.classId || '',
            status: student.status
        });
        setIsModalOpen(true);
    };

    const handleOpenAdd = () => {
        setEditingStudent(null);
        setFormData({
            name: '',
            classId: classes[0]?.id || '',
            status: EnrollmentStatus.ACTIVE
        });
        setIsModalOpen(true);
    };

    const handleSubmit = () => {
        if (!formData.name.trim()) return;

        if (editingStudent) {
            onUpdateStudent({
                ...editingStudent,
                name: formData.name,
                classId: formData.classId,
                status: formData.status
            });
        } else {
            onAddStudent({
                id: `s-${Date.now()}`,
                name: formData.name,
                classId: formData.classId,
                status: formData.status
            });
        }
        setIsModalOpen(false);
    };

    const handleBatchSubmit = () => {
        const names = batchData.names.split('\n').map(n => n.trim()).filter(n => n.length > 0);
        if (names.length === 0) return;

        onBatchAdd(names, batchData.classId, batchData.status);
        setBatchData({ ...batchData, names: '' });
        setIsBatchModalOpen(false);
    };

    return (
        <div className="flex-1 flex flex-col bg-slate-50 h-full overflow-hidden">

            {/* Header / Actions */}
            <div className="p-6 border-b border-gray-200 bg-white flex flex-col xl:flex-row xl:items-center justify-between gap-4">

                <div className="flex flex-col sm:flex-row gap-3 flex-1">
                    <div className="relative flex-1 min-w-[250px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar protagonista..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <select
                                value={classFilter}
                                onChange={(e) => setClassFilter(e.target.value)}
                                className="appearance-none pl-3 pr-8 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none min-w-[150px]"
                            >
                                <option value="ALL">Todas as Turmas</option>
                                {classes.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>

                        <div className="relative">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="appearance-none pl-3 pr-8 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none min-w-[150px]"
                            >
                                <option value="ALL">Todas as Situações</option>
                                {Object.values(EnrollmentStatus).map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => setIsBatchModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium whitespace-nowrap"
                    >
                        <Users size={16} /> Em Lote
                    </button>
                    <button
                        onClick={handleOpenAdd}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm whitespace-nowrap"
                    >
                        <UserPlus size={16} /> Novo Protagonista
                    </button>
                </div>
            </div>

            {/* Protagonist List Area */}
            <div className="flex-1 overflow-auto p-3 md:p-6 custom-scrollbar">

                {/* Mobile/Tablet Card View (Visible on small screens) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
                    {filteredStudents.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                            <Users size={48} className="mx-auto text-slate-200 mb-4" />
                            <p className="text-slate-400 font-black uppercase tracking-widest text-xs italic">Nenhum protagonista encontrado.</p>
                        </div>
                    ) : (
                        filteredStudents.map(student => {
                            const studentClass = classes.find(c => c.id === student.classId);
                            return (
                                <div key={student.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3 group relative overflow-hidden">
                                    <div className={`absolute top-0 left-0 w-1 h-full ${ENROLLMENT_COLORS[student.status]?.split(' ')[0] || 'bg-slate-200'}`}></div>

                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-black text-slate-800 leading-tight uppercase text-sm">{student.name}</h4>
                                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">{studentClass?.name || 'Sem Turma'}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${ENROLLMENT_COLORS[student.status]}`}>
                                            {student.status}
                                        </span>
                                    </div>

                                    <div className="flex justify-end items-center gap-2 pt-2 border-t border-slate-100">
                                        <button
                                            onClick={() => handleOpenEdit(student)}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-black uppercase transition-all active:scale-95 border border-indigo-100"
                                        >
                                            <Pencil size={14} /> Editar
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (window.confirm(`Tem certeza que deseja remover ${student.name}?`)) {
                                                    onDeleteStudent(student.id);
                                                }
                                            }}
                                            className="p-2 text-rose-600 bg-rose-50 rounded-xl transition-all active:scale-90 border border-rose-100"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Desktop Table View (Visible on md screens and up) */}
                <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                        <thead className="bg-slate-50/80">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Protagonista</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Turma</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Situação</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-50">
                            {filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center text-slate-400">
                                        <Users size={40} className="mx-auto mb-4 opacity-20" />
                                        <p className="font-black uppercase tracking-widest text-xs italic">Nenhum registro encontrado.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map(student => {
                                    const studentClass = classes.find(c => c.id === student.classId);
                                    return (
                                        <tr key={student.id} className="hover:bg-indigo-50/30 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap font-black text-slate-700">{student.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                                                {studentClass ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200">
                                                        {studentClass.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 italic text-xs">Sem turma</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-0.5 text-[10px] font-black uppercase rounded border ${ENROLLMENT_COLORS[student.status]}`}>
                                                    {student.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        onClick={() => handleOpenEdit(student)}
                                                        className="text-indigo-600 hover:text-white p-2 hover:bg-indigo-600 rounded-xl transition-all active:scale-95 shadow-sm border border-transparent hover:border-indigo-700"
                                                        title="Editar"
                                                    >
                                                        <Pencil size={14} strokeWidth={3} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm(`Tem certeza que deseja remover ${student.name}?`)) {
                                                                onDeleteStudent(student.id);
                                                            }
                                                        }}
                                                        className="text-rose-500 hover:text-white p-2 hover:bg-rose-500 rounded-xl transition-all active:scale-95 shadow-sm border border-transparent hover:border-rose-600"
                                                        title="Remover"
                                                    >
                                                        <Trash2 size={14} strokeWidth={3} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <div className="bg-slate-900 text-white p-4 flex justify-between items-center rounded-t-xl">
                            <h3 className="font-bold">{editingStudent ? 'Editar Protagonista' : 'Novo Protagonista'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Turma</label>
                                <select
                                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={formData.classId}
                                    onChange={e => setFormData({ ...formData, classId: e.target.value })}
                                >
                                    <option value="">Selecione uma turma...</option>
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Situação</label>
                                <select
                                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value as EnrollmentStatus })}
                                >
                                    {Object.values(EnrollmentStatus).map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="pt-4 flex justify-end gap-2">
                                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={!formData.name.trim() || !formData.classId}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-slate-300"
                                >
                                    Salvar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Batch Add Modal */}
            {isBatchModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <div className="bg-slate-900 text-white p-4 flex justify-between items-center rounded-t-xl">
                            <h3 className="font-bold flex items-center gap-2"><Users size={18} /> Adicionar em Lote</h3>
                            <button onClick={() => setIsBatchModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Turma Destino</label>
                                <select
                                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={batchData.classId}
                                    onChange={e => setBatchData({ ...batchData, classId: e.target.value })}
                                >
                                    <option value="">Selecione uma turma...</option>
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Situação Inicial</label>
                                <select
                                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={batchData.status}
                                    onChange={e => setBatchData({ ...batchData, status: e.target.value as EnrollmentStatus })}
                                >
                                    {Object.values(EnrollmentStatus).map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Lista de Nomes (um por linha)</label>
                                <textarea
                                    className="w-full h-32 p-3 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono resize-none"
                                    placeholder="João da Silva&#10;Maria Oliveira"
                                    value={batchData.names}
                                    onChange={e => setBatchData({ ...batchData, names: e.target.value })}
                                />
                                <p className="text-xs text-right text-slate-500 mt-1">
                                    {batchData.names.split('\n').filter(n => n.trim().length > 0).length} nomes detectados
                                </p>
                            </div>
                            <div className="pt-4 flex justify-end gap-2">
                                <button onClick={() => setIsBatchModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                                <button
                                    onClick={handleBatchSubmit}
                                    disabled={!batchData.names.trim() || !batchData.classId}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-slate-300"
                                >
                                    Adicionar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentManager;