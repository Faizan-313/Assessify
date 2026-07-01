import { DIAGRAM_EVALUATION_PROMPT } from "../prompts/diagramEvaluation.prompt.js";

function buildDiagramGradingMessages(question, answerImagePart, referenceImagePart = null) {
    const maxMarks = Number(question.marks) || 0;
    const referenceAnswer = question.evaluationConfig?.referenceAnswer ?? "";

    const promptText = [
        `Question: ${question.questionText ?? ""}`,
        `Max marks: ${maxMarks}`,
        `Reference rubric: ${referenceAnswer || "(no text rubric provided)"}`,
        `Reference diagram: ${referenceImagePart ? "provided as the first image" : "(no reference diagram provided)"}`,
        "Student diagram: provided as the final image. Grade the final image.",
    ].join("\n");

    const userParts = [{ text: promptText }];
    if (referenceImagePart) {
        userParts.push(referenceImagePart);
    }
    userParts.push(answerImagePart);

    return [
        { role: "system", content: DIAGRAM_EVALUATION_PROMPT },
        { role: "user", content: userParts },
    ];
}

export default buildDiagramGradingMessages;
