'use client';

import React, { useEffect, useState } from "react";
import Navbar from "@/components/navbar";
import Link from "next/link";
import type { AnalysisResponse, Decision } from "@/lib/types";

// type Decision = 'True' | 'False' | 'Misleading' | 'Unverifiable' | 'Error';

// interface ClaimBreakdown {
//     sub_claim: string;
//     status: 'Supported' | 'Refuted' | 'Contradicted' | 'Unverifiable';
//     evidence: string;
//     source_url?: string;
//     reason_for_decision: string;
// }
//
// interface Explanation {
//     claim_breakdown: ClaimBreakdown[];
//     explanation: string;
//     corrected_news?: string;
//     explanatory_tag?: string;
//     misinformation_techniques?: string[];
// }
//
// export interface WebResult {
//     title: string;
//     url: string;
// }
//
// export interface AnalysisResponse {
//     summary?: string;
//     final_verdict?: {
//         decision?: Decision;
//         fake_score?: number;
//         reasoning?: string;
//     };
//     explanation?: Partial<Explanation>;
//     web_results?: WebResult[];
//     fact_check_api?: any[];
//     error?: string;
//     detail?: any;
// }


export default function ResultsPage() {
    const [data, setData] = useState<AnalysisResponse | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);

    useEffect(() => {
        try {
            const raw = typeof window !== 'undefined' ? sessionStorage.getItem('lastAnalysis') : null;
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    // This handles both direct objects and objects nested under a 'results' key
                    setData(parsed.results || parsed);
                } else {
                    setParseError('Stored analysis has an invalid format.');
                }
            }
        } catch (e) {
            setParseError(`Failed to parse stored analysis.`);
        }
    }, []);

    const decisionColor = (d?: Decision | 'Unknown') =>
        d === 'True' ? 'text-green-400'
            : d === 'False' ? 'text-red-400'
                : d === 'Misleading' ? 'text-orange-400'
                    : d === 'Unverifiable' ? 'text-blue-400'
                        : 'text-gray-400';

    // Safely extract all data points from the state
    const decision: Decision | 'Unknown' = data?.final_verdict?.decision ?? 'Unknown';
    const fakeScore = data?.final_verdict?.fake_score;
    const reasoning = data?.final_verdict?.reasoning ?? '';
    const claimBreakdown = data?.explanation?.claim_breakdown ?? [];
    const explanationText = data?.explanation?.explanation ?? '';
    const explanatoryTag = data?.explanation?.explanatory_tag ?? '';
    const correctedNews = data?.explanation?.corrected_news ?? '';
    const techniques = Array.isArray(data?.explanation?.misinformation_techniques)
        ? (data.explanation.misinformation_techniques as string[])
        : [];
    const webResults = Array.isArray(data?.web_results) ? data.web_results : [];
    const apiError = data?.error || (typeof data?.detail === 'string' ? String(data.detail) : '');

    // Backend returns fake_score (0 = truthful, 100 = fake).
    // Invert it so the UI shows "Truthfulness Score" (0 = fake, 100 = truthful).
    const score = typeof fakeScore === 'number' ? (100 - fakeScore) : null;

    const getScoreColor = (s: number | null) => {
        if (s === null) return "text-gray-400";
        if (s > 70) return "text-green-400"; // Closer to True
        if (s > 40) return "text-orange-400"; // Misleading/Uncertain
        return "text-red-500"; // Closer to False
    };

    return (
        <main className="bg-gradient-to-br from-black via-gray-900 to-black text-white min-h-screen">
            <Navbar />
            <section className="pt-24 pb-12 px-6">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-4xl sm:text-5xl font-extrabold mb-6 bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                        Analysis Results
                    </h1>
                    <p className="text-gray-400 mb-10 text-base sm:text-lg">
                        {!data ? "Loading analysis..." : "Here are the verified results of your analysis."}
                    </p>

                    {(parseError || apiError) && (
                        <div className="bg-red-900/30 border border-red-500/40 rounded-xl p-5 mb-8 shadow-lg">
                            <h3 className="font-semibold text-red-300 mb-2">⚠️ Could Not Display a Complete Result</h3>
                            {parseError && <p className="text-sm text-red-200">{parseError}</p>}
                            {apiError && <p className="text-sm text-red-200">API error: {apiError}</p>}
                            <p className="text-xs mt-2 text-red-300/70">Try running the analysis again. If this persists clear the browsers sessionStorage and retry.</p>
                        </div>
                    )}

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="md:col-span-2 space-y-8">
                            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-800 p-4 sm:p-6 shadow-lg hover:shadow-purple-500/10 transition">
                                <h2 className="text-xl sm:text-2xl font-semibold mb-3 text-purple-300">Your Input</h2>
                                <p className="text-gray-400 text-sm">Input successfully captured and analyzed ✅</p>
                            </div>

                            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-800 p-4 sm:p-6 shadow-lg">
                                <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4 text-pink-300">Classification</h2>
                                <p className={`text-xl sm:text-2xl font-bold ${decisionColor(decision)}`}>{decision}</p>
                                <p className="text-gray-400 mt-2 sm:mt-3 text-sm italic">{reasoning || "No reasoning provided."}</p>
                            </div>

                            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-800 p-4 sm:p-6 shadow-lg">
                                <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-cyan-300">Reasoning & Explanation</h2>
                                {claimBreakdown.length > 0 ? (
                                    <ul className="list-disc ml-6 text-gray-300 space-y-3 text-sm">
                                        {claimBreakdown.map((c, i) => (
                                            <li key={i}>
                                                <div className="font-medium text-purple-200 mb-1">{c.sub_claim}</div>
                                                <div><span className="font-semibold text-gray-400">Status:</span> {c.status}</div>
                                                {c.evidence && <div><span className="font-semibold text-gray-400">Evidence:</span> {c.evidence}</div>}
                                                {c.source_url && <div><span className="font-semibold text-gray-400">Source:</span> <a className="text-cyan-400 underline hover:text-cyan-200" href={c.source_url} target="_blank" rel="noopener noreferrer">{c.source_url}</a></div>}
                                                {c.reason_for_decision && <div><span className="font-semibold text-gray-400">Why:</span> {c.reason_for_decision}</div>}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-gray-400 text-sm">No detailed explanation available.</p>
                                )}
                                {explanationText && <p className="mt-4 text-gray-200">{explanationText}</p>}
                                {explanatoryTag && <p className="mt-3 text-purple-300"><strong>Tag:</strong> {explanatoryTag}</p>}
                                {correctedNews && <p className="mt-3 text-cyan-300"><strong>Corrected:</strong> {correctedNews}</p>}
                                {techniques.length > 0 && (
                                    <div className="mt-4">
                                        <strong className="text-pink-300">Techniques Detected:</strong>
                                        <ul className="list-disc pl-6 text-gray-300 text-sm mt-1">
                                            {techniques.map((t: any, i) => (
                                                <li key={i}>
                                                    {typeof t === 'string'
                                                        ? t
                                                        : `${t.technique || 'Unknown technique'}${t.reason_for_detection ? ` — ${t.reason_for_detection}` : ''}`}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                            </div>

                            {webResults.length > 0 && (
                                <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-800 p-4 sm:p-6 shadow-lg">
                                    <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-green-300">Evidence Sources</h2>
                                    <ul className="list-disc ml-6 text-cyan-400 text-sm space-y-2">
                                        {webResults.map((s, i) => (
                                            <li key={i}><a className="underline hover:text-cyan-200" href={s.url} target="_blank" rel="noopener noreferrer">{s.title || s.url}</a></li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className="space-y-8">
                            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-800 p-6 shadow-lg flex flex-col items-center">
                                <h2 className="text-2xl font-semibold mb-4 text-yellow-300">Truthfulness Score</h2>
                                <div className="relative w-28 h-28 flex items-center justify-center">
                                    <div className="absolute inset-0 rounded-full bg-gray-700"></div>
                                    <div className="absolute inset-1 rounded-full bg-gray-900"></div>
                                    <span className={`relative text-2xl font-bold ${getScoreColor(score)}`}>
                                        {typeof score === 'number' ? `${score}%` : "--%"}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Score reflects confidence in truthfulness.</p>

                                <div className="mt-4 flex gap-3">
                                    <span className={`w-4 h-4 rounded-full transition ${score !== null && score > 70 ? 'bg-green-500' : 'bg-gray-600'}`}></span>
                                    <span className={`w-4 h-4 rounded-full transition ${score !== null && score > 40 && score <= 70 ? 'bg-orange-500' : 'bg-gray-600'}`}></span>
                                    <span className={`w-4 h-4 rounded-full transition ${score !== null && score <= 40 ? 'bg-red-500' : 'bg-gray-600'}`}></span>
                                </div>
                            </div>

                            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-800 p-6 shadow-lg">
                                <h2 className="text-2xl font-semibold mb-4 text-teal-300">Next Steps</h2>
                                <ol className="list-decimal ml-6 text-gray-300 space-y-1 text-sm">
                                    <li>Cross-reference claims with multiple trusted sources.</li>
                                    <li>Be cautious of emotionally charged language.</li>
                                    <li>Use reverse image search for visuals.</li>
                                </ol>
                            </div>

                            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-800 p-6 shadow-lg">
                                <h2 className="text-2xl font-semibold mb-4 text-blue-300">Language</h2>
                                <p className="text-gray-400 text-sm">
                                    Multilingual support will be available in the final product.
                                </p>
                            </div>

                            <div className="bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl shadow-xl text-center p-6 hover:scale-105 transition">
                                <Link href="/analyser" className="font-bold text-lg text-white">
                                    🔄 New Check
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}

