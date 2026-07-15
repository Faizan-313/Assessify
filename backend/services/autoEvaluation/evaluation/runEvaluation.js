import { ExamSubmission } from "../../../models/examSubmission.model.js";
import evaluateAnswer from "./controller/evaluation.controller.js";
import { Exam } from "../../../models/exam.model.js";
import clampMarks from "../helpers/clampMarks.js";
import scoreMcqQuestion from "./mcq.evaluation.js";
import sleep from "../helpers/sleep.js";
import { GEMINI_REQUEST_DELAY_MS } from "../constants.js";
import evaluateDiagramAnswer from "./controller/diagram.evaluation.controller.js";

function mcqHasAnswerKey(question) {
    const raw = question.evaluationConfig?.correctOption;
    return raw !== undefined && raw !== null && !Number.isNaN(Number(raw));
}

async function runAutoEvaluationJob({ examId, questionPaper }) {
    try {
        //Only grab submissions that ACTUALLY need evaluation
        const submissions = await ExamSubmission.find({ 
            examId, 
            evaluateStatus: "Pending" 
        }).lean();

        const currentExam = await Exam.findById(examId).select("evaluationStatus autoEvalProgress").lean();
        const existingCompleted = currentExam?.autoEvalProgress?.completed ?? 0;
        const existingTotal = currentExam?.autoEvalProgress?.total ?? 0;
        const totalSubmissions = submissions.length;
        const total = existingTotal > 0 ? Math.max(existingTotal, existingCompleted + totalSubmissions) : totalSubmissions;

        if (totalSubmissions === 0) {
            await Exam.findByIdAndUpdate(examId, { $set: { evaluationStatus: "auto_evaluated", "autoEvalProgress.total": total, "autoEvalProgress.completed": existingCompleted } });
            return;
        }

        //Initialize or preserve progress tracking in the database
        await Exam.findByIdAndUpdate(examId, { 
            $set: { 
                evaluationStatus: "in_progress",
                "autoEvalProgress.total": total,
                "autoEvalProgress.completed": existingCompleted,
            } 
        });

        const questionById = new Map(questionPaper?.questions?.map((q) => [String(q._id), q]));
        let completedCount = existingCompleted;

        for (const sub of submissions) {
            const activeExam = await Exam.findById(examId).select("evaluationStatus").lean();
            if (!activeExam || activeExam.evaluationStatus !== "in_progress") {
                console.info("Auto evaluation job stopped for exam", examId, "due to status", activeExam?.evaluationStatus);
                return;
            }

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
                    const { status, marksObtained, feedback } = await evaluateAnswer({
                        question: q,
                        answerText: ans.answerText,
                        answerLanguage: ans.language,
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

                if (ans.questionType === "diagram") {
                    const imageInText = ans.answerText;

                    const { status, marksObtained, feedback } = await evaluateDiagramAnswer({
                        question: q,
                        answerDiagram: imageInText
                    });
                    
                    if (imageInText && GEMINI_REQUEST_DELAY_MS > 0) {
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

                }
            }

            const evaluateStatus = needsManualReview ? "Pending" : "AutoEvaluated";
            
            //Save THIS student immediately so data isn't lost if the server crashes
            await ExamSubmission.updateOne(
                { _id: sub._id },
                {
                    $set: {
                        answers: updatedAnswers,
                        totalScore,
                        evaluateStatus,
                    },
                }
            );

            completedCount++;

            //Update the real-time progress tracker on the Exam
            await Exam.findByIdAndUpdate(examId, { 
                $set: { "autoEvalProgress.completed": completedCount } 
            });
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
