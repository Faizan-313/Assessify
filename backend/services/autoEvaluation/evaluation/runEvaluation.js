import { ExamSubmission } from "../../../models/examSubmission.model.js";
import evaluateWithAi from "./ai.evaluation.js";
import { Exam } from "../../../models/exam.model.js";
import clampMarks from "../helpers/clampMarks.js";
import scoreMcqQuestion from "./mcq.evaluation.js";
import sleep from "../helpers/sleep.js";
import { GEMINI_REQUEST_DELAY_MS } from "../constants.js";

function mcqHasAnswerKey(question) {
    const raw = question.evaluationConfig?.correctOption;
    return raw !== undefined && raw !== null && !Number.isNaN(Number(raw));
}

async function runAutoEvaluationJob({ examId, questionPaper }) {
    try {
        const submissions = await ExamSubmission.find({ examId }).lean();

        if (submissions.length === 0) {
            await Exam.findByIdAndUpdate(examId, { $set: { evaluationStatus: "auto_evaluated" } });
            return;
        }

        const questionById = new Map(questionPaper?.questions?.map((q) => [String(q._id), q]));
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
                    const answered = ans.answerText && String(ans.answerText).trim().length > 0;
                    const { status, marksObtained, feedback } = await evaluateWithAi({
                        question: q,
                        answerText: ans.answerText,
                        kind: ans.questionType,
                    });

                    if (answered && GEMINI_REQUEST_DELAY_MS > 0) {
                        await sleep(GEMINI_REQUEST_DELAY_MS);
                    }

                    if (status === "error") {
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

export default runAutoEvaluationJob;
