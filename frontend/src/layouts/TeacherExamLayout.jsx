import { Outlet } from "react-router-dom";
import { TeacherProvider } from "../context/TeacherContext";
import { ExamProvider } from "../context/ExamContext";
import NavBar from "../components/NavBar";

export function TeacherExamLayout() {
    return (
        <TeacherProvider>
            <ExamProvider>
                <NavBar />
                <Outlet />
            </ExamProvider>
        </TeacherProvider>
    );
}
