import { GoogleGenerativeAI } from '@google/generative-ai';
import { SoapNote } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// --- Helper: Dynamic Model Discovery ---
// This follows the logic in your DoctorAssistant to find the best flash model
async function getActiveModelName(): Promise<string> {
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const data = await res.json();
        
        if (data.models) {
            const names = data.models.map((m: any) => m.name.replace('models/', ''));
            const bestModel = names.find((n: string) => n.includes('gemini-2.5-flash')) ||
                              names.find((n: string) => n.includes('gemini-2.0-flash')) ||
                              names.find((n: string) => n.includes('gemini-1.5-flash')) ||
                              'gemini-1.5-flash';
            return bestModel;
        }
    } catch (e) {
        console.error("Model discovery failed, falling back to 1.5-flash", e);
    }
    return 'gemini-1.5-flash';
}

const genAI = new GoogleGenerativeAI(API_KEY);

// --- SOAP Note Generator (Scribe) ---
export const generateSoapNote = async (transcript: string): Promise<SoapNote> => {
    if (!API_KEY || !transcript.trim()) return simulateSoapNote();

    try {
        // Dynamically get the best model name
        const modelName = await getActiveModelName();
        
        const model = genAI.getGenerativeModel({ 
            model: modelName,
            // Bisaya/Cebuano translation instructions included here
            systemInstruction: `You are an expert Pediatric Scribe for Dr. Atamosa in Balamban, Cebu. 
            The transcript may contain a mix of Bisaya (Cebuano) and English. 
            Translate all Bisaya phrases into professional clinical English. 
            Organize the findings into a standard SOAP note format.`
        });

        const prompt = `
        Analyze this pediatric consultation transcript:
        "${transcript}"
        
        Generate a JSON object with exactly these keys:
        - subjective: Patient/Parent history and complaints.
        - objective: Physical examination findings, vitals, and observations.
        - assessment: Diagnosis, differential diagnosis, or clinical impression.
        - plan: Medications (dosage/duration), labs, follow-up, and home care advice.
        
        Return ONLY valid JSON. If Bisaya was spoken, ensure the JSON content is in English.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        
        // Clean markdown JSON blocks
        const cleanedJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedJson);
    } catch (error) {
        console.error("SOAP Generation Error:", error);
        return simulateSoapNote();
    }
};

// --- Live Audio Service Placeholder ---
// Kept for compatibility, though useScribe now uses Native Browser API for mobile support
export class GeminiLiveService {
  constructor(private onMessage: (text: string) => void) {}
  async connect(inputStream: MediaStream) { 
      console.log("Gemini Live Service: Connection established using dynamic discovery."); 
  }
  disconnect() { console.log("Gemini Live Service: Disconnected."); }
}

const simulateSoapNote = (): SoapNote => ({
    subjective: "Transcript analysis unavailable. Check API connectivity.",
    objective: "No exam data extracted.",
    assessment: "Pending review.",
    plan: "Manual documentation required."
});