import {
    startAutoEvaluation as startAutoEvaluationService,
    getAutoEvaluationStatus as getAutoEvaluationStatusService,
} from "../services/autoEvaluation/autoEvaluation.service.js";

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

export { startAutoEvaluation, getAutoEvaluationStatus };
