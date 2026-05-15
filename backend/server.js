import express from "express";
import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import http from "http"; 
import connectDB from "./database/db.js";
import { setupSocket } from "./socket/socket.js";

import authRouter from "./routes/auth.routes.js";
import examRouter from "./routes/exam.routes.js";
import dashboardRouter from "./routes/teacher.routes.js";
import accRecoveryRouter from "./routes/accRecovery.routes.js";
import autoEvaluationRouter from "./routes/autoEvaluation.routes.js";

const app = express();

// REQUIRED for Render to handle "secure: true" correctly
app.set("trust proxy", 1);

const port = process.env.PORT || 3000;

// middleware
app.use(compression());
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

//images path
app.use("/images", express.static("public/images"));

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    })
);

connectDB();

//Create HTTP server for Socket.io
const server = http.createServer(app);

//Initialize Socket.io with that HTTP server
setupSocket(server);

// routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/exams", examRouter);
app.use("/api/v1/teacher", dashboardRouter);
app.use("/api/v1/forgot-password", accRecoveryRouter);
app.use("/api/v1/:examId/auto-evaluation", autoEvaluationRouter)

server.listen(port, () => {
    console.log(`Server listening on PORT ${port}`);
});
