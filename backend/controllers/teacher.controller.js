import { Exam } from "../models/exam.model.js";
import { ExamSubmission } from "../models/examSubmission.model.js";
import { QuestionPaper } from "../models/questions.model.js";
import { Student } from "../models/student.model.js";
import { Violation } from "../models/violation.model.js";
import { pickExamPublicFields } from "../utils/examMetadata.js";
import { streamStudentPaperPdf } from "../services/pdf/downloadStudentPaper.service.js";


const dashboardData = async (req, res) => {
    try {
        const id = req.user._id;
        const exams = await Exam.find({ createdBy: id })
            .populate({
                path: "questionPaper",
                select: "questions",
            })
            .sort({ createdAt: -1 })
            .lean();

        if (!exams || exams.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No exams created yet",
                exams: [],
            });
        }
        
        // Format response without additional queries
        const formattedExams = exams.map((exam) => ({
            ...pickExamPublicFields(exam),
            questions: exam.questionPaper?.questions || [],
            evaluationStatus: exam.evaluationStatus,
            createdAt: exam.createdAt,
        }));

        return res.status(200).json({
            success: true,
            exams: formattedExams,
        });
    } catch (error) {
        console.log("Error in dashboard: ", error)
        return res.status(500).json({ message: "Something went wrong" });
    }
}

const studentList = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 30);
        const search = req.query.searchQuery || req.query.search || "";
        const { examId } = req.query;

        if (!examId) {
            return res.status(400).json({ message: "Exam ID is required." });
        }

        const skip = (page - 1) * limit;

        // Base query for the submissions
        const submissionQuery = { examId };

        //If searching, find matching student IDs first
        if (search) {
            const matchingStudents = await Student.find({
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { rollNumber: { $regex: search, $options: "i" } }
                ]
            })
            .select("_id")
            .lean();

            const matchingStudentIds = matchingStudents.map(student => student._id);

            // If a search was entered but no students match, return early
            if (matchingStudentIds.length === 0) {
                return res.status(200).json({
                    message: "No students match your search.",
                    students: [],
                    total: 0,
                    pages: 0,
                    currentPage: page,
                });
            }

            // Append the matched IDs to our submission query
            submissionQuery.studentId = { $in: matchingStudentIds };
        }

        //Fetch count and actual submissions in parallel for speed
        const [total, submissions] = await Promise.all([
            ExamSubmission.countDocuments(submissionQuery),
            ExamSubmission.find(submissionQuery)
                .populate({
                    path: "studentId",
                    select: "name rollNumber collegeId batch _id"
                })
                .populate({
                    path: "examId",
                    select: "totalMarks",
                })
                .skip(skip)
                .limit(limit)
                .lean()
        ]);

        if (submissions.length === 0 && !search) {
            return res.status(200).json({
                message: "No students have attempted this exam yet.",
                students: [],
                total: 0,
                pages: 0,
                currentPage: page,
            });
        }

        // Format response exactly as your frontend expects
        const formattedStudents = submissions.map(sub => {
            // Safety check in case student data was deleted from DB but submission remains
            const studentData = sub.studentId || {}; 
            
            return {
                ...studentData,
                _id: studentData._id || null,
                attemptId: sub._id,
                submittedAt: sub.submittedAt,
                evaluateStatus: sub.evaluateStatus,
                totalScore: sub.totalScore,
                totalMarks: sub.examId?.totalMarks || 0,
                examsAttempted: [{
                    evaluateStatus: sub.evaluateStatus,
                    totalScore: sub.totalScore,
                    examId: {
                        totalMarks: sub.examId?.totalMarks || 0,
                    }
                }]
            };
        });

        return res.status(200).json({
            message: "Students and their answer sheets fetched successfully.",
            students: formattedStudents,
            total,
            pages: Math.ceil(total / limit),
            currentPage: page,
        });

    } catch (error) {
        console.error("Error in getting students for evaluation:", error);
        return res.status(500).json({ message: "An error occurred while fetching the student list." });
    }
};


const evaluatePaper = async (req, res) => {
    try {
        const {
            examId,
            studentId,
            totalScore,
            evaluatorComments,
            answers, 
        } = req.body.data || req.body;

        if (!examId || !studentId || totalScore == null || !Array.isArray(answers)) {
            return res.status(400).json({ message: "Invalid data received" });
        }

        const exam = await Exam.findById(examId).select("evaluationStatus createdBy");
        if (!exam) {
            return res.status(404).json({ message: "Exam not found" });
        }

        if (String(exam.createdBy) !== String(req.user._id)) {
            return res.status(403).json({ message: "Not authorized to evaluate this exam" });
        }

        if (exam.evaluationStatus === "in_progress") {
            return res.status(409).json({
                message: "Auto evaluation is currently running. Please wait for it to finish.",
            });
        }

        if (exam.evaluationStatus === "completed") {
            return res.status(400).json({
                message: "Evaluation has been finalized. Marks can no longer be changed.",
            });
        }

        const studentSubmission = await ExamSubmission.findOne({ examId, studentId });
        if (!studentSubmission) {
            return res.status(404).json({ message: "No submission found" });
        }

        // Update answers with evaluated marks
        studentSubmission.answers = studentSubmission.answers.map((ans) => {
            const updated = answers.find(
                (a) => String(a.questionId) === String(ans.questionId)
            );
            if (updated) {
                ans.marksObtained = updated.marksObtained || 0;
            }
            return ans;
        });

        studentSubmission.totalScore = totalScore;
        studentSubmission.evaluatorsComments = evaluatorComments || "";
        studentSubmission.evaluateStatus = "Evaluated";

        await studentSubmission.save();

        return res.status(200).json({
            message: "Evaluation saved successfully",
            updatedSubmission: studentSubmission,
        });
    } catch (error) {
        console.error("Error in storing evaluated paper:", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};


const completeEvaluation = async (req, res) => {
    try {
        const { examId } = req.body || {};

        if (!examId) {
            return res.status(400).json({ message: "Exam ID is required" });
        }

        const exam = await Exam.findById(examId).select("createdBy evaluationStatus");
        if (!exam) {
            return res.status(404).json({ message: "Exam not found" });
        }

        if (String(exam.createdBy) !== String(req.user._id)) {
            return res.status(403).json({ message: "Not authorized to finalize this exam" });
        }

        if (exam.evaluationStatus === "in_progress") {
            return res.status(409).json({
                message: "Auto evaluation is currently running. Please wait for it to finish.",
                evaluationStatus: exam.evaluationStatus,
            });
        }

        if (exam.evaluationStatus === "completed") {
            return res.status(200).json({
                message: "Evaluation is already finalized",
                evaluationStatus: "completed",
            });
        }

        const pendingCount = await ExamSubmission.countDocuments({
            examId,
            evaluateStatus: { $nin: ["Evaluated", "AutoEvaluated"] },
        });

        if (pendingCount > 0) {
            return res.status(400).json({
                message: `${pendingCount} student${pendingCount > 1 ? "s are" : " is"} still pending evaluation`,
                pendingCount,
                evaluationStatus: exam.evaluationStatus,
            });
        }

        // Atomic transition so two concurrent clicks can't both finalize.
        const updated = await Exam.findOneAndUpdate(
            {
                _id: examId,
                createdBy: req.user._id,
                evaluationStatus: { $nin: ["in_progress", "completed"] },
            },
            { $set: { evaluationStatus: "completed" } },
            { new: true }
        ).select("evaluationStatus");

        if (!updated) {
            const latest = await Exam.findById(examId).select("evaluationStatus").lean();
            return res.status(409).json({
                message: "Exam status changed; refresh and try again",
                evaluationStatus: latest?.evaluationStatus,
            });
        }

        return res.status(200).json({
            message: "Evaluation finalized. Results are now locked.",
            evaluationStatus: updated.evaluationStatus,
        });
    } catch (error) {
        console.error("Error finalizing evaluation:", error);
        return res.status(500).json({ message: "Could not finalize evaluation" });
    }
};


const getStudent = async (req, res) => {
    try {
        const studentId = req.query.studentId || req.params.studentId || req.body.studentId;

        if (!studentId) {
            return res.status(400).json({ message: "Student ID is missing" });
        }

        let student = await Student.findById(studentId)
            .populate({
                path: "examsAttempted",
                populate: {
                    path: "examId",
                },
            })
            .lean();

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const violations = await Violation.find({ studentId: student._id }).select("violations");
        student.violations = violations || [];

        return res.status(200).json({ student });
    } catch (error) {
        console.error("Error fetching student:", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};

const downloadStudentPaper = async (req, res) => {
    try {
        await streamStudentPaperPdf({
            examId: req.params.examId,
            studentId: req.params.studentId,
            userId: req.user._id,
        }, res);
    } catch (error) {
        console.error("Error downloading student paper:", error);
        return res.status(error.statusCode || 500).json({
            message: error.message || "Could not download paper",
        });
    }
};

export {
    dashboardData,
    studentList,
    evaluatePaper,
    completeEvaluation,
    getStudent,
    downloadStudentPaper,
}