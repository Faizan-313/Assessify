import sleep from "./sleep.js";

function parseRetryDelayMsFromGeminiError(error) {
    const msg = String(error?.message ?? "");
    const m = msg.match(/retry in ([\d.]+)s/i);
    if (!m) return null;
    const sec = Number.parseFloat(m[1]);
    if (!Number.isFinite(sec)) return null;
    return Math.min(60_000, Math.max(500, Math.ceil(sec * 1000)));
}

async function generateContentWithRetries(fn, { maxAttempts = 5 } = {}) {
    let lastErr;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastErr = err;
            const status = err?.status;
            const retryable = status === 429 || status === 503;
            if (!retryable || attempt === maxAttempts) {
                throw err;
            }
            const fromApi = parseRetryDelayMsFromGeminiError(err);
            const backoffMs =
                fromApi ??
                Math.min(45_000, Math.ceil(1500 * 2 ** (attempt - 1)));
            console.warn(
                `[Gemini] ${status} on attempt ${attempt}/${maxAttempts}, waiting ${backoffMs}ms before retry`
            );
            await sleep(backoffMs);
        }
    }
    throw lastErr;
}

export { generateContentWithRetries, parseRetryDelayMsFromGeminiError };
