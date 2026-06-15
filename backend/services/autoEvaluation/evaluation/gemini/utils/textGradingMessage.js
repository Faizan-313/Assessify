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

export default buildTextGradingMessages;
