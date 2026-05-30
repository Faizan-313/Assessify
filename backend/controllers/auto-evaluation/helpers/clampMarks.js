function clampMarks(value, max) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    if (Number.isFinite(max) && n > max) return max;
    return n;
}

export default clampMarks;