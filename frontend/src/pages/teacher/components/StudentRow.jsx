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
            color: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
            label: "Evaluated",
            dot: "bg-emerald-400",
        }
        : isAutoEvaluated
            ? {
                color: "bg-violet-500/15 text-violet-300 border border-violet-500/30",
                label: "Auto evaluated",
                dot: "bg-violet-400",
            }
            : isQueued
                ? {
                    color: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
                    label: "Auto Evaluating",
                    dot: "bg-sky-400",
                }
                : {
                    color: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
                    label: "Pending",
                    dot: "bg-amber-400",
                };

    const getGradeColor = (percent) => {
        if (percent >= 90) return "text-emerald-400";
        if (percent >= 75) return "text-sky-300";
        if (percent >= 60) return "text-amber-400";
        return "text-red-400";
    };

    return (
        <tr className="hover:bg-white/[0.03] transition-colors duration-150">
            <td className="px-3 py-3">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/[0.05] border border-white/10 text-xs font-semibold text-gray-300">
                    {index + 1}
                </span>
            </td>

            <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-white" />
                    </div>
                    <p className="font-semibold text-sm text-white truncate">
                        {student.name}
                    </p>
                </div>
            </td>

            <td className="px-3 py-3">
                <p className="text-sm font-semibold text-gray-200">
                    {student.rollNumber}
                </p>
            </td>

            <td className="px-3 py-3">
                <p className="text-xs font-mono text-gray-300 bg-white/[0.05] border border-white/10 px-2 py-1 rounded inline-block">
                    {student.collegeId}
                </p>
            </td>

            <td className="px-3 py-3">
                <p className="text-sm font-medium text-gray-200">
                    {student.batch}
                </p>
            </td>

            <td className="px-3 py-3">
                <div className="flex flex-col gap-0.5">
                    <p className={`text-sm font-bold ${getGradeColor(percentage)}`}>
                        {totalScore}/{totalMarks}
                    </p>
                    <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                    percentage >= 90 ? "bg-emerald-500"
                                        : percentage >= 75 ? "bg-sky-500"
                                            : percentage >= 60 ? "bg-amber-500"
                                                : "bg-red-500"
                                }`}
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                        <span className="text-xs font-semibold text-gray-400">
                            {percentage}%
                        </span>
                    </div>
                </div>
            </td>

            <td className="px-3 py-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot} ${!isGraded ? "animate-pulse" : ""}`} />
                    {statusConfig.label}
                </span>
            </td>

            <td className="px-4 py-3 text-center">
                {isGraded ? (
                    <button
                        onClick={() => onEvaluate(student._id, student)}
                        className="inline-flex items-center justify-center gap-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-all"
                    >
                        Review
                        <ChevronRight className="w-4 h-4" />
                    </button>
                ) : isQueued ? (
                    <button
                        type="button"
                        disabled
                        title="Auto evaluation is in progress for this paper"
                        className="inline-flex items-center justify-center gap-1.5 bg-sky-500/10 text-sky-300 border border-sky-500/30 text-sm font-medium px-3 py-1.5 rounded-lg cursor-not-allowed"
                    >
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Evaluating
                    </button>
                ) : (
                    <button
                        onClick={() => onEvaluate(student._id, student)}
                        className="inline-flex items-center justify-center gap-1 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-all"
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
        <thead className="bg-white/[0.03] border-b border-white/10">
            <tr>
                {["#", "Student", "Roll No", "College ID", "Batch", "Marks", "Status", "Action"].map((label, i) => (
                    <th
                        key={label}
                        className={`px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide ${i === 7 ? "text-center" : "text-left"}`}
                    >
                        {label}
                    </th>
                ))}
            </tr>
        </thead>
    );
}

export default StudentRow;
