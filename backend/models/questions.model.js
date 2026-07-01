import mongoose from "mongoose";

const QuestionPaperSchema = new mongoose.Schema({
    examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    questions: [
        {
            type: {
                type: String,
                enum: ["mcq", "code", "text", "diagram"],
                required: true,
            },
            questionText: { type: String, required: true },
            marks: { type: Number, required: true },
            image: { type: String },
            options: [String],
            evaluationConfig: {
                correctOption: Number,
                referenceAnswer: String,
                referenceImage: String,
                testCases: [
                    {
                        input: { type: String, default: "" },
                        output: { type: String, default: "" },
                    },
                ],
            }
        },
    ],
});

QuestionPaperSchema.index({ examId: 1 });

export const QuestionPaper = mongoose.model("QuestionPaper", QuestionPaperSchema);
