import mongoose from "mongoose";

const ExamSubmissionSchema = new mongoose.Schema({
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Exam",
        required: true,
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true,
    },
    evaluatorsComments: {
        type: String,
        default: "",
    },
    evaluateStatus: {
        type: String,
        enum : ["Pending", "AutoEvaluated", "Evaluated"],
        default: "Pending"
    },
    answers: [
        {
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Question",
            required: true,
        },
        questionType: {
            type: String,
            enum: ["mcq", "code", "text", "diagram"],
            required: true,
        },
        answerText: String,
        language: { type: String, default: null },
        marks: { type: Number },
        marksObtained: { type: Number, default: 0 },
        aiFeedback: { type: String, default: "" },
        },
    ],
    totalScore: { 
        type: Number, 
        default: 0 
    },
    submittedAt: { 
        type: Date, 
        default: Date.now 
    }
},{
    timestamps: true 
});

ExamSubmissionSchema.index({ examId: 1 });
ExamSubmissionSchema.index({ studentId: 1 });
ExamSubmissionSchema.index({ teacherId: 1 });
ExamSubmissionSchema.index({ examId: 1, studentId: 1 });

export const ExamSubmission = mongoose.model("ExamSubmission", ExamSubmissionSchema);
