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

const STATUS_POLL_INTERVAL_MS = 3000;

function AppearedStudentList() {
    const [currentPage, setCurrentPage] = useState(1);
    const [evaluationStatus, setEvaluationStatus] = useState(null);
    const [evalProgress, setEvalProgress] = useState({ completed: 0, total: 0 });
    const [statusReady, setStatusReady] = useState(false);
    const [startingEvaluation, setStartingEvaluation] = useState(false);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [completing, setCompleting] = useState(false);
    
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
            const progress = res?.data?.autoEvalProgress ?? { completed: 0, total: 0 };
            
            setEvaluationStatus(nextStatus);
            setEvalProgress(progress);
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
        
        const confirmed = await new Promise((resolve) => {
            const id = toast(() => (
                <div className="max-w-md">
                    <div className="font-medium text-gray-900">Start Auto Evaluation?</div>
                    <div className="text-sm mt-1 text-gray-600">This will scan and grade all pending papers. Manual evaluation will be locked until it finishes.</div>
                    <div className="flex gap-2 mt-3">
                        <button
                            className="px-3 py-1.5 cursor-pointer hover:bg-emerald-700 rounded-md bg-emerald-600 text-white text-sm font-medium transition-colors"
                            onClick={() => { toast.dismiss(id); resolve(true); }}
                        >Start</button>
                        <button
                            className="px-3 py-1.5 cursor-pointer hover:bg-gray-300 rounded-md bg-gray-200 text-gray-800 text-sm font-medium transition-colors"
                            onClick={() => { toast.dismiss(id); resolve(false); }}
                        >Cancel</button>
                    </div>
                </div>
            ));
        });
        
        if (!confirmed) return;

        try {
            setStartingEvaluation(true);
            const res = await apiCall(`/api/v1/${examId}/auto-evaluation/start`, "POST");
            if (res.status === 202 || res.status === 200) {
                setEvaluationStatus(res.data?.evaluationStatus || "in_progress");
                toast.success("Auto evaluation started");
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

    if (studentsLoading && students.length === 0) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-slate-50 via-[#9ec8b9] to-[#5c8374] dark:from-gray-900 dark:via-slate-900 dark:to-gray-900">
                <Loader2 className="w-12 h-12 animate-spin text-[#5c8374] dark:text-[#9ec8b9] mb-4" />
                <p className="text-gray-600 dark:text-gray-400 font-medium">Loading students...</p>
            </div>
        );
    }

    const progressPercent = evalProgress?.total > 0 
        ? Math.round((evalProgress.completed / evalProgress.total) * 100) 
        : 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#f0f8f7] via-[#e8f5f3] to-[#dff1ee] dark:from-[#092635] dark:via-[#1b4242] dark:to-[#0d3a47] py-8 px-4 sm:px-6 lg:px-8">
            {inProgress && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/70 backdrop-blur-sm px-4">
                    <div className="max-w-md w-full rounded-2xl border border-indigo-500/30 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
                        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-emerald-500 to-indigo-500 animate-pulse" />
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-emerald-700 flex items-center justify-center shadow-md">
                                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Auto Evaluation in Progress</h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">for {exam.title || "this exam"}</p>
                                </div>
                            </div>
                            
                            {evalProgress?.total > 0 && (
                                <div className="py-2">
                                    <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                        <span>Evaluating papers...</span>
                                        <span>{progressPercent}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                        <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }}></div>
                                    </div>
                                    <p className="text-center text-xs mt-2 text-gray-500 dark:text-gray-400">
                                        {evalProgress.completed} of {evalProgress.total} students evaluated
                                    </p>
                                </div>
                            )}
                            <p className="text-sm text-gray-700 dark:text-gray-300">Manual evaluation is locked until the job finishes — please keep this page open or come back later.</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-2">
                                <Lock className="w-3.5 h-3.5" /> Editing blocked during run.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className={`max-w-7xl mx-auto pt-20 ${inProgress ? "pointer-events-none select-none" : ""}`} aria-hidden={inProgress}>
                
                {/* Header Section */}
                <div className="mb-8 flex flex-col xl:flex-row xl:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-[#5c8374] dark:bg-[#9ec8b9] rounded-xl shadow-lg">
                                <ClipboardCheck className="w-7 h-7 text-white" />
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                                Evaluation Panel
                            </h1>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 ml-14">
                            Manage and evaluate student exam papers efficiently
                        </p>
                    </div>

                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
                        {/* Search Bar*/}
                        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full lg:w-80">
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search student..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-[#5c8374] outline-none transition-all"
                                />
                                {searchInput && (
                                    <button
                                        type="button"
                                        onClick={handleClearSearch}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <button 
                                type="submit"
                                className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm text-white rounded-xl shadow-sm transition-colors font-medium whitespace-nowrap"
                            >
                                Search
                            </button>
                        </form>

                        <div className="hidden lg:block w-px h-8 bg-gray-300 dark:bg-gray-700 mx-2"></div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleAutoEvaluation}
                                disabled={!canStart}
                                className="flex-1 lg:flex-none relative inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white whitespace-nowrap bg-gradient-to-r from-indigo-600 to-emerald-700 hover:from-indigo-700 hover:to-emerald-600 focus:ring-2 focus:ring-indigo-400 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {!statusReady || evaluating ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Sparkles className="w-4 h-4" />
                                )}
                                <span>{evaluating ? "Evaluating..." : evaluationStatus === "failed" ? "Retry Auto" : "Auto Evaluate"}</span>
                            </button>

                            <button
                                onClick={() => canComplete && setShowCompleteModal(true)}
                                disabled={!canComplete}
                                className="flex-1 lg:flex-none relative inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white whitespace-nowrap bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-600 shadow-md transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isCompleted ? <Lock className="w-4 h-4" /> : completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                <span>{isCompleted ? "Finalized" : completing ? "Finalizing" : "Complete"}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Status Banners */}
                {isCompleted && (
                    <div className="mb-6 overflow-hidden rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 via-white to-teal-50 dark:from-emerald-950/40 dark:via-gray-800 dark:to-teal-950/40 shadow-sm">
                        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500" />
                        <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shadow-sm">
                                <Lock className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">Evaluation Finalized</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300">Results for this exam are locked. Marks can no longer be edited.</p>
                            </div>
                        </div>
                    </div>
                )}

                {studentsError && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg shadow-sm flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                        <div>
                            <p className="font-semibold text-red-800 dark:text-red-300 mb-1">Error Loading Students</p>
                            <p className="text-sm text-red-700 dark:text-red-400">{studentsError}</p>
                            <button onClick={() => fetchStudents(examId, currentPage, 30, activeSearch)} className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg">Try Again</button>
                        </div>
                    </div>
                )}

                {/* Exam Details Card */}
                <div className="mb-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-[#5c8374] to-[#1b4242] dark:from-[#9ec8b9] dark:to-[#5c8374] px-6 py-4">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <ClipboardCheck className="w-5 h-5" />
                            Exam Details
                        </h2>
                    </div>
                    <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Exam Title</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{exam.title || "N/A"}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Exam Code</p>
                            <p className="text-sm font-mono font-medium text-gray-900 dark:text-white">{exam.examCode || "N/A"}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Duration</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{exam.duration ? `${exam.duration} mins` : "N/A"}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Marks</p>
                            <p className="text-xl font-bold text-[#5c8374] dark:text-[#9ec8b9]">{exam.totalMarks || "N/A"}</p>
                        </div>
                    </div>
                </div>

                {/* Students Table */}
                {students.length === 0 && !studentsError && !studentsLoading ? (
                    <div className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            {activeSearch ? "No Results Found" : "No Students Enrolled"}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            {activeSearch ? `No students match your search "${activeSearch}"` : "There are no students enrolled for this exam yet."}
                        </p>
                        {activeSearch && (
                            <button onClick={handleClearSearch} className="px-6 py-2.5 bg-[#5c8374] hover:bg-[#1b4242] text-white text-sm font-medium rounded-lg shadow-sm">
                                Clear Search
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden relative">
                        {studentsLoading && (
                            <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 z-10 flex items-center justify-center backdrop-blur-sm">
                                <Loader2 className="w-8 h-8 animate-spin text-[#5c8374]" />
                            </div>
                        )}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <StudentTableHeader />
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
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
                        
                        <div className="px-6 py-4 text-white bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Showing <span className="font-semibold text-gray-900 dark:text-white">{students.length}</span> of{" "}
                                <span className="font-semibold text-gray-900 dark:text-white">{studentsPagination.total}</span> students
                            </p>
                            
                            {studentsPagination.pages > 1 && (
                                <div className="flex items-center gap-2">
                                    <button onClick={handlePreviousPage} disabled={currentPage === 1} className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors text-gray-600 dark:text-gray-300">
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Page {studentsPagination.currentPage} of {studentsPagination.pages}</span>
                                    <button onClick={handleNextPage} disabled={currentPage >= studentsPagination.pages} className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors text-gray-600 dark:text-gray-300">
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {showCompleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/70 backdrop-blur-sm p-4">
                    <div className="max-w-md w-full rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
                        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500" />
                        <div className="p-6 space-y-5">
                            <div className="flex items-start gap-3">
                                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
                                    <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Finalize Evaluation?</h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{exam.title || "this exam"}</p>
                                </div>
                            </div>
                            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                <p>Once finalized, the results for this exam will be <span className="font-semibold text-gray-900 dark:text-white">locked</span>. Neither auto evaluation nor manual marks can be changed afterwards.</p>
                            </div>
                            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                                <button onClick={() => setShowCompleteModal(false)} disabled={completing} className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 font-semibold bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors">Cancel</button>
                                <button onClick={handleCompleteEvaluation} disabled={completing} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 shadow-md transition-all disabled:opacity-60">
                                    {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                    {completing ? "Finalizing..." : "Yes, finalize"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AppearedStudentList;