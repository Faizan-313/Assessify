import {
    Calendar, Clock, Award, Copy, Check,
    Users, ChevronRight, Trash2,
    Loader2, Sparkles, Loader, AlertCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import getExamStatusHelper from "../utils/examStatusHelper.js";

function ExamCard({ exam, onViewDetails, onEvaluate, onCopyCode, copiedCode, onDeleteExam, isDeleting }) {
    const status = getExamStatusHelper(exam.startTime, exam.endTime);
    const questionCount = exam.questions?.length || 0;
    const isCompleted = status.label === "Completed";
    const isLive = status.label === "Live";
    const navigate = useNavigate();

    return (
        <div className="group relative rounded-2xl overflow-hidden bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 hover:border-violet-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-500/10">
            <div className="relative p-6 bg-gradient-to-br from-indigo-600/20 via-violet-600/20 to-fuchsia-600/20 border-b border-white/10">
                <div className="absolute -top-16 -right-16 w-40 h-40 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="relative">
                    <div className="flex justify-between items-start mb-3 gap-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${status.color}`}>
                            {status.label}
                        </span>
                        <button
                            onClick={onCopyCode}
                            className="inline-flex items-center gap-1.5 text-xs font-mono bg-white/10 hover:bg-white/20 border border-white/10 text-gray-100 px-2.5 py-1 rounded-lg transition-all"
                            title="Copy exam code"
                        >
                            {copiedCode === exam.examCode ? (
                                <>
                                    <Check size={12} />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy size={12} />
                                    {exam.examCode}
                                </>
                            )}
                        </button>
                    </div>
                    <h2 className="text-xl font-bold line-clamp-2 text-white">
                        {exam.title}
                    </h2>
                    {exam.evaluationStatus && exam.evaluationStatus !== "not_started" && (
                        <ExamEvaluationStatusBadge status={exam.evaluationStatus} />
                    )}
                </div>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <Stat label="Duration" value={exam.duration} unit="mins" />
                    <Stat label="Marks" value={exam.totalMarks} unit="points" />
                    <Stat label="Questions" value={questionCount} unit="qs" />
                </div>

                <div className="border-t border-white/10 pt-4 mb-5 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-gray-400">
                        <Calendar size={14} className="flex-shrink-0 text-indigo-400" />
                        <span>
                            Starts:{" "}
                            {new Date(exam.startTime).toLocaleString("en-IN", {
                                timeZone: "Asia/Kolkata",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                            })}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                        <Clock size={14} className="flex-shrink-0 text-violet-400" />
                        <span>
                            Ends:{" "}
                            {new Date(exam.endTime).toLocaleString("en-IN", {
                                timeZone: "Asia/Kolkata",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                            })}
                        </span>
                    </div>
                </div>

                <div className="space-y-2">
                    <button
                        onClick={onViewDetails}
                        className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white py-2.5 rounded-lg transition-all font-semibold text-sm shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40"
                    >
                        View Details
                        <ChevronRight size={16} className="group-hover:translate-x-0.5 transition" />
                    </button>

                    {isLive && (
                        <button
                            onClick={() => navigate(`/teacher/monitor/${exam._id}`)}
                            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white py-2.5 rounded-lg transition-all font-semibold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40"
                        >
                            <Users size={16} />
                            Monitor Exam
                        </button>
                    )}

                    {!isLive && !isCompleted && (
                        <button
                            onClick={onDeleteExam}
                            disabled={isDeleting}
                            className="w-full inline-flex items-center cursor-pointer justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-300 hover:text-red-200 py-2.5 rounded-lg transition-all font-semibold text-sm disabled:opacity-60"
                        >
                            {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            Delete Exam
                        </button>
                    )}

                    {isCompleted && (
                        <button
                            onClick={onEvaluate}
                            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-fuchsia-500 to-pink-600 hover:from-fuchsia-400 hover:to-pink-500 text-white py-2.5 rounded-lg transition-all font-semibold text-sm shadow-lg shadow-fuchsia-500/20 hover:shadow-fuchsia-500/40"
                        >
                            <Award size={16} />
                            Evaluate Papers
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function ExamEvaluationStatusBadge({ status }) {
    const config = {
        in_progress: {
            label: "AI auto-evaluation running",
            icon: Loader,
            className: "bg-amber-500/15 text-amber-100 border border-amber-400/35",
        },
        auto_evaluated: {
            label: "Papers auto-evaluated — review or finalize in panel",
            icon: Sparkles,
            className: "bg-violet-500/15 text-violet-100 border border-violet-400/35",
        },
        completed: {
            label: "Results finalized (locked)",
            icon: Award,
            className: "bg-emerald-500/15 text-emerald-100 border border-emerald-400/35",
        },
        failed: {
            label: "Auto-evaluation failed — retry from evaluation panel",
            icon: AlertCircle,
            className: "bg-red-500/15 text-red-100 border border-red-400/35",
        },
        manually_evaluated: {
            label: "Marked manually",
            icon: Award,
            className: "bg-sky-500/15 text-sky-100 border border-sky-400/35",
        },
    }[status];

    if (!config) return null;

    const Icon = config.icon;
    return (
        <span
            className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold leading-snug ${config.className}`}
        >
            <Icon size={12} className={status === "in_progress" ? "animate-spin shrink-0" : "shrink-0"} />
            {config.label}
        </span>
    );
}

function Stat({ label, value, unit }) {
    return (
        <div className="rounded-lg p-3 text-center bg-white/[0.03] border border-white/10">
            <p className="text-[10px] text-gray-400 mb-1 font-medium uppercase tracking-wider">{label}</p>
            <p className="text-lg font-bold text-white tabular-nums">{value}</p>
            <p className="text-[10px] text-gray-500">{unit}</p>
        </div>
    );
}

export default ExamCard;
