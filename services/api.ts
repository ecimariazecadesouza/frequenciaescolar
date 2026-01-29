
const API_URL = "https://script.google.com/macros/s/AKfycbxgd6B6CwlRAz2fVsIzznA7oxwH2sQQKLaOD6zyp_BE4QfsId8seFMMXFztBOerF_iSqw/exec";

const fetchApi = async (action: string, data?: any) => {
    if (!API_URL) {
        console.error("VITE_APPS_SCRIPT_URL não configurada.");
        return null;
    }

    try {
        // Para ESCRITA (POST), o Google Apps Script exige no-cors para evitar problemas de Preflight
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'text/plain', // Usar text/plain evita o preflight OPTIONS do navegador
            },
            body: JSON.stringify({ action, data }),
        });

        return { success: true }; // No modo no-cors não conseguimos ler o corpo, mas assumimos sucesso se não der erro

    } catch (error) {
        console.error(`API Error (${action}):`, error);
        return { success: false, error };
    }
};

export const schoolApi = {
    // Lote de dados inicial (GET)
    getAllData: async () => {
        if (!API_URL) return null;
        try {
            const response = await fetch(API_URL);
            const text = await response.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                console.error("Erro ao converter resposta para JSON:", text);
                return null;
            }
        } catch (error) {
            console.error("Error fetching all data:", error);
            return null;
        }
    },

    // Frequência
    saveAttendance: (studentId: string, date: string, statusArray: any[], subjectId: string) =>
        fetchApi("SAVE_ATTENDANCE", { studentId, date, statusArray, subjectId }),

    // Protagonistas
    upsertStudent: (student: any) => fetchApi("UPDATE_STUDENT", student),
    deleteStudent: (id: string) => fetchApi("DELETE_STUDENT", { id }),

    // Turmas
    upsertClass: (classData: any) => fetchApi("UPSERT_CLASS", classData),
    deleteClass: (id: string) => fetchApi("DELETE_CLASS", { id }),

    // Disciplinas
    upsertSubject: (subject: any) => fetchApi("UPSERT_SUBJECT", subject),
    deleteSubject: (id: string) => fetchApi("DELETE_SUBJECT", { id }),

    // Configurações
    updateBimesters: (bimesters: any[]) => fetchApi("UPDATE_BIMESTERS", bimesters),
    updateSetting: (key: string, value: any) => fetchApi("UPDATE_SETTINGS", { key, value }),
};
