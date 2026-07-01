import {
    startAutoEvaluation as startAutoEvaluationService,
    getAutoEvaluationStatus as getAutoEvaluationStatusService,
} from "../services/autoEvaluation/autoEvaluation.service.js";
import {Exam} from "../models/exam.model.js";

const startAutoEvaluation = async (req, res) => {
    try {
        const result = await startAutoEvaluationService(req.params.examId, req.user._id);
        return res.status(202).json(result);
    } catch (error) {
        console.error("Error in startAutoEvaluation:", error);
        return res.status(error.statusCode || 500).json({ message: error.message || "Could not start auto evaluation" });
    }
};

const getAutoEvaluationStatus = async (req, res) => {
    try {
        const status = await getAutoEvaluationStatusService(req.params.examId, req.user._id);
        return res.status(200).json(status);
    } catch (error) {
        console.error("Error in getAutoEvaluationStatus:", error);
        return res.status(error.statusCode || 500).json({ message: error.message || "Something went wrong" });
    }
};

const pauseAutoEvaluation = async (req, res) => {
    try {
        const { examId } = req.params;

        const exam = await Exam.findById(examId);

        if (!exam) {
            return res.status(404).json({
                success: false,
                message: "Exam not found"
            });
        }

        if (exam.evaluationStatus !== "in_progress") {
            return res.status(400).json({
                success: false,
                message: "Evaluation is not currently running."
            });
        }

        exam.evaluationStatus = "paused";
        exam.autoEvalProgress = exam.autoEvalProgress || {};
        exam.autoEvalProgress.pauseReason = "Paused by teacher";

        await exam.save();

        return res.status(200).json({
            success: true,
            message: "Evaluation paused successfully.",
            reason: exam.autoEvalProgress.pauseReason
        });
    }catch (error){
        console.error("Error in pausing auto evaluation: ", error);
        return res.status(500).json({ message: "Could not pause auto evaluation" });
    }
}


export { startAutoEvaluation, getAutoEvaluationStatus, pauseAutoEvaluation };
