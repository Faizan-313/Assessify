import { CODE_EVALUATION_PROMPT } from "../prompts/codeEvaluation.prompt.js";

function buildCodeGradingMessages(question, answerText, answerLanguage) {
    const maxMarks = Number(question.marks) || 0;
    const testCases = Array.isArray(question.evaluationConfig?.testCases)
        ? question.evaluationConfig.testCases
        : [];

    const systemPrompt = CODE_EVALUATION_PROMPT;

    const userPrompt = [
        `Problem statement: ${question.questionText ?? ""}`,
        `Max marks: ${maxMarks}`,
        `Submitted language: ${answerLanguage || "not specified"}`,
        "Test cases:",
        testCases.length > 0
            ? testCases
                    .map((testCase, index) => {
                        return [
                            `Case ${index + 1}:`,
                            `Input: ${testCase?.input ?? ""}`,
                            `Expected output: ${testCase?.output ?? ""}`,
                        ].join("\n");
                    })
                    .join("\n\n")
            : "(no test cases provided; grade based on the problem statement alone)",
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

export default buildCodeGradingMessages;
