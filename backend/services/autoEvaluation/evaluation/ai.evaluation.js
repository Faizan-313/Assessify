import { GoogleGenerativeAI } from "@google/generative-ai";
import { parseRetryDelayMsFromGeminiError, generateContentWithRetries } from "../helpers/retries.js";
import { GEMINI_GRADER_MODEL } from "../constants.js";
import buildTextGradingMessages from "./utils/textGradingMessage.js";
import buildCodeGradingMessages from "./utils/codeGradingMessage.js";
import clampMarks from "../helpers/clampMarks.js";
import axios from "axios";

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

const isProduction = process.env.NODE_ENV === "production";

function provideMarks(similarity, maxMarks) {
    if( typeof similarity !== "number" || isNaN(similarity) ) {
        return 0;
    }
    const clampedMarks = Math.max(0, Math.min(1, similarity));
    if( clampedMarks <= 0.45 ){
        return 0;
    }else if( clampedMarks >= 0.85 ){
        return maxMarks;
    }
    return Math.round(clampedMarks * maxMarks);
}

async function evaluateWithAi({ question, answerText, kind }) {
    const maxMarks = Number(question?.marks) || 0;

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

        // for text grading in the non-production env, we use a local evaluation service that relies on a smaller model and uses a cosine similarity approach
        // to provide more stable and deterministic evaluation results.
        if(!isProduction){
            if(kind === "text"){
                const teacherAnswer = question?.evaluationConfig?.referenceAnswer || "";

                const url = process.env.TEXT_GRADING_MICROSERVICE_URL || "http://127.0.0.1:8000";

                const response = await axios.post(`${url}/text-evaluate`, {
                    teacherAnswer,
                    studentAnswer: String(answerText),
                });
                const marksObtained = provideMarks(response.data.similarity, maxMarks);

                return {
                    status: "done",
                    marksObtained: marksObtained,
                    feedback: response.data.feedback || "No feedback provided.",
                };
            }
        }else{
            // for production text grading and code grading, we use the Gemini model directly , as it is more reliable and is easy for production use.
            if (kind === "text") {
                messages = buildTextGradingMessages(question, answerText);
            } else if (kind === "code") {
                messages = buildCodeGradingMessages(question, answerText);
            } else {
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

            const response = await generateContentWithRetries(() => model.generateContent(userPrompt));
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
