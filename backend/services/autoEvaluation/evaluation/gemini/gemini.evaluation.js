import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateContentWithRetries } from "../../helpers/retries.js";
import { GEMINI_GRADER_MODEL } from "../../constants.js";
import buildTextGradingMessages from "./utils/textGradingMessage.js";
import buildCodeGradingMessages from "./utils/codeGradingMessage.js";
import clampMarks from "../../helpers/clampMarks.js";

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

async function evaluateWithGemini({ question, answerText, answerLanguage, kind }) {
    const maxMarks = Number(question?.marks) || 0;

    if (!answerText || String(answerText).trim().length === 0) {
        return {
            status: "done",
            marksObtained: 0,
            feedback: "No answer was submitted; 0 marks awarded.",
        };
    }

    let messages;
    if (kind === "text") {
        messages = buildTextGradingMessages(question, answerText);
    } else if (kind === "code") {
        messages = buildCodeGradingMessages(question, answerText, answerLanguage);
    } else {
        return { status: "error", marksObtained: 0 };
    }

    const genAI = getGeminiAi();
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

    const response = await generateContentWithRetries(() => model.generateContent(userPrompt));
    const raw = response?.response?.text() ?? "";
    const qid = question?._id != null ? String(question._id) : "?";

    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (parseErr) {
        console.error(
            `[auto-eval] questionId=${qid} kind=${kind} parse error; raw text:`,
            raw.length > 6000 ? `${raw.slice(0, 6000)}... [truncated]` : raw,
            parseErr
        );
        return { status: "error", marksObtained: 0 };
    }

    const rawMarks = parsed?.marksObtained ?? parsed?.marks_awarded ?? parsed?.marks_obtained;
    const marksObtained = clampMarks(rawMarks, maxMarks);

    const feedbackRaw =
        typeof parsed?.feedback === "string"
            ? parsed.feedback
            : typeof parsed?.comment === "string"
            ? parsed.comment
            : typeof parsed?.rationale === "string"
            ? parsed.rationale
            : "";
    const feedback = feedbackRaw.trim() || "(Model returned no feedback text.)";

    return { status: "done", marksObtained, feedback };
}

export default evaluateWithGemini;
