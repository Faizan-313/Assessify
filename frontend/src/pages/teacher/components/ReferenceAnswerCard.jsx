import React from 'react'
import {
    Image as ImageIcon, CheckCircle2, Terminal
} from "lucide-react";

const ReferenceAnswerCard = (question) => {
    const config = question?.evaluationConfig || {};

    if (question.type === "text" || question.type === "diagram") {
        return (
            <>
                {config.referenceAnswer?.trim() && (
                    <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4">
                        <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-400">
                            <CheckCircle2 size={14} />
                            Reference Answer / Rubric
                        </h4>
                        <p className="whitespace-pre-wrap text-sm text-indigo-100/70">
                            {config.referenceAnswer}
                        </p>
                    </div>
                )}
                {question.type === "diagram" && config.referenceImage && (
                    <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4">
                        <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-400">
                            <ImageIcon size={14} />
                            Reference Diagram
                        </h4>
                        <div className="max-h-[70vh] overflow-auto rounded-lg border border-slate-700 bg-white p-2">
                            <img
                                src={config.referenceImage}
                                alt="Reference diagram"
                                className="block h-auto max-w-none"
                            />
                        </div>
                    </div>
                )}
            </>
        );
    }

    if (question.type === "mcq") {
        return (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
                    <CheckCircle2 size={14} />
                    Correct Answer
                </h4>
                <div className="space-y-2">
                    {question.options.map((option, idx) => {
                        const isCorrect = config.correctOption === idx;
                        const optionText = option?.text ?? option;

                        return (
                            <div
                                key={option?._id || idx}
                                className={`flex items-center gap-3 rounded-lg border p-3 ${
                                    isCorrect
                                        ? "border-emerald-500/30 bg-emerald-500/10"
                                        : "border-slate-700/50 bg-slate-900/50"
                                }`}
                            >
                                <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border ${
                                    isCorrect ? "border-emerald-500 text-emerald-500" : "border-slate-500 text-transparent"
                                }`}>
                                    {isCorrect && <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />}
                                </div>
                                <span className={isCorrect ? "font-medium text-emerald-100" : "text-slate-300"}>
                                    ({String.fromCharCode(65 + idx)}) {optionText}
                                </span>
                                {isCorrect && <CheckCircle2 size={16} className="ml-auto text-emerald-500" />}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (question.type === "code" && config.testCases?.length > 0) {
        return (
            <div className="rounded-lg border border-slate-700/50 bg-slate-900/30 p-4">
                <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <Terminal size={14} />
                    Evaluation Test Cases
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                    {config.testCases.map((testCase, idx) => (
                        <div key={idx} className="flex flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
                            <div className="border-b border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs font-bold text-slate-400">
                                Case {idx + 1}
                            </div>
                            <div className="space-y-2 p-3 font-mono text-xs">
                                <div>
                                    <span className="mb-1 block text-sky-400">Input:</span>
                                    <div className="overflow-x-auto rounded bg-slate-900 p-2 text-slate-300">
                                        {testCase.input || "No Input"}
                                    </div>
                                </div>
                                <div>
                                    <span className="mb-1 block text-emerald-400">Expected Output:</span>
                                    <div className="overflow-x-auto rounded bg-slate-900 p-2 text-slate-300">
                                        {testCase.output}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return null;
};

export default ReferenceAnswerCard
