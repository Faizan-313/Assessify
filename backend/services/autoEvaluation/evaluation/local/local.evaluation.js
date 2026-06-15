import axios from "axios";

function provideMarks(similarity, maxMarks) {
    if (typeof similarity !== "number" || Number.isNaN(similarity)) {
        return 0;
    }

    const clampedMarks = Math.max(0, Math.min(1, similarity));
    if (clampedMarks <= 0.25) {
        return 0;
    }

    return Math.round(clampedMarks * maxMarks);
}

function buildCodeFeedback(result) {
    const passed = Number(result?.passed) || 0;
    const total = Number(result?.total) || 0;
    const score = Number(result?.score) || 0;
    const parts = [`${passed}/${total} test cases passed. Score: ${score}%.`];

    if (result?.compileError) {
        parts.push(`Compile error: ${result.compileError}`);
    } else if (result?.message) {
        parts.push(result.message);
    }

    const failedCases = Array.isArray(result?.results)
        ? result.results.filter((testResult) => !testResult?.passed).slice(0, 3)
        : [];

    for (const testResult of failedCases) {
        const label = `Test case ${testResult.testCase}: ${testResult.status || "failed"}.`;
        if (testResult.error) {
            parts.push(`${label} ${testResult.error}`);
        } else if (testResult.expected !== undefined || testResult.actual !== undefined) {
            parts.push(`${label} Expected "${testResult.expected ?? ""}", got "${testResult.actual ?? ""}".`);
        } else {
            parts.push(label);
        }
    }

    return parts.join(" ");
}

async function evaluateWithLocal({ question, answerText, answerLanguage, kind }) {
    const maxMarks = Number(question?.marks) || 0;

    if (!answerText || String(answerText).trim().length === 0) {
        return {
            status: "done",
            marksObtained: 0,
            feedback: "No answer was submitted; 0 marks awarded.",
        };
    }

    if (kind === "text") {
        const teacherAnswer = question?.evaluationConfig?.referenceAnswer || "";
        const url = process.env.TEXT_GRADING_MICROSERVICE_URL || "http://127.0.0.1:8000";

        const response = await axios.post(`${url}/text-evaluate`, {
            teacherAnswer,
            studentAnswer: String(answerText),
        });

        return {
            status: "done",
            marksObtained: provideMarks(response.data.similarity, maxMarks),
            feedback: response.data.feedback || "No feedback provided.",
        };
    }

    if (kind === "code") {
        const testCases = question?.evaluationConfig?.testCases || [];
        if (!Array.isArray(testCases) || testCases.length === 0) {
            return {
                status: "error",
                marksObtained: 0,
                feedback: "No test cases are configured for this code question.",
            };
        }

        const url = process.env.CODE_GRADING_MICROSERVICE_URL || "http://localhost:7000";
        const response = await axios.post(
            `${url}/code-evaluate`,
            {
                language: answerLanguage || "python",
                code: String(answerText),
                testCases,
            },
            {
                validateStatus: () => true,
            }
        );

        const result = response.data || {};
        const score = Number(result.score) || 0;

        return {
            status: "done",
            marksObtained: (score / 100) * maxMarks,
            feedback: buildCodeFeedback(result),
        };
    }

    return { status: "error", marksObtained: 0 };
}

export default evaluateWithLocal;
