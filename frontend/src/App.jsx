import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { lazy, Suspense } from "react";
import { LoadingFallback } from "./components/LoadingFallback";

const ProctoringProvider = lazy(() =>
  import("./context/ProctoringContext").then((m) => ({ default: m.ProctoringProvider }))
);

const ExamLayout = lazy(() =>
  import("./layouts/ExamLayout").then((m) => ({ default: m.ExamLayout }))
);

const TeacherExamLayout = lazy(() =>
  import("./layouts/TeacherExamLayout").then((m) => ({ default: m.TeacherExamLayout }))
);

//routes
import ProtectedRoute from "./routes/ProtectedRoute";
import PublicOnlyRoute from "./routes/PublicOnlyRoute";

//pages - only critical pages loaded upfront
import Home from "./pages/common/Home";
import NavBar from "./components/NavBar";
import PageNotFound from "./pages/common/PageNotFound";

// Lazy load all pages to avoid loading unused code on 3G
const ExamCodeAndInstruction = lazy(() => import("./pages/student/ExamCodeAndInstruction"));
const ThankYou = lazy(() => import("./pages/common/ThankYou"));
const Signup = lazy(() => import("./pages/auth/Signup"));
const Signin = lazy(() => import("./pages/auth/Signin"));
const CreateExam = lazy(() => import("./pages/teacher/CreateExam"));
const TeacherDashboard = lazy(() => import("./pages/teacher/Dashboard"));
const StudentDetailsFilling = lazy(() => import("./pages/student/StudentDetailsFilling"));
const ExamSection = lazy(() => import("./pages/student/ExamSection"));
const AppearedStudentList = lazy(() => import("./pages/teacher/AppearedStudentList"));
const ViewPaper = lazy(() => import("./pages/teacher/ViewPaper"));
const MonitorExam = lazy(() => import("./pages/teacher/MonitorExam"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const Docs = lazy(() => import("./pages/common/Docs"));

function MainLayout() {
  return (
    <>
      <NavBar />
      <Outlet />
    </>
  );
}

function MinimalLayout() {
  return <Outlet />;
}

function ProctoredLayout() {
  return (
    <ProctoringProvider>
      <Outlet />
    </ProctoringProvider>
  );
}

function AppContent() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/docs" element={<Docs />} />

        <Route element={<PublicOnlyRoute />}>
          <Route path="/signup" element={<Signup />} />
          <Route path="/signin" element={<Signin />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
        </Route>
      </Route>

      <Route element={<ExamLayout />}> 
        <Route path="/exam" element={<ExamCodeAndInstruction />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<TeacherExamLayout />}>
          <Route path="/create-exam" element={<CreateExam />} />
          <Route path="/dashboard" element={<TeacherDashboard />} />
          <Route path="/teacher/evaluation/:examId" element={<AppearedStudentList />} />
          <Route path="/teacher/evalvate/:examId/:studentId" element={<ViewPaper />} />
          <Route path="/teacher/monitor/:examId" element={<MonitorExam />} />
        </Route>
      </Route>

      <Route element={<ExamLayout />}> 
        <Route element={<ProctoredLayout />}>
          <Route path="/exam/student/details" element={<StudentDetailsFilling />} />
          <Route path="/exam/student/section" element={<ExamSection />} />
        </Route>
      </Route>

      <Route element={<MinimalLayout />}>
        <Route path="/thank-you/:name" element={<ThankYou />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-center" reverseOrder={false} />
        <Suspense fallback={<LoadingFallback />}>
          <AppContent />
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App
