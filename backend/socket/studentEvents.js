import { Violation } from "../models/violation.model.js";
import { ExamSubmission } from "../models/examSubmission.model.js";

async function isStudentExamFinished(examId, studentId) {
    if (!examId || !studentId) return false;
    const submitted = await ExamSubmission.exists({ examId, studentId });
    if (submitted) return true;
    const doc = await Violation.findOne({ examId, studentId }).select("status").lean();
    return doc?.status === "submitted";
}

export default function registerStudentEvents(io, socket) {
    // Handle student joining exam
    socket.on("student-joined", async (payload) => {
        try {
            const { examId, studentId, studentDetails } = payload;

            if (!examId || !studentId || !studentDetails) {
                console.warn("Invalid student-joined payload:", payload);
                return;
            }

            // Broadcast to teachers monitoring this exam
            const broadcastData = {
                examId,
                studentId,
                studentDetails,
                joinedAt: new Date().toISOString()
            };
            
            io.to(`exam_${examId}`).emit("student-joined", broadcastData);
            

        } catch (err) {
            console.error("Error handling student join:", err);
        }
    });

    // Handle new violations
    socket.on("new-violation", async (payload) => {
        try {
            if (!payload || typeof payload !== "object") {
                console.warn("Invalid new-violation payload:", payload);
                return;
            }
            const {
                examId,
                studentId,
                violation,
                studentDetails: rawStudentDetails,
            } = payload;

            const studentDetails = rawStudentDetails
                ? {
                      name: rawStudentDetails.name,
                      rollNumber: rawStudentDetails.rollNumber,
                      collegeId: rawStudentDetails.collegeId,
                      batch: rawStudentDetails.batch,
                  }
                : undefined;

            const clientSaysSubmitted = payload.isSubmitted === true;

            if (clientSaysSubmitted) {
                return;
            }

            if (await isStudentExamFinished(examId, studentId)) {
                return;
            }

            if (!studentId || !examId || !violation?.type || !studentDetails) {
                console.warn("Invalid violation payload:", payload);
                return;
            }

            const violationDoc = await Violation.findOneAndUpdate(
                { studentId, examId },
                { 
                    $push: { violations: violation },
                    $set: { 
                        studentDetails,
                        lastViolationAt: new Date()
                    }
                },
                { new: true, upsert: true }
            );

            // Broadcast to teachers monitoring this exam
            const broadcastData = {
                examId,
                studentId,
                violation,
                studentDetails,
                timestamp: new Date().toISOString()
            };
            
            io.to(`exam_${examId}`).emit("new-violation", broadcastData);
            

        } catch (err) {
            console.error("Error saving violation:", err);
        }
    });

    // Handle student heartbeat (for monitoring)
    socket.on("studentHeartbeat", (payload) => {
        const { examId, studentId, timeLeft } = payload;
        
        // Broadcast heartbeat to teachers (silent, no logs to avoid spam)
        io.to(`exam_${examId}`).emit("student-heartbeat", {
            studentId,
            timeLeft,
            timestamp: new Date().toISOString()
        });
    });

    // Handle student submission
    socket.on("student-submitted", async (payload) => {
        try {
            const { examId, studentId } = payload;

            if (!examId || !studentId) {
                console.warn("Invalid student-submitted payload:", payload);
                return;
            }
            
            //if violation exists, update status to submitted; if not, create a minimal violation doc
            await Violation.findOneAndUpdate(
                { examId, studentId },
                { $set: { status: "submitted" }, $setOnInsert: { violations: [] } },
                { new: true, upsert: true }
            );



            // Broadcast to teachers
            const broadcastData = {
                examId,
                studentId,
                submittedAt: new Date().toISOString()
            };
            
            io.to(`exam_${examId}`).emit("student-submitted", broadcastData);
            
        } catch (err) {
            console.error("Error handling student submission:", err);
        }
    });
}