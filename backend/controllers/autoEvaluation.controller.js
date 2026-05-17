import mongoose from "mongoose";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Exam } from "../models/exam.model.js";
import { QuestionPaper } from "../models/questions.model.js";
import { ExamSubmission } from "../models/examSubmission.model.js";


// Lazy-init so the module can load when GEMINI_API_KEY is missing.
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

const GEMINI_GRADER_MODEL = ( process.env.GEMINI_GRADER_MODEL).trim();

// Rate limits by plan. 
const GEMINI_MAX_RPM = Math.max(1, Number.parseInt(process.env.GEMINI_MAX_RPM || "5", 10) || 5);

// Minimum ms between generateContent calls to satisfy RPM (60s / max requests per minute). 
const GEMINI_RPM_MIN_INTERVAL_MS = Math.ceil(60_000 / GEMINI_MAX_RPM);

// extra delay on top of RPM spacing (ms). 
const GEMINI_REQUEST_DELAY_EXTRA_MS = Math.max(0, Number.parseInt(process.env.GEMINI_REQUEST_DELAY_MS || "0", 10) || 0);

const GEMINI_REQUEST_DELAY_MS = Math.max(GEMINI_RPM_MIN_INTERVAL_MS, GEMINI_REQUEST_DELAY_EXTRA_MS);

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryDelayMsFromGeminiError(error) {
    const msg = String(error?.message ?? "");
    const m = msg.match(/retry in ([\d.]+)s/i);
    if (!m) return null;
    const sec = Number.parseFloat(m[1]);
    if (!Number.isFinite(sec)) return null;
    return Math.min(60_000, Math.max(500, Math.ceil(sec * 1000)));
}

function clampMarks(value, max) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    if (Number.isFinite(max) && n > max) return max;
    return n;
}

// Retries generateContent on 429/503 with backoff. 
async function generateContentWithRetries(fn, { maxAttempts = 5 } = {}) {
    let lastErr;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastErr = err;
            const status = err?.status;
            const retryable = status === 429 || status === 503;
            if (!retryable || attempt === maxAttempts) {
                throw err;
            }
            const fromApi = parseRetryDelayMsFromGeminiError(err);
            const backoffMs =
                fromApi ??
                Math.min(45_000, Math.ceil(1500 * 2 ** (attempt - 1)));
            console.warn(
                `[Gemini] ${status} on attempt ${attempt}/${maxAttempts}, waiting ${backoffMs}ms before retry`
            );
            await sleep(backoffMs);
        }
    }
    throw lastErr;
}


function mcqHasAnswerKey(question) {
    const raw = question.evaluationConfig?.correctOption;
    return raw !== undefined && raw !== null && !Number.isNaN(Number(raw));
}


// MCQ answers from the student app are stored as the selected option string (not index).
function scoreMcqQuestion(question, answerText) {
    const maxMarks = Number(question.marks) || 0;
    const rawIdx = question.evaluationConfig?.correctOption;

    if (rawIdx === undefined || rawIdx === null || Number.isNaN(Number(rawIdx))) {
        return { marksObtained: 0, maxMarks };
    }

    const correctIdx = Number(rawIdx);
    const options = question.options || [];

    if (!Number.isInteger(correctIdx) || correctIdx < 0 || correctIdx >= options.length) {
        return { marksObtained: 0, maxMarks };
    }

    const expected = String(options[correctIdx] ?? "").trim();
    const given = String(answerText ?? "").trim();

    if (expected.length === 0) {
        return { marksObtained: 0, maxMarks };
    }

    const marksObtained = expected === given ? maxMarks : 0;
    return { marksObtained, maxMarks };
}

// AI-graded evaluation for free-text and code questions.
// The model compares the submission against the reference answer/code.
function buildTextGradingMessages(question, answerText) {
    const maxMarks = Number(question.marks) || 0;
    const referenceAnswer = question.evaluationConfig?.referenceAnswer ?? "";

    const systemPrompt = process.env.SYSTEM_PROMPT_TEXT;

    const userPrompt = [
        `Question: ${question.questionText ?? ""}`,
        `Max marks: ${maxMarks}`,
        `Reference answer: ${referenceAnswer || "(no reference provided — grade based on the question alone)"}`,
        `Student's answer: ${answerText ?? ""}`,
    ].join("\n");

    return [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
    ];
}

function buildCodeGradingMessages(question, answerText) {
    const maxMarks = Number(question.marks) || 0;
    const referenceCode = question.evaluationConfig?.referenceCode ?? "";

    const systemPrompt = process.env.SYSTEM_PROMPT_CODE;

    const userPrompt = [
        `Problem statement: ${question.questionText ?? ""}`,
        `Max marks: ${maxMarks}`,
        "Reference solution:",
        "```",
        referenceCode || "(no reference provided — grade based on the problem statement alone)",
        "```",
        "Student's submission:",
        "```",
        answerText ?? "",
        "```",
    ].join("\n");

    return [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
    ];
}

async function evaluateWithAi({ question, answerText, kind }) {
    const maxMarks = Number(question?.marks) || 0;

    // Short-circuit obviously empty answers — no need to spend a model call.
    if (!answerText || String(answerText).trim().length === 0) {
        return {
            status: "done",
            marksObtained: 0,
            feedback: "No answer was submitted; no marks awarded.",
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
        const feedback =
            feedbackRaw.trim() ||
            "(Model returned no feedback text — check JSON shape and prompts.)";

        const rawForLog =
            raw.length > 8000 ? `${raw.slice(0, 8000)}… [truncated ${raw.length} chars]` : raw;

        console.log(`[auto-eval] questionId=${qid} model raw JSON:`, rawForLog);

        return { status: "done", marksObtained, feedback };
    } catch (error) {
        const status = error?.status;
        if (status === 404) {
            console.error(
                `evaluateWithAi: model "${GEMINI_GRADER_MODEL}" is not available for this API key (404). `
            );
        } else if (status === 429) {
            console.error(
                "evaluateWithAi: quota/rate limit (429) persists after retries. " + `buy subscription with higher GEMINI_MAX_RPM or GEMINI_REQUEST_DELAY_MS.`
            );
        }
        console.error("Error in evaluateWithAi function:", error);
        return { status: "error", marksObtained: 0 };
    }
}


async function runAutoEvaluationJob({ examId, questionPaper }) {
    try {
        const submissions = await ExamSubmission.find({ examId }).lean();

        if (submissions.length === 0) {
            await Exam.findByIdAndUpdate(examId, { $set: { evaluationStatus: "auto_evaluated" } });
            return;
        }

        const questionById = new Map(
            questionPaper.questions.map((q) => [String(q._id), q])
        );

        const bulkOps = [];

        for (const sub of submissions) {
            let totalScore = 0;
            let needsManualReview = false;
            const updatedAnswers = [];

            for (const ans of sub.answers || []) {
                const q = questionById.get(String(ans.questionId));

                if (!q) {
                    needsManualReview = true;
                    updatedAnswers.push({ ...ans, marksObtained: ans.marksObtained ?? 0 });
                    continue;
                }

                if (ans.questionType === "mcq") {
                    if (!mcqHasAnswerKey(q)) {
                        needsManualReview = true;
                        updatedAnswers.push({ ...ans, marksObtained: ans.marksObtained ?? 0 });
                        continue;
                    }
                    const { marksObtained } = scoreMcqQuestion(q, ans.answerText);
                    totalScore += marksObtained;
                    updatedAnswers.push({ ...ans, marksObtained });
                    continue;
                }

                if (ans.questionType === "text" || ans.questionType === "code") {
                    const answered =
                        ans.answerText && String(ans.answerText).trim().length > 0;
                    const { status, marksObtained, feedback } = await evaluateWithAi({
                        question: q,
                        answerText: ans.answerText,
                        kind: ans.questionType,
                    });

                    if (answered && GEMINI_REQUEST_DELAY_MS > 0) {
                        await sleep(GEMINI_REQUEST_DELAY_MS);
                    }

                    //if the auto evaluation fails for particular question, then we add it to the manual review
                    //TODO:(later) add a feature to retry the auto evaluation for that particular question 
                    if(status === "error"){
                        needsManualReview = true;
                        updatedAnswers.push({ ...ans, marksObtained: ans.marksObtained ?? 0 });
                        continue;
                    }

                    const safeMarks = clampMarks(marksObtained, Number(q.marks) || 0);
                    totalScore += safeMarks;
                    updatedAnswers.push({
                        ...ans,
                        marksObtained: safeMarks,
                        aiFeedback: typeof feedback === "string" ? feedback : "",
                    });
                    continue;
                }

                //for diagram type questions
                needsManualReview = true;
                updatedAnswers.push({ ...ans, marksObtained: ans.marksObtained ?? 0 });
            }

            const evaluateStatus = needsManualReview ? "Pending" : "AutoEvaluated";

            bulkOps.push({
                updateOne: {
                    filter: { _id: sub._id },
                    update: {
                        $set: {
                            answers: updatedAnswers,
                            totalScore,
                            evaluateStatus,
                        },
                    },
                },
            });
        }

        if (bulkOps.length > 0) {
            await ExamSubmission.bulkWrite(bulkOps, { ordered: false });
        }

        await Exam.findByIdAndUpdate(examId, { $set: { evaluationStatus: "auto_evaluated" } });
    } catch (error) {
        console.error("Auto evaluation job failed for exam", examId, error);
        try {
            await Exam.findByIdAndUpdate(examId, { $set: { evaluationStatus: "failed" } });
        } catch (persistErr) {
            console.error("Could not persist exam evaluation failure status:", persistErr);
        }
    }
}


const startAutoEvaluation = async (req, res) => {
    const { examId } = req.params;

    try {
        if (!examId || !mongoose.isValidObjectId(examId)) {
            return res.status(400).json({ message: "A valid exam ID is required" });
        }

        const exam = await Exam.findById(examId).select("createdBy evaluationStatus");
        if (!exam) {
            return res.status(404).json({ message: "Exam not found" });
        }

        if (String(exam.createdBy) !== String(req.user._id)) {
            return res.status(403).json({ message: "You are not authorized to run auto evaluation for this exam" });
        }

        if(exam.evaluationStatus === "completed"){
            return res.status(400).json({ message: "Exam has already been evaluted cannot be evaluated again" });
        }

        if (exam.evaluationStatus === "in_progress") {
            return res.status(409).json({
                message: "Auto evaluation is already running for this exam",
                evaluationStatus: exam.evaluationStatus,
            });
        }

        const questionPaper = await QuestionPaper.findOne({ examId }).lean();
        if (!questionPaper) {
            return res.status(404).json({ message: "Question paper not found" });
        }

        // Atomic claim: succeeds only if no other run is currently in_progress.
        const claimed = await Exam.findOneAndUpdate(
            {
                _id: examId,
                createdBy: req.user._id,
                evaluationStatus: { $ne: "in_progress" },
            },
            { $set: { evaluationStatus: "in_progress" } },
            { new: true }
        );

        if (!claimed) {
            const latest = await Exam.findById(examId).select("evaluationStatus").lean();
            return res.status(409).json({
                message: "Exam evaluation status changed; refresh and try again",
                evaluationStatus: latest?.evaluationStatus,
            });
        }

        // Fire-and-forget the long-running job. The client polls /status to track progress.
        // TODO(infra): move this to a real worker / queue (e.g. BullMQ) so jobs survive restarts.
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
