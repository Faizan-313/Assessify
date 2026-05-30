import mongoose from "mongoose";

const StudentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    rollNumber: { type: String, required: true },
    batch: { type: Number, required: true },
    collegeId: { type: String, required: true },
    examsAttempted: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ExamSubmission",
            default: [],
        }
    ],
}, { timestamps: true });

StudentSchema.index({ rollNumber: 1 });
StudentSchema.index({ collegeId: 1 });
StudentSchema.index({ batch: 1 });

export const Student = mongoose.model("Student", StudentSchema);
