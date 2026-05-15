import { Exam } from "../models/exam.model.js";
import { ExamSubmission } from "../models/examSubmission.model.js";
import { QuestionPaper } from "../models/questions.model.js"; 
import { Student } from "../models/student.model.js";
import { User } from "../models/user.model.js"; 
import { v4 as uuidv4 } from "uuid";
import { uploadBufferToCloudinary } from "../cloudinary/cloudinary.js";

const createExam = async (req, res) => {
    try {
        //Parse multipart text fields
        const examDetailsParsed = JSON.parse(req.body.examDetails);
        const questionsParsed = JSON.parse(req.body.questions);
        const totalMarks = parseInt(req.body.totalMarks);

        //Attach images to corresponding questions and upload to cloudinary
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const index = parseInt(file.fieldname.split("_")[1]);

                if (!isNaN(index) && questionsParsed[index]) {
                    const cloudinaryRes = await uploadBufferToCloudinary(file.buffer);
                    questionsParsed[index].image = cloudinaryRes.secure_url;
                }
            }
        }

        examDetailsParsed.startTime = new Date(examDetailsParsed.startTime);
        examDetailsParsed.endTime = new Date(examDetailsParsed.endTime);

        //Generate unique exam code
        const baseCode = examDetailsParsed.examCode;
        const uniqueCode = `${baseCode}-${uuidv4()
            .split("-")[0]
            .toUpperCase()}`;

        // Create Exam 
        const newExam = new Exam({
            ...examDetailsParsed,
            duration: parseInt(examDetailsParsed.duration),
            totalMarks,
            examCode: uniqueCode,
            createdBy: req.user._id,
        });

        //Create Question Paper
        const newQuestionPaper = new QuestionPaper({
            examId: newExam._id,
            questions: questionsParsed.map((q) => {
                const question = {
                    type: q.type,
                    questionText: q.questionText,
                    marks: parseInt(q.marks),
                    options: q.options || [],
                    image: q.image || null,
                };

                const evaluationConfig = {};
                if (q.type === "mcq" && q.correctOption != null && q.correctOption !== "") {
                    const idx = Number(q.correctOption);
                    if (!Number.isNaN(idx)) {
                        evaluationConfig.correctOption = idx;
                    }
                }
                if (q.type === "text" && typeof q.referenceAnswer === "string" && q.referenceAnswer.trim() !== "") {
                    evaluationConfig.referenceAnswer = q.referenceAnswer.trim();
                }
                if (q.type === "code" && typeof q.referenceCode === "string" && q.referenceCode.trim() !== "") {
                    evaluationConfig.referenceCode = q.referenceCode;
                }
                if (Object.keys(evaluationConfig).length > 0) {
                    question.evaluationConfig = evaluationConfig;
                }
                return question;
            }),
        });

        await newQuestionPaper.save();

        //Link and save exam
        newExam.questionPaper = newQuestionPaper._id;
        await newExam.save();

        //Update teacher record
        await User.findByIdAndUpdate(req.user._id, {
            $push: { examsCreated: newExam._id },
        });

        return res.status(200).json({
            message: "Exam created successfully",
            examId: newExam._id,
        });
    } catch (error) {
        console.error("Error creating exam:", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};


const validateCode = async (req, res) => {
    try {
        const { examCode } = req.body;
        if(!examCode || examCode.trim() === "") {
            return res.status(400).json({ message: "Please enter a valid code" });
        }

        const examDetails = await Exam.findOne({ examCode }).select("-questionPaper -createdBy -createdAt");
        if(!examDetails){
            return res.status(400).json({ message: "Exam code is invalid" });
        }

        const now = new Date();

        // check if exam has started or not
        const examStartTime = new Date(examDetails.startTime);
        if(examStartTime > now){
            return res.status(410).json({ message: "Exam has not started yet" });
        }

        //check if exam has already ended
        const examEndTime = new Date(examDetails.endTime);
        if(examEndTime < now){
            return res.status(410).json({ message: "This exam has ended and is no longer accessible." });
        }
        
        return res.status(200).json({ message: "Code validated successfully", examDetails })

    } catch (error) {
        console.log("Error in validating exam-code: ", error);
        return res.status(500).json({ message: "Something went wrong" })
    }
}


const storeStudentDetails = async (req, res) => {
    try {
        const { fullName, rollNumber, collegeId, session, batch, examId } = req.body;

        if (!examId) {
            return res.status(400).json({ message: "Check the exam code again" });
        }

        if ([fullName, rollNumber, collegeId, session, batch].some(field => !field || field.trim() === "")) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({ message: "Exam does not exist" });
        }

        const formattedRoll = rollNumber.trim().toUpperCase();
        const formattedCollegeId = collegeId.trim().toUpperCase();

        let student = await Student.findOne({ rollNumber: formattedRoll, collegeId: formattedCollegeId });

        if (!student) {
            student = await Student.create({
                name: fullName.trim().toLowerCase(),
                rollNumber: formattedRoll,
                collegeId: formattedCollegeId,
                session,
                batch,
                examsAttempted: []
            });
        } else {
            const existingSubmission = await ExamSubmission.findOne({ studentId: student._id, examId });
            if (existingSubmission) {
                return res.status(400).json({ message: "Student is already registered for this exam" });
            }
        }

        const questionPaper = await QuestionPaper.findOne({ examId }).select("questions");
        if (!questionPaper) {
            return res.status(404).json({ message: "Question paper not found" });
        }

        //link students to exams
        exam.students.push(student._id);
        await exam.save();

        return res.status(200).json({
            success: true,
            message: "Student details submitted successfully",
            student,
            question: questionPaper
        });

    } catch (error) {
        console.error("Error in storing the student data:", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};


const submitExam = async (req, res) => {
    try {
        const { answers, examId, studentDetail } = req.body;

        if (!answers || !examId) {
            return res.status(400).json({ message: "Unauthorized" });
        }
        const student = await Student.findOne({
            rollNumber: studentDetail.rollNumber.trim().toUpperCase(),
            collegeId: studentDetail.collegeId.trim().toUpperCase()
        });

        if (!student) {
            return res.status(400).json({ message: "Unauthorized" });
        }

        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({ message: "Exam does not exist" });
        }

        // check exam timing
        if (exam.endTime && Date.now() > new Date(exam.endTime)) {
            return res.status(400).json({ message: "Exam has already ended" });
        }

        const existing = await ExamSubmission.findOne({ studentId: student._id, examId });
        if (existing) {
            return res.status(400).json({ message: "You have already submitted this exam" });
        }

        const teacherId = exam.createdBy;

        const submission = await ExamSubmission.create({
            studentId: student._id,
            examId,
            teacherId,
            answers: answers.map(ans => ({
                questionId: ans.questionId,
                answerText: ans.answerText || "",
                marks: ans.marks || 0,
                questionType: ans.type
            }))
        });


        await Student.findByIdAndUpdate(student._id, {
            $push: { examsAttempted: submission._id }
        });

        return res.status(200).json({
            message: "Answers submitted successfully",
            submission
        });

    } catch (error) {
        console.error("Error in submitting the answers:", error);
        return res.status(500).json({
            message: "Could not submit the answers, please try again"
        });
    }
};

const getExamData = async (req, res) => {
    try {
        const { examId } = req.params;

        if (!examId) {
            return res.status(400).json({ message: "Exam ID is required" });
        }

        // Fetch the exam by ID
        const exam = await Exam.findById(examId);

        if (!exam) {
            return res.status(404).json({ message: "Exam not found" });
        }

        // Fetch the related question paper
        const paper = await QuestionPaper.findOne({ examId: exam._id });

        // Prepare formatted response
        const formattedExam = {
            _id: exam._id,
            title: exam.title,
            examCode: exam.examCode,
            description: exam.description,
            duration: exam.duration,
            totalMarks: exam.totalMarks,
            startTime: exam.startTime,
            endTime: exam.endTime,
            questions: paper?.questions || [],
            evaluationStatus: exam.evaluationStatus,
            createdAt: exam.createdAt,
        };

        return res.status(200).json(formattedExam);
    } catch (error) {
        console.error("Error in getting a particular exam data:", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};

const deleteExam = async (req, res) => {
    try {
        const { id } = req.params;
        if(!id){
            return res.status(400).json({ message: "Exam ID is required" });
        }

        const exam = await Exam.findById(id).lean();
        if (!exam) {
            return res.status(404).json({ message: "Exam not found" });
        }

        // Authorization check
        if (exam.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "You are not authorized to delete this exam" });
        }

        // Prevent deletion of live or already-completed exams
        const now = new Date();
        const isLive = exam.startTime <= now && exam.endTime >= now;
        const isCompleted = exam.endTime < now;

        if (isLive || isCompleted) {
            return res.status(409).json({
                message: "Only upcoming exams can be deleted"
            });
        }

        //delete exam + question paper together
        await Promise.all([
            Exam.findByIdAndDelete(id),
            exam.questionPaper && QuestionPaper.findByIdAndDelete(exam.questionPaper),
        ]);

        return res.status(200).json({ message: "Exam deleted successfully" });

    } catch (error) {
        console.error(`[deleteExam] Error deleting exam ${req.params?.id}:`, error);
        return res.status(500).json({ message: "An unexpected error occurred. Please try again." });
    }
};

export {
    createExam,
    validateCode,
    storeStudentDetails,
    submitExam,
    getExamData,
    deleteExam
}