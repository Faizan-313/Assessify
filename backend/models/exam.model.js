import mongoose from "mongoose";

const ExamSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true 
    },
    description: String,
    branch: { type: String, required: true, trim: true },
    semester: { type: String, required: true, trim: true },
    session: { type: String, required: true, trim: true },
    duration: { 
        type: Number, 
        required: true 
    },                                    //minutes
    examCode: { 
        type: String, 
        unique: true, 
        required: true
    },
    startTime: { 
        type: Date, 
        required: true 
    },
    endTime: { 
        type: Date, 
        required: true 
    },
    totalMarks: { 
        type: Number, 
        default: 0 
    },
    students: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Student" 
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },                                         //teacher ID
    questionPaper: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "QuestionPaper" 
    },
    evaluationStatus: {
        type: String,
        enum: [
            "not_started",
            "in_progress",
            "auto_evaluated",
            "manually_evaluated",
            "completed",
            "failed"
        ],
        default: "not_started"
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
});

ExamSchema.index({ createdBy: 1 });
ExamSchema.index({ startTime: 1 });
ExamSchema.index({ endTime: 1 });
ExamSchema.index({ examCode: 1 }, { unique: true });

export const Exam = mongoose.model("Exam", ExamSchema);
