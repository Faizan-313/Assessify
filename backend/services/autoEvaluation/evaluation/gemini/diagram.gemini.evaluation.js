import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateContentWithRetries } from "../../helpers/retries.js";
import { GEMINI_GRADER_MODEL } from "../../constants.js";
import buildDiagramGradingMessages from "./utils/diagramGradingMessage.js";
import clampMarks from "../../helpers/clampMarks.js";

let geminiAi = null;

function getGeminiAi() {
    if (geminiAi) return geminiAi;

    const apiKey = process.env.GEMINI_DIAGRAM_EVALUATION_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_DIAGRAM_EVALUATION_KEY is not configured");
    }

    geminiAi = new GoogleGenerativeAI(apiKey);
    return geminiAi;
}

function makeInlineImagePart(base64Data, mimeType = "image/jpeg") {
    return {
        inlineData: {
            data: base64Data,
            mimeType,
        },
    };
}

function dataUrlToInlineImagePart(source) {
    const value = String(source || "").trim();
    if (!value) return null;

    const dataUrlMatch = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
    if (dataUrlMatch) {
        return makeInlineImagePart(dataUrlMatch[2], dataUrlMatch[1]);
    }

    return makeInlineImagePart(value);
}

async function urlToInlineImagePart(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Could not fetch reference diagram: ${response.status}`);
    }

    const mimeType = response.headers.get("content-type")?.split(";")[0] || "image/png";
    const buffer = Buffer.from(await response.arrayBuffer());
    return makeInlineImagePart(buffer.toString("base64"), mimeType);
}

export const evaluateDiagramAnswer = async ({ question, answerDiagram }) => {
    const maxMarks = Number(question?.marks) || 0;

    if (!answerDiagram || String(answerDiagram).trim().length === 0) {
        return {
            status: "done",
            marksObtained: 0,
            feedback: "No answer was submitted; 0 marks awarded.",
        };
    }

    const answerImagePart = dataUrlToInlineImagePart(answerDiagram);
    if (!answerImagePart) {
        return {
            status: "done",
            marksObtained: 0,
            feedback: "The submitted diagram image could not be read; 0 marks awarded.",
        };
    }

    let referenceImagePart = null;
    const referenceImage = question?.evaluationConfig?.referenceImage;
    if (referenceImage) {
        try {
            referenceImagePart = dataUrlToInlineImagePart(referenceImage);
            if (String(referenceImage).startsWith("http")) {
                referenceImagePart = await urlToInlineImagePart(referenceImage);
            }
        } catch (error) {
            console.warn("[auto-eval] Could not attach reference diagram; grading without it.", error);
        }
    }

    const messages = buildDiagramGradingMessages(question, answerImagePart, referenceImagePart);
    if (!messages) {
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

    let response;
    try {
        response = await generateContentWithRetries(() => model.generateContent(userPrompt));
    } catch (err) {
        console.error(`[auto-eval] questionId=${qid} diagram evaluation failed:`, err);
        return { status: "error", marksObtained: 0 };
    }
    const raw = response?.response?.text() ?? "";
    const qid = question?._id != null ? String(question._id) : "?";

    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (parseErr) {
        console.error(
            `[auto-eval] questionId=${qid} kind=diagram parse error; raw text:`,
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
};
