
const API_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

const fetchApi = async (action: string, data?: any) => {
    if (!API_URL) {
        console.error("VITE_APPS_SCRIPT_URL não configurada no .env");
        return null;
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors', // Apps Script requires no-cors for POST sometimes or proper redirect handling
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action, data }),
        });

        // Warning: With 'no-cors', we can't read the response body.
        // However, Apps Script Web Apps usually work better with standard fetches if configured correctly.
        // Let's use a more robust way that handles the redirect:

        const robustResponse = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action, data }),
        });
        return await robustResponse.json();

    } catch (error) {
        console.error(`API Error (${action}):`, error);
        return { success: false, error };
    }
};

export const schoolApi = {
    // Lote de dados inicial
    getAllData: async () => {
        try {
            const response = await fetch(API_URL);
            return await response.json();
        } catch (error) {
            console.error("Error fetching all data:", error);
            return null;
        }
    },

    // Frequência
    saveAttendance: (studentId: string, date: string, statusArray: any[]) =>
        fetchApi("SAVE_ATTENDANCE", { studentId, date, statusArray }),

    // Alunos
    upsertStudent: (student: any) => fetchApi("UPDATE_STUDENT", student),
    deleteStudent: (id: string) => fetchApi("DELETE_STUDENT", { id }),

    // Turmas
    upsertClass: (classData: any) => fetchApi("UPSERT_CLASS", classData),
    deleteClass: (id: string) => fetchApi("DELETE_CLASS", { id }),

    // Configurações
    updateBimesters: (bimesters: any[]) => fetchApi("UPDATE_BIMESTERS", bimesters),
    updateSetting: (key: string, value: any) => fetchApi("UPDATE_SETTINGS", { key, value }),
};
