import { Violation } from "../models/violation.model.js";
import { Exam } from "../models/exam.model.js";
import { ExamSubmission } from "../models/examSubmission.model.js";
import { submitExam } from "../controllers/exams.controller.js";

export default function registerTeacherEvents(io, socket) {
    socket.on("teacher-action", async (payload) => {
        try {
            const { examId, studentId, action, reason } = payload;

            if (!examId || !studentId || !action) {
                console.warn("Invalid teacher action payload:", payload);
                return;
            }

            const status =
                action === "pause"
                    ? "paused"
                    : action === "terminate"
                    ? "terminated"
                    : action === "resume"
                    ? "active"
                    : null;


            //Update student's violation status in DB
            const updated = status && 
                await Violation.findOneAndUpdate(
                    { examId, studentId },
                    { status },
                    { new: true, upsert: false }
                );


            // Fetch the exam to get all enrolled students
            const exam = await Exam.findById(examId)
                .select("students session branch semester")
                .populate("students", "name rollNumber collegeId batch")
                .lean();

            if (!exam) {
                io.to(`exam_${examId}`).emit("violations-history", { violations: [] });
                return;
            }

            // Fetch all violations for this exam
            const violations = await Violation.find({ examId })
                .populate("studentId", "name rollNumber collegeId batch")
                .lean();

            // Fetch all submissions for this exam to detect submitted students
            const submissions = await ExamSubmission.find({ examId }).select("studentId").lean();
            const submittedSet = new Set(submissions.map(s => s.studentId.toString()));

            // Create a map of violations by studentId for quick lookup
            const violationsMap = {};
            violations.forEach(v => {
                violationsMap[v.studentId._id.toString()] = v;
            });

            // Combine: violations + all enrolled students (use submissions to mark submitted state)
            const formatted = exam.students.map(student => {
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

            // Broadcast updated violations to all teachers in the exam room
            io.to(`exam_${examId}`).emit("violations-history", { violations: formatted });

            // emit action to the specific student's room
            io.to(`student_${studentId}`).emit("exam-action", { action, reason });

            // emit confirmation back to teachers in the same exam room
            io.to(`exam_${examId}`).emit("teacher-action-applied", {
                studentId,
                action,
                reason,
            });
        } catch (err) {
            console.error("Error processing teacher action:", err);
        }
    });

    socket.on("fetch-violations", async ({ examId }) => {
        try {
            // Fetch the exam to get all enrolled students
            const exam = await Exam.findById(examId)
                .select("students session branch semester")
                .populate("students", "name rollNumber collegeId batch")
                .lean();

            if (!exam) {
                socket.emit("violations-history", { violations: [] });
                return;
            }

            // Fetch all violations for this exam
            const violations = await Violation.find({ examId })
                .populate("studentId", "name rollNumber collegeId batch")
                .lean();

            // Fetch all submissions for this exam to detect submitted students
            const submissions = await ExamSubmission.find({ examId }).select("studentId").lean();
            const submittedSet = new Set(submissions.map(s => s.studentId.toString()));

            // Create a map of violations by studentId for quick lookup
            const violationsMap = {};
            violations.forEach(v => {
                violationsMap[v.studentId._id.toString()] = v;
            });

            // Combine: violations + all enrolled students (use submissions to mark submitted state)
            const formatted = exam.students.map(student => {
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

            socket.emit("violations-history", { violations: formatted });
        } catch (err) {
            console.error("Error fetching violations history:", err);
        }
    });
}
