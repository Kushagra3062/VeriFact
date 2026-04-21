/* TypeScript */
import type { AnalysisResponse } from './types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function analyzePayload(input: { 
    text?: string; 
    url?: string; 
    fileData?: { name: string; type: string; buffer: ArrayBuffer } 
}): Promise<AnalysisResponse> {

    // File uploads go DIRECTLY to the FastAPI backend using pre-buffered data
    if (input.fileData) {
        const { name, type, buffer } = input.fileData;
        console.log(`[misinfoClient] Sending pre-buffered file: ${name}, ${buffer.byteLength} bytes`);
        
        const blob = new Blob([buffer], { type });
        const form = new FormData();
        form.append('file', blob, name);

        const res = await fetch(`${BACKEND_URL}/analyze-file`, {
            method: 'POST',
            body: form,
        });

        if (!res.ok) {
            const errBody = await res.text().catch(() => '');
            throw new Error(`Analyze failed (${res.status}): ${errBody || res.statusText}`);
        }

        return res.json();
    }

    // Text/URL analysis goes through the Next.js API proxy (works fine)
    const form = new FormData();
    if (input.text) form.append('text', input.text);
    if (input.url) form.append('url', input.url);

    console.log(`[misinfoClient] Fetching /api/analyze...`);
    const res = await fetch('/api/analyze', {
        method: 'POST',
        body: form,
    });

    if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`Analyze failed (${res.status}): ${errBody || res.statusText}`);
    }

    return res.json();
}