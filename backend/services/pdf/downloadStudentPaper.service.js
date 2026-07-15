import { Exam } from "../../models/exam.model.js";
import { ExamSubmission } from "../../models/examSubmission.model.js";
import PDFDocument from "pdfkit";
import {
    isBase64Image,
    renderImage,
    formatCodeBlock,
    C,
    MARGIN,
    PAGE_HEIGHT,
    PAGE_WIDTH,
    CONTENT_WIDTH
} from "./pdfHelpers.js";

//Helpers 
function hRule(doc, y, { color = C.rule, weight = 0.5 } = {}) {
    doc.save()
        .strokeColor(color)
        .lineWidth(weight)
        .moveTo(MARGIN, y)
        .lineTo(PAGE_WIDTH - MARGIN, y)
        .stroke()
        .restore();
}

function label(doc, text, x, y, width = 120) {
    doc.font("Helvetica")
        .fontSize(9)
        .fill(C.lightGray)
        .text(text.toUpperCase(), x, y, { width, characterSpacing: 0.4 });
}

function value(doc, text, x, y, width = 160) {
    doc.font("Helvetica")
        .fontSize(10)
        .fill(C.darkGray)
        .text(String(text || "—"), x, y, { width });
}

function sectionHeading(doc, text) {
    doc.moveDown(0.8);
    doc.font("Helvetica-Bold")
        .fontSize(8)
        .fill(C.lightGray)
        .text(text.toUpperCase(), MARGIN, doc.y, {
            characterSpacing: 1.2,
            width: CONTENT_WIDTH,
        });
    doc.moveDown(0.4);
    hRule(doc, doc.y, { color: C.rule, weight: 0.75 });
    doc.moveDown(0.8);
}

//Main Export 
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
        .populate({ path: "studentId", select: "name rollNumber collegeId batch" })
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

    const filename = `answer-sheet-${
        submission.studentId?.rollNumber || submission.studentId?._id
    }.pdf`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/pdf");

    const doc = new PDFDocument({ margin: MARGIN, size: "A4", bufferPages: true });
    doc.pipe(res);
    await renderStudentPaperPdf(doc, exam, submission);
    doc.end();
}

async function renderStudentPaperPdf(doc, exam, submission) {
    const student = submission.studentId || {};

    // Cover / Header
    // Institution / exam title
    doc.font("Helvetica-Bold")
        .fontSize(18)
        .fill(C.black)
        .text(exam.title || "Examination Answer Sheet", MARGIN, MARGIN, {
            width: CONTENT_WIDTH,
            align: "center",
        });

    doc.moveDown(0.3);
    doc.font("Helvetica")
        .fontSize(10)
        .fill(C.lightGray)
        .text("Student Answer Sheet", { width: CONTENT_WIDTH, align: "center" });

    doc.moveDown(1.2);
    hRule(doc, doc.y, { color: C.black, weight: 1.5 });
    doc.moveDown(0.15);
    hRule(doc, doc.y, { color: C.black, weight: 0.5 });
    doc.moveDown(1.4);

    // Student + Exam Info — two-column grid 
    const col1X = MARGIN;
    const col2X = MARGIN + CONTENT_WIDTH / 2 + 10;
    const colW  = CONTENT_WIDTH / 2 - 10;

    const studentRows = [
        { lbl: "Student Name",  val: student.name       },
        { lbl: "Roll Number",   val: student.rollNumber  },
        { lbl: "College ID",    val: student.collegeId   },
        { lbl: "Batch",         val: student.batch       },
    ];

    const examRows = [
        { lbl: "Exam Code",   val: exam.examCode   },
        { lbl: "Branch",      val: exam.branch     },
        { lbl: "Semester",    val: exam.semester   },
        { lbl: "Session",     val: exam.session    },
        { lbl: "Total Marks", val: exam.totalMarks },
    ];

    const infoTop = doc.y;

    // Left column — student
    doc.font("Helvetica-Bold")
        .fontSize(8)
        .fill(C.lightGray)
        .text("STUDENT INFORMATION", col1X, infoTop, {
            width: colW, characterSpacing: 1,
        });

    let leftY = infoTop + 16;
    studentRows.forEach(({ lbl, val: v }) => {
        label(doc, lbl,      col1X,       leftY, colW * 0.45);
        value(doc, v,        col1X + colW * 0.46, leftY, colW * 0.54);
        leftY += 18;
    });

    // Right column — exam
    doc.font("Helvetica-Bold")
        .fontSize(8)
        .fill(C.lightGray)
        .text("EXAMINATION DETAILS", col2X, infoTop, {
            width: colW, characterSpacing: 1,
        });

    let rightY = infoTop + 16;
    examRows.forEach(({ lbl, val: v }) => {
        label(doc, lbl,       col2X,        rightY, colW * 0.45);
        value(doc, v,         col2X + colW * 0.46, rightY, colW * 0.54);
        rightY += 18;
    });

    // Advance cursor past both columns
    doc.y = Math.max(leftY, rightY) + 4;
    doc.moveDown(1);

    //Score Summary bar
    hRule(doc, doc.y, { color: C.rule });
    doc.moveDown(0.7);

    const answers      = submission.answers || [];
    const questions    = exam.questionPaper?.questions || [];
    const totalObtained = answers.reduce((s, a) => s + (a.marksObtained ?? 0), 0);
    const totalPossible = questions.reduce((s, q) => s + (q.marks ?? 0), 0);
    const pct           = totalPossible > 0
        ? Math.round((totalObtained / totalPossible) * 100)
        : 0;

    const scoreColor =
        pct >= 80 ? C.markFull :
        pct >= 40 ? C.markPartial :
                    C.markZero;

    doc.font("Helvetica-Bold")
        .fontSize(10)
        .fill(C.midGray)
        .text("TOTAL SCORE", MARGIN, doc.y, { continued: true, width: CONTENT_WIDTH - 80 });

    doc.font("Helvetica-Bold")
        .fontSize(13)
        .fill(scoreColor)
        .text(`${totalObtained} / ${totalPossible}  (${pct}%)`, {
            align: "right",
            width: CONTENT_WIDTH,
        });

    doc.moveDown(0.7);
    hRule(doc, doc.y, { color: C.rule });
    doc.moveDown(1.6);

    // Questions & Answers
    questions.forEach((question, index) => {
        // Page break guard
        if (doc.y > PAGE_HEIGHT - 220) {
            doc.addPage();
            doc.y = MARGIN;
        }

        const answer        = answers.find(
            (a) => String(a.questionId) === String(question._id)
        );
        const marksObtained = answer?.marksObtained ?? 0;
        const totalMarks    = question.marks ?? 0;
        const marksColor    =
            marksObtained === totalMarks ? C.markFull :
            marksObtained > 0            ? C.markPartial :
                                            C.markZero;

        //  Question number + marks badge (single line) 
        const qNumText    = `Q${index + 1}.`;
        const marksText   = `${marksObtained} / ${totalMarks} marks`;
        const badgeWidth  = 90;

        doc.font("Helvetica-Bold")
            .fontSize(11)
            .fill(C.black)
            .text(qNumText, MARGIN, doc.y, {
                continued: true,
                width: CONTENT_WIDTH - badgeWidth,
            });

        doc.font("Helvetica")
            .fontSize(9)
            .fill(marksColor)
            .text(marksText, {
                align: "right",
                width: CONTENT_WIDTH,
            });

        doc.moveDown(0.5);

        // Question text / image 
        if (question.image) {
            renderImage(doc, question.image, { fit: [CONTENT_WIDTH, 300] });
            doc.moveDown(0.6);
        }

        if (question.questionText) {
            renderTextOrCode(doc, question.questionText, {
                font:     "Helvetica",
                fontSize: 10.5,
                fill:     C.darkGray,
                indent:   0,
            });
        }

        doc.moveDown(0.9);

        // Answer
        doc.font("Helvetica-Bold")
            .fontSize(9)
            .fill(C.lightGray)
            .text("STUDENT'S ANSWER", MARGIN, doc.y, {
                characterSpacing: 0.8,
                width: CONTENT_WIDTH,
            });

        doc.moveDown(0.35);

        const studentAnswer = answer?.answerText || answer?.answer || "";

        if (studentAnswer) {
            if (typeof studentAnswer === "string" && isBase64Image(studentAnswer)) {
                renderImage(doc, studentAnswer, { fit: [CONTENT_WIDTH, 280] });
            } else {
                renderTextOrCode(doc, String(studentAnswer), {
                    font:     "Helvetica",
                    fontSize: 10.5,
                    fill:     C.black,
                    indent:   0,
                });
            }
        } else {
            doc.font("Helvetica-Oblique")
                .fontSize(10)
                .fill(C.lightGray)
                .text("No answer submitted", MARGIN, doc.y, { width: CONTENT_WIDTH });
        }

        doc.moveDown(1.2);

        // — Thin rule between questions (skip after last) ———————————————
        if (index < questions.length - 1) {
            hRule(doc, doc.y, { color: C.ruleLight, weight: 0.5 });
            doc.moveDown(1.2);
        }
    });

    //Per-page footer 
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);

        const footerY = PAGE_HEIGHT - 36;
        hRule(doc, footerY - 6, { color: C.rule, weight: 0.5 });

        doc.font("Helvetica")
            .fontSize(8)
            .fill(C.lightGray)
            .text(
                `${exam.title || "Answer Sheet"}  ·  ${student.name || "Student"}  ·  Generated ${new Date().toLocaleDateString()}`,
                MARGIN, footerY,
                { width: CONTENT_WIDTH - 80, align: "left" }
            )
            .text(
                `Page ${i + 1} of ${totalPages}`,
                MARGIN, footerY,
                { width: CONTENT_WIDTH, align: "right" }
            );
    }
}

// Render plain text or fenced code blocks
function renderTextOrCode(doc, text, { font, fontSize, fill, indent }) {
    const fenceRe  = /```[\w]*\n?([\s\S]*?)```/g;
    const hasFence = fenceRe.test(text);
    fenceRe.lastIndex = 0;

    if (hasFence) {
        const parts = text.split(/```[\w]*\n?[\s\S]*?```/g);
        const codes = [...text.matchAll(/```[\w]*\n?([\s\S]*?)```/g)].map(
            (m) => m[1]
        );

        parts.forEach((part, idx) => {
            if (part.trim()) {
                doc.font(font)
                    .fontSize(fontSize)
                    .fill(fill)
                    .text(part.trim(), MARGIN + indent, doc.y, {
                        width: CONTENT_WIDTH - indent,
                    });
                doc.moveDown(0.4);
            }
            if (codes[idx] !== undefined) {
                formatCodeBlock(doc, codes[idx]);
                doc.moveDown(0.4);
            }
        });
    } else {
        doc.font(font)
           .fontSize(fontSize)
           .fill(fill)
           .text(text, MARGIN + indent, doc.y, {
               width: CONTENT_WIDTH - indent,
           });
    }
}

export { streamStudentPaperPdf };