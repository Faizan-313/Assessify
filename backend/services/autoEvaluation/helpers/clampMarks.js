function clampMarks(value, max) {
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0) {
        return 0;
    }
    return Math.min(parsed, max);
}

export default clampMarks;
