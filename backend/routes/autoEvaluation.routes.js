import express from "express";
import authenticateToken from "../middlewares/auth.middleware.js";
import { startAutoEvaluation, getAutoEvaluationStatus } from "../controllers/auto-evaluation/autoEvaluation.controller.js";

// mergeParams: true so :examId from the parent mount path (/api/v1/:examId/auto-evaluation)
// is visible to the handlers via req.params.examId.
const router = express.Router({ mergeParams: true });

router.post("/start", authenticateToken, startAutoEvaluation);
router.get("/status", authenticateToken, getAutoEvaluationStatus);

export default router;