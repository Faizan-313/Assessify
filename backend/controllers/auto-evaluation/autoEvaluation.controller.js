import mongoose from "mongoose";
import { Exam } from "../../models/exam.model.js";
import { QuestionPaper } from "../../models/questions.model.js";
import runAutoEvaluationJob from "./evaluation/runEvaluation.js";

const startAutoEvaluation = async (req, res) => {
    const { examId } = req.params;

    try {
        if (!examId || !mongoose.isValidObjectId(examId)) {
            return res.status(400).json({ message: "A valid exam ID is required" });
        }

        const claimed = await Exam.findOneAndUpdate(
            {
                _id: examId,
                createdBy: req.user._id,
                evaluationStatus: {
                    $nin: ["in_progress", "completed", "manually_evaluated"]
                }
            },
            {
                $set: {
                    evaluationStatus: "in_progress"
                }
            },
            {
                new: true
            }
        );

        if (!claimed) {
            return res.status(409).json({
                message: "Exam cannot be auto evaluated because either exam does not exist or its evaluation status is either in_progress, completed or manually_evaluated."
            });
        }

        const questionPaper = await QuestionPaper.findOne({ examId }).lean();
        if (!questionPaper) {
            return res.status(404).json({ message: "Question paper not found" });
        }

        // Fire-and-forget the heavy job. 
        // TODO: move this to a real worker / queue so jobs survive restarts.
        setImmediate(() => {
            runAutoEvaluationJob({ examId, questionPaper }).catch((err) => {
                console.error("Unhandled error in auto evaluation job:", err);
            });
        });

        return res.status(202).json({
            message: "Auto evaluation started",
            evaluationStatus: "in_progress",
        });
    } catch (error) {
        console.error("Error in startAutoEvaluation:", error);
        return res.status(500).json({ message: "Could not start auto evaluation" });
    }
};


const getAutoEvaluationStatus = async (req, res) => {
    try {
        const { examId } = req.params;

        if (!examId || !mongoose.isValidObjectId(examId)) {
            return res.status(400).json({ message: "A valid exam ID is required" });
        }

        const exam = await Exam.findById(examId).select("createdBy evaluationStatus").lean();
        if (!exam) {
            return res.status(404).json({ message: "Exam not found" });
        }

        if (String(exam.createdBy) !== String(req.user._id)) {
            return res.status(403).json({ message: "Forbidden" });
        }

        return res.status(200).json({ evaluationStatus: exam.evaluationStatus });
    } catch (error) {
        console.error("Error in getAutoEvaluationStatus:", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};


export { 
    startAutoEvaluation, 
    getAutoEvaluationStatus 
};
