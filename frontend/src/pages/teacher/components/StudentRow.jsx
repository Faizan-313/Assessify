import {
    User, ChevronRight, Loader2
} from "lucide-react";
import {
    isSubmissionGraded,
    SUBMISSION_EVAL_STATUS,
} from "../../../utils/submissionEvaluateStatus";

function StudentRow({ student, onEvaluate, index, autoEvaluating = false }) {
    const evaluationStatus = student.examsAttempted[0].evaluateStatus;
    const totalScore = student.examsAttempted[0].totalScore;
    const totalMarks = student.examsAttempted[0].examId.totalMarks;
    const percentage = ((totalScore / totalMarks) * 100).toFixed(1);

    const isGraded = isSubmissionGraded(evaluationStatus);
    const isPending = !isGraded;
    const isQueued = autoEvaluating && isPending;
    const isManualEvaluated = evaluationStatus === SUBMISSION_EVAL_STATUS.EVALUATED;
    const isAutoEvaluated = evaluationStatus === SUBMISSION_EVAL_STATUS.AUTO_EVALUATED;

    const statusConfig = isManualEvaluated
        ? {
            color: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800",
            label: "Evaluated",
            dot: "bg-emerald-500",
        }
        : isAutoEvaluated
            ? {
                color: "bg-violet-50 dark:bg-violet-900/20 text-violet-800 dark:text-violet-300 border border-violet-200 dark:border-violet-800",
                label: "Auto evaluated",
                dot: "bg-violet-500",
            }
        : isQueued
            ? {
                color: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800",
                label: "Auto Evaluating",
                dot: "bg-indigo-500"
            }
            : {
                color: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
                label: "Pending",
                dot: "bg-amber-500",
            };

    const dotPulse = !isGraded;

    // Grade calculation with visual feedback
    const getGradeColor = (percent) => {
        if (percent >= 90) return "text-emerald-600 dark:text-emerald-400";
        if (percent >= 75) return "text-[#1b4242] dark:text-[#5c8374]";
        if (percent >= 60) return "text-amber-600 dark:text-amber-400";
        return "text-red-600 dark:text-red-400";
    };

    return (
        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150">
            <td className="px-3 py-3">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {index + 1}
                </span>
            </td>

            <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5c8374] to-[#1b4242] flex items-center justify-center flex-shrink-0 shadow-md">
                        <User className="w-4 h-4 text-white" />
                    </div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {student.name}
                    </p>
                </div>
            </td>

            <td className="px-3 py-3">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {student.rollNumber}
                </p>
            </td>

            <td className="px-3 py-3">
                <p className="text-xs font-mono text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded inline-block">
                    {student.collegeId}
                </p>
            </td>

            <td className="px-3 py-3">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {student.batch}
                </p>
            </td>

            <td className="px-3 py-3">
                <div className="flex flex-col gap-0.5">
                    <p className={`text-sm font-bold ${getGradeColor(percentage)}`}>
                        {totalScore}/{totalMarks}
                    </p>
                    <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-300 ${percentage >= 90 ? "bg-emerald-500" :
                                        percentage >= 75 ? "bg-[#5c8374]" :
                                            percentage >= 60 ? "bg-amber-500" :
                                                "bg-red-500"
                                    }`}
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                            {percentage}%
                        </span>
                    </div>
                </div>
            </td>

            <td className="px-3 py-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot} ${dotPulse ? "animate-pulse" : ""}`}></span>
                    {statusConfig.label}
                </span>
            </td>

            <td className="px-4 py-3 text-center">
                {isGraded ? (
                    <button
                        onClick={() => onEvaluate(student._id, student)}
                        className="inline-flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-all focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                    >
                        Review
                        <ChevronRight className="w-4 h-4" />
                    </button>
                ) : isQueued ? (
                    <button
                        type="button"
                        disabled
                        title="Auto evaluation is in progress for this paper"
                        className="inline-flex items-center justify-center gap-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-sm font-medium px-3 py-1.5 rounded-lg cursor-not-allowed"
                    >
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Evaluating
                    </button>
                ) : (
                    <button
                        onClick={() => onEvaluate(student._id, student)}
                        className="inline-flex items-center justify-center gap-1 bg-[#5c8374] hover:bg-[#1b4242] text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-all focus:ring-2 focus:ring-[#9ec8b9] focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                    >
                        Evaluate
                        <ChevronRight className="w-4 h-4" />
                    </button>
                )}
            </td>

        </tr>
    );
}

export function StudentTableHeader() {
    return (
        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
            <tr>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    #
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Student
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Roll No
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    College ID
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Batch
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Marks
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Status
                </th>
                <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Action
                </th>
            </tr>
        </thead>
    );
}

export default StudentRow;