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

    const marksObtained = expected === given ? maxMarks : 0;
    return { marksObtained, maxMarks };
}

export default scoreMcqQuestion;
