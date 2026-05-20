import { Outlet } from "react-router-dom";
import { ExamProvider } from "../context/ExamContext";

export function ExamLayout() {
    return (
        <ExamProvider>
            <Outlet />
        </ExamProvider>
    );
}
