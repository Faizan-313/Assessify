import { useState, useEffect, useMemo, useCallback } from "react";
import {
    ArrowLeft, Save, Loader2,
    MessageSquare, AlertCircle, FileText, Image as ImageIcon,
    AlertTriangle, Monitor, MousePointer, Keyboard, Maximize, Eye,
    ChevronDown, ChevronUp
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { apiCall } from "../../api/api";
import { useExam } from "../../context/ExamContextCore";
import MarksInput from "./components/MarksInput.jsx";

// Utility Functions
const sanitizeAndFormatAnswer = (answer) => {
    if (!answer) return "";

    let text = String(answer);

    text = text
        .replace(/\\t/g, "\t")
        .replace(/\\r/g, "\r")
        .replace(/\\\//g, "/")
        .replace(/\\\\/g, "\\")
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'");

    text = text.replace(/\\u([0-9A-Fa-f]{4})/g, (match, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
    });

    return text;
};

const formatViolationType = (type) => {
    const violationMap = {
        "TAB_SWITCH": "Tab Switch",
        "WINDOW_BLUR": "Window Blur",
        "DEVTOOLS_OPENED": "DevTools Opened",
        "RIGHT_CLICK_ATTEMPT": "Right Click",
        "BLOCKED_SHORTCUT": "Blocked Shortcut",
        "FULLSCREEN_EXIT": "Fullscreen Exit",
    };
    
    const normalizedType = type?.toUpperCase();
    return violationMap[normalizedType] || type;
};

const getViolationIcon = (type) => {
    const iconProps = { className: "w-4 h-4" };
    const normalizedType = type?.toUpperCase();

    const iconMap = {
        "TAB_SWITCH": <Monitor {...iconProps} />,
        "WINDOW_BLUR": <Monitor {...iconProps} />,
        "DEVTOOLS_OPENED": <MousePointer {...iconProps} />,
        "RIGHT_CLICK_ATTEMPT": <MousePointer {...iconProps} />,
        "BLOCKED_SHORTCUT": <Keyboard {...iconProps} />,
        "FULLSCREEN_EXIT": <Maximize {...iconProps} />,
    };

    return iconMap[normalizedType] || <AlertTriangle {...iconProps} />;
};

const getViolationColor = (type) => {
    const normalizedType = type?.toUpperCase();

    const colorMap = {
        "TAB_SWITCH": "bg-[#9ec8b9] text-[#092635] dark:bg-[#092635]/40 dark:text-[#9ec8b9] border-[#9ec8b9] dark:border-[#092635]",
        "WINDOW_BLUR": "bg-[#9ec8b9] text-[#092635] dark:bg-[#092635]/40 dark:text-[#9ec8b9] border-[#9ec8b9] dark:border-[#092635]",
        "DEVTOOLS_OPENED": "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-700",
        "RIGHT_CLICK_ATTEMPT": "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-700",
        "BLOCKED_SHORTCUT": "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-700",
        "FULLSCREEN_EXIT": "bg-[#f0f7f6] text-[#1b4242] dark:bg-[#1b4242]/40 dark:text-[#9ec8b9] border-[#9ec8b9] dark:border-[#5c8374]",
    };

    return colorMap[normalizedType] || "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300 border-gray-200 dark:border-gray-700";
};

// API Function
const fetchStudent = async (studentId) => {
    try {
        const response = await apiCall(
            `${import.meta.env.VITE_API_URL}/api/v1/teacher/exam/student?studentId=${studentId}`,
            "GET"
        );

        if (response.status === 200) {
            return response.data.student;
        }
        
        throw new Error("Failed to fetch student data");
    } catch (error) {
        console.error("Error fetching student data:", error);
        throw error;
    }
};

function ViewPaper() {
    const { studentId, examId } = useParams();
    const navigate = useNavigate();
    const { fetchParticularExamDetails, particularExamDetails } = useExam();
    
    const [student, setStudent] = useState(null);
    const [marks, setMarks] = useState("");
    const [comments, setComments] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [localExamAttempt, setLocalExamAttempt] = useState(null);
    const [showViolations, setShowViolations] = useState(false);
    const [loading, setLoading] = useState(true);

    const exam = particularExamDetails;

    // Memoized Values
    const examAttempt = useMemo(() => {
        if (!student?.examsAttempted) return null;
        
        return student.examsAttempted.find(attempt =>
            typeof attempt.examId === 'object'
                ? attempt.examId._id === examId
                : attempt.examId === examId
        );
    }, [student, examId]);

    const examViolations = useMemo(() => {
        return student?.violations?.[0]?.violations || [];
    }, [student]);

    const maxMarks = useMemo(() => exam?.totalMarks || 100, [exam]);

    const totalObtainedMarks = useMemo(() => {
        if (!localExamAttempt?.answers) return 0;
        
        return localExamAttempt.answers.reduce(
            (sum, ans) => sum + (parseFloat(ans.marksObtained) || 0),
            0
        );
    }, [localExamAttempt]);

    // Load Data Effect
    useEffect(() => {
        const loadData = async () => {
            if (!examId || !studentId) {
                toast.error("Missing exam or student ID");
                navigate(-1);
                return;
            }

            try {
                setLoading(true);
                
                const [studentData] = await Promise.all([
                    fetchStudent(studentId),
                    fetchParticularExamDetails(examId)
                ]);

                if (studentData) {
                    setStudent(studentData);
                } else {
                    throw new Error("Failed to load student data");
                }
            } catch (err) {
                console.error("Error in loadData:", err);
                toast.error("Failed to load data");
                navigate(-1);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [examId, studentId]);

    // Initialize Local Exam Attempt
    useEffect(() => {
        if (examAttempt) {
            setLocalExamAttempt(JSON.parse(JSON.stringify(examAttempt)));
            setMarks(examAttempt.totalScore?.toString() || "");
            setComments(examAttempt.evaluatorComments || "");
        }
    }, [examAttempt]);

    // Handlers
    const handleValidation = useCallback(() => {
        const marksNum = parseFloat(marks);

        if (marks === "") {
            toast.error("Please enter marks");
            return false;
        }

        if (isNaN(marksNum)) {
            toast.error("Marks must be a valid number");
            return false;
        }

        if (marksNum < 0 || marksNum > maxMarks) {
            toast.error(`Marks must be between 0 and ${maxMarks}`);
            return false;
        }

        return true;
    }, [marks, maxMarks]);

    const handleSubmit = useCallback(async () => {
        if (!handleValidation()) return;

        try {
            setSubmitting(true);

            const evaluatedAnswers = localExamAttempt.answers.map(ans => ({
                questionId: ans.questionId,
                marksObtained: parseFloat(ans.marksObtained) || 0
            }));

            const totalScore = evaluatedAnswers.reduce((sum, ans) => sum + ans.marksObtained, 0).toFixed(1);


            const response = await apiCall(
                `${import.meta.env.VITE_API_URL}/api/v1/teacher/evaluate-paper`,
                "POST",
                {
                    data: {
                        examId,
                        studentId,
                        totalScore,
                        evaluatorComments: comments,
                        answers: evaluatedAnswers,
                    },
                }
            );

            if (response.status === 200) {
                toast.success("Paper evaluated successfully!");
                setTimeout(() => {
                    navigate(`/teacher/evaluation/${examId}`, { replace: true });
                }, 1500);
            } else {
                throw new Error(response.data?.message || "Failed to submit evaluation");
            }
        } catch (error) {
            console.error("Error submitting evaluation:", error);
            toast.error(error.response?.data?.message || "Failed to submit evaluation");
        } finally {
            setSubmitting(false);
        }
    }, [handleValidation, localExamAttempt, examId, studentId, comments, navigate]);

    // Render Functions
    const renderStudentAnswer = useCallback((question, studentAnswer) => {
        const hasAnswer = studentAnswer?.answerText?.trim();

        if (!hasAnswer) {
            return (
                <div className="bg-gray-50 dark:bg-gray-700/50 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        No answer provided
                    </p>
                    <MarksInput
                        question={question}
                        studentAnswer={studentAnswer}
                        setLocalExamAttempt={setLocalExamAttempt}
                    />
                </div>
            );
        }

        if (question.type === "diagram") {
            return (
                <div className="bg-[#9ec8b9] dark:bg-[#092635]/20 border border-[#9ec8b9] dark:border-[#092635] rounded-lg p-4 space-y-3">
                    <p className="text-xs font-semibold text-[#1b4242] dark:text-[#9ec8b9]">
                        STUDENT'S DIAGRAM
                    </p>
                    {studentAnswer.answerText?.startsWith("data:image") ? (
                        <div className="flex flex-col gap-2">
                            <img
                                src={studentAnswer.answerText}
                                alt="Student's diagram"
                                className="max-w-full h-auto border border-gray-300 dark:border-gray-600 rounded-lg"
                            />
                        </div>
                    ) : (
                        <div className="flex items-center justify-center p-8 bg-gray-100 dark:bg-gray-800 rounded-lg">
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                            <p className="text-sm text-gray-500 dark:text-gray-400 ml-2">Diagram image</p>
                        </div>
                    )}
                    <MarksInput
                        question={question}
                        studentAnswer={studentAnswer}
                        setLocalExamAttempt={setLocalExamAttempt}
                    />
                </div>
            );
        }

        if (question.type === "mcq") {
            const selectedOption = studentAnswer.answerText;
            const optionDetails = question.options?.find(opt => 
                opt._id === selectedOption || opt.text === selectedOption
            );

            return (
                <div className="bg-[#9ec8b9]/20 dark:bg-[#092635]/30 border border-[#5c8374] dark:border-[#1b4242] rounded-lg p-4 space-y-3">
                    <p className="text-xs font-semibold text-[#1b4242] dark:text-[#9ec8b9]">
                        STUDENT'S ANSWER
                    </p>
                    <div className="bg-white dark:bg-gray-800 border-2 border-[#5c8374] dark:border-[#1b4242] rounded-lg p-3">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {optionDetails?.text || selectedOption}
                        </p>
                    </div>
                    {question.options?.length > 0 && (
                        <div className="space-y-2 mt-3">
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">All Options:</p>
                            <div className="space-y-1">
                                {question.options.map((option, idx) => {
                                    const isSelected = selectedOption === option._id || selectedOption === option.text;
                                    return (
                                        <div
                                            key={option._id || idx}
                                            className={`p-2 rounded text-sm ${
                                                isSelected
                                                    ? "bg-green-300 dark:bg-green-300/40 border border-[#5c8374] dark:border-[#1b4242]"
                                                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                            }`}
                                        >
                                            <span className="font-medium">({String.fromCharCode(65 + idx)})</span> {option.text || option}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    <MarksInput
                        question={question}
                        studentAnswer={studentAnswer}
                        setLocalExamAttempt={setLocalExamAttempt}
                    />
                </div>
            );
        }

        return (
            <div className="bg-[#9ec8b9]/20 dark:bg-[#092635]/30 border border-[#5c8374] dark:border-[#1b4242] rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-[#1b4242] dark:text-[#9ec8b9]">
                    STUDENT'S ANSWER
                </p>
                <pre className="text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 p-3 rounded-lg text-sm dark:bg-gray-950 bg-white leading-relaxed whitespace-pre-wrap break-words font-mono overflow-auto max-h-96">
                    {sanitizeAndFormatAnswer(studentAnswer.answerText)}
                </pre>
                <MarksInput
                    question={question}
                    studentAnswer={studentAnswer}
                    setLocalExamAttempt={setLocalExamAttempt}
                />
            </div>
        );
    }, []);

    // Loading State
    if (loading || !exam || !student || !localExamAttempt) {
        return (
            <div className="pt-20 min-h-screen bg-gradient-to-b from-[#f0f8f7] to-[#e0f2f0] dark:from-[#092635] dark:to-[#1b4242] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-[#5c8374] animate-spin" />
                    <p className="text-gray-600 dark:text-gray-300">Loading exam paper...</p>
                </div>
            </div>
        );
    }

    const studentAnswers = localExamAttempt.answers || [];

    return (
        <div className="pt-20 min-h-screen bg-gradient-to-b from-[#f0f8f7] to-[#e0f2f0] dark:from-[#092635] dark:to-[#1b4242] py-8 px-4 sm:px-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate(`/teacher/evaluation/${examId}`)}
                        className="p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg transition"
                        title="Go back"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                            Evaluate Paper
                        </h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {exam.title}
                        </p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Exam Details Card */}
                        <div className="bg-white/80 dark:bg-gray-800/70 backdrop-blur-lg border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-md">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                                Exam Details
                            </h2>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Exam Title</p>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                                        {exam.title}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Exam Code</p>
                                    <p className="font-mono text-gray-900 dark:text-gray-100 text-sm">
                                        {exam.examCode}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Duration</p>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                                        {exam.duration} minutes
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Marks</p>
                                    <p className="font-bold text-[#5c8374] dark:text-[#9ec8b9]">
                                        {maxMarks}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Questions & Answers Card */}
                        <div className="bg-white/80 dark:bg-gray-800/70 backdrop-blur-lg border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-md">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                                Questions & Answers
                            </h2>

                            {exam.questions?.length > 0 ? (
                                <div className="space-y-6">
                                    {exam.questions.map((question, idx) => {
                                        const studentAnswer = studentAnswers.find(
                                            (ans) => ans.questionId === question._id
                                        );

                                        return (
                                            <div
                                                key={question._id || idx}
                                                className="pb-6 border-b border-gray-200 dark:border-gray-700 last:border-b-0 last:pb-0"
                                            >
                                                <div className="mb-4">
                                                    <div className="flex items-start justify-between gap-3 mb-2">
                                                        <h3 className="font-bold text-gray-900 dark:text-gray-100">
                                                            Q{idx + 1}. {question.questionText}
                                                        </h3>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <span className="px-2.5 py-1 bg-[#f0f7f6] dark:bg-[#1b4242]/30 text-[#1b4242] dark:text-[#9ec8b9] text-xs font-semibold rounded-full whitespace-nowrap">
                                                                {question.type}
                                                            </span>
                                                            <span className="px-2.5 py-1 bg-[#f0f7f6] dark:bg-[#1b4242]/30 text-[#5c8374] dark:text-[#9ec8b9] text-xs font-semibold rounded-full whitespace-nowrap">
                                                                {question.marks || 0} marks
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {question.image && (
                                                        <img className="h-[60%] w-full" rel="question image" aria-label="question image" src={question.image}></img>
                                                    )}
                                                </div>

                                                {renderStudentAnswer(question, studentAnswer)}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-50" />
                                    <p className="text-gray-600 dark:text-gray-400">
                                        No questions available for this exam
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Submission Info */}
                        {localExamAttempt && (
                            <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-400">
                                <p>
                                    <strong>Submitted:</strong> {new Date(localExamAttempt.submittedAt).toLocaleString()}
                                </p>
                                {localExamAttempt.evaluatedAt && (
                                    <p>
                                        <strong>Evaluated:</strong> {new Date(localExamAttempt.evaluatedAt).toLocaleString()}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Student Information Card */}
                        <div className="bg-[#f0f7f6] dark:bg-[#1b4242]/20 border border-[#9ec8b9] dark:border-[#5c8374] rounded-2xl p-5 shadow-md">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">
                                Student Information
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">Full Name</p>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{student.name}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">Roll Number</p>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{student.rollNumber}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">College ID</p>
                                    <p className="font-mono text-gray-900 dark:text-gray-100 text-xs">{student.collegeId}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">Batch</p>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{student.batch}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">Session</p>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{student.session}</p>
                                </div>
                            </div>
                        </div>

                        {/* Violations Card */}
                        <div className="bg-white/80 dark:bg-gray-800/70 backdrop-blur-lg border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-md">
                            <button
                                onClick={() => setShowViolations(prev => !prev)}
                                className="w-full flex items-center justify-between"
                                aria-expanded={showViolations}
                            >
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                                    Exam Violations
                                    {examViolations.length > 0 && (
                                        <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-red-900 dark:text-red-300">
                                            {examViolations.length}
                                        </span>
                                    )}
                                </h3>
                                {showViolations ? (
                                    <ChevronUp className="w-5 h-5 text-gray-500" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-500" />
                                )}
                            </button>

                            {showViolations && (
                                <div className="mt-4">
                                    {examViolations.length > 0 ? (
                                        <div className="space-y-3">
                                            {examViolations.map((violation, index) => (
                                                <div
                                                    key={violation._id || index}
                                                    className="p-3 border rounded-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:shadow-sm transition-shadow"
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`p-1.5 rounded-md border ${getViolationColor(violation.type)}`}>
                                                                {getViolationIcon(violation.type)}
                                                            </span>
                                                            <span className={`px-2.5 py-1 text-xs font-medium rounded-md border ${getViolationColor(violation.type)}`}>
                                                                {formatViolationType(violation.type)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 ml-8">
                                                        {new Date(violation.timestamp).toLocaleString()}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4">
                                            <Eye className="w-8 h-8 text-green-500 mx-auto mb-2 opacity-60" />
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                No violations detected during this exam
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Mark Paper Card */}
                        <div className="bg-white/80 dark:bg-gray-800/70 backdrop-blur-lg border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-md sticky top-24">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-5">
                                Mark Paper
                            </h3>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Total Marks Obtained <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={totalObtainedMarks.toFixed(1)}
                                            readOnly
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                            bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-gray-100 font-medium text-lg
                                            cursor-not-allowed"
                                        />
                                        <span className="absolute right-3 top-2.5 text-gray-500 dark:text-gray-400 font-medium text-sm">
                                            / {maxMarks}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        Automatically calculated from individual question marks
                                    </p>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                                        <MessageSquare className="w-4 h-4" />
                                        Feedback Comments
                                    </label>
                                    <textarea
                                        value={comments}
                                        onChange={(e) => setComments(e.target.value)}
                                        placeholder="Add constructive feedback for the student..."
                                        disabled={submitting}
                                        rows={5}
                                        maxLength={500}
                                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg
                                        bg-white/70 dark:bg-gray-700 text-gray-900 dark:text-gray-100
                                        placeholder-gray-400 focus:ring-2 focus:ring-[#5c8374] 
                                        focus:border-transparent outline-none transition resize-none disabled:opacity-50"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                                        {comments.length} / 500 characters
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3 mt-6">
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting || totalObtainedMarks === 0}
                                    className="w-full bg-[#5c8374] hover:bg-[#1b4242] disabled:bg-gray-400 disabled:cursor-not-allowed
                                    text-white py-2.5 rounded-lg font-semibold transition duration-200
                                    focus:ring-2 focus:ring-[#9ec8b9] focus:ring-offset-2
                                    dark:focus:ring-offset-gray-800 flex items-center justify-center gap-2 text-sm"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Submit Evaluation
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ViewPaper;