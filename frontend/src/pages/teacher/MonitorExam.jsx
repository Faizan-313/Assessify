import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { useParams, useNavigate } from "react-router-dom";
import { AlertTriangle, Loader2, User, Clock, Shield, XCircle, ChevronDown, ChevronUp, Eye, Users, UserX, Search } from "lucide-react";
import toast from "react-hot-toast";
import ReasonWindow from "./components/PauseReasonWindow";
import { useExam } from "../../context/ExamContextCore";
import { TeacherPageShell, teacherCardClass, teacherInputClass } from "./components/TeacherPageShell";

export default function MonitorExam() {
    const { examId } = useParams();

    const [studentViolations, setStudentViolations] = useState({});
    const [examDetails, setExamDetails] = useState(null);
    const [socket, setSocket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedStudents, setExpandedStudents] = useState({});
    const [isConnected, setIsConnected] = useState(false);
    const [showWindow, setShowWindow] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentToTerminate, setStudentToTerminate] = useState(null);
    
    const { fetchParticularExamDetails } = useExam();
    const [view, setView] = useState("active");
    const [searchQuery, setSearchQuery] = useState("");

    const navigate = useNavigate();

    useEffect(() => {
        const fetchExamDetails = async () => {
            if (!examId) return;
            setLoading(true);
            try {
                const response = await fetchParticularExamDetails(examId);
                const data = response?.data ?? response;
                setExamDetails(data);
            } catch {
                toast.error("Failed to load exam details");
            } finally {
                setLoading(false);
            }
        };

        fetchExamDetails();
    }, [examId]);

    useEffect(() => {
        const s = io(import.meta.env.VITE_API_URL, {
            transports: ["websocket"],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });
        setSocket(s);

        s.on("connect", () => {
            setIsConnected(true);
            setStudentViolations({});
            toast.success("Monitoring started!", { id: "sys-connect" });
            s.emit("joinRoom", { room: `exam_${examId}` });
            s.emit("fetch-violations", { examId });
        });

        s.on("disconnect", () => {
            setIsConnected(false);
            toast.error("Connection lost", { id: "sys-disconnect" });
        });

        s.on("connect_error", (error) => {
            setIsConnected(false);
            console.error("Socket connection error:", error);
        });

        s.on("violations-history", (data) => {
            if (!data.violations || !Array.isArray(data.violations)) return;

            setStudentViolations((prev) => {
                const next = {};

                data.violations.forEach((doc) => {
                    const existing = prev[doc.studentId];
                    const isTerminated = doc.status === "terminated";
                    const isSubmitted = doc.status === "submitted";
                    next[doc.studentId] = {
                        studentId: doc.studentId,
                        studentDetails: doc.studentDetails || existing?.studentDetails,
                        violations: doc.violations ?? existing?.violations ?? [],
                        isPaused: doc.status === "paused",
                        isTerminated,
                        isSubmitted: isSubmitted && !isTerminated,
                        joinedAt: existing?.joinedAt,
                        timeLeft: existing?.timeLeft,
                        lastHeartbeat: existing?.lastHeartbeat,
                    };
                });

                Object.entries(prev).forEach(([studentId, existing]) => {
                    if (!next[studentId]) {
                        next[studentId] = existing;
                    }
                });

                return next;
            });
        });

        s.on("student-joined", (data) => {
            const { studentId, studentDetails } = data;

            setStudentViolations((prev) => {
                if (prev[studentId]) {
                    return prev;
                }

                return {
                    ...prev,
                    [studentId]: {
                        studentId,
                        studentDetails,
                        violations: [],
                        isPaused: false,
                        isTerminated: false,
                        isSubmitted: false,
                        joinedAt: data.joinedAt
                    }
                };
            });

            toast.success(`${studentDetails?.name || 'Student'} joined`, { id: "student-join" });
        });

        s.on("new-violation", (data) => {
            const { studentId, violation, studentDetails } = data;

            setStudentViolations((prev) => {
                const existing = prev[studentId] || {
                    studentId,
                    studentDetails,
                    violations: [],
                    isPaused: false,
                    isTerminated: false,
                    isSubmitted: false
                };

                return {
                    ...prev,
                    [studentId]: {
                        ...existing,
                        studentDetails: studentDetails || existing.studentDetails,
                        violations: [violation, ...existing.violations],
                    },
                };
            });

            toast.error(`Violation: ${studentDetails?.name || "Student"}`, { id: "new-violation" });
        });

        s.on("teacher-action-applied", (data) => {
            const { studentId, action } = data;

            setStudentViolations((prev) => {
                const studentData = prev[studentId];
                if (!studentData) return prev;

                return {
                    ...prev,
                    [studentId]: {
                        ...studentData,
                        isPaused: action === "pause" ? true : action === "resume" ? false : studentData.isPaused,
                        isTerminated: action === "terminate" ? true : studentData.isTerminated,
                        isSubmitted: action === "terminate" ? false : studentData.isSubmitted,
                    },
                };
            });

            const actionText = action === "resume" ? "resumed" : action === "pause" ? "paused" : "terminated";
            toast.success(`Exam ${actionText}`, { id: "teacher-action" });
        });

        s.on("student-submitted", (data) => {
            const { studentId } = data;

            setStudentViolations((prev) => {
                const studentData = prev[studentId];
                if (!studentData) return prev;

                return {
                    ...prev,
                    [studentId]: {
                        ...studentData,
                        isSubmitted: studentData.isTerminated ? false : true,
                        isPaused: false,
                        submittedAt: data.submittedAt
                    },
                };
            });

            toast.success("A student submitted the exam", { id: "student-submit" });
        });

        s.on("student-heartbeat", (data) => {
            const { studentId, timeLeft } = data;

            setStudentViolations((prev) => {
                const studentData = prev[studentId];
                if (!studentData) return prev;

                return {
                    ...prev,
                    [studentId]: {
                        ...studentData,
                        timeLeft,
                        lastHeartbeat: new Date().toISOString()
                    },
                };
            });
        });

        s.on("exam-ended", () => {
            toast.success("Exam ended! All students are being submitted.", { id: "exam-ended", duration: 4000 });
            setTimeout(() => navigate("/dashboard"), 3000);
        });

        return () => {
            s.disconnect();
        };
    }, [examId]);

    const handleAction = (studentId, action, reason = null) => {
        if (!socket || !socket.connected) {
            toast.error("Not connected to server");
            return;
        }

        const payload = { examId, studentId, action, reason };
        socket.emit("teacher-action", payload);
    };

    const handlePause = (studentId) => {
        setSelectedStudent(studentId);
        setShowWindow(true);
    };

    const handleSubmitReason = (finalReason) => {
        handleAction(selectedStudent, "pause", finalReason);
        setShowWindow(false);
    };

    const handleCancel = () => {
        setShowWindow(false);
    };

    const initiateTerminate = (student) => {
        setStudentToTerminate(student);
    };

    const confirmTerminate = () => {
        if (studentToTerminate) {
            handleAction(studentToTerminate.studentId, "terminate");
            setStudentToTerminate(null);
        }
    };

    const toggleExpand = (studentId) => {
        setExpandedStudents(prev => ({
            ...prev,
            [studentId]: !prev[studentId]
        }));
    };

    const showActiveStudents = () => setView("active");
    const showCompletedStudents = () => setView("completed");

    const allStudents = useMemo(
        () => Object.values(studentViolations),
        [studentViolations]
    );

    const activeCount = useMemo(
        () => allStudents.filter((s) => !s.isSubmitted && !s.isTerminated).length,
        [allStudents]
    );

    const submittedCount = useMemo(
        () => allStudents.filter((s) => s.isSubmitted && !s.isTerminated).length,
        [allStudents]
    );

    const terminatedCount = useMemo(
        () => allStudents.filter((s) => s.isTerminated).length,
        [allStudents]
    );

    const completedCount = submittedCount + terminatedCount;

    const matchesSearch = (student) => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return true;
        const d = student.studentDetails || {};
        return (
            String(d.name || "").toLowerCase().includes(q) ||
            String(d.rollNumber || "").toLowerCase().includes(q) ||
            String(d.collegeId || "").toLowerCase().includes(q)
        );
    };

    const activeStudents = useMemo(
        () => allStudents.filter((s) => !s.isSubmitted && !s.isTerminated).filter(matchesSearch),
        [allStudents, searchQuery]
    );

    const completedStudents = useMemo(
        () => allStudents.filter((s) => s.isSubmitted || s.isTerminated).filter(matchesSearch),
        [allStudents, searchQuery]
    );

    const getViolationIcon = (type) => {
        switch (type) {
            case "TAB_SWITCH":
            case "WINDOW_BLUR":
                return <XCircle className="w-4 h-4" />;
            case "DEVTOOLS_OPENED":
                return <Shield className="w-4 h-4" />;
            case "FULLSCREEN_EXIT":
                return <AlertTriangle className="w-4 h-4" />;
            case "AI_NO_FACE":
                return <UserX className="w-4 h-4" />;
            case "AI_MULTIPLE_FACES":
                return <Users className="w-4 h-4" />;
            case "AI_HEAD_LEFT":
            case "AI_HEAD_RIGHT":
            case "AI_HEAD_UP":
            case "AI_HEAD_DOWN":
            case "AI_GAZE_LEFT":
            case "AI_GAZE_RIGHT":
            case "AI_GAZE_UP":
            case "AI_GAZE_DOWN":
                return <Eye className="w-4 h-4" />;
            default:
                return <AlertTriangle className="w-4 h-4" />;
        }
    };

    const getViolationColor = (type) => {
        switch (type) {
            case "DEVTOOLS_OPENED":
            case "AI_MULTIPLE_FACES":
                return "text-red-600 dark:text-red-400";
            case "TAB_SWITCH":
            case "WINDOW_BLUR":
            case "AI_NO_FACE":
                return "text-orange-600 dark:text-orange-400";
            case "AI_HEAD_LEFT":
            case "AI_HEAD_RIGHT":
            case "AI_HEAD_UP":
            case "AI_HEAD_DOWN":
            case "AI_GAZE_LEFT":
            case "AI_GAZE_RIGHT":
            case "AI_GAZE_UP":
            case "AI_GAZE_DOWN":
                return "text-amber-600 dark:text-amber-400";
            default:
                return "text-yellow-600 dark:text-yellow-400";
        }
    };

    const getStatusBadge = (student) => {
        if (student.isTerminated) {
            return <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-bold">TERMINATED</span>;
        }
        if (student.isSubmitted) {
            return <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-bold">SUBMITTED</span>;
        }
        if (student.isPaused) {
            return <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-xs font-bold">PAUSED</span>;
        }
        return <span className="px-3 py-1 bg-[#00cf87] text-[#000000] rounded-full text-xs font-bold animate-pulse">ACTIVE</span>; 
    };

    const copyToClipboard = async (code) => {
        try {
            await navigator.clipboard.writeText(code);
            toast.success("Exam code copied!");
        } catch {
            toast.error("Failed to copy code");
        }
    };

    if (loading) {
        return (
            <TeacherPageShell>
                <div className="flex flex-col items-center justify-center py-24">
                    <Loader2 className="animate-spin w-12 h-12 mb-4 text-sky-400" />
                    <p className="text-gray-400">Loading exam details...</p>
                </div>
            </TeacherPageShell>
        );
    }

    return (
        <TeacherPageShell>
            <div className={`mb-6 ${teacherCardClass} p-6 sm:p-8`}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                    <div>
                        <span className="inline-block px-3 py-1 mb-3 text-xs font-semibold tracking-wider uppercase rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            Live Session
                        </span>
                        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                            Monitor{" "}
                            <span className="bg-gradient-to-r from-emerald-300 to-sky-300 bg-clip-text text-transparent">Exam</span>
                        </h1>
                        <p className="text-gray-400 mt-1 text-sm">{examDetails?.title || "Exam"}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => copyToClipboard(examDetails?.examCode)}
                            className="flex items-center gap-2 px-4 py-2 bg-white/[0.05] border border-white/10 text-sky-300 font-mono text-sm rounded-xl hover:bg-white/[0.08] transition-all"
                            title="Copy exam code"
                        >
                            {examDetails?.examCode || "N/A"}
                        </button>
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
                            isConnected
                                ? "bg-emerald-500/10 border-emerald-500/30"
                                : "bg-red-500/10 border-red-500/30"
                        }`}>
                            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                            <span className={`text-sm font-medium ${isConnected ? "text-emerald-300" : "text-red-300"}`}>
                                {isConnected ? "Live" : "Disconnected"}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl p-4 bg-white/[0.03] border border-white/10">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Duration</p>
                        <p className="text-lg font-semibold text-white">{examDetails?.duration} minutes</p>
                    </div>
                    <div className="rounded-xl p-4 bg-white/[0.03] border border-white/10">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Marks</p>
                        <p className="text-lg font-semibold text-white">{examDetails?.totalMarks}</p>
                    </div>
                    <div className="rounded-xl p-4 bg-white/[0.03] border border-white/10">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Students Monitored</p>
                        <p className="text-lg font-semibold text-white">{Object.keys(studentViolations).length}</p>
                    </div>
                </div>
            </div>

            {Object.keys(studentViolations).length === 0 ? (
                <div className={`${teacherCardClass} p-12 text-center`}>
                    <Loader2 className="animate-spin w-12 h-12 mx-auto mb-4 text-sky-400" />
                    <p className="text-gray-300 text-lg">Waiting for students to join...</p>
                    <p className="text-gray-500 text-sm mt-2">Students will appear here when they start the exam</p>
                </div>
            ) : (
                    <div className="space-y-3">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-2">
                            <div className="flex flex-wrap gap-2 p-1 bg-white/[0.03] rounded-xl border border-white/10 w-fit">
                                <button
                                    onClick={showActiveStudents}
                                    className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 cursor-pointer ${view === "active"
                                            ? "bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-sm"
                                            : "text-gray-400 hover:text-white"
                                        }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${view === "active" ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
                                        Active
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${view === "active"
                                                ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300"
                                                : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                                            }`}>
                                            {activeCount}
                                        </span>
                                    </span>
                                </button>
                                <button
                                    onClick={showCompletedStudents}
                                    className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 cursor-pointer ${view === "completed"
                                            ? "bg-white/[0.08] text-white border border-white/15 shadow-sm"
                                            : "text-gray-400 hover:text-white"
                                        }`}
                                >
                                    <span className="flex items-center gap-2">
                                        Completed
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${view === "completed"
                                                ? "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                                : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                                            }`}>
                                            {completedCount}
                                        </span>
                                    </span>
                                </button>
                            </div>

                            <div className="relative w-full lg:max-w-md">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                <input
                                    type="search"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by name, roll number, or college ID…"
                                    className={`${teacherInputClass} pl-10 py-2.5 text-sm`}
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        <p className="text-xs text-gray-500 mb-4">
                            Completed: {submittedCount} · Terminated: {terminatedCount}
                        </p>

                        <div className="space-y-6">
                            {view === "active" && (
                                <div>
                                    <h2 className="text-lg font-semibold text-white mb-3">
                                        Active Students ({activeStudents.length}{searchQuery ? ` of ${activeCount}` : ""})
                                    </h2>
                                    {activeStudents.length === 0 ? (
                                        <div className={`${teacherCardClass} p-8 text-center`}>
                                            <p className="text-gray-400">
                                                {searchQuery ? "No active students match your search." : "No active students"}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {activeStudents.map((student) => (
                                                <div key={student.studentId} className={`${teacherCardClass} overflow-hidden`}>
                                                    <div className="p-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3 flex-1">
                                                                <div className="w-10 h-10 rounded-full bg-[#f0f8f7] dark:bg-[#5c8374]/30 flex items-center justify-center flex-shrink-0">
                                                                    <User className="w-5 h-5 text-[#5c8374] dark:text-[#9ec8b9]" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">{student.studentDetails?.name || "Unknown Student"}</h3>
                                                                    <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                                                                        <span>{student.studentDetails?.rollNumber || "N/A"}</span>
                                                                        <span>{student.studentDetails?.collegeId || "N/A"}</span>
                                                                        <span>{examDetails?.session || "N/A"}</span>
                                                                        <span>{student.studentDetails?.batch || "N/A"}</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                {getStatusBadge(student)}
                                                                <div className={`px-3 py-1 rounded-full ${student.violations.length > 5 ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" : student.violations.length > 2 ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" : student.violations.length > 0 ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}>
                                                                    <p className="text-xs font-medium">{student.violations.length}</p>
                                                                </div>

                                                                {!student.isTerminated && (
                                                                    <>
                                                                        {!student.isPaused ? (
                                                                            <button onClick={() => handlePause(student.studentId)} className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-xs font-medium transition-colors" title="Pause exam">Pause</button>
                                                                        ) : (
                                                                            <button onClick={() => handleAction(student.studentId, "resume")} className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-md text-xs font-medium transition-colors" title="Resume exam">Resume</button>
                                                                        )}
                                                                        <button onClick={() => initiateTerminate(student)} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-medium transition-colors" title="Terminate exam">Terminate</button>
                                                                    </>
                                                                )}

                                                                {student.violations.length > 0 && (
                                                                    <button onClick={() => toggleExpand(student.studentId)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title={expandedStudents[student.studentId] ? "Hide violations" : "Show violations"}>
                                                                        {expandedStudents[student.studentId] ? <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {expandedStudents[student.studentId] && student.violations.length > 0 && (
                                                        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-3 max-h-60 overflow-y-auto">
                                                            <div className="space-y-2">
                                                                {student.violations.map((violation, idx) => (
                                                                    <div key={`${student.studentId}-${idx}`} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-2 text-xs">
                                                                        <div className="flex items-center gap-2 flex-1">
                                                                            <div className={getViolationColor(violation.type)}>{getViolationIcon(violation.type)}</div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="font-semibold text-gray-900 dark:text-white truncate">{violation.type.replace(/_/g, " ")}</p>
                                                                                <p className="text-gray-600 dark:text-gray-400 truncate">{violation.message}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                                                                            <Clock className="w-3 h-3" />
                                                                            <span>{new Date(violation.timestamp).toLocaleTimeString()}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {view === "completed" && (
                                <div>
                                    <h2 className="text-lg font-semibold text-white mb-3">
                                        Completed ({completedStudents.length}{searchQuery ? ` of ${completedCount}` : ""})
                                    </h2>
                                    {completedStudents.length === 0 ? (
                                        <div className={`${teacherCardClass} p-8 text-center`}>
                                            <p className="text-gray-400">
                                                {searchQuery ? "No completed students match your search." : "No submitted or terminated students yet"}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {completedStudents.map((student) => (
                                                <div key={student.studentId} className={`${teacherCardClass} overflow-hidden`}>
                                                    <div className="p-4 flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${student.isTerminated ? "bg-red-50 dark:bg-red-900/20" : "bg-emerald-50 dark:bg-emerald-900/20"}`}>
                                                                <User className={`w-5 h-5 ${student.isTerminated ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">{student.studentDetails?.name || "Unknown Student"}</h3>
                                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                                                                    <span>{student.studentDetails?.rollNumber || "N/A"}</span>
                                                                    <span>{student.studentDetails?.collegeId || "N/A"}</span>
                                                                    <span>Batch {student.studentDetails?.batch || "N/A"}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3 flex-shrink-0">
                                                            {getStatusBadge(student)}
                                                            <div className={`px-3 py-1 rounded-full ${student.violations.length > 5 ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" : student.violations.length > 2 ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" : student.violations.length > 0 ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}>
                                                                <p className="text-xs font-medium">{student.violations.length}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            <ReasonWindow
                visible={showWindow}
                onSubmit={handleSubmitReason}
                onCancel={handleCancel}
            />

            {studentToTerminate && (
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#0f1117] rounded-xl shadow-2xl p-6 max-w-md w-full border border-white/10">
                        <div className="flex items-center gap-3 mb-4 text-red-400">
                            <AlertTriangle className="w-8 h-8" />
                            <h3 className="text-xl font-bold text-white">Confirm Termination</h3>
                        </div>
                        <p className="text-gray-400 mb-6 text-sm">
                            Are you sure you want to terminate <span className="font-semibold text-red-400">{studentToTerminate.studentDetails?.name}&apos;s</span> exam? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setStudentToTerminate(null)}
                                className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-gray-300 rounded-lg text-sm font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmTerminate}
                                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition-colors"
                            >
                                Confirm Terminate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </TeacherPageShell>
    );
}

