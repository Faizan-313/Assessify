import express from "express"
import authenticateToken from "../middlewares/auth.middleware.js"
import { 
    dashboardData,
    studentList,
    evaluatePaper,
    completeEvaluation,
    getStudent,
    downloadStudentPaper,
} from "../controllers/teacher.controller.js";

const router = express.Router()

router.get('/dashboard', authenticateToken, dashboardData);
router.get('/exam/students', authenticateToken, studentList);
router.get('/exam/student', authenticateToken, getStudent);
router.get('/exam/:examId/download/:studentId/pdf', authenticateToken, downloadStudentPaper);
router.post('/evaluate-paper', authenticateToken, evaluatePaper);
router.post('/exam/complete', authenticateToken, completeEvaluation);

export default router