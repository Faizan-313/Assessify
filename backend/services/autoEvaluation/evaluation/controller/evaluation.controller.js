import { GEMINI_GRADER_MODEL } from "../../constants.js";
import evaluateWithGemini from "../gemini/gemini.evaluation.js";
import evaluateWithLocal from "../local/local.evaluation.js";

function shouldUseGeminiEvaluator() {
    return process.env.NODE_ENV === "production";
}

async function evaluateAnswer({ question, answerText, answerLanguage, kind }) {
    try {
        if (shouldUseGeminiEvaluator()) {
            return await evaluateWithGemini({ question, answerText, answerLanguage, kind });
        }

        return await evaluateWithLocal({ question, answerText, answerLanguage, kind });
    } catch (error) {
        const status = error?.status || error?.response?.status;
        if (status === 404) {
            console.error(`evaluateAnswer: model "${GEMINI_GRADER_MODEL}" or evaluation endpoint was not found.`);
        } else if (status === 429) {
            console.error("evaluateAnswer: quota/rate limit (429) persists after retries.");
        }

        console.error("Error in evaluateAnswer function:", error);
        return { status: "error", marksObtained: 0 };
    }
}

export default evaluateAnswer;
