import { Violation } from "../models/violation.model.js";
import { Exam } from "../models/exam.model.js";
import { ExamSubmission } from "../models/examSubmission.model.js";

export async function buildMonitoringSnapshot(examId) {
    if (!examId) return { violations: [] };

    const exam = await Exam.findById(examId)
        .select("students")
        .populate("students", "name rollNumber collegeId batch")
        .lean();

    if (!exam) {
        return { violations: [] };
    }

    const violations = await Violation.find({ examId })
        .populate("studentId", "name rollNumber collegeId batch")
        .lean();

    const submissions = await ExamSubmission.find({ examId }).select("studentId").lean();
    const submittedSet = new Set(submissions.map((s) => s.studentId.toString()));

    const violationsMap = {};
    violations.forEach((v) => {
        const studentId = v.studentId?._id?.toString();
        if (studentId) {
            violationsMap[studentId] = v;
        }
    });

    const formatted = exam.students.map((student) => {
        const studentIdStr = student._id.toString();
        const violation = violationsMap[studentIdStr];

        return {
            studentId: studentIdStr,
            studentDetails: {
                name: student.name,
                rollNumber: student.rollNumber,
                collegeId: student.collegeId,
                batch: student.batch,
            },
            violations: violation?.violations || [],
            status: violation?.status || (submittedSet.has(studentIdStr) ? "submitted" : "active"),
        };
    });

    return { violations: formatted };
}

export async function emitMonitoringSnapshot(io, examId, socket = null) {
    const payload = await buildMonitoringSnapshot(examId);

    if (socket) {
        socket.emit("violations-history", { violations: payload.violations });
    } else {
        io.to(`exam_${examId}`).emit("violations-history", { violations: payload.violations });
    }
}
