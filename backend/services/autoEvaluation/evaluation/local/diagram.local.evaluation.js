import axios from "axios";
import clampMarks from "../../helpers/clampMarks.js";

async function evaluateDiagramWithLocal({ question, answerDiagram }) {
    if (!answerDiagram || String(answerDiagram).trim().length === 0) {
        return { status: "done", marksObtained: 0, feedback: "No answer was submitted; 0 marks awarded." };
    }

    const baseUrl = (process.env.DIAGRAM_GRADING_MICROSERVICE_URL || "http://127.0.0.1:8001").replace(/\/$/, "");
    const timeout = Math.max(1_000, Number(process.env.DIAGRAM_GRADING_TIMEOUT_MS) || 120_000);
    const response = await axios.post(
        `${baseUrl}/diagram-evaluate`,
        { question, answerDiagram: String(answerDiagram) },
        { timeout }
    );
    const result = response.data || {};
    if (result.status === "error") {
        return { status: "error", marksObtained: 0, feedback: result.feedback || "Diagram service failed." };
    }

    return {
        status: "done",
        marksObtained: clampMarks(result.marksObtained, Number(question?.marks) || 0),
        feedback: typeof result.feedback === "string" && result.feedback.trim()
            ? result.feedback.trim()
            : "(Model returned no feedback text.)",
    };
}

export default evaluateDiagramWithLocal;
