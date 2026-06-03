import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import { apiCall } from "../api/api";
import { TeacherContext } from "./TeacherContextCore";

export const TeacherProvider = ({ children }) => {
    const [students, setStudents] = useState([]);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [studentsError, setStudentsError] = useState(null);
    const [studentsPagination, setStudentsPagination] = useState({
        currentPage: 1,
        pages: 0,
        total: 0,
    });

    const [exams, setExams] = useState([]);
    const [examsLoading, setExamsLoading] = useState(false);
    const [examsError, setExamsError] = useState(null);

    const fetchStudents = useCallback(async (examId, page = 1, limit = 20) => {
        try {
            setStudentsLoading(true);
            setStudentsError(null);
            const response = await apiCall(`/api/v1/teacher/exam/students`, "GET", {
                params: { examId, page, limit },
            });

            if (response.status === 200) {
                setStudents(Array.isArray(response.data.students) ? response.data.students : []);
                setStudentsPagination({
                    currentPage: response.data.currentPage || page,
                    pages: response.data.pages || 0,
                    total: response.data.total || 0,
                });
            }
        } catch {
            setStudentsError("Failed to load students");
            toast.error("Failed to load students");
        } finally {
            setStudentsLoading(false);
        }
    }, []);

    const fetchExams = useCallback(async () => {
        try {
            setExamsLoading(true);
            setExamsError(null);
            const response = await apiCall(`/api/v1/teacher/dashboard`, "GET");

            if (response.data?.success) {
                setExams(response.data.exams || []);
            } else {
                setExamsError("Failed to load exams");
                toast.error("Failed to load exams");
            }
        } catch  {
            setExamsError("Error loading dashboard");
            toast.error("Error loading dashboard");
        } finally {
            setExamsLoading(false);
        }
    }, []);

    const removeExam = useCallback((id) => {
        setExams((prev) => prev.filter((exam) => exam._id !== id));
    }, []);

    const deleteExam = useCallback(async (id) => {
        try {
            const res = await apiCall(`/api/v1/exams/${id}`, "DELETE");
            if (res?.status === 200) {
                removeExam(id);
                toast.success("Exam deleted successfully.");
                setExamsError(null);
            } else {
                setExamsError("Failed to delete exam");
                toast.error("Failed to delete exam");
            }
        } catch (err) {
            console.error("Failed to delete exam:", err);
            setExamsError("Failed to delete exam");
            toast.error("Failed to delete exam");
        }
    }, [removeExam]);

    return (
        <TeacherContext.Provider
            value={{
                students,
                studentsLoading,
                studentsError,
                fetchStudents,
                studentsPagination,
                exams,
                examsLoading,
                examsError,
                fetchExams,
                deleteExam,
                removeExam,
            }}
        >
            {children}
        </TeacherContext.Provider>
    );
};

