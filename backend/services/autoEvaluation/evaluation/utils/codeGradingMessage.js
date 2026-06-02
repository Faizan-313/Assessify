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

export default buildCodeGradingMessages;
