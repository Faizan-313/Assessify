import { useEffect, useLayoutEffect, useState, useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { useExam } from "../../context/ExamContextCore";
import { useProctoringCtx } from "../../context/proctoringContextCore";
import toast from "react-hot-toast";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { oneDark } from "@codemirror/theme-one-dark";
import { Clock, FileText, Code, User, AlertTriangle, Shield } from "lucide-react";
import DiagramCanvas from "./components/DiagramCanvas";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

function ExamSection() {
    const { exam, studentDetails, questionPaper } = useExam();
    const { stop: stopProctoring, setAnomalyHandler } = useProctoringCtx();
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [selectedLanguages, setSelectedLanguages] = useState({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [violations, setViolations] = useState([]);
    const [devToolsOpen, setDevToolsOpen] = useState(false);
    const [examPaused, setExamPaused] = useState(false);
    const [pauseReason, setPauseReason] = useState(null);
    const [needsFullscreen, setNeedsFullscreen] = useState(false);

    const submitAttemptedRef = useRef(false);
    const timerRef = useRef(null);
    const socketRef = useRef(null);
    const studentJoinedEmittedRef = useRef(false);
    
    const isSubmittedRef = useRef(false);
    //Suppress proctoring UI during submit click sequence (blur/visibility fire before onClick). ms timestamp. 
    const proctoringSuppressedUntilRef = useRef(0);

    const questionsRef = useRef([]);
    const answersRef = useRef({});
    const selectedLanguagesRef = useRef({});

    const navigate = useNavigate();

    const languageExtensions = {
        javascript: { ext: javascript(), label: "JavaScript" },
        python: { ext: python(), label: "Python" },
        java: { ext: java(), label: "Java" },
        cpp: { ext: cpp(), label: "C++" }
    };

    // Initialize questions and answers
    useEffect(() => {
        const paperQuestions = questionPaper?.questions || [];
        setQuestions(paperQuestions);
        questionsRef.current = paperQuestions;

        const defaultLangs = {};
        const initialAnswers = {};
        paperQuestions.forEach(q => {
            if (q.type === "code") defaultLangs[q._id] = "javascript";
            initialAnswers[q._id] = "";
        });

        setSelectedLanguages(defaultLangs);
        selectedLanguagesRef.current = defaultLangs;
        setAnswers(initialAnswers);
        answersRef.current = initialAnswers;
    }, [questionPaper]);

    useEffect(() => { questionsRef.current = questions; }, [questions]);
    useEffect(() => { answersRef.current = answers; }, [answers]);
    useEffect(() => { selectedLanguagesRef.current = selectedLanguages; }, [selectedLanguages]);

    const proctoringMayRecord = () =>
        Date.now() >= proctoringSuppressedUntilRef.current &&
        !isSubmittedRef.current &&
        !submitAttemptedRef.current;

    const reportViolation = useCallback((violation) => {
        if (!proctoringMayRecord()) return;

        if (socketRef.current?.connected) {
            socketRef.current.emit("new-violation", {
                examId: exam._id,
                studentId: studentDetails._id,
                submitted: false,
                isSubmitted: false,
                violation,
                studentDetails: {
                    name: studentDetails.name,
                    rollNumber: studentDetails.rollNumber,
                    collegeId: studentDetails.collegeId,
                    session: studentDetails.session,
                    batch: studentDetails.batch
                }
            });
        }
    }, [exam, studentDetails]);

    const recordProctoringSignal = useCallback(
        (violation, toastMessage) => {
            if (!proctoringMayRecord()) return false;
            setViolations(prev => [...prev, violation]);
            toast.error(toastMessage);
            reportViolation(violation);
            return true;
        },
        [reportViolation]
    );

    const handleSubmit = useCallback(async () => {
        if (submitAttemptedRef.current) return;
        proctoringSuppressedUntilRef.current = Date.now() + 8000;
        submitAttemptedRef.current = true;
        isSubmittedRef.current = true;

        clearInterval(timerRef.current);
        toast.dismiss();
        // Synchronous commit so useLayoutEffect runs now and removes proctoring listeners before any further events.
        flushSync(() => {
            setIsSubmitted(true);
        });

        try {
            const finalAnswers = questionsRef.current.map(q => ({
                questionId: q._id,
                questionText: q.questionText,
                type: q.type,
                answerText: answersRef.current[q._id] || "",
                language: selectedLanguagesRef.current[q._id] || null,
                marks: q.marks,
                marksObtained: 0
            }));

            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/v1/exams/submit`,
                {
                    answers: finalAnswers,
                    examId: exam._id,
                    studentDetail: {
                        id: studentDetails._id,
                        rollNumber: studentDetails.rollNumber,
                        collegeId: studentDetails.collegeId,
                        name: studentDetails.name,
                        session: studentDetails.session,
                        batch: studentDetails.batch
                    },
                },
                { withCredentials: true }
            );

            if (response.status === 200) {
                if (socketRef.current && socketRef.current.connected) {
                    socketRef.current.emit("student-submitted", {
                        examId: exam._id,
                        studentId: studentDetails._id
                    });
                }
                if (socketRef.current) {
                    socketRef.current.removeAllListeners();
                    socketRef.current.disconnect();
                    socketRef.current = null;
                }

                toast.success("Exam submitted successfully!");
                stopProctoring();
                const name = studentDetails?.name
                    ?.split(" ")
                    .map(n => n.charAt(0).toUpperCase() + n.slice(1))
                    .join(" ");
                setTimeout(() => navigate(`/thank-you/${name}`), 1500);
            } else {
                throw new Error("Failed to submit exam");
            }

        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to submit exam");
            proctoringSuppressedUntilRef.current = 0;
            submitAttemptedRef.current = false;
            isSubmittedRef.current = false;
            flushSync(() => {
                setIsSubmitted(false);
            });
        }
    }, [exam, studentDetails, navigate, stopProctoring]);

    // Safety net: if the exam page unmounts for any reason (forced redirect, page close, etc.) make sure the camera and detectors are released too.
    useEffect(() => {
        return () => {
            stopProctoring();
        };
    }, [stopProctoring]);

    useLayoutEffect(() => {
        if (isSubmitted) {
            toast.dismiss();
        }
    }, [isSubmitted]);

    const handleSubmitRef = useRef(handleSubmit);
    handleSubmitRef.current = handleSubmit;

    //Calculate initial time 
    useEffect(() => {
        if (!exam?.duration || !exam?.endTime) return;

        const now = new Date();
        const examEndTime = new Date(exam.endTime);
        const durationSeconds = exam.duration * 60;
        const timeUntilEnd = Math.floor((examEndTime - now) / 1000);
        const calculatedTime = Math.min(durationSeconds, timeUntilEnd);

        if (calculatedTime <= 0) {
            toast.error("This exam has already ended");
            handleSubmit();
        } else {
            setTimeLeft(calculatedTime);
        }
    }, [exam]);

    //Timer countdown
    useEffect(() => {
        if (isSubmitted || submitAttemptedRef.current || examPaused) return;

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    toast.error("Time's up! Submitting exam automatically...");
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerRef.current);
    }, [isSubmitted, examPaused, handleSubmit]);

    //Socket connection 
    useEffect(() => {
        if (!exam || !studentDetails) return;

        const socket = io(import.meta.env.VITE_API_URL, {
            transports: ["websocket"],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            socket.emit("joinRoom", { room: `exam_${exam._id}` });
            socket.emit("joinRoom", { room: `student_${studentDetails._id}` });

            if (!studentJoinedEmittedRef.current) {
                socket.emit("student-joined", {
                    examId: exam._id,
                    studentId: studentDetails._id,
                    studentDetails: {
                        name: studentDetails.name,
                        rollNumber: studentDetails.rollNumber,
                        collegeId: studentDetails.collegeId,
                        session: studentDetails.session,
                        batch: studentDetails.batch
                    }
                });
                studentJoinedEmittedRef.current = true;
            }
        });

        socket.on("connect_error", () => {
            toast.error("Connection error. Please check your internet.");
        });

        socket.on("exam-action", (data) => {
            if (data.action === "terminate") {
                toast.error("Your exam was terminated by the teacher!");
                handleSubmitRef.current();
            } else if (data.action === "pause") {
                setExamPaused(true);
                setPauseReason(data.reason || "Paused by teacher");
                toast.error("Exam paused by teacher!");
            } else if (data.action === "resume") {
                setExamPaused(false);
                setPauseReason(null);
                toast.success("Exam resumed. You may continue.");
            }
        });

        return () => {
            socket.removeAllListeners();
            socket.disconnect();
        };
    }, [exam, studentDetails]);

    //Heartbeat 
    useEffect(() => {
        const interval = setInterval(() => {
            if (
                socketRef.current &&
                socketRef.current.connected &&
                !isSubmittedRef.current
            ) {
                socketRef.current.emit("studentHeartbeat", {
                    examId: exam._id,
                    studentId: studentDetails._id,
                    timeLeft
                });
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [exam, studentDetails, timeLeft]);

    //Security: Tab switching 
    useLayoutEffect(() => {
        if (isSubmitted || submitAttemptedRef.current) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                recordProctoringSignal(
                    {
                        type: "TAB_SWITCH",
                        timestamp: new Date().toISOString(),
                        message: "Student switched tabs or minimized window"
                    },
                    "Tab switching detected! This violation has been recorded."
                );
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [isSubmitted, recordProctoringSignal]);

    //Security: Window blur
    useLayoutEffect(() => {
        if (isSubmitted || submitAttemptedRef.current) return;

        const handleBlur = () => {
            recordProctoringSignal(
                {
                    type: "WINDOW_BLUR",
                    timestamp: new Date().toISOString(),
                    message: "Student switched to another application"
                },
                "Window switching detected! This violation has been recorded."
            );
        };

        window.addEventListener("blur", handleBlur);
        return () => window.removeEventListener("blur", handleBlur);
    }, [isSubmitted, recordProctoringSignal]);

    //Security: Prevent page refresh/close
    useLayoutEffect(() => {
        if (isSubmitted || submitAttemptedRef.current) return;

        const handleBeforeUnload = (e) => {
            if (isSubmittedRef.current || submitAttemptedRef.current) return; 
            if (!isSubmittedRef.current && !submitAttemptedRef.current) {
                e.preventDefault();
                e.returnValue = "Your exam is in progress. Are you sure you want to leave?";
                return e.returnValue;
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isSubmitted]);

    // Security: DevTools / context menu / keyboard shortcuts 
    useLayoutEffect(() => {
        if (isSubmitted || submitAttemptedRef.current) return; // stops re-registering after submit

        const detectDevTools = () => {
            const threshold = 160;
            const widthThreshold = window.outerWidth - window.innerWidth > threshold;
            const heightThreshold = window.outerHeight - window.innerHeight > threshold;
            const orientation = widthThreshold ? "vertical" : "horizontal";

            if (
                !(heightThreshold && widthThreshold) &&
                (
                    (window.Firebug && window.Firebug.chrome && window.Firebug.chrome.isInitialized) ||
                    widthThreshold ||
                    heightThreshold
                )
            ) {
                if (!devToolsOpen) {
                    const recorded = recordProctoringSignal(
                        {
                            type: "DEVTOOLS_OPENED",
                            timestamp: new Date().toISOString(),
                            message: `Developer tools opened (${orientation})`,
                            orientation
                        },
                        "Developer tools detected! This is a serious violation."
                    );
                    if (recorded) setDevToolsOpen(true);
                }
            } else {
                setDevToolsOpen(false);
            }
        };

        const handleContextMenu = (e) => {
            e.preventDefault();
            recordProctoringSignal(
                {
                    type: "RIGHT_CLICK_ATTEMPT",
                    timestamp: new Date().toISOString(),
                    message: "Student attempted to right-click"
                },
                "Right-click is disabled during the exam"
            );
        };

        const handleKeyDown = (e) => {
            if (
                e.keyCode === 123 ||
                (e.ctrlKey && e.shiftKey && e.keyCode === 73) ||
                (e.ctrlKey && e.shiftKey && e.keyCode === 74) ||
                (e.ctrlKey && e.keyCode === 85)
            ) {
                e.preventDefault();
                recordProctoringSignal(
                    {
                        type: "BLOCKED_SHORTCUT",
                        timestamp: new Date().toISOString(),
                        message: `Attempted to use blocked shortcut: ${e.key}`,
                        keyCode: e.keyCode
                    },
                    "This keyboard shortcut is disabled during the exam"
                );
            }
        };

        const devToolsInterval = setInterval(detectDevTools, 1000);
        document.addEventListener("contextmenu", handleContextMenu);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            clearInterval(devToolsInterval);   // cleared as soon as isSubmitted  true
            document.removeEventListener("contextmenu", handleContextMenu);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isSubmitted, devToolsOpen, recordProctoringSignal]); // isSubmitted triggers cleanup on submit

    // Silent block: copy / cut / paste and screenshot-ish shortcuts. not added to violation. A brief toast lets the student know.
    useLayoutEffect(() => {
        if (isSubmitted || submitAttemptedRef.current) return;

        let lastToastAt = 0;
        const notify = (msg) => {
            const now = Date.now();
            if (now - lastToastAt < 1200) return; // throttle — PrintScreen can fire repeatedly
            lastToastAt = now;
            toast.error(msg, { id: "exam-block" });
        };

        const blockClipboardEvent = (label) => (e) => {
            e.preventDefault();
            e.stopPropagation();
            notify(`${label} is disabled during the exam`);
        };

        const handleCopy = blockClipboardEvent("Copy");
        const handleCut = blockClipboardEvent("Cut");
        const handlePaste = blockClipboardEvent("Paste");

        const wipeClipboard = () => {
            // on PrintScreen Windows.
            if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText("").catch(() => {});
            }
        };

        const handleKeyDown = (e) => {
            const key = (e.key || "").toLowerCase();

            // PrintScreen on Windows / macOS screenshot combos.
            if (
                e.key === "PrintScreen" ||
                e.keyCode === 44 ||
                (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(key)) // macOS: ⌘⇧3/4/5
            ) {
                e.preventDefault();
                wipeClipboard();
                notify("Screenshots are disabled during the exam");
                return;
            }

            // Ctrl/Cmd + C / X / V / P — clipboard + print (print path is a screenshot vector).
            if ((e.ctrlKey || e.metaKey) && !e.altKey) {
                if (["c", "x", "v", "p"].includes(key)) {
                    e.preventDefault();
                    const labelMap = { c: "Copy", x: "Cut", v: "Paste", p: "Print" };
                    notify(`${labelMap[key]} is disabled during the exam`);
                }
            }
        };

        const handleKeyUp = (e) => {
            if (e.key === "PrintScreen" || e.keyCode === 44) {
                wipeClipboard();
                notify("Screenshots are disabled during the exam");
            }
        };

        document.addEventListener("copy", handleCopy, true);
        document.addEventListener("cut", handleCut, true);
        document.addEventListener("paste", handlePaste, true);
        document.addEventListener("keydown", handleKeyDown, true);
        document.addEventListener("keyup", handleKeyUp, true);

        return () => {
            document.removeEventListener("copy", handleCopy, true);
            document.removeEventListener("cut", handleCut, true);
            document.removeEventListener("paste", handlePaste, true);
            document.removeEventListener("keydown", handleKeyDown, true);
            document.removeEventListener("keyup", handleKeyUp, true);
        };
    }, [isSubmitted]);

    //Security: Fullscreen enforcement
    const enterFullscreen = useCallback(async () => {
        if (document.fullscreenElement) {
            setNeedsFullscreen(false);
            return true;
        }
        try {
            const elem = document.documentElement;
            const req =
                elem.requestFullscreen?.bind(elem) ??
                elem.webkitRequestFullscreen?.bind(elem) ??
                elem.msRequestFullscreen?.bind(elem);
            if (!req) {
                setNeedsFullscreen(false);
                return false;
            }
            await req();
            setNeedsFullscreen(false);
            return true;
        } catch (error) {
            console.warn("Fullscreen request rejected, awaiting user gesture:", error?.message || error);
            setNeedsFullscreen(true);
            return false;
        }
    }, []);

    useLayoutEffect(() => {
        if (isSubmitted || submitAttemptedRef.current) return;

        // Try to enter on mount. If the navigation from StudentDetailsFilling preserved the gesture we're already fullscreen; if not, this will fail silently and the overlay prompt takes over.
        if (!document.fullscreenElement) {
            enterFullscreen();
        } else {
            setNeedsFullscreen(false);
        }

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                recordProctoringSignal(
                    {
                        type: "FULLSCREEN_EXIT",
                        timestamp: new Date().toISOString(),
                        message: "Student exited fullscreen mode"
                    },
                    "Please remain in fullscreen mode during the exam"
                );
                if (proctoringMayRecord()) setNeedsFullscreen(true);
            } else {
                setNeedsFullscreen(false);
            }
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(err => console.error(err));
            }
        };
    }, [isSubmitted, recordProctoringSignal, enterFullscreen]);

    //Security: AI monitoring - forward anomalies (no_face, multiple_faces, head/gaze off-axis, phone_detected, ...) through the same violation pipeline as DOM-based events so they hit the socket, the teacher dashboard, and the DB.
    useLayoutEffect(() => {
        if (isSubmitted || submitAttemptedRef.current) return;

        const handleAnomaly = (anomaly) => {
            // anomaly: { id, key, message, startTime } from AnomalyTracker
            const type = `AI_${String(anomaly.key || "UNKNOWN").toUpperCase()}`;
            recordProctoringSignal(
                {
                    type,
                    timestamp: new Date(anomaly.startTime || Date.now()).toISOString(),
                    message: anomaly.message,
                    source: "ai_monitoring"
                },
                `AI monitoring detected: ${anomaly.message}`
            );
        };

        setAnomalyHandler(handleAnomaly);
        return () => setAnomalyHandler(null);
    }, [isSubmitted, recordProctoringSignal, setAnomalyHandler]);

    // Helpers
    const handleAnswerChange = useCallback((questionId, value) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    }, []);

    const handleLanguageChange = useCallback((questionId, language) => {
        setSelectedLanguages(prev => ({ ...prev, [questionId]: language }));
    }, []);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
        return `${m}:${s < 10 ? "0" : ""}${s}`;
    };

    const getTimeColor = () => {
        if (timeLeft > 300) return "text-green-600 dark:text-green-400";
        if (timeLeft > 60) return "text-yellow-600 dark:text-yellow-400";
        return "text-red-600 dark:text-red-400 animate-pulse";
    };

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString("en-US", {
            month: "short", day: "numeric", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
    };

    const name = studentDetails?.name
        ?.split(" ")
        .map(n => n.charAt(0).toUpperCase() + n.slice(1))
        .join(" ");

    if (!exam) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <FileText className="w-16 h-16 mx-auto text-red-500 mb-4" />
                    <p className="text-xl text-red-600 dark:text-red-400">No exam found!</p>
                </div>
            </div>
        );
    }
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#f0f8f7] via-[#e8f5f3] to-[#dff1ee] dark:from-[#092635] dark:via-[#1b4242] dark:to-[#0d3a47] py-8 px-4 sm:px-6 lg:px-8">

            {/* Fullscreen gate — only mounted when we lose fullscreen. The user-gesture on this button is what lets the browser honor the request. */}
            {needsFullscreen && !isSubmitted && (
                <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center px-4">
                    <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center border-2 border-red-400 dark:border-red-600">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Shield className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Fullscreen Required</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            This exam must be taken in fullscreen mode. Please click the button below to continue.
                        </p>
                        <button
                            type="button"
                            onClick={enterFullscreen}
                            className="w-full px-6 py-3 bg-gradient-to-r from-[#5c8374] to-[#1b4242] hover:from-[#1b4242] hover:to-[#092635] text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold"
                        >
                            Enter Fullscreen
                        </button>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                            Exiting fullscreen during the exam will be recorded as a violation.
                        </p>
                    </div>
                </div>
            )}

            <div className="max-w-5xl mx-auto">

                {/* Security Warning */}
                {violations.length > 0 && !examPaused && (
                    <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-2xl p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <Shield className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-red-800 dark:text-red-300 mb-2">
                                    Security Violations Detected: {violations.length}
                                </h3>
                                <p className="text-sm text-red-700 dark:text-red-400">
                                    Your exam activities are being monitored. Violations may result in exam disqualification.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Student Details Card */}
                {!examPaused && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-4">
                            <User className="w-6 h-6 text-[#5c8374] dark:text-[#9ec8b9]" />
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Student Information</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[
                                { label: "Full Name", value: name },
                                { label: "Roll Number", value: studentDetails?.rollNumber },
                                { label: "College ID", value: studentDetails?.collegeId },
                                { label: "Session", value: studentDetails?.session },
                                { label: "Batch", value: studentDetails?.batch },
                            ].map(({ label, value }) => (
                                <div key={label} className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-lg p-4">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</p>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{value || "N/A"}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Exam Header Card */}
                {!examPaused && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
                        <div className="text-center mb-6">
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#ddf6ed] to-[#8dd9d9] bg-clip-text text-transparent mb-2">
                                {exam.title}
                            </h1>
                            <p className="text-gray-600 dark:text-gray-300 text-lg">{exam.description}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-gradient-to-br from-[#f0f8f7] to-[#e0f2f0] dark:from-[#5c8374]/20 dark:to-[#1b4242]/20 rounded-xl p-4 border border-[#9ec8b9] dark:border-[#5c8374]">
                                <div className="flex items-center gap-3">
                                    <Clock className="w-5 h-5 text-[#5c8374] dark:text-[#9ec8b9]" />
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Duration</p>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{exam.duration} min</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-[#f0f8f7] to-[#e0f2f0] dark:from-[#5c8374]/20 dark:to-[#1b4242]/20 rounded-xl p-4 border border-[#9ec8b9] dark:border-[#5c8374]">
                                <div className="flex items-center gap-3">
                                    <FileText className="w-5 h-5 text-[#5c8374] dark:text-[#9ec8b9]" />
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Marks</p>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{exam.totalMarks}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 border border-green-200 dark:border-green-700">
                                <div className="flex items-center gap-3">
                                    <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Time Remaining</p>
                                        <p className={`text-lg font-bold ${getTimeColor()}`}>{formatTime(timeLeft)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-4 border border-orange-200 dark:border-orange-700">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">End Time</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {formatDateTime(exam.endTime)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                {examPaused ? (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 text-center border-4 border-orange-500 dark:border-orange-600">
                        <div className="w-24 h-24 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                            <AlertTriangle className="w-12 h-12 text-orange-600 dark:text-orange-400" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Exam Paused</h2>
                        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-6 mb-6 border-2 border-orange-200 dark:border-orange-700">
                            <p className="text-lg text-orange-800 dark:text-orange-300 font-semibold mb-2">
                                {pauseReason || "Security violation detected"}
                            </p>
                            <p className="text-gray-600 dark:text-gray-400">
                                Your exam has been temporarily paused by the instructor.
                            </p>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                            </div>
                            <span className="text-sm">Waiting for instructor response</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
                            Please remain on this screen. Do not close or refresh the page.
                        </p>
                        {violations.length > 0 && (
                            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
                                <p className="text-sm text-red-700 dark:text-red-400">
                                    <strong>Violations recorded:</strong> {violations.length}
                                </p>
                            </div>
                        )}
                    </div>

                ) : isSubmitted ? (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 text-center border border-gray-200 dark:border-gray-700">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Exam Submitted Successfully!</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">Your answers have been recorded. You may now close this window.</p>
                        {violations.length > 0 && (
                            <p className="text-sm text-orange-600 dark:text-orange-400">
                                Note: {violations.length} security violation(s) were recorded during your exam.
                            </p>
                        )}
                    </div>

                ) : (
                    <div className="space-y-6">
                        {questions.map((q, index) => (
                            <div
                                key={q._id || `question-${index}`}
                                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-300"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex-1">
                                        <span className="inline-flex items-center justify-center w-8 h-8 bg-[#f0f8f7] dark:bg-[#5c8374]/30 text-[#5c8374] dark:text-[#9ec8b9] rounded-lg mr-3 font-bold">
                                            {index + 1}
                                        </span>
                                        {q.questionText}
                                    </h3>
                                    <span className="ml-4 px-3 py-1 bg-[#f0f8f7] dark:bg-[#5c8374]/30 text-[#5c8374] dark:text-[#9ec8b9] rounded-full text-sm font-medium whitespace-nowrap">
                                        {q.marks} marks
                                    </span>
                                </div>

                                {q.image && (
                                    <img
                                        className="h-[60%] w-full"
                                        aria-label="question image"
                                        src={q.image}
                                        alt="question"
                                    />
                                )}

                                {q.type === "mcq" && (
                                    <div className="space-y-3 mt-4">
                                        {q.options?.map((opt, i) => (
                                            <label
                                                key={`${q._id}-option-${i}`}
                                                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200"
                                            >
                                                <input
                                                    type="radio"
                                                    name={`q-${q._id}`}
                                                    value={opt}
                                                    checked={answers[q._id] === opt}
                                                    onChange={(e) => handleAnswerChange(q._id, e.target.value)}
                                                    className="w-4 h-4 text-[#5c8374] focus:ring-[#5c8374]"
                                                />
                                                <span className="text-gray-700 dark:text-gray-200 font-medium">{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {q.type === "text" && (
                                    <textarea
                                        rows={5}
                                        value={answers[q._id] || ""}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-xl p-4 mt-4 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#5c8374] focus:border-transparent transition-all duration-200 resize-none"
                                        placeholder="Type your answer here..."
                                        onChange={(e) => handleAnswerChange(q._id, e.target.value)}
                                    />
                                )}

                                {q.type === "code" && (
                                    <div className="mt-4 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <Code className="w-5 h-5 text-[#5c8374] dark:text-[#9ec8b9]" />
                                            <select
                                                value={selectedLanguages[q._id] || "javascript"}
                                                onChange={(e) => handleLanguageChange(q._id, e.target.value)}
                                                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#5c8374] focus:border-transparent"
                                            >
                                                {Object.entries(languageExtensions).map(([key, { label }]) => (
                                                    <option key={`${q._id}-lang-${key}`} value={key}>{label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="border border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden">
                                            <CodeMirror
                                                value={answers[q._id] || ""}
                                                height="300px"
                                                theme={oneDark}
                                                extensions={[languageExtensions[selectedLanguages[q._id] || "javascript"].ext]}
                                                onChange={(value) => handleAnswerChange(q._id, value)}
                                                className="text-sm"
                                                basicSetup={{
                                                    autocompletion: true,
                                                    highlightActiveLine: true,
                                                    highlightSelectionMatches: true,
                                                    closeBrackets: true,
                                                    defaultKeymap: true,
                                                    history: true,
                                                    foldGutter: true,
                                                    drawSelection: true,
                                                    dropCursor: true,
                                                    lintKeymap: true,
                                                    searchKeymap: true,
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {q.type === "diagram" && (
                                    <div className="mt-4">
                                        <DiagramCanvas
                                            questionId={q._id}
                                            onAnswerChange={handleAnswerChange}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}

                        <div className="flex justify-center pt-6">
                            <button
                                type="button"
                                onPointerDown={() => {
                                    proctoringSuppressedUntilRef.current = Date.now() + 1500;
                                }}
                                onClick={handleSubmit}
                                disabled={isSubmitted}
                                className="group relative px-8 py-4 bg-gradient-to-r from-[#5c8374] to-[#1b4242] hover:from-[#1b4242] hover:to-[#092635] disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold text-lg flex items-center gap-3"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Submit Exam
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ExamSection;