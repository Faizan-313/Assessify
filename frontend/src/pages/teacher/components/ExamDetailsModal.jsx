import {
    Calendar, Clock, Award, X, Copy, Check, Info, FileText, 
    Layers, BookOpen, CalendarDays, Terminal, CheckCircle2, 
    AlertCircle, Image as ImageIcon
} from "lucide-react";
import getExamStatusHelper from "../utils/examStatusHelper.js";

function ExamDetailsModal({ exam, onClose, copiedCode, onCopyCode }) {
    const status = getExamStatusHelper(exam.startTime, exam.endTime);

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleString("en-US", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-80 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-slate-900 text-slate-200 rounded-2xl shadow-2xl border border-slate-700/60 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-slate-950/50 border-b border-slate-800 p-6 flex-shrink-0">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${status.color}`}>
                                    {status.label}
                                </span>
                                {exam.evaluationStatus && exam.evaluationStatus !== "not_started" && (
                                    <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-xs font-bold uppercase tracking-wide">
                                        Eval: {exam.evaluationStatus.replace(/_/g, " ")}
                                    </span>
                                )}
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-white truncate">
                                {exam.title}
                            </h2>
                            <p className="text-slate-400 mt-2 text-sm max-w-2xl line-clamp-2">
                                {exam.description || "No description provided for this exam."}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex-shrink-0"
                            aria-label="Close modal"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    
                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl flex flex-col gap-1">
                            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"><Clock size={14}/> Duration</span>
                            <span className="text-xl font-bold text-white">{exam.duration} <span className="text-sm font-normal text-slate-500">mins</span></span>
                        </div>
                        <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl flex flex-col gap-1">
                            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"><Award size={14}/> Total Marks</span>
                            <span className="text-xl font-bold text-emerald-400">{exam.totalMarks}</span>
                        </div>
                        <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl flex flex-col gap-1">
                            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"><Layers size={14}/> Questions</span>
                            <span className="text-xl font-bold text-white">{exam.questions?.length || 0}</span>
                        </div>
                        <div className="bg-sky-500/10 border border-sky-500/20 p-4 rounded-xl flex flex-col gap-1 items-start justify-center">
                            <span className="text-sky-400 text-xs font-semibold uppercase tracking-wider">Exam Code</span>
                            <button
                                onClick={onCopyCode}
                                className="flex items-center gap-2 text-white font-mono font-bold text-lg hover:text-sky-300 transition-colors group"
                            >
                                {exam.examCode}
                                {copiedCode === exam.examCode ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} className="text-sky-400/50 group-hover:text-sky-300" />}
                            </button>
                        </div>
                    </div>

                    {/* Meta & Schedule Section */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Info size={16} /> Course Details
                            </h3>
                            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 space-y-3">
                                <div className="flex justify-between items-center border-b border-slate-700/50 pb-3">
                                    <span className="text-slate-400 text-sm flex items-center gap-2"><BookOpen size={14}/> Branch</span>
                                    <span className="font-semibold text-white">{exam.branch || "N/A"}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-700/50 pb-3">
                                    <span className="text-slate-400 text-sm flex items-center gap-2"><Layers size={14}/> Semester</span>
                                    <span className="font-semibold text-white">{exam.semester || "N/A"}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 text-sm flex items-center gap-2"><CalendarDays size={14}/> Session</span>
                                    <span className="font-semibold text-white">{exam.session || "N/A"}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Calendar size={16} /> Schedule
                            </h3>
                            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 space-y-3">
                                <div className="flex flex-col gap-1 border-b border-slate-700/50 pb-3">
                                    <span className="text-emerald-400 text-xs font-semibold uppercase">Starts</span>
                                    <span className="font-medium text-white">{formatDate(exam.startTime)}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-rose-400 text-xs font-semibold uppercase">Ends</span>
                                    <span className="font-medium text-white">{formatDate(exam.endTime)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Question Paper Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <FileText size={20} className="text-indigo-400" /> 
                                Question Paper
                            </h3>
                            <span className="text-sm text-slate-400">{exam.questions?.length || 0} Total</span>
                        </div>

                        <div className="space-y-4">
                            {exam.questions && exam.questions.length > 0 ? (
                                exam.questions.map((q, idx) => (
                                    <div key={q._id || idx} className="bg-slate-800/20 border border-slate-700/50 rounded-xl overflow-hidden">
                                        {/* Question Header */}
                                        <div className="bg-slate-800/40 p-4 border-b border-slate-700/50 flex items-start gap-4">
                                            <div className="flex-shrink-0 flex flex-col items-center gap-2">
                                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-700 text-white font-bold text-sm">
                                                    {idx + 1}
                                                </span>
                                                <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded uppercase">
                                                    {q.type}
                                                </span>
                                            </div>
                                            <div className="flex-1 pt-1 text-slate-200 font-medium leading-relaxed">
                                                {q.questionText}
                                            </div>
                                            <div className="flex-shrink-0">
                                                <span className="px-3 py-1 bg-slate-700/50 text-slate-300 text-xs font-bold rounded-lg whitespace-nowrap">
                                                    {q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Question Body (Images, Options) */}
                                        <div className="p-5 space-y-4">
                                            {q.image && (
                                                <div className="border border-slate-700 rounded-lg p-2 bg-slate-900/50 w-fit">
                                                    <img src={q.image} alt="Question figure" className="max-w-full h-auto max-h-64 rounded object-contain" />
                                                </div>
                                            )}

                                            {/* MCQ Options Rendering */}
                                            {q.type === "mcq" && q.options && (
                                                <div className="space-y-2 mt-2">
                                                    {q.options.map((opt, i) => {
                                                        const isCorrect = q.evaluationConfig?.correctOption === i;
                                                        return (
                                                            <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${isCorrect ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900/50 border-slate-700/50'}`}>
                                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${isCorrect ? 'border-emerald-500 text-emerald-500' : 'border-slate-500 text-transparent'}`}>
                                                                    {isCorrect && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                                                                </div>
                                                                <span className={isCorrect ? 'text-emerald-100 font-medium' : 'text-slate-300'}>{opt}</span>
                                                                {isCorrect && <CheckCircle2 size={16} className="text-emerald-500 ml-auto" />}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Text/Diagram Reference Answer */}
                                            {(q.type === "text" || q.type === "diagram") && q.evaluationConfig?.referenceAnswer && (
                                                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-4">
                                                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                        <CheckCircle2 size={14} /> Reference Answer / Rubric
                                                    </h4>
                                                    <p className="text-sm text-indigo-100/70 whitespace-pre-wrap">
                                                        {q.evaluationConfig.referenceAnswer}
                                                    </p>
                                                </div>
                                            )}

                                            {q.type === "diagram" && q.evaluationConfig?.referenceImage && (
                                                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-4">
                                                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                        <ImageIcon size={14} /> Reference Diagram
                                                    </h4>
                                                    <div className="max-h-80 overflow-auto rounded-lg border border-slate-700 bg-white p-2">
                                                        <img
                                                            src={q.evaluationConfig.referenceImage}
                                                            alt="Reference diagram"
                                                            className="block h-auto max-w-none"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Code Test Cases */}
                                            {q.type === "code" && q.evaluationConfig?.testCases?.length > 0 && (
                                                <div className="space-y-2">
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                        <Terminal size={14} /> Evaluation Test Cases
                                                    </h4>
                                                    <div className="grid sm:grid-cols-2 gap-3">
                                                        {q.evaluationConfig.testCases.map((tc, i) => (
                                                            <div key={i} className="bg-slate-950 border border-slate-700 rounded-lg overflow-hidden flex flex-col">
                                                                <div className="bg-slate-800/50 px-3 py-1.5 border-b border-slate-700 text-xs font-bold text-slate-400">
                                                                    Case {i + 1}
                                                                </div>
                                                                <div className="p-3 text-xs font-mono space-y-2">
                                                                    <div>
                                                                        <span className="text-sky-400 block mb-1">Input:</span>
                                                                        <div className="bg-slate-900 p-2 rounded text-slate-300 overflow-x-auto">{tc.input || "No Input"}</div>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-emerald-400 block mb-1">Expected Output:</span>
                                                                        <div className="bg-slate-900 p-2 rounded text-slate-300 overflow-x-auto">{tc.output}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* Fallback if no evaluation config is set */}
                                            {q.type !== "mcq" && !q.evaluationConfig?.referenceAnswer && !q.evaluationConfig?.referenceImage && (!q.evaluationConfig?.testCases || q.evaluationConfig?.testCases?.length === 0) && (
                                                <div className="flex items-center gap-2 text-amber-400/80 text-sm bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                                                    <AlertCircle size={16} />
                                                    No evaluation rubric or test cases provided for this question.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 bg-slate-800/20 border border-slate-700/50 rounded-xl border-dashed">
                                    <FileText size={48} className="mx-auto text-slate-600 mb-4" />
                                    <p className="text-slate-400 font-medium">No questions have been added to this paper yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ExamDetailsModal;
