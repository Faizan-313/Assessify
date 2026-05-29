import { GoogleGenerativeAI } from "@google/generative-ai";
import {
    parseRetryDelayMsFromGeminiError,
    generateContentWithRetries
} from "../helpers/retries.js";
import {
    GEMINI_GRADER_MODEL,
    GEMINI_MAX_RPM,
    GEMINI_RPM_MIN_INTERVAL_MS,
    GEMINI_REQUEST_DELAY_MS
} from "../constants.js";
import buildTextGradingMessages from "./utils/textGradingMessage.js";
import buildCodeGradingMessages from "./utils/codeGradingMessage.js";
import clampMarks from "../helpers/clampMarks.js"


let geminiAi = null;

function getGeminiAi() {
    if (geminiAi) return geminiAi;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured");
    }
    geminiAi = new GoogleGenerativeAI(apiKey);
    return geminiAi;
}

async function evaluateWithAi({ question, answerText, kind }) {
    const maxMarks = Number(question?.marks) || 0;

    // empty answers — no need to call model.
    if (!answerText || String(answerText).trim().length === 0) {
        return {
            status: "done",
            marksObtained: 0,
            feedback: "No answer was submitted; 0 marks awarded.",
        };
    }

    try {
        const genAI = getGeminiAi();

        let messages;
        if (kind === "text") {
            messages = buildTextGradingMessages(question, answerText);
        } else if (kind === "code") {
            messages = buildCodeGradingMessages(question, answerText);
        } else {
            // Unsupported kind for AI grading — caller will treat this as manual review.
            return { status: "error", marksObtained: 0 };
        }

        const systemInstruction = messages[0]?.content ?? "";
        const userPrompt = messages[1]?.content ?? "";

        const model = genAI.getGenerativeModel({
            model: GEMINI_GRADER_MODEL,
            systemInstruction,
            generationConfig: {
                temperature: 0,
                responseMimeType: "application/json",
            },
        });

        const response = await generateContentWithRetries(() =>
            model.generateContent(userPrompt)
        );
        const raw = response?.response?.text() ?? "";
        const qid = question?._id != null ? String(question._id) : "?";

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (parseErr) {
            console.error(
                `[auto-eval] questionId=${qid} kind=${kind} parse error; raw text:`,
                raw.length > 6000 ? `${raw.slice(0, 6000)}… [truncated]` : raw,
                parseErr
            );
            return { status: "error", marksObtained: 0 };
        }

        // Handle both 'marksObtained' and 'marks_awarded' field names from AI
        const marksObtained = clampMarks(parsed?.marksObtained ?? parsed?.marks_awarded, maxMarks);
        const feedbackRaw =
            typeof parsed?.feedback === "string"
                ? parsed.feedback
                : typeof parsed?.comment === "string"
                    ? parsed.comment
                    : typeof parsed?.rationale === "string"
                        ? parsed.rationale
                        : "";
        const feedback = feedbackRaw.trim() || "(Model returned no feedback text.)";

        const rawForLog = raw.length > 8000 ? `${raw.slice(0, 8000)}… [truncated ${raw.length} chars]` : raw;

        // console.log(`[auto-eval] questionId=${qid} model raw JSON:`, rawForLog);

        return { status: "done", marksObtained, feedback };
    } catch (error) {
        const status = error?.status;
        if (status === 404) {
            console.error(`evaluateWithAi: model "${GEMINI_GRADER_MODEL}" is not available for this API key (404). `);
        } else if (status === 429) {
            console.error("evaluateWithAi: quota/rate limit (429) persists after retries. ");
        }
        console.error("Error in evaluateWithAi function:", error);
        return { status: "error", marksObtained: 0 };
    }
}

export default evaluateWithAi;