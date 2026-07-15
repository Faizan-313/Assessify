import { GEMINI_GRADER_MODEL } from "../../constants.js";
import { evaluateDiagramAnswer as evaluateWithGemini } from "../gemini/diagram.gemini.evaluation.js";
import evaluateDiagramWithLocal from "../local/diagram.local.evaluation.js";

function shouldUseGeminiEvaluator() {
    return process.env.NODE_ENV === "production";
}

async function evaluateDiagramAnswer({ question, answerDiagram }) {
    try {
        if (shouldUseGeminiEvaluator()) {
            return await evaluateWithGemini({ question, answerDiagram });
        }
        return await evaluateDiagramWithLocal({ question, answerDiagram });
    } catch (error) {
        const status = error?.status || error?.response?.status;
        if (status === 404) {
            console.error(`evaluateDiagramAnswer: model "${GEMINI_GRADER_MODEL}" or diagram endpoint was not found.`);
        } else if (status === 429) {
            console.error("evaluateDiagramAnswer: quota/rate limit (429) persists after retries.");
        }
        console.error("Error in evaluateDiagramAnswer:", error);
        return { status: "error", marksObtained: 0 };
    }
}

export default evaluateDiagramAnswer;
