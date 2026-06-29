import { useState } from "react";
import { Outlet } from "react-router-dom";
import { TeacherProvider } from "../context/TeacherContext";
import { ExamProvider } from "../context/ExamContext";
import TeacherSidebar from "../pages/teacher/components/TeacherSidebar";
import TeacherNavbar from "../pages/teacher/components/TeacherNavbar";

function TeacherShell() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div
            className="flex h-screen bg-[#080b12] text-gray-100 overflow-hidden"
            style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
        >
            <TeacherSidebar
                mobileOpen={mobileOpen}
                onMobileClose={() => setMobileOpen(false)}
                collapsed={collapsed}
                onToggleCollapse={() => setCollapsed((prev) => !prev)}
            />

            <div className="flex-1 flex flex-col min-w-0 min-h-0">
                <TeacherNavbar onMenuClick={() => setMobileOpen(true)} />
                <main className="flex-1 overflow-y-auto min-h-0">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export function TeacherExamLayout() {
    return (
        <TeacherProvider>
            <ExamProvider>
                <TeacherShell />
            </ExamProvider>
        </TeacherProvider>
    );
}
