/**
 * Normalizes branch / semester / session on exams and related API payloads.
 */

export function sanitizeExamMetadata(fields = {}) {
    return {
        branch: String(fields.branch ?? "").trim(),
        semester: String(fields.semester ?? "").trim(),
        session: String(fields.session ?? "").trim(),
    };
}

export function assertExamMetadataPresent(meta) {
    const missing = [];
    if (!meta.branch) missing.push("branch");
    if (!meta.semester) missing.push("semester");
    if (!meta.session) missing.push("session");
    if (missing.length === 0) return null;
    return `Missing required exam fields: ${missing.join(", ")}`;
}

/** Fields exposed to students and teachers (validate-code, dashboard, get exam). */
export function pickExamPublicFields(exam) {
    if (!exam) return null;
    const meta = sanitizeExamMetadata(exam);
    return {
        _id: exam._id,
        title: exam.title,
        examCode: exam.examCode,
        description: exam.description ?? "",
        branch: meta.branch,
        semester: meta.semester,
        session: meta.session,
        duration: exam.duration,
        totalMarks: exam.totalMarks,
        startTime: exam.startTime,
        endTime: exam.endTime,
        createdAt: exam.createdAt,
    };
}

export function pickStudentPublicFields(student) {
    if (!student) return null;
    return {
        _id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        collegeId: student.collegeId,
        batch: student.batch,
    };
}
