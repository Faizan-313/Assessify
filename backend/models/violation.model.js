import mongoose from "mongoose";

const violationSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true,
    },
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Exam",
        required: true,
    },
    status: {
        type: String,
        enum: ["active", "paused", "terminated", "submitted"],
        default: "active"
    },
    studentDetails: {
        name: { type: String, trim: true },
        rollNumber: { type: String, trim: true },
        collegeId: { type: String, trim: true },
        batch: { type: Number },
    },
    violations: [
        {
            type: {
                type: String,
                enum: [
                    // DOM / browser-based proctoring events
                    "TAB_SWITCH",
                    "WINDOW_BLUR",
                    "DEVTOOLS_OPENED",
                    "RIGHT_CLICK_ATTEMPT",
                    "BLOCKED_SHORTCUT",
                    "FULLSCREEN_EXIT",
                    // AI-monitoring anomalies 
                    "AI_NO_FACE",
                    "AI_MULTIPLE_FACES",
                    "AI_HEAD_LEFT",
                    "AI_HEAD_RIGHT",
                    "AI_HEAD_UP",
                    "AI_HEAD_DOWN",
                    "AI_GAZE_LEFT",
                    "AI_GAZE_RIGHT",
                    "AI_GAZE_UP",
                    "AI_GAZE_DOWN",
                    "AI_PHONE_DETECTED"
                ],
                required: true
            },
            timestamp: { type: Date, default: Date.now },
        }
    ]
}, {
    timestamps: true
});

// Add indexes for frequently queried fields
violationSchema.index({ examId: 1 });
violationSchema.index({ studentId: 1, examId: 1 });

export const Violation = mongoose.model("Violation", violationSchema);
