import { useState, useEffect } from "react";
import { Plus, Trash2, Save, Send, Clock, Calendar, FileText, Code, CheckSquare, Check, Edit2, AlertCircle, FileLock2 } from "lucide-react";
import toast from "react-hot-toast";
import { apiCall } from "../../api/api";
import { useNavigate } from "react-router-dom";
import ImageUploadComponent from "./components/ImageUploadComponent";
import validateExamDetails from "./utils/validateExamDetails";


export default function CreateExam() {
    const [examDetails, setExamDetails] = useState({
        title: "",
        description: "",
        duration: "",
        examCode: "",
        branch: "",
        semester: "",
        session: "",
        startTime: "",
        endTime: ""
    });

    const navigate = useNavigate();

    const [questions, setQuestions] = useState([]);
    const [totalMarks, setTotalMarks] = useState(0);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [questionToDelete, setQuestionToDelete] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleExamChange = (e) => {
        setExamDetails({ ...examDetails, [e.target.name]: e.target.value });
    };

    const addQuestion = (type = "code") => {
        const newQuestion = {
            type,
            questionText: "",
            marks: "",
            image: null,
            imagePreview: null,
            isCompleted: false,
        };

        if (type === "mcq") {
            newQuestion.options = ["", "", "", ""];
            newQuestion.correctAnswer = 0;
        }

        if (type === "text") {
            newQuestion.referenceAnswer = "";
        }

        if (type === "code") {
            newQuestion.referenceCode = "";
        }

        setQuestions([...questions, newQuestion]);
    };

    // get already entered data stored in localstorage on load
    useEffect(() => {
        const data = localStorage.getItem("createExamDraft");
        if (data) {
            try {
                const examData = JSON.parse(data);
                if (examData) {
                    setExamDetails(examData.examDetails || {
                        title: "",
                        description: "",
                        duration: "",
                        examCode: "",
                        branch: "",
                        semester: "",
                        session: "",
                        startTime: "",
                        endTime: ""
                    });

                    // Ensure any draft loaded does NOT restore image fields (clear them)
                    const sanitizedQuestions = (examData.questions || []).map(q => ({
                        ...q,
                        image: null,
                        imagePreview: null
                    }));

                    setQuestions(sanitizedQuestions);
                    setTotalMarks(examData.totalMarks || 0);
                }
            } catch {
                toast.error("Failed to load saved draft");
                localStorage.removeItem("createExamDraft");
            }
        }
    }, []);

    const confirmDelete = (index) => {
        setQuestionToDelete(index);
        setShowDeleteModal(true);
    };

    const removeQuestion = () => {
        if (questionToDelete !== null) {
            const removed = questions[questionToDelete];
            setQuestions(questions.filter((_, i) => i !== questionToDelete));
            setTotalMarks(totalMarks - (parseInt(removed.marks) || 0));
            setShowDeleteModal(false);
            setQuestionToDelete(null);
        }
    };

    const handleQuestionChange = (index, field, value) => {
        const updated = [...questions];
        const oldMarks = parseInt(updated[index].marks) || 0;
        updated[index][field] = value;

        if (field === "marks") {
            const newMarks = parseInt(value) || 0;
            setTotalMarks(totalMarks - oldMarks + newMarks);
        }

        if (field === "type" && value === "mcq" && !updated[index].options) {
            updated[index].options = ["", "", "", ""];
            updated[index].correctAnswer = 0;
        }

        if (field === "type" && value !== "mcq" && updated[index].options) {
            delete updated[index].options;
            delete updated[index].correctAnswer;
        }

        if (field === "type") {
            if (value === "text" && updated[index].referenceAnswer === undefined) {
                updated[index].referenceAnswer = "";
            }
            if (value !== "text") {
                delete updated[index].referenceAnswer;
            }
            if (value === "code" && updated[index].referenceCode === undefined) {
                updated[index].referenceCode = "";
            }
            if (value !== "code") {
                delete updated[index].referenceCode;
            }
        }

        setQuestions(updated);
    };

    const handleOptionChange = (qIndex, optIndex, value) => {
        const updated = [...questions];
        updated[qIndex].options[optIndex] = value;
        setQuestions(updated);
    };

    const markQuestionComplete = (index) => {
        if (!questions[index].questionText.trim() || !questions[index].marks || parseInt(questions[index].marks) <= 0) {
            toast.error("Please fill in the question text and valid marks before marking as done");
            return;
        }
        const updated = [...questions];
        updated[index].isCompleted = true;
        setQuestions(updated);
    };

    const editQuestion = (index) => {
        const updated = [...questions];
        updated[index].isCompleted = false;
        setQuestions(updated);
    };

    const handleSubmit = async (isDraft = false) => {
        // If saving as draft, save exam data without actual File objects 
        if (isDraft) {
            try {
                // Do NOT persist any image-related data in drafts. Clear image and preview so user must re-upload when publishing.
                const questionsForDraft = questions?.map((q) => ({
                    ...q,
                    image: null,
                    imagePreview: null
                }));

                const draftExamData = {
                    examDetails,
                    questions: questionsForDraft,
                    totalMarks
                };

                localStorage.setItem("createExamDraft", JSON.stringify(draftExamData));
                toast.success("Exam saved as draft! Images are not stored in drafts.");
            } catch (error) {
                console.error("Error saving draft:", error);
                toast.error("Failed to save draft");
            }
            return;
        }

        const isValid = validateExamDetails(examDetails, questions);
        if (!isValid) return;

        for (let i = 0; i < questions?.length; i++) {
            if (!questions[i].questionText.trim()) {
                toast.error(`Question ${i + 1} text is required`);
                return;
            }
            if (!questions[i].marks || parseInt(questions[i].marks) <= 0) {
                toast.error(`Question ${i + 1} must have valid marks`);
                return;
            }
            if (questions[i].type === "mcq") {
                const filledOptions = questions[i].options.filter(opt => opt.trim());
                if (filledOptions.length < 2) {
                    toast.error(`Question ${i + 1} (MCQ) must have at least 2 options`);
                    return;
                }
            }
            if (questions[i].type === "text" && !questions[i].referenceAnswer?.trim()) {
                toast.error(`Question ${i + 1} (Text) needs a reference answer for AI evaluation`);
                return;
            }
            if (questions[i].type === "code" && !questions[i].referenceCode?.trim()) {
                toast.error(`Question ${i + 1} (Code) needs a reference solution for AI evaluation`);
                return;
            }
        }

        // Prepare FormData to send as multipart/form-data so we are able to include File objects directly
        const formData = new FormData();
        formData.append('examDetails', JSON.stringify({
            ...examDetails,
            duration: parseInt(examDetails.duration),
            startTime: new Date(examDetails.startTime).toISOString(),
            endTime: new Date(examDetails.endTime).toISOString()
        }));

        // Questions payload (without files) include a hasImage flag for each question
        const questionsPayload = questions?.map((q) => ({
            type: q.type,
            questionText: q.questionText,
            marks: parseInt(q.marks),
            ...(q.type === 'mcq'
                ? { options: q.options, correctOption: q.correctAnswer }
                : {}),
            ...(q.type === 'text' ? { referenceAnswer: q.referenceAnswer || "" } : {}),
            ...(q.type === 'code' ? { referenceCode: q.referenceCode || "" } : {}),
            hasImage: !!q.image
        }));

        formData.append('questions', JSON.stringify(questionsPayload));
        formData.append('totalMarks', String(totalMarks));

        // Append images with keys that indicate their question index
        questions?.forEach((q, i) => {
            if (q.image && !(typeof q.image === 'string')) {
                formData.append(`image_${i}`, q.image);
            }
        });

        setIsSubmitting(true);

        try {
            // we're sending multipart/form-data so the backend should accept files under keys like `image_0`, `image_1`, ...
            const res = await apiCall(`/api/v1/exams/create`, "POST", { data: formData });
            if (res.status === 200) {
                toast.success("Exam published successfully!");

                // Clear localStorage and reset form
                localStorage.removeItem("createExamDraft");
                setExamDetails({
                    title: "",
                    description: "",
                    duration: "",
                    examCode: "",
                    branch: "",
                    semester: "",
                    session: "",
                    startTime: "",
                    endTime: ""
                });
                setQuestions([]);
                setTotalMarks(0);
                navigate("/dashboard")
            }
        } catch (error) {
            console.error("Unexpected error during submission:", error);
            if (error.status === 413)
                toast.error("Image size must be less than 2mb")
            else
                toast.error("An error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const getQuestionIcon = (type) => {
        switch (type) {
            case "code": return <Code className="w-4 h-4" />;
            case "text": return <FileText className="w-4 h-4" />;
            case "mcq": return <CheckSquare className="w-4 h-4" />;
            case "diagram": return <Calendar className="w-4 h-4" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    const inputClass =
        "w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 transition";
    const inputIconClass = inputClass + " pl-11";

    const renderCompletedQuestion = (q, index) => {
        return (
            <div className="rounded-2xl p-6 bg-gradient-to-b from-emerald-500/[0.07] to-white/[0.01] border border-emerald-500/30">
                <div className="flex justify-between items-start mb-4 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center justify-center">
                            <Check className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-white text-lg">Question {index + 1}</h4>
                            <span className="text-xs text-gray-400">
                                {q?.type === "mcq" ? "Multiple Choice" : q?.type === "code" ? "Code Question" : q?.type === "diagram" ? "Diagram based" : "Text Answer"}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => editQuestion(index)}
                            className="text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/30 p-2 rounded-lg transition-all"
                            title="Edit Question"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => confirmDelete(index)}
                            className="text-red-300 hover:text-red-200 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 p-2 rounded-lg transition-all"
                            title="Delete Question"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-start gap-4">
                        <p className="text-gray-200 text-base leading-relaxed flex-1 whitespace-pre-wrap">{q.questionText}</p>
                        <span className="px-3 py-1 bg-violet-500/15 text-violet-300 border border-violet-500/30 rounded-full text-xs font-semibold whitespace-nowrap">
                            {q.marks} marks
                        </span>
                    </div>

                    {q?.type === "mcq" && (
                        <div className="mt-4 space-y-2 pl-1">
                            {q.options.map((option, optIndex) => (
                                option.trim() && (
                                    <div key={optIndex} className="flex items-start gap-2 text-sm">
                                        <span className={`font-semibold ${q.correctAnswer === optIndex ? 'text-emerald-300' : 'text-gray-400'}`}>
                                            {String.fromCharCode(65 + optIndex)}.
                                        </span>
                                        <span className={`${q.correctAnswer === optIndex ? 'text-emerald-300 font-medium' : 'text-gray-300'}`}>
                                            {option}
                                            {q.correctAnswer === optIndex && ' ✓'}
                                        </span>
                                    </div>
                                )
                            ))}
                        </div>
                    )}

                    {q.type === "text" && q.referenceAnswer?.trim() && (
                        <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.05] p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 mb-1">
                                Reference Answer
                            </p>
                            <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                                {q.referenceAnswer}
                            </p>
                        </div>
                    )}

                    {q.type === "code" && q.referenceCode?.trim() && (
                        <div className="mt-4 rounded-lg border border-sky-500/20 bg-sky-500/[0.05] p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-sky-300 mb-1">
                                Reference Code
                            </p>
                            <pre className="text-sm text-gray-200 whitespace-pre-wrap font-mono leading-relaxed overflow-auto max-h-48">
                                {q.referenceCode}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderEditableQuestion = (q, index) => {
        return (
            <div className="rounded-2xl p-6 bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 hover:border-violet-500/30 transition-colors">
                <div className="flex justify-between items-start mb-5 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold shadow-lg shadow-violet-500/20">
                            {index + 1}
                        </div>
                        <h4 className="font-bold text-white text-lg">
                            Question {index + 1}
                        </h4>
                    </div>
                    <button
                        onClick={() => confirmDelete(index)}
                        className="text-red-300 hover:text-red-200 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 p-2 rounded-lg transition-all"
                        title="Delete Question"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label htmlFor={`type-${index}`} className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                            Question Type
                        </label>
                        <div className="relative">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                {getQuestionIcon(q.type)}
                            </div>
                            <select
                                id={`type-${index}`}
                                value={q.type}
                                onChange={(e) =>
                                    handleQuestionChange(index, "type", e.target.value)
                                }
                                className={inputIconClass + " appearance-none cursor-pointer"}
                            >
                                <option value="code" className="bg-gray-900">Code Question</option>
                                <option value="text" className="bg-gray-900">Text Answer</option>
                                <option value="diagram" className="bg-gray-900">Diagram based</option>
                                <option value="mcq" className="bg-gray-900">Multiple Choice</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label htmlFor={`marks-${index}`} className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                            Marks
                        </label>
                        <input
                            type="number"
                            id={`marks-${index}`}
                            placeholder="10"
                            value={q.marks}
                            onChange={(e) =>
                                handleQuestionChange(index, "marks", e.target.value)
                            }
                            required
                            className={inputClass}
                            min="1"
                        />
                    </div>
                </div>

                <div className="mb-4">
                    <label htmlFor={`questionText-${index}`} className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                        Question Text
                    </label>
                    <textarea
                        id={`questionText-${index}`}
                        placeholder="Enter your question here..."
                        value={q.questionText}
                        onChange={(e) =>
                            handleQuestionChange(index, "questionText", e.target.value)
                        }
                        required
                        className={inputClass + " resize-none"}
                        rows={3}
                    />
                </div>

                <ImageUploadComponent key={index} index={index} questions={questions} setQuestions={setQuestions} />

                {q?.type === "mcq" && (
                    <div className="bg-violet-500/[0.06] p-4 rounded-xl border border-violet-500/20 mb-4">
                        <span className="block text-xs font-semibold text-violet-200 mb-3 uppercase tracking-wider">
                            Multiple Choice Options
                        </span>
                        <div className="space-y-2">
                            {q.options.map((option, optIndex) => (
                                <div key={optIndex} className="flex items-center gap-3">
                                    <input
                                        type="radio"
                                        id={`q-${index}-opt-${optIndex}`}
                                        name={`correct-${index}`}
                                        checked={q.correctAnswer === optIndex}
                                        onChange={() =>
                                            handleQuestionChange(index, "correctAnswer", optIndex)
                                        }
                                        className="w-4 h-4 accent-violet-500"
                                    />
                                    <label htmlFor={`q-${index}-opt-${optIndex}`} className="flex-1">
                                        <input
                                            type="text"
                                            placeholder={`Option ${optIndex + 1}`}
                                            value={option}
                                            onChange={(e) =>
                                                handleOptionChange(index, optIndex, e.target.value)
                                            }
                                            className={inputClass + " py-2.5"}
                                        />
                                    </label>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-violet-300/80 mt-3">
                            Select the correct answer
                        </p>
                    </div>
                )}

                {q.type === "text" && (
                    <div className="bg-emerald-500/[0.06] p-4 rounded-xl border border-emerald-500/20 mb-4">
                        <label
                            htmlFor={`reference-answer-${index}`}
                            className="block text-xs font-semibold text-emerald-200 mb-2 uppercase tracking-wider"
                        >
                            Reference Answer (used by AI auto evaluation)
                        </label>
                        <textarea
                            id={`reference-answer-${index}`}
                            placeholder="Write the ideal answer / rubric the AI should grade against..."
                            value={q.referenceAnswer || ""}
                            onChange={(e) =>
                                handleQuestionChange(index, "referenceAnswer", e.target.value)
                            }
                            className={inputClass + " resize-none font-sans"}
                            rows={5}
                        />
                        <p className="text-xs text-emerald-300/80 mt-2">
                            The AI compares each student answer to this reference. Be specific so the grading is consistent.
                        </p>
                    </div>
                )}

                {q.type === "code" && (
                    <div className="bg-sky-500/[0.06] p-4 rounded-xl border border-sky-500/20 mb-4">
                        <label
                            htmlFor={`reference-code-${index}`}
                            className="block text-xs font-semibold text-sky-200 mb-2 uppercase tracking-wider"
                        >
                            Reference Solution Code (used by AI auto evaluation)
                        </label>
                        <textarea
                            id={`reference-code-${index}`}
                            placeholder="// Paste the canonical solution. The AI will not execute it; it grades against this reference."
                            value={q.referenceCode || ""}
                            onChange={(e) =>
                                handleQuestionChange(index, "referenceCode", e.target.value)
                            }
                            className={inputClass + " resize-none font-mono text-sm"}
                            rows={8}
                            spellCheck={false}
                        />
                        <p className="text-xs text-sky-300/80 mt-2">
                            Student code is not executed. The reference is used to score correctness, structure and clarity.
                        </p>
                    </div>
                )}

                <div className="flex justify-end">
                    <button
                        onClick={() => markQuestionComplete(index)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 mt-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-lg transition-all duration-200 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 font-semibold text-sm"
                    >
                        <Check className="w-4 h-4" />
                        Done
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="relative min-h-screen bg-gray-950 text-gray-100 overflow-hidden">
            <div className="absolute -top-40 -left-40 w-[35rem] h-[35rem] bg-indigo-600/15 rounded-full blur-[130px] pointer-events-none" />
            <div className="absolute top-1/3 -right-40 w-[35rem] h-[35rem] bg-violet-600/15 rounded-full blur-[130px] pointer-events-none" />

            <div className="relative max-w-5xl mx-auto pb-12 pt-24 sm:pt-28 lg:pt-32 px-4 sm:px-6 lg:px-8">
                <div className="rounded-2xl p-6 sm:p-8 mb-6 bg-gradient-to-br from-indigo-600/15 via-violet-600/15 to-fuchsia-600/15 border border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                        <div>
                            <span className="inline-block px-3 py-1 mb-3 text-xs font-semibold tracking-wider uppercase rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                                New Assessment
                            </span>
                            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                                Create New{" "}
                                <span className="bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
                                    Exam
                                </span>
                            </h1>
                            <p className="text-gray-400 mt-1 text-sm">
                                Design your exam with custom questions and settings
                            </p>
                        </div>
                        <div className="self-start sm:self-auto px-4 py-2 rounded-full font-semibold bg-white/5 border border-white/10 text-white whitespace-nowrap">
                            Total: <span className="text-violet-300 tabular-nums">{totalMarks}</span> marks
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl p-6 sm:p-8 mb-6 bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-violet-400" />
                        Exam Details
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="md:col-span-2">
                            <label htmlFor="exam-title" className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                                Exam Title
                            </label>
                            <input
                                type="text"
                                id="exam-title"
                                name="title"
                                placeholder="Data Structures Final Exam"
                                value={examDetails.title}
                                onChange={handleExamChange}
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label htmlFor="exam-duration" className="text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                Duration (minutes)
                            </label>
                            <input
                                type="number"
                                id="exam-duration"
                                name="duration"
                                placeholder="60"
                                value={examDetails.duration}
                                onChange={handleExamChange}
                                className={inputClass}
                                min="1"
                            />
                        </div>

                        <div>
                            <label htmlFor="exam-branch" className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                                Branch
                            </label>
                            <input
                                type="text"
                                id="exam-branch"
                                name="branch"
                                placeholder="CSE"
                                value={examDetails.branch}
                                onChange={handleExamChange}
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label htmlFor="exam-semester" className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                                Semester
                            </label>
                            <input
                                type="number"
                                id="exam-semester"
                                name="semester"
                                placeholder="8"
                                value={examDetails.semester}
                                onChange={handleExamChange}
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label htmlFor="exam-session" className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                                Session
                            </label>
                            <input
                                type="text"
                                id="exam-session"
                                name="session"
                                placeholder="Spring 2026"
                                value={examDetails.session}
                                onChange={handleExamChange}
                                className={inputClass}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label htmlFor="exam-code" className="text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider flex items-center gap-1">
                                <FileLock2 className="w-3.5 h-3.5" />
                                Exam Code
                            </label>
                            <input
                                type="text"
                                id="exam-code"
                                name="examCode"
                                placeholder="Set an exam code"
                                value={examDetails.examCode}
                                onChange={handleExamChange}
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label htmlFor="exam-startTime" className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                                Start Time
                            </label>
                            <input
                                type="datetime-local"
                                id="exam-startTime"
                                name="startTime"
                                value={examDetails.startTime}
                                onChange={handleExamChange}
                                className={inputClass + " [color-scheme:dark]"}
                            />
                        </div>

                        <div>
                            <label htmlFor="exam-endTime" className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                                End Time
                            </label>
                            <input
                                type="datetime-local"
                                id="exam-endTime"
                                name="endTime"
                                value={examDetails.endTime}
                                onChange={handleExamChange}
                                className={inputClass + " [color-scheme:dark]"}
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="exam-description" className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                            Description / Instructions
                        </label>
                        <textarea
                            id="exam-description"
                            name="description"
                            placeholder="Enter exam instructions, guidelines, or any important notes for students..."
                            value={examDetails.description}
                            onChange={handleExamChange}
                            className={inputClass + " resize-none"}
                            rows={4}
                        />
                    </div>
                </div>

                <div className="rounded-2xl p-6 sm:p-8 mb-6 bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-violet-400" />
                            Questions{" "}
                            <span className="text-gray-500 font-normal">({questions.length})</span>
                        </h2>
                        <button
                            onClick={() => addQuestion("code")}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white rounded-lg transition-all duration-200 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 font-semibold text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add Question
                        </button>
                    </div>

                    {questions.length === 0 ? (
                        <div className="text-center py-12 rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02]">
                            <FileText className="w-14 h-14 text-violet-400/60 mx-auto mb-4" />
                            <p className="text-gray-200 text-base font-medium">No questions added yet</p>
                            <p className="text-gray-500 text-sm mt-1">Click "Add Question" to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {questions.map((q, index) => (
                                <div key={index}>
                                    {q.isCompleted ? renderCompletedQuestion(q, index) : renderEditableQuestion(q, index)}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                    <button
                        onClick={() => handleSubmit(true)}
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-200 rounded-xl transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="w-4 h-4" />
                        Save as Draft
                    </button>
                    <button
                        onClick={() => handleSubmit(false)}
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white rounded-xl transition-all duration-200 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="w-4 h-4" />
                        {isSubmitting ? "Publishing..." : "Publish Exam"}
                    </button>
                </div>
            </div>

            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 border border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                                <AlertCircle className="w-6 h-6 text-red-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Delete Question?</h3>
                        </div>
                        <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                            Are you sure you want to delete Question{" "}
                            <span className="text-white font-semibold">
                                {questionToDelete !== null ? questionToDelete + 1 : ""}
                            </span>
                            ? This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setQuestionToDelete(null);
                                }}
                                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 rounded-lg transition-all font-medium text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={removeQuestion}
                                className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white rounded-lg transition-all font-semibold text-sm shadow-lg shadow-red-500/25"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
