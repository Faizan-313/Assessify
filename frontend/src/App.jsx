import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { ExamProvider } from "./context/ExamContext";
import { TeacherProvider } from "./context/TeacherContext";
import { ProctoringProvider } from "./context/ProctoringContext";

//routes
import ProtectedRoute from "./routes/ProtectedRoute";
import PublicOnlyRoute from "./routes/PublicOnlyRoute";

//pages
import Home from "./pages/Home"
import NavBar from "./components/NavBar"
import ExamCodeAndInstruction from "./pages/student/ExamCodeAndInstruction";
import Signup from "./pages/auth/Signup";
import Signin from "./pages/auth/Signin";
import PageNotFound from "./pages/PageNotFound";
import CreateExam from "./pages/teacher/CreateExam";
import TeacherDashboard from "./pages/teacher/Dashboard";
import StudentDetailsFilling from "./pages/student/StudentDetailsFilling";
import ExamSection from "./pages/student/ExamSection";
import ThankYou from "./pages/ThankYou";
import AppearedStudentList from "./pages/teacher/AppearedStudentList";
import ViewPaper from "./pages/teacher/ViewPaper";
import MonitorExam from "./pages/teacher/MonitorExam";
import ForgotPassword from "./pages/auth/ForgotPassword";
import Docs from "./pages/Docs";

function MainLayout() {
  return (
    <>
      <NavBar />
      <Toaster position="top-center" reverseOrder={false} />
      <Outlet />
    </>
  );
}

function MinimalLayout() {
  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <Outlet />
    </>
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

        <Route path="/exam" element={<ExamCodeAndInstruction />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/create-exam" element={<CreateExam />} />
          <Route path="/dashboard" element={<TeacherDashboard />} />
          <Route path="/teacher/evaluation/:examId" element={<AppearedStudentList />} />
          <Route path="/teacher/evalvate/:examId/:studentId" element={<ViewPaper />} />
          <Route path="/teacher/monitor/:examId" element={<MonitorExam />} />
        </Route>

      </Route>

      <Route element={<MinimalLayout />}>
        <Route path="/exam/student/details" element={<StudentDetailsFilling />} />
        <Route path="/exam/student/section" element={<ExamSection />} />
        <Route path="/thank-you/:name" element={<ThankYou />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  )
}

function App() {

  return (
    <AuthProvider>
      <ExamProvider>
        <TeacherProvider>
          <Router>
            <ProctoringProvider>
              <AppContent />
            </ProctoringProvider>
          </Router>
        </TeacherProvider>
      </ExamProvider>
    </AuthProvider>
  )
}

export default App
