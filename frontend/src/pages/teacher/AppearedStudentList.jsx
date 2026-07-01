import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Search, ClipboardCheck, AlertCircle, Loader2, ChevronLeft, ChevronRight, Sparkles, Lock, ShieldCheck, AlertTriangle, X
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { apiCall } from "../../api/api";
import { useTeacher } from "../../context/TeacherContextCore";
import { useExam } from "../../context/ExamContextCore";
import StudentRow, { StudentTableHeader } from "./components/StudentRow";
import { TeacherPageShell, teacherCardClass, teacherInputClass } from "./components/TeacherPageShell";

const STATUS_POLL_INTERVAL_MS = 3000;

function AppearedStudentList() {
    const [currentPage, setCurrentPage] = useState(1);
    const [evaluationStatus, setEvaluationStatus] = useState(null);
    const [evalProgress, setEvalProgress] = useState({ completed: 0, total: 0 });
    const [statusReady, setStatusReady] = useState(false);
    const [startingEvaluation, setStartingEvaluation] = useState(false);
    const [showAutoEvalModal, setShowAutoEvalModal] = useState(false);
    const [showPauseConfirmModal, setShowPauseConfirmModal] = useState(false);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [pauseReason, setPauseReason] = useState(null);
    
    // Search states
    const [searchInput, setSearchInput] = useState("");
    const [activeSearch, setActiveSearch] = useState("");
    const pollTimerRef = useRef(null);

    const { examId } = useParams();
    const navigate = useNavigate();
    const { fetchStudents, students, studentsLoading, studentsError, studentsPagination } = useTeacher();
    const { particularExamDetails, fetchParticularExamDetails } = useExam();

    const exam = particularExamDetails || {};
    const inProgress = evaluationStatus === "in_progress";
    const isCompleted = evaluationStatus === "completed";
    const evaluating = inProgress || startingEvaluation;
    const canStart = statusReady && !inProgress && !startingEvaluation && !isCompleted;
    const canComplete = statusReady && !inProgress && !isCompleted && !completing;

    const handleSearchSubmit = (e) => {
        e.preventDefault(); 
        setCurrentPage(1);
        setActiveSearch(searchInput);
    };

    const handleClearSearch = () => {
        setSearchInput("");
        setActiveSearch("");
        setCurrentPage(1);
    };

    const fetchEvaluationStatus = useCallback(async () => {
        if (!examId) return null;
        try {
            const res = await apiCall(`/api/v1/${examId}/auto-evaluation/status`, "GET");
            const nextStatus = res?.data?.evaluationStatus ?? null;
            const progress = res?.data?.autoEvalProgress ?? { completed: 0, total: 0, pauseReason: null };
            
            setEvaluationStatus(nextStatus);
            setEvalProgress(progress);
            setPauseReason(nextStatus === "paused" ? progress.pauseReason || "Paused by teacher" : null);
            setStatusReady(true);
            return nextStatus;
        } catch (err) {
            console.warn("Could not fetch auto evaluation status:", err);
            setStatusReady(true);
            return null;
        }
    }, [examId]);

    useEffect(() => {
        if (!examId) return;
        // signature: (examId, page, limit, searchQuery)
        fetchStudents(examId, currentPage, 30, activeSearch);
    }, [examId, currentPage, activeSearch, fetchStudents]);

    useEffect(() => {
        if (!examId) return;
        fetchParticularExamDetails(examId);
        fetchEvaluationStatus();
    }, [examId, fetchParticularExamDetails, fetchEvaluationStatus]);

    useEffect(() => {
        if (!inProgress) {
            if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current);
                pollTimerRef.current = null;
            }
            return;
        }

        pollTimerRef.current = setInterval(async () => {
            const next = await fetchEvaluationStatus();
            if (next && next !== "in_progress") {
                clearInterval(pollTimerRef.current);
                pollTimerRef.current = null;
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Keep the search context alive even when polling finishes
                await fetchStudents(examId, currentPage, 30, activeSearch);
                
                if (next === "auto_evaluated") {
                    toast.success("Auto evaluation finished");
                } else if (next === "failed") {
                    toast.error("Auto evaluation failed. You can retry.");
                }
            }
        }, STATUS_POLL_INTERVAL_MS);

        return () => {
            if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current);
                pollTimerRef.current = null;
            }
        };
    }, [inProgress, fetchEvaluationStatus, fetchStudents, examId, currentPage, activeSearch]);

    const handleEvaluate = (studentId) => {
        if (evaluating) return;
        navigate(`/teacher/evaluate/${examId}/${studentId}`); 
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const handleNextPage = () => {
        if (currentPage < studentsPagination.pages) setCurrentPage(currentPage + 1);
    };

    const handleAutoEvaluation = async () => {
        if (!canStart) return;
        setShowAutoEvalModal(true);
    };

    const confirmAutoEvaluation = async () => {
        setShowAutoEvalModal(false);
        try {
            setStartingEvaluation(true);
            const res = await apiCall(`/api/v1/${examId}/auto-evaluation/start`, "POST");
            if (res.status === 202 || res.status === 200) {
                setEvaluationStatus(res.data?.evaluationStatus || "in_progress");
                setPauseReason(null);
                toast.success(res.data?.message || "Auto evaluation started");
            }
        } catch (error) {
            console.error("Failed to start auto evaluation:", error);
            const message = error?.response?.data?.message || "Could not start auto evaluation";
            if (error?.response?.data?.evaluationStatus) {
                setEvaluationStatus(error.response.data.evaluationStatus);
            }
            toast.error(message);
        } finally {
            setStartingEvaluation(false);
        }
    };

    const handleCompleteEvaluation = async () => {
        if (!canComplete) return;
        try {
            setCompleting(true);
            const res = await apiCall(`/api/v1/teacher/exam/complete`, "POST", { data: { examId } });
            if (res.status === 200) {
                setEvaluationStatus(res.data?.evaluationStatus || "completed");
                setShowCompleteModal(false);
                toast.success(res.data?.message || "Evaluation finalized");
                await fetchStudents(examId, currentPage, 30, activeSearch);
            }
        } catch (error) {
            console.error("Failed to finalize evaluation:", error);
            const message = error?.response?.data?.message || "Could not finalize evaluation";
            toast.error(message);
        } finally {
            setCompleting(false);
        }
    };

    const handlePauseEvaluation = () => {
        if (!inProgress) return;
        setShowPauseConfirmModal(true);
    };

    const confirmPauseEvaluation = async () => {
        setShowPauseConfirmModal(false);
        if (!inProgress) return;

        try {
            const res = await apiCall(`/api/v1/${examId}/auto-evaluation/pause`, "PATCH");
            if (res.status === 200) {
                setEvaluationStatus("paused");
                setPauseReason(res.data?.reason || "Paused by teacher");
                toast.success(res.data?.message || "Auto evaluation paused");
            }
        } catch (error) {
            console.error("Failed to pause auto evaluation:", error);
            toast.error("Could not pause evaluation. Please try again.");
        }
    };

    if (studentsLoading && students.length === 0) {
        return (
            <TeacherPageShell>
                <div className="flex flex-col justify-center items-center py-24">
                    <Loader2 className="w-12 h-12 animate-spin text-sky-400 mb-4" />
                    <p className="text-gray-400 font-medium">Loading students...</p>
                </div>
            </TeacherPageShell>
        );
    }

    const progressPercent = evalProgress?.total > 0
        ? Math.round((evalProgress.completed / evalProgress.total) * 100)
        : 0;

    return (
        <TeacherPageShell>
            {/* Header */}
            <div className="mb-8 flex flex-col xl:flex-row xl:items-end justify-between gap-6">
                <div>
                    <span className="inline-block px-3 py-1 mb-3 text-xs font-semibold tracking-wider uppercase rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
                        Evaluation
                    </span>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                        Student{" "}
                        <span className="bg-gradient-to-r from-sky-300 to-emerald-300 bg-clip-text text-transparent">
                            Papers
                        </span>
                    </h1>
                    <p className="text-gray-400 mt-1 text-sm">Manage and evaluate student exam submissions</p>
                </div>

                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
                    <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full lg:w-80">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search student..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className={`${teacherInputClass} pl-10 py-2.5 text-sm`}
                            />
                            {searchInput && (
                                <button
                                    type="button"
                                    onClick={handleClearSearch}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <button
                            type="submit"
                            className="px-5 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-sm text-white rounded-xl transition-colors font-medium whitespace-nowrap"
                        >
                            Search
                        </button>
                    </form>

                    <div className="flex gap-3">
                        <button
                            onClick={handleAutoEvaluation}
                            disabled={!canStart}
                            className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white whitespace-nowrap bg-gradient-to-r from-indigo-500 to-emerald-600 hover:from-indigo-400 hover:to-emerald-500 shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {!statusReady || evaluating ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Sparkles className="w-4 h-4" />
                            )}
                            <span>{evaluating ? "Evaluating..." : evaluationStatus === "failed" ? "Retry" : evaluationStatus === "paused" ? "Resume" : "Auto Evaluate"}</span>
                        </button>

                        {evaluationStatus === "in_progress" && (
                            <button
                                onClick={handlePauseEvaluation}
                                disabled={!inProgress}
                                className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white whitespace-nowrap bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Pause
                            </button>
                        )}

                        <button
                            onClick={() => canComplete && setShowCompleteModal(true)}
                            disabled={!canComplete}
                            className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white whitespace-nowrap bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCompleted ? <Lock className="w-4 h-4" /> : completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                            <span>{isCompleted ? "Finalized" : completing ? "Finalizing" : "Complete"}</span>
                        </button>
                    </div>
                </div>
            </div>
            {pauseReason && (
                <div className="mb-6 px-6 py-4 rounded-2xl border border-white/10 bg-[#111827]/80 text-gray-200">
                    <div className="flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 text-amber-300 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-white">Auto evaluation paused</p>
                            <p className="text-sm text-gray-400">{pauseReason}</p>
                        </div>
                    </div>
                </div>
            )}

            {(inProgress || startingEvaluation) && (
                <div className="border-b border-2 rounded-2xl border-sky-500/25 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-emerald-500/10 mb-4 px-6 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 min-w-0">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shrink-0">
                                <Loader2 className="w-5 h-5 text-white animate-spin" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-sm font-bold text-white">Auto Evaluation in Progress</h3>
                                <p className="text-xs text-gray-400 truncate">{exam.title || "this exam"}</p>
                            </div>
                        </div>
                        {evalProgress?.total > 0 && (
                            <div className="w-full sm:w-48 shrink-0 flex-none min-w-0 max-w-full">
                                <div className="flex justify-between text-xs font-semibold text-gray-300 mb-1">
                                    <span>{evalProgress.completed}/{evalProgress.total}</span>
                                    <span>{progressPercent}%</span>
                                </div>
                                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                                    <div
                                        className="bg-sky-500 h-1.5 rounded-full transition-[width] duration-500"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                        Manual evaluation is locked on the table below until the job finishes.
                    </p>
                </div>
            )}

            {isCompleted && (
                <div className={`mb-6 ${teacherCardClass} overflow-hidden`}>
                    <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500" />
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                            <Lock className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">Evaluation Finalized</h3>
                            <p className="text-sm text-gray-400">Results for this exam are locked. Marks can no longer be edited.</p>
                        </div>
                    </div>
                </div>
            )}

            {studentsError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                    <div>
                        <p className="font-semibold text-red-300 mb-1">Error Loading Students</p>
                        <p className="text-sm text-red-400/80">{studentsError}</p>
                        <button
                            onClick={() => fetchStudents(examId, currentPage, 30, activeSearch)}
                            className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-medium rounded-lg border border-red-500/30"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            )}

            {/* Exam Details */}
            <div className={`mb-8 ${teacherCardClass} overflow-hidden`}>
                <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-sky-500/10 to-indigo-500/10">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <ClipboardCheck className="w-5 h-5 text-sky-400" />
                        Exam Details
                    </h2>
                </div>
                <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <DetailField label="Exam Title" value={exam.title || "N/A"} />
                    <DetailField label="Exam Code" value={exam.examCode || "N/A"} mono />
                    <DetailField label="Duration" value={exam.duration ? `${exam.duration} mins` : "N/A"} />
                    <DetailField label="Total Marks" value={exam.totalMarks || "N/A"} accent />
                </div>
            </div>

            {/* Students Table — only this section blocked during auto evaluation */}
            {students.length === 0 && !studentsError && !studentsLoading ? (
                <div className={`${teacherCardClass} border-dashed p-12 text-center`}>
                    <div className="w-16 h-16 bg-white/[0.05] border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-gray-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                        {activeSearch ? "No Results Found" : "No Students Enrolled"}
                    </h3>
                    <p className="text-sm text-gray-400 mb-4">
                        {activeSearch ? `No students match "${activeSearch}"` : "There are no students enrolled for this exam yet."}
                    </p>
                    {activeSearch && (
                        <button onClick={handleClearSearch} className="px-6 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-sm font-medium rounded-xl">
                            Clear Search
                        </button>
                    )}
                </div>
            ) : (
                <div className={`${teacherCardClass} overflow-hidden`}>
                    <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-white">Student List</h2>
                    </div>
                    <div className="relative">
                        {(inProgress || startingEvaluation) && (
                            <div className="absolute inset-0 z-10 bg-[#080b12]/30 pointer-events-auto cursor-not-allowed" aria-hidden="true" />
                        )}

                        {studentsLoading && (
                            <div className="absolute inset-0 bg-[#080b12]/50 z-20 flex items-center justify-center backdrop-blur-sm">
                                <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
                            </div>
                        )}

                        <div className="overflow-x-auto">
                        <table className="w-full">
                            <StudentTableHeader />
                            <tbody className="divide-y divide-white/5">
                                {students.map((student, index) => (
                                    <StudentRow
                                        key={student._id}
                                        student={student}
                                        index={index}
                                        onEvaluate={handleEvaluate}
                                        autoEvaluating={evaluating}
                                    />
                                ))}
                            </tbody>
                        </table>
                        </div>
                    </div>

                    <div className="px-6 py-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-sm text-gray-400">
                            Showing <span className="font-semibold text-white">{students.length}</span> of{" "}
                            <span className="font-semibold text-white">{studentsPagination.total}</span> students
                        </p>
                        {studentsPagination.pages > 1 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePreviousPage}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-white/10 hover:bg-white/[0.05] disabled:opacity-40 text-gray-300 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="px-3 py-2 text-sm font-medium text-gray-300">
                                    Page {studentsPagination.currentPage} of {studentsPagination.pages}
                                </span>
                                <button
                                    onClick={handleNextPage}
                                    disabled={currentPage >= studentsPagination.pages}
                                    className="p-2 rounded-lg border border-white/10 hover:bg-white/[0.05] disabled:opacity-40 text-gray-300 transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showAutoEvalModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#0f1117] shadow-2xl overflow-hidden">
                        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-sky-500" />
                        <div className="p-6 space-y-5">
                            <div className="flex items-start gap-3">
                                <div className="w-12 h-12 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center flex-shrink-0">
                                    <Sparkles className="w-6 h-6 text-sky-300" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">{evaluationStatus === "paused" ? "Resume Auto Evaluation?" : "Start Auto Evaluation?"}</h2>
                                    <p className="text-xs text-gray-400">This will grade all pending papers and temporarily lock manual evaluation.</p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-300">
                                We recommend reviewing the student list before {evaluationStatus === "paused" ? "resuming" : "starting"}. You can pause the process anytime while it is running.
                            </p>
                            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setShowAutoEvalModal(false)}
                                    className="px-5 py-2.5 rounded-xl border border-white/10 text-sm text-gray-300 font-semibold hover:bg-white/[0.05]"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmAutoEvaluation}
                                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-emerald-600 hover:from-indigo-400"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    {evaluationStatus === "paused" ? "Resume Evaluation" : "Start Evaluation"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showPauseConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#0f1117] shadow-2xl overflow-hidden">
                        <div className="h-1 w-full bg-gradient-to-r from-amber-500 to-orange-500" />
                        <div className="p-6 space-y-5">
                            <div className="flex items-start gap-3">
                                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                                    <AlertTriangle className="w-6 h-6 text-amber-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Pause Auto Evaluation?</h2>
                                    <p className="text-xs text-gray-400">Pausing stops the job until you resume it again.</p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-300">
                                Pausing will preserve completed progress. You can resume from the same state later.
                            </p>
                            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setShowPauseConfirmModal(false)}
                                    className="px-5 py-2.5 rounded-xl border border-white/10 text-sm text-gray-300 font-semibold hover:bg-white/[0.05]"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmPauseEvaluation}
                                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400"
                                >
                                    <AlertTriangle className="w-4 h-4" />
                                    Pause Evaluation
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showCompleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#0f1117] shadow-2xl overflow-hidden">
                        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500" />
                        <div className="p-6 space-y-5">
                            <div className="flex items-start gap-3">
                                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                                    <AlertTriangle className="w-6 h-6 text-amber-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Finalize Evaluation?</h2>
                                    <p className="text-xs text-gray-400">{exam.title || "this exam"}</p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-300">
                                Once finalized, results will be <span className="font-semibold text-white">locked</span>. Neither auto nor manual marks can be changed afterwards.
                            </p>
                            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setShowCompleteModal(false)}
                                    disabled={completing}
                                    className="px-5 py-2.5 rounded-xl border border-white/10 text-sm text-gray-300 font-semibold hover:bg-white/[0.05] disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCompleteEvaluation}
                                    disabled={completing}
                                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 disabled:opacity-60"
                                >
                                    {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                    {completing ? "Finalizing..." : "Yes, finalize"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </TeacherPageShell>
    );
}

function DetailField({ label, value, mono, accent }) {
    return (
        <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
            <p className={`text-sm font-semibold truncate ${accent ? "text-sky-300 text-xl font-bold" : mono ? "font-mono text-gray-200" : "text-white"}`}>
                {value}
            </p>
        </div>
    );
}

export default AppearedStudentList;