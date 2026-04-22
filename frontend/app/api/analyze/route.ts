// frontend/app/api/analyze/route.ts
/* TypeScript */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        // Clean the backend URL from potential quotes and spaces
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/[",]/g, '').trim();
        if (!backendUrl) {
            return new Response(JSON.stringify({ error: 'Backend URL not configured' }), { status: 500 });
        }

        // Diagnostic: Log all incoming headers
        console.log("[api/analyze] Incoming Headers:");
        req.headers.forEach((v, k) => console.log(`  ${k}: ${v}`));

        const frontendFormData = await req.formData();
        const text = frontendFormData.get('text');
        const url = frontendFormData.get('url');
        const fileValue = frontendFormData.get('file');

        // Check if the input is a file upload
        const isFile = fileValue && typeof fileValue !== 'string' && (fileValue instanceof Blob);

        let res: Response;

        if (isFile) {
            const fileBlob = fileValue as Blob;
            const fileName = (fileValue as any).name || 'uploaded_file';
            
            // CRITICAL FIX: Buffer the file content immediately.
            // Next.js App Router can return 0-byte blobs from formData() if the
            // underlying stream is consumed or GC'd before we read from the blob.
            const buffer = await fileBlob.arrayBuffer();
            console.log(`[api/analyze] File: ${fileName}, buffered ${buffer.byteLength} bytes, type: ${fileBlob.type}`);
            
            if (buffer.byteLength === 0) {
                return new Response(JSON.stringify({ error: 'File upload failed — received 0 bytes. Please try again.' }), { 
                    status: 400, 
                    headers: { 'Content-Type': 'application/json' } 
                });
            }

            // Reconstruct a fresh Blob from the buffered data
            const freshBlob = new Blob([buffer], { type: fileBlob.type });
            const filePayload = new FormData();
            filePayload.append('file', freshBlob, fileName);

            console.log(`[api/analyze] Forwarding to ${backendUrl}/analyze-file`);
            res = await fetch(`${backendUrl}/analyze-file`, {
                method: 'POST',
                body: filePayload,
            });

        } else {
            // The input is text or a URL, so we send as application/json to the /analyze endpoint
            const jsonPayload: { text?: string; url?: string; input_type: string } = {
                input_type: 'text' // Default
            };

            if (text && typeof text === 'string' && text.trim()) {
                jsonPayload.text = text.trim();
                jsonPayload.input_type = 'text';
            } else if (url && typeof url === 'string' && url.trim()) {
                jsonPayload.url = url.trim();
                jsonPayload.input_type = 'url';
            } else {
                console.error("[api/analyze] No valid input found. FormData keys:", Array.from(frontendFormData.keys()));
                return new Response(JSON.stringify({ error: 'No valid text, URL, or file input provided' }), { status: 400 });
            }

            console.log(`[api/analyze] Forwarding to ${backendUrl}/analyze (Type: ${jsonPayload.input_type})`);
            res = await fetch(`${backendUrl}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(jsonPayload),
            });
        }

        // Handle the response from the backend
        const contentType = res.headers.get('content-type');
        let body: any;

        if (contentType && contentType.includes('application/json')) {
            const body = await res.json();
            
            // Forward the backend success/error status and JSON body
            return new Response(JSON.stringify(body), {
                status: res.status,
                headers: { 'Content-Type': 'application/json' },
            });
        } else {
            const textResponse = await res.text();
            console.error(`[api/analyze] Backend returned non-JSON (${res.status}):`, textResponse.substring(0, 200));
            return new Response(JSON.stringify({ 
                error: 'Backend error', 
                detail: textResponse.substring(0, 500),
                status: res.status 
            }), { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

    } catch (err: any) {
        // Handle network errors or other issues with the proxy itself
        console.error("Proxy Error:", err);
        return new Response(JSON.stringify({ error: 'Proxy error', detail: String(err?.message || err) }), { status: 500 });
    }
}

