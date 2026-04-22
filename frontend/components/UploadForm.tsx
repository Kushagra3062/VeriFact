'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { analyzePayload } from '@/lib/misinfoClient';

interface BufferedFile {
    name: string;
    type: string;
    buffer: ArrayBuffer;
}

export default function UploadForm() {
    const router = useRouter();
    const [text, setText] = useState('');
    const [url, setUrl] = useState('');
    const [file, setFile] = useState<BufferedFile | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0] || null;
        if (f) {
            console.log(`[UploadForm] File selected: ${f.name}, Size: ${f.size} bytes, Type: ${f.type}`);
            try {
                // CRITICAL: Read file content IMMEDIATELY on selection
                // before the File reference can become stale
                const buffer = await f.arrayBuffer();
                console.log(`[UploadForm] File buffered: ${buffer.byteLength} bytes`);
                setFile({ name: f.name, type: f.type, buffer });
            } catch (err) {
                console.error('[UploadForm] Failed to read file:', err);
                setError('Failed to read the selected file. Please try again.');
                setFile(null);
            }
        } else {
            setFile(null);
        }
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        const trimmedText = text.trim();
        const trimmedUrl = url.trim();

        if (!trimmedText && !trimmedUrl && !file) {
            setError('Please provide text, a URL, or upload a file.');
            return;
        }

        const payload: { text?: string; url?: string; fileData?: { name: string; type: string; buffer: ArrayBuffer } } = {};
        if (trimmedText) payload.text = trimmedText;
        else if (trimmedUrl) payload.url = trimmedUrl;
        else if (file) payload.fileData = file;

        try {
            setSubmitting(true);
            console.log(`[UploadForm] Submitting payload:`, { 
                file: payload.fileData ? `${payload.fileData.name} (${payload.fileData.buffer.byteLength} bytes)` : 'none' 
            });
            const result = await analyzePayload(payload);

            sessionStorage.setItem('lastAnalysis', JSON.stringify(result));
            sessionStorage.setItem(
                'lastInputMeta',
                JSON.stringify({
                    kind: trimmedText ? 'text' : trimmedUrl ? 'url' : file ? 'file' : 'unknown',
                    text: trimmedText || undefined,
                    url: trimmedUrl || undefined,
                    fileName: file?.name || undefined,
                    fileType: file?.type || undefined,
                })
            );

            router.push('/results');
        } catch (err: any) {
            setError(err?.message || 'Failed to analyze input.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form
            onSubmit={onSubmit}
            className="relative max-w-5xl mx-auto px-6 sm:px-8 md:px-10 py-8 sm:py-10 space-y-8
                       rounded-3xl border border-gray-800/60
                       bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950
                       shadow-[0_0_40px_rgba(139,92,246,0.2)] backdrop-blur-2xl"
        >
            {/* Glow accents */}
            <div className="absolute -top-20 -left-20 w-56 sm:w-72 h-56 sm:h-72 bg-purple-500/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -right-20 w-56 sm:w-72 h-56 sm:h-72 bg-pink-500/20 rounded-full blur-3xl"></div>

            {/* Title */}
            <div className="relative text-center mb-4">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                    Misinformation Analyzer
                </h2>
                <p className="mt-3 text-gray-400 text-sm sm:text-base max-w-2xl mx-auto">
                    Paste text, drop a link, or upload a file. Get instant AI-powered analysis.
                </p>
            </div>

            {/* 2-column layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {/* Left: Text + URL */}
                <div className="space-y-6">
                    {/* Text Input */}
                    <div className="group relative">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Text</label>
                        <textarea
                            className="w-full h-[140px] sm:h-[160px] p-3 sm:p-4 rounded-xl
                                       bg-gray-900/80 border border-gray-800 text-gray-100
                                       placeholder-gray-500 focus:ring-2 focus:ring-purple-500
                                       focus:outline-none transition resize-none text-sm sm:text-base"
                            placeholder="Paste a claim, paragraph, or article..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                        />
                    </div>

                    {/* URL Input */}
                    <div className="group relative">
                        <label className="block text-sm font-medium text-gray-300 mb-2">URL</label>
                        <input
                            type="url"
                            className="w-full p-3 rounded-xl
                                       bg-gray-900/80 border border-gray-800 text-gray-100
                                       placeholder-gray-500 focus:ring-2 focus:ring-pink-500
                                       focus:outline-none transition text-sm sm:text-base"
                            placeholder="https://example.com/news-article"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                        />
                    </div>
                </div>

                {/* Right: File Upload */}
                <div className="group relative flex flex-col">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Upload File</label>
                    <div className="flex-1 relative flex flex-col items-center justify-center border-2 border-dashed border-gray-700
                                    rounded-xl p-6 sm:p-8 text-gray-400 hover:border-purple-500 hover:text-gray-200 transition group text-sm sm:text-base">
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,audio/mpeg,audio/wav,video/mp4,video/quicktime,video/x-msvideo"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={onFileChange}
                        />
                        {file ? (
                            <p className="text-sm sm:text-base font-medium text-gray-200 break-words text-center">
                                {file.name}{' '}
                                <span className="text-gray-500">({file.type || 'unknown'})</span>
                            </p>
                        ) : (
                            <p className="text-sm sm:text-base text-center">Click or drag & drop a file here</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg p-3">
                    {error}
                </div>
            )}

            {/* Submit */}
            <div className="flex items-center justify-center pt-2 sm:pt-4">
                <button
                    type="submit"
                    disabled={submitting}
                    className={`px-6 sm:px-8 md:px-10 py-2.5 sm:py-3 rounded-xl font-semibold text-base sm:text-lg text-white shadow-lg transition-all
                        ${submitting
                        ? 'bg-purple-800 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 hover:scale-105 hover:shadow-[0_0_25px_rgba(236,72,153,0.5)]'}
                    `}
                >
                    {submitting ? 'Analyzing…' : 'Analyze Now'}
                </button>
            </div>
        </form>
    );
}
