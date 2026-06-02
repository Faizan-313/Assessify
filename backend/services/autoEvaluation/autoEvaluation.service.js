import mongoose from "mongoose";
import { Exam } from "../../models/exam.model.js";
import { QuestionPaper } from "../../models/questions.model.js";
import runAutoEvaluationJob from "./evaluation/runEvaluation.js";

async function startAutoEvaluation(examId, userId) {
    if (!examId || !mongoose.isValidObjectId(examId)) {
        const error = new Error("A valid exam ID is required");
        error.statusCode = 400;
        throw error;
    }

    const claimed = await Exam.findOneAndUpdate(
        {
            _id: examId,
            createdBy: userId,
            evaluationStatus: {
                $nin: ["in_progress", "completed", "manually_evaluated"],
            },
        },
        {
            $set: {
                evaluationStatus: "in_progress",
            },
        },
        {
            new: true,
        }
    );

    if (!claimed) {
        const error = new Error(
            "Exam cannot be auto evaluated because either the exam does not exist or its evaluation status is in_progress, completed, or manually_evaluated."
        );
        error.statusCode = 409;
        throw error;
    }

    const questionPaper = await QuestionPaper.findOne({ examId }).lean();
    if (!questionPaper) {
        const error = new Error("Question paper not found");
        error.statusCode = 404;
        throw error;
    }

    setImmediate(() => {
        runAutoEvaluationJob({ examId, questionPaper }).catch((err) => {
            console.error("Unhandled error in auto evaluation job:", err);
        });
    });

    return {
        message: "Auto evaluation started",
        evaluationStatus: "in_progress",
        exam: claimed,
    };
}

async function getAutoEvaluationStatus(examId, userId) {
    if (!examId || !mongoose.isValidObjectId(examId)) {
        const error = new Error("A valid exam ID is required");
        error.statusCode = 400;
        throw error;
    }

    const exam = await Exam.findById(examId).select("createdBy evaluationStatus").lean();
    if (!exam) {
        const error = new Error("Exam not found");
        error.statusCode = 404;
        throw error;
    }

    if (String(exam.createdBy) !== String(userId)) {
        const error = new Error("Forbidden");
        error.statusCode = 403;
        throw error;
    }

    return {
        evaluationStatus: exam.evaluationStatus,
    };
}

export { startAutoEvaluation, getAutoEvaluationStatus };
