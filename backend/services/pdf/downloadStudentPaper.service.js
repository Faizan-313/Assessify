import { Exam } from "../../models/exam.model.js";
import { ExamSubmission } from "../../models/examSubmission.model.js";
import PDFDocument from "pdfkit";
import {
    addHorizontalLine,
    addSectionBox,
    isBase64Image,
    renderImage,
    formatCodeBlock,
} from "./pdfHelpers.js";

async function streamStudentPaperPdf({ examId, studentId, userId }, res) {
    if (!examId || !studentId) {
        const error = new Error("Exam ID and student ID are required");
        error.statusCode = 400;
        throw error;
    }

    const exam = await Exam.findById(examId)
        .populate({ path: "questionPaper", select: "questions" })
        .lean();

    if (!exam) {
        const error = new Error("Exam not found");
        error.statusCode = 404;
        throw error;
    }

    if (String(exam.createdBy) !== String(userId)) {
        const error = new Error("Not authorized to download this paper");
        error.statusCode = 403;
        throw error;
    }

    const submission = await ExamSubmission.findOne({ examId, studentId })
        .populate({
            path: "studentId",
            select: "name rollNumber collegeId batch",
        })
        .lean();

    if (!submission) {
        const error = new Error("Submission not found");
        error.statusCode = 404;
        throw error;
    }

    if (!["AutoEvaluated", "Evaluated"].includes(submission.evaluateStatus)) {
        const error = new Error("Paper must be evaluated before download");
        error.statusCode = 400;
        throw error;
    }

    const filename = `answer-sheet-${submission.studentId?.rollNumber || submission.studentId?._id}.pdf`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/pdf");

    const doc = new PDFDocument({ margin: 60, size: "A4", bufferPages: true });
    doc.pipe(res);

    renderStudentPaperPdf(doc, exam, submission);
    doc.end();
}

function renderStudentPaperPdf(doc, exam, submission) {
    doc.fontSize(24)
       .font("Helvetica-Bold")
       .fill("#2c3e50")
       .text(exam.title || "Examination Answer Sheet", { align: "center" });

    doc.moveDown(0.5);
    doc.fontSize(12)
       .font("Helvetica")
       .fill("#7f8c8d")
       .text("Student Answer Sheet", { align: "center" });

    doc.moveDown(1);
    addHorizontalLine(doc, doc.y);
    doc.moveDown(1);

    addSectionBox(doc, "STUDENT INFORMATION");
    const studentDetails = [
        { label: "Student Name", value: submission.studentId?.name || "-" },
        { label: "Roll Number", value: submission.studentId?.rollNumber || "-" },
        { label: "College ID", value: submission.studentId?.collegeId || "-" },
        { label: "Batch", value: submission.studentId?.batch || "-" },
    ];

    studentDetails.forEach((detail, index) => {
        doc.font("Helvetica-Bold")
           .fontSize(10)
           .fill("#34495e")
           .text(`${detail.label}:`, 70, doc.y, { continued: true, width: 100 });

        doc.font("Helvetica")
           .fill("#2c3e50")
           .text(` ${detail.value}`);

        if (index < studentDetails.length - 1) {
            doc.moveDown(0.3);
        }
    });

    doc.moveDown(1.5);
    addSectionBox(doc, "EXAMINATION DETAILS");

    const examDetails = [
        { label: "Exam Code", value: exam.examCode || "-" },
        { label: "Branch", value: exam.branch || "-" },
        { label: "Semester", value: exam.semester || "-" },
        { label: "Session", value: exam.session || "-" },
        { label: "Total Marks", value: exam.totalMarks || "-" },
    ];

    examDetails.forEach((detail, index) => {
        doc.font("Helvetica-Bold")
           .fontSize(10)
           .fill("#34495e")
           .text(`${detail.label}:`, 70, doc.y, { continued: true, width: 100 });

        doc.font("Helvetica")
           .fill("#2c3e50")
           .text(` ${detail.value}`);

        if (index < examDetails.length - 1) {
            doc.moveDown(0.3);
        }
    });

    doc.moveDown(1.5);
    addSectionBox(doc, "SCORE SUMMARY");

    const scoreBoxWidth = 200;
    const scoreBoxX = (doc.page.width - scoreBoxWidth) / 2;
    doc.rect(scoreBoxX, doc.y, scoreBoxWidth, 40)
       .fill("#ebf5fb")
       .stroke("#3498db");

    doc.fill("#2c3e50")
       .font("Helvetica-Bold")
       .fontSize(14)
       .text("Score Obtained", scoreBoxX, doc.y + 8, {
           width: scoreBoxWidth,
           align: "center",
       });

    doc.fontSize(24)
       .fill("#27ae60")
       .text(`${submission.totalScore || 0} / ${exam.totalMarks || 0}`, scoreBoxX, doc.y + 2, {
           width: scoreBoxWidth,
           align: "center",
       });

    doc.fill("#000000")
       .font("Helvetica")
       .fontSize(11);

    doc.moveDown(3);
    addSectionBox(doc, "QUESTIONS & ANSWERS");
    doc.moveDown(1);

    const questions = exam.questionPaper?.questions || [];
    const answers = submission.answers || [];

    questions.forEach((question, index) => {
        if (doc.y > doc.page.height - 200) {
            doc.addPage();
        }

        const answer = answers.find((a) => String(a.questionId) === String(question._id));
        const questionNumber = index + 1;
        const marksObtained = answer?.marksObtained ?? 0;
        const totalMarks = question.marks || 0;
        const marksColor = marksObtained === totalMarks ? '#27ae60' : marksObtained > 0 ? '#f39c12' : '#e74c3c';

        doc.rect(60, doc.y, 475, 30)
           .fill('#ecf0f1');
        doc.circle(90, doc.y + 15, 12)
           .fill('#3498db');

        doc.fill('#ffffff')
           .font('Helvetica-Bold')
           .fontSize(12)
           .text(`${questionNumber}`, 85, doc.y + 8, { width: 15, align: 'center' });

        doc.fill('#2c3e50')
           .fontSize(13)
           .text(`Question ${questionNumber}`, 110, doc.y - 15);

        doc.fontSize(10)
           .fill(marksColor)
           .text(`[${marksObtained}/${totalMarks} marks]`, 110, doc.y - 10, { width: 200 });

        doc.moveDown(2.5);
        doc.font('Helvetica-Bold')
           .fontSize(11)
           .fill('#2c3e50')
           .text('Question:', 70);

        doc.font('Helvetica')
           .fontSize(11)
           .fill('#34495e');

        if (question.questionImage) {
            renderImage(doc, question.questionImage, { fit: [400, 300] });
            doc.moveDown(1);
        }

        if (question.questionText) {
            if (question.questionText.includes('```') ||
                question.questionText.includes('function') ||
                question.questionText.includes('class') ||
                question.questionText.includes('public') ||
                question.questionText.includes('def ')) {
                const codeMatch = question.questionText.match(/```[\s\S]*?```/g);
                if (codeMatch) {
                    const parts = question.questionText.split(/```[\s\S]*?```/g);
                    parts.forEach((part, idx) => {
                        if (part.trim()) {
                            doc.text(part.trim(), { indent: 20 });
                        }
                        if (codeMatch[idx]) {
                            const code = codeMatch[idx].replace(/```\w*\n?/g, '').replace(/```/g, '');
                            formatCodeBlock(doc, code);
                        }
                    });
                } else {
                    doc.text(question.questionText, { indent: 20 });
                }
            } else {
                doc.text(question.questionText, { indent: 20 });
            }
        }

        doc.moveDown(1);
        doc.font('Helvetica-Bold')
           .fontSize(11)
           .fill('#27ae60')
           .text('Student Answer:', 70);

        doc.font('Helvetica')
           .fontSize(11)
           .fill('#2c3e50');

        const studentAnswer = answer?.answerText || answer?.answer || '';

        if (studentAnswer) {
            if (typeof studentAnswer === 'string' && isBase64Image(studentAnswer)) {
                renderImage(doc, studentAnswer, { fit: [400, 300] });
            } else {
                const answerText = String(studentAnswer);
                if (answerText.includes('```') ||
                    answerText.includes('function') ||
                    answerText.includes('class') ||
                    answerText.includes('def ')) {
                    const codeMatch = answerText.match(/```[\s\S]*?```/g);
                    if (codeMatch) {
                        const parts = answerText.split(/```[\s\S]*?```/g);
                        parts.forEach((part, idx) => {
                            if (part.trim()) {
                                doc.text(part.trim(), { indent: 20 });
                            }
                            if (codeMatch[idx]) {
                                const code = codeMatch[idx].replace(/```\w*\n?/g, '').replace(/```/g, '');
                                formatCodeBlock(doc, code);
                            }
                        });
                    } else {
                        doc.text(answerText, { indent: 20 });
                    }
                } else {
                    doc.text(answerText, { indent: 20 });
                }
            }
        } else {
            doc.font('Helvetica-Oblique')
               .fill('#95a5a6')
               .text('No answer submitted', { indent: 20 })
               .font('Helvetica')
               .fill('#2c3e50');
        }

        if (answer?.feedback) {
            doc.moveDown(1);
            doc.font('Helvetica-Bold')
               .fontSize(10)
               .fill('#e67e22')
               .text('Feedback:', 70);

            doc.font('Helvetica')
               .fontSize(10)
               .fill('#7f8c8d')
               .text(answer.feedback, { indent: 20 });
        }

        doc.moveDown(1.5);

        if (index < questions.length - 1) {
            addHorizontalLine(doc, doc.y);
            doc.moveDown(1);
        }
    });

    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        doc.strokeColor('#bdc3c7')
           .lineWidth(0.5)
           .moveTo(60, doc.page.height - 50)
           .lineTo(535, doc.page.height - 50)
           .stroke();

        doc.fontSize(8)
           .fill('#95a5a6')
           .font('Helvetica')
           .text(
               `Generated on ${new Date().toLocaleDateString()} | Answer Sheet - ${submission.studentId?.name || 'Student'}`,
               60,
               doc.page.height - 45,
               { width: 375, align: 'center' }
           );

        doc.text(
            `Page ${i + 1} of ${totalPages}`,
            400,
            doc.page.height - 45,
            { width: 135, align: 'right' }
        );
    }
}

export { streamStudentPaperPdf };
