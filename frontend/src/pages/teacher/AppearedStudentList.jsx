import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Search, ClipboardCheck, AlertCircle, Loader2, ChevronLeft, ChevronRight, Sparkles, Clock, Lock, ShieldCheck, AlertTriangle
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { apiCall } from "../../api/api";
import { useTeacher } from "../../context/TeacherContext";
import { useExam } from "../../context/ExamContext";
import StudentRow, { StudentTableHeader } from "./components/StudentRow";

const STATUS_POLL_INTERVAL_MS = 5000;

function AppearedStudentList() {
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [evaluationStatus, setEvaluationStatus] = useState(null);
    const [statusReady, setStatusReady] = useState(false);
    const [startingEvaluation, setStartingEvaluation] = useState(false);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [completing, setCompleting] = useState(false);
    const pollTimerRef = useRef(null);
    const { examId } = useParams();
    const navigate = useNavigate();
    const { fetchStudents, students, studentsLoading, studentsError, studentsPagination } = useTeacher();
    const { particularExamDetails, fetchParticularExamDetails } = useExam();

    const exam = particularExamDetails || {};

    const inProgress = evaluationStatus === "in_progress";
    const isCompleted = evaluationStatus === "completed";
    const evaluating = inProgress || startingEvaluation;
    // The auto-eval button is locked only while an auto evaluation run is actually
    // happening, or after the exam has been finalized.
    const canStart = statusReady && !inProgress && !startingEvaluation && !isCompleted;

    const fetchEvaluationStatus = useCallback(async () => {
        if (!examId) return null;
        try {
            const res = await apiCall(
                `${import.meta.env.VITE_API_URL}/api/v1/${examId}/auto-evaluation/status`,
                "GET"
            );
            const next = res?.data?.evaluationStatus ?? null;
            setEvaluationStatus(next);
            setStatusReady(true);
            return next;
        } catch (err) {
            console.warn("Could not fetch auto evaluation status:", err);
            setStatusReady(true);
            return null;
        }
    }, [examId]);

    useEffect(() => {
        if (!examId) return;
        fetchStudents(examId, currentPage);
        fetchParticularExamDetails(examId);
        fetchEvaluationStatus();
    }, [examId, currentPage, fetchEvaluationStatus]);

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
                await fetchStudents(examId, currentPage);
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
    }, [inProgress, fetchEvaluationStatus, fetchStudents, examId, currentPage]);

    const handleEvaluate = (studentId) => {
        if (evaluating) return;
        navigate(`/teacher/evalvate/${examId}/${studentId}`);
    };

    const filteredStudents = Array.isArray(students)
        ? students.filter(
            (s) =>
                s.name?.toLowerCase().includes(search.toLowerCase()) ||
                s.rollNumber?.toLowerCase().includes(search.toLowerCase())
        )
        : [];

    const pendingCount = useMemo(() => {
        if (!Array.isArray(students)) return 0;
        return students.filter(
            (s) => s?.examsAttempted?.[0]?.evaluateStatus !== "Evaluated"
        ).length;
    }, [students]);

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < studentsPagination.pages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const handleAutoEvaluation = async () => {
        if (!canStart || pendingCount === 0) return;
        const confirmed = window.confirm(
            `Auto Evaluate ${pendingCount} pending paper${pendingCount > 1 ? "s" : ""} for "${exam.title || "this exam"}"?\n\n` +
            `This may take several hours. Manual evaluation will be locked until it finishes.`
        );
        if (!confirmed) return;

        try {
            setStartingEvaluation(true);
            const res = await apiCall(
                `${import.meta.env.VITE_API_URL}/api/v1/${examId}/auto-evaluation/start`,
                "POST"
            );
            if (res.status === 202 || res.status === 200) {
                setEvaluationStatus(res.data?.evaluationStatus || "in_progress");
                toast.success("Auto evaluation started");
            }
        } catch (error) {
            console.error("Failed to start auto evaluation:", error);
            const message =
                error?.response?.data?.message || "Could not start auto evaluation";
            if (error?.response?.data?.evaluationStatus) {
                setEvaluationStatus(error.response.data.evaluationStatus);
            }
            toast.error(message);
        } finally {
            setStartingEvaluation(false);
        }
    };

    const canComplete =
        statusReady && !inProgress && !isCompleted && !completing && pendingCount === 0;

    const handleCompleteEvaluation = async () => {
        if (!canComplete) return;
        try {
            setCompleting(true);
            const res = await apiCall(
                `${import.meta.env.VITE_API_URL}/api/v1/teacher/exam/complete`,
                "POST",
                { data: { examId } }
            );
            if (res.status === 200) {
                setEvaluationStatus(res.data?.evaluationStatus || "completed");
                setShowCompleteModal(false);
                toast.success(res.data?.message || "Evaluation finalized");
                await fetchStudents(examId, currentPage);
            }
        } catch (error) {
            console.error("Failed to finalize evaluation:", error);
            const message =
                error?.response?.data?.message || "Could not finalize evaluation";
            if (error?.response?.data?.evaluationStatus) {
                setEvaluationStatus(error.response.data.evaluationStatus);
            }
            toast.error(message);
        } finally {
            setCompleting(false);
        }
    };

    if (studentsLoading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-slate-50 via-[#9ec8b9] to-[#5c8374] dark:from-gray-900 dark:via-slate-900 dark:to-gray-900">
                <Loader2 className="w-12 h-12 animate-spin text-[#5c8374] dark:text-[#9ec8b9] mb-4" />
                <p className="text-gray-600 dark:text-gray-400 font-medium">Loading students...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#f0f8f7] via-[#e8f5f3] to-[#dff1ee] dark:from-[#092635] dark:via-[#1b4242] dark:to-[#0d3a47] py-8 px-4 sm:px-6 lg:px-8">
            {inProgress && (
                <div
                    role="alertdialog"
                    aria-modal="true"
                    aria-live="assertive"
                    className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/70 backdrop-blur-sm px-4"
                >
                    <div className="max-w-md w-full rounded-2xl border border-indigo-500/30 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
                        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-emerald-500 to-indigo-500 animate-pulse" />
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-emerald-700 flex items-center justify-center shadow-md">
                                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                        Auto Evaluation in Progress
                                    </h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        for {exam.title || "this exam"}
                                    </p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                The AI is grading every text and code answer for this exam.
                                Manual evaluation is locked until the job finishes — please keep
                                this page open or come back later.
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5" />
                                Editing is blocked while this is running.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className={`max-w-7xl mx-auto pt-20 ${inProgress ? "pointer-events-none select-none" : ""}`} aria-hidden={inProgress}>
                <div className="mb-8">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
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

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search by name or roll number..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl 
                                        bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 
                                        placeholder-gray-500 dark:placeholder-gray-400
                                        shadow-sm hover:shadow-md
                                        focus:ring-2 focus:ring-[#5c8374] focus:border-[#5c8374] dark:focus:ring-[#9ec8b9]
                                        outline-none transition-all duration-200"
                                />
                            </div>

                            <button
                                onClick={handleAutoEvaluation}
                                disabled={!canStart || pendingCount === 0}
                                title={
                                    !statusReady
                                        ? "Checking auto evaluation status..."
                                        : isCompleted
                                            ? "Evaluation is finalized"
                                            : inProgress
                                                ? "Auto evaluation is already in progress"
                                                : pendingCount === 0
                                                    ? "No pending papers to auto-evaluate"
                                                    : `Auto-evaluate all ${pendingCount} pending paper${pendingCount > 1 ? "s" : ""} for this exam`
                                }
                                className="relative inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-white whitespace-nowrap
                                    bg-gradient-to-r from-indigo-600 to-emerald-700 hover:from-indigo-700 hover:to-emerald-600
                                    focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900
                                    shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer
                                    disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-md"
                            >
                                {!statusReady ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Checking status...</span>
                                    </>
                                ) : evaluating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Evaluating...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5" />
                                        <span>
                                            {evaluationStatus === "failed"
                                                ? "Retry Auto Evaluate"
                                                : "Auto Evaluate"}
                                        </span>
                                        {pendingCount > 0 && (
                                            <span className="ml-1 inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 text-xs font-bold rounded-full bg-white/20 backdrop-blur-sm">
                                                {pendingCount}
                                            </span>
                                        )}
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => canComplete && setShowCompleteModal(true)}
                                disabled={!canComplete}
                                title={
                                    !statusReady
                                        ? "Checking evaluation status..."
                                        : isCompleted
                                            ? "Evaluation is already finalized"
                                            : inProgress
                                                ? "Auto evaluation is running"
                                                : pendingCount > 0
                                                    ? `${pendingCount} student${pendingCount > 1 ? "s are" : " is"} still pending`
                                                    : "Finalize evaluation. Results will be locked."
                                }
                                className="relative inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-white whitespace-nowrap
                                    bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-600
                                    focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900
                                    shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer
                                    disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-md"
                            >
                                {isCompleted ? (
                                    <>
                                        <Lock className="w-5 h-5" />
                                        <span>Finalized</span>
                                    </>
                                ) : completing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Finalizing...</span>
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="w-5 h-5" />
                                        <span>Complete Evaluation</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {isCompleted && (
                    <div
                        role="status"
                        className="mb-6 overflow-hidden rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 via-white to-teal-50 dark:from-emerald-950/40 dark:via-gray-800 dark:to-teal-950/40 shadow-md"
                    >
                        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500" />
                        <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shadow-md">
                                <Lock className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                                    Evaluation Finalized
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    Results for this exam are locked. Marks can no longer be edited.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {evaluating && (
                    <div
                        role="status"
                        aria-live="polite"
                        className="mb-6 overflow-hidden rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-gradient-to-r from-indigo-50 via-white to-emerald-50 dark:from-indigo-950/40 dark:via-gray-800 dark:to-emerald-950/40 shadow-md"
                    >
                        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-emerald-500 to-indigo-500 bg-[length:200%_100%] animate-pulse" />
                        <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-emerald-700 flex items-center justify-center shadow-md">
                                <Loader2 className="w-6 h-6 text-white animate-spin" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                        Auto Evaluation in Progress
                                    </h3>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                                        <Clock className="w-3 h-3" />
                                        Running
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    Evaluating <span className="font-semibold">{pendingCount}</span> pending paper{pendingCount !== 1 ? "s" : ""} for this exam. This may take several hours.
                                </p>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                    <Lock className="w-3 h-3" />
                                    Manual evaluation is locked until this finishes.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mb-8">
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-[#5c8374] to-[#1b4242] dark:from-[#9ec8b9] dark:to-[#5c8374] px-6 py-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <ClipboardCheck className="w-5 h-5" />
                                Exam Details
                            </h2>
                        </div>
                        <div className="p-6">
                            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                        Exam Title
                                    </p>
                                    <p className="text-base font-semibold text-gray-900 dark:text-white">
                                        {exam.title || "N/A"}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                        Exam Code
                                    </p>
                                    <p className="text-base font-mono font-medium text-gray-900 dark:text-white">
                                        {exam.examCode || "N/A"}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                        Duration
                                    </p>
                                    <p className="text-base font-semibold text-gray-900 dark:text-white">
                                        {exam.duration ? `${exam.duration} minutes` : "N/A"}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                        Total Marks
                                    </p>
                                    <p className="text-2xl font-bold text-[#5c8374] dark:text-[#9ec8b9]">
                                        {exam.totalMarks || "N/A"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {studentsError && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-400 rounded-lg shadow-md">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-semibold text-red-800 dark:text-red-300 mb-1">
                                    Error Loading Students
                                </p>
                                <p className="text-sm text-red-700 dark:text-red-400">{studentsError}</p>
                                <button
                                    onClick={() => fetchStudents(examId, currentPage)}
                                    className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {filteredStudents.length === 0 && !studentsError && (
                    <div className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-12 text-center">
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                                <ClipboardCheck className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                {students.length === 0 ? "No Students Enrolled" : "No Results Found"}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                {students.length === 0 
                                    ? "There are no students enrolled for this exam yet." 
                                    : `No students match your search "${search}"`}
                            </p>
                            {search && (
                                <button
                                    onClick={() => setSearch("")}
                                    className="px-6 py-2.5 bg-[#5c8374] hover:bg-[#1b4242] dark:bg-[#9ec8b9] dark:hover:bg-[#5c8374] text-white font-medium rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                                >
                                    Clear Search
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {filteredStudents.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <StudentTableHeader />
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredStudents.map((student, index) => (
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
                        
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Showing <span className="font-semibold text-gray-900 dark:text-white">{filteredStudents.length}</span> of{" "}
                                    <span className="font-semibold text-gray-900 dark:text-white">{studentsPagination.total}</span> students
                                </p>
                                
                                {studentsPagination.pages > 1 && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handlePreviousPage}
                                            disabled={currentPage === 1}
                                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                        </button>
                                        
                                        <span className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                                            Page {studentsPagination.currentPage} of {studentsPagination.pages}
                                        </span>
                                        
                                        <button
                                            onClick={handleNextPage}
                                            disabled={currentPage >= studentsPagination.pages}
                                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showCompleteModal && (
                <div
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="complete-eval-title"
                    className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/70 backdrop-blur-sm p-4"
                >
                    <div className="max-w-md w-full rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
                        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500" />
                        <div className="p-6 space-y-5">
                            <div className="flex items-start gap-3">
                                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
                                    <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <h2 id="complete-eval-title" className="text-lg font-bold text-gray-900 dark:text-white">
                                        Finalize Evaluation?
                                    </h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {exam.title || "this exam"}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                <p>
                                    Once finalized, the results for this exam will be{" "}
                                    <span className="font-semibold text-gray-900 dark:text-white">locked</span>.
                                    Neither auto evaluation nor manual marks can be changed afterwards.
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    All {students.length} student paper{students.length === 1 ? "" : "s"} have been evaluated and are ready to be finalized.
                                </p>
                            </div>

                            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setShowCompleteModal(false)}
                                    disabled={completing}
                                    className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCompleteEvaluation}
                                    disabled={completing}
                                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-600 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {completing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Finalizing...
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck className="w-4 h-4" />
                                            Yes, finalize
                                        </>
                                    )}
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