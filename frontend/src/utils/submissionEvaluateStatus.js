/** Matches `evaluateStatus` on ExamSubmission (`backend/models/examSubmission.model.js`). */

export const SUBMISSION_EVAL_STATUS = {
    PENDING: "Pending",
    AUTO_EVALUATED: "AutoEvaluated",
    EVALUATED: "Evaluated",
};

export function isSubmissionGraded(status) {
    return (
        status === SUBMISSION_EVAL_STATUS.EVALUATED ||
        status === SUBMISSION_EVAL_STATUS.AUTO_EVALUATED
    );
}

export function getSubmissionStatusLabel(status) {
    switch (status) {
        case SUBMISSION_EVAL_STATUS.EVALUATED:
            return "Evaluated";
        case SUBMISSION_EVAL_STATUS.AUTO_EVALUATED:
            return "Auto evaluated";
        default:
            return "Pending";
    }
}
