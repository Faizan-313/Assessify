import {
    Calendar, Clock, Award, X, Copy, Check,
} from "lucide-react";
import getExamStatusHelper from "../utils/examStatusHelper.js";


function ExamDetailsModal({ exam, onClose, copiedCode, onCopyCode }) {
    const status = getExamStatusHelper(exam.startTime, exam.endTime);

    return (
        <div
            className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-gradient-to-r from-[#5c8374] to-[#092635] dark:from-[#5c8374] dark:to-[#092635] p-6 text-white sticky top-0">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                                    {status.label}
                                </span>
                                <button
                                    onClick={onCopyCode}
                                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-all text-sm"
                                >
                                    {copiedCode === exam.examCode ? (
                                        <>
                                            <Check size={14} />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={14} />
                                            {exam.examCode}
                                        </>
                                    )}
                                </button>
                            </div>
                            <h2 className="text-2xl font-bold">{exam.title}</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-all flex-shrink-0"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    <div>
                        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-3 tracking-wide">
                            Description
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            {exam.description || "No description provided"}
                        </p>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-4 tracking-wide">
                            Exam Details
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#9ec8b9] dark:bg-[#092635]/20 rounded-xl p-5 border border-[#9ec8b9] dark:border-[#092635]">
                                <div className="flex items-center gap-2 text-[#1b4242] dark:text-[#5c8374] mb-3">
                                    <Clock size={18} />
                                    <span className="text-sm font-semibold">Duration</span>
                                </div>
                                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                                    {exam.duration}
                                    <span className="text-lg font-normal text-gray-600 dark:text-gray-400 ml-2">
                                        minutes
                                    </span>
                                </p>
                            </div>

                            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-5 border border-green-200 dark:border-green-800">
                                <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-3">
                                    <Award size={18} />
                                    <span className="text-sm font-semibold">Total Marks</span>
                                </div>
                                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                                    {exam.totalMarks}
                                    <span className="text-lg font-normal text-gray-600 dark:text-gray-400 ml-2">
                                        marks
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-4 tracking-wide">
                            Questions ({exam.questions?.length || 0})
                        </h3>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {exam.questions && exam.questions.length > 0 ? (
                                exam.questions.map((q, idx) => (
                                    <div
                                        key={q._id || idx}
                                        className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-[#5c8374] dark:hover:border-[#5c8374] transition"
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                                                Q{idx + 1}. <span className="text-[#092635] dark:text-[#9ec8b9]">{q.questionText}</span>
                                            </p>
                                            <span className="px-2.5 py-1 bg-[#f0f8f7] dark:bg-[#5c8374]/30 text-[#5c8374] dark:text-[#9ec8b9] text-xs font-semibold rounded-full whitespace-nowrap flex-shrink-0">
                                                {q.marks} marks
                                            </span>
                                        </div>
                                        {q.image && <img className="h-[50%] w-[50%]" rel="question image" aria-label="question image" src={q.image}></img>}

                                        {q.type === "mcq" && q.options && (
                                            <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-gray-700 dark:text-gray-400 text-sm">
                                                {q.options.map((opt, i) => (
                                                    <li key={i}>{opt}</li>
                                                ))}
                                            </ul>
                                        )}

                                        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded">
                                                {q.type.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                                    No questions added yet
                                </p>
                            )}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-4 tracking-wide">
                            Schedule
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-start gap-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-5 border border-gray-200 dark:border-gray-600">
                                <Calendar className="text-[#5c8374] dark:text-[#9ec8b9] mt-1 flex-shrink-0" size={20} />
                                <div>
                                    <p className="font-semibold text-gray-800 dark:text-gray-100 mb-2">Start Time</p>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        {new Date(exam.startTime).toLocaleString("en-US", {
                                            weekday: "long",
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit"
                                        })}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-5 border border-gray-200 dark:border-gray-600">
                                <Calendar className="text-[#1b4242] dark:text-[#5c8374] mt-1 flex-shrink-0" size={20} />
                                <div>
                                    <p className="font-semibold text-gray-800 dark:text-gray-100 mb-2">End Time</p>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        {new Date(exam.endTime).toLocaleString("en-US", {
                                            weekday: "long",
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit"
                                        })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-3 tracking-wide">
                            Additional Information
                        </h3>
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-5 border border-gray-200 dark:border-gray-600 space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Created On</span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {new Date(exam.createdAt).toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric"
                                    })}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Branch</span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {exam.branch || "N/A"}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Semester</span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {exam.semester || "N/A"}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Session</span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {exam.session || "N/A"}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Exam Code</span>
                                <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                                    {exam.examCode}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


export default ExamDetailsModal;