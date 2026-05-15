import mongoose from "mongoose";
import OpenAI from "openai";
import { Exam } from "../models/exam.model.js";
import { QuestionPaper } from "../models/questions.model.js";
import { ExamSubmission } from "../models/examSubmission.model.js";


// Lazy-init the OpenAI client so the module can still load in environments
// where OPENAI_API_KEY is not configured (e.g. local dev without AI grading).
let openaiClient = null;
function getOpenAIClient() {
    if (openaiClient) return openaiClient;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not configured");
    }
    openaiClient = new OpenAI({ apiKey });
    return openaiClient;
}

const AI_GRADER_MODEL = process.env.OPENAI_GRADER_MODEL || "gpt-4o-mini";


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

/*
 * AI-graded evaluation for free-text and code questions.

 * The model never executes student code; it only compares the submission
 * against the reference answer/code and the rubric described in the prompt.
 * On any failure (missing key, network error, malformed model output) we
 * return status "error" so the caller can route the answer to manual review.
 */
function buildTextGradingMessages(question, answerText) {
    const maxMarks = Number(question.marks) || 0;
    const referenceAnswer = question.evaluationConfig?.referenceAnswer ?? "";

    const systemPrompt = [
        "You are an exam grader for short-answer / descriptive questions.",
        "Score the student's answer strictly against the provided reference answer and the question itself.",
        "Reward correctness of facts and key concepts; minor wording differences are fine.",
        "Penalize missing key points, factually wrong statements, and irrelevant content.",
        "Do not award marks for empty, gibberish, or completely off-topic answers.",
        "Return ONLY a JSON object that matches this exact shape:",
        '{ "marksObtained": <number between 0 and maxMarks, may be fractional>, "feedback": "<short 1-2 sentence justification>" }',
        "Never output anything outside the JSON object.",
    ].join(" ");

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

    const systemPrompt = [
        "You are an exam grader for programming questions.",
        "You will be given the problem statement, a reference solution, and the student's submitted code.",
        "Do NOT execute the code. Reason about it statically.",
        "Judge correctness (does it solve the stated problem?), handling of edge cases, time/space sanity, and overall code quality.",
        "Wording / variable name / language differences from the reference are fine as long as the logic is correct.",
        "Give partial credit for partially correct solutions (e.g. correct main logic but missing edge cases).",
        "Award 0 for empty submissions, code unrelated to the problem, or code that clearly cannot solve it.",
        "Return ONLY a JSON object that matches this exact shape:",
        '{ "marksObtained": <number between 0 and maxMarks, may be fractional>, "feedback": "<short 1-2 sentence justification>" }',
        "Never output anything outside the JSON object.",
    ].join(" ");

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
        return { status: "done", marksObtained: 0, feedback: "Empty answer." };
    }

    try {
        const client = getOpenAIClient();

        let messages;
        if (kind === "text") {
            messages = buildTextGradingMessages(question, answerText);
        } else if (kind === "code") {
            messages = buildCodeGradingMessages(question, answerText);
        } else {
            // Unsupported kind for AI grading — caller will treat this as manual review.
            return { status: "error", marksObtained: 0 };
        }

        const response = await client.chat.completions.create({
            model: AI_GRADER_MODEL,
            temperature: 0,
            response_format: { type: "json_object" },
            messages,
        });

        const raw = response?.choices?.[0]?.message?.content ?? "";
        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (parseErr) {
            console.error("evaluateWithAi: failed to parse model JSON output:", raw, parseErr);
            return { status: "error", marksObtained: 0 };
        }

        const marksObtained = clampMarks(parsed?.marksObtained, maxMarks);
        const feedback = typeof parsed?.feedback === "string" ? parsed.feedback : undefined;

        return { status: "done", marksObtained, feedback };
    } catch (error) {
        console.error("Error in evaluateWithAi function:", error);
        return { status: "error", marksObtained: 0 };
    }
}


function clampMarks(value, max) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    if (Number.isFinite(max) && n > max) return max;
    return n;
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
                    const { status, marksObtained } = await evaluateWithAi({
                        question: q,
                        answerText: ans.answerText,
                        kind: ans.questionType,
                    });

                    //if the auto evaluation fails for particular question, then we add it to the manual review
                    //TODO:(future feature) we can add a feature to retry the auto evaluation for that particular question 
                    if(status === "error"){
                        needsManualReview = true;
                        updatedAnswers.push({ ...ans, marksObtained: ans.marksObtained ?? 0 });
                        continue;
                    }

                    const safeMarks = clampMarks(marksObtained, Number(q.marks) || 0);
                    totalScore += safeMarks;
                    updatedAnswers.push({ ...ans, marksObtained: safeMarks });
                    continue;
                }

                //for diagram type questions
                needsManualReview = true;
                updatedAnswers.push({ ...ans, marksObtained: ans.marksObtained ?? 0 });
            }

            const evaluateStatus = needsManualReview ? "Pending" : "Evaluated";

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
