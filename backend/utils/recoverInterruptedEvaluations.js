import { Exam } from "../models/exam.model.js";

async function recoverInterruptedEvaluations() {
    await Exam.updateMany(
        { evaluationStatus: "in_progress" },
        {
            $set: {
                evaluationStatus: "paused",
                "autoEvalProgress.pauseReason": "Paused due to server problem"
            }
        }
    );
}

export default recoverInterruptedEvaluations;