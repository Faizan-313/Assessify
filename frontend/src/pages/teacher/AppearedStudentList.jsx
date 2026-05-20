import React, { useEffect, useState } from "react";
import {
    Search, ClipboardCheck, AlertCircle, Loader2, ChevronLeft, ChevronRight
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useTeacher } from "../../context/TeacherContextCore";
import { useExam } from "../../context/ExamContextCore";
import StudentRow, { StudentTableHeader } from "./components/StudentRow";

function AppearedStudentList() {
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const { examId } = useParams();
    const navigate = useNavigate();
    const { fetchStudents, students, studentsLoading, studentsError, studentsPagination } = useTeacher();
    const { particularExamDetails, fetchParticularExamDetails } = useExam();

    useEffect(() => {
        if (examId) {
            fetchStudents(examId, currentPage);
            fetchParticularExamDetails(examId);
        }
    }, [examId, currentPage]);
    
    const exam = particularExamDetails || {};

    const handleEvaluate = (studentId) => {
        navigate(`/teacher/evalvate/${examId}/${studentId}`);
    };
    
    const filteredStudents = Array.isArray(students)
        ? students.filter(
            (s) =>
                s.name?.toLowerCase().includes(search.toLowerCase()) ||
                s.rollNumber?.toLowerCase().includes(search.toLowerCase())
        )
        : [];

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < studentsPagination.pages) {
            setCurrentPage(currentPage + 1);
        }
    };

    if (studentsLoading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-slate-50 via-[#9ec8b9] to-[#5c8374] dark:from-gray-900 dark:via-slate-900 dark:to-gray-900">
                <Loader2 className="w-12 h-12 animate-spin text-[#5c8374] dark:text-[#9ec8b9] mb-4" />
                <p className="text-gray-600 dark:text-gray-400 font-medium">Loading students...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#f0f8f7] via-[#e8f5f3] to-[#dff1ee] dark:from-[#092635] dark:via-[#1b4242] dark:to-[#0d3a47] py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto pt-20">
                <div className="mb-8">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-[#5c8374] dark:bg-[#9ec8b9] rounded-xl shadow-lg">
                                    <ClipboardCheck className="w-7 h-7 text-white" />
                                </div>
                                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                                    Evaluation Panel
                                </h1>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 ml-14">
                                Manage and evaluate student exam papers efficiently
                            </p>
                        </div>

                        <div className="relative w-full lg:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search by name or roll number..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl 
                                    bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 
                                    placeholder-gray-500 dark:placeholder-gray-400
                                    shadow-sm hover:shadow-md
                                    focus:ring-2 focus:ring-[#5c8374] focus:border-[#5c8374] dark:focus:ring-[#9ec8b9]
                                    outline-none transition-all duration-200"
                            />
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-[#5c8374] to-[#1b4242] dark:from-[#9ec8b9] dark:to-[#5c8374] px-6 py-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <ClipboardCheck className="w-5 h-5" />
                                Exam Details
                            </h2>
                        </div>
                        <div className="p-6">
                            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                        Exam Title
                                    </p>
                                    <p className="text-base font-semibold text-gray-900 dark:text-white">
                                        {exam.title || "N/A"}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                        Exam Code
                                    </p>
                                    <p className="text-base font-mono font-medium text-gray-900 dark:text-white">
                                        {exam.examCode || "N/A"}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                        Duration
                                    </p>
                                    <p className="text-base font-semibold text-gray-900 dark:text-white">
                                        {exam.duration ? `${exam.duration} minutes` : "N/A"}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                        Total Marks
                                    </p>
                                    <p className="text-2xl font-bold text-[#5c8374] dark:text-[#9ec8b9]">
                                        {exam.totalMarks || "N/A"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {studentsError && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-400 rounded-lg shadow-md">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-semibold text-red-800 dark:text-red-300 mb-1">
                                    Error Loading Students
                                </p>
                                <p className="text-sm text-red-700 dark:text-red-400">{studentsError}</p>
                                <button
                                    onClick={() => fetchStudents(examId, currentPage)}
                                    className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {filteredStudents.length === 0 && !studentsError && (
                    <div className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-12 text-center">
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                                <ClipboardCheck className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                {students.length === 0 ? "No Students Enrolled" : "No Results Found"}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                {students.length === 0 
                                    ? "There are no students enrolled for this exam yet." 
                                    : `No students match your search "${search}"`}
                            </p>
                            {search && (
                                <button
                                    onClick={() => setSearch("")}
                                    className="px-6 py-2.5 bg-[#5c8374] hover:bg-[#1b4242] dark:bg-[#9ec8b9] dark:hover:bg-[#5c8374] text-white font-medium rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                                >
                                    Clear Search
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {filteredStudents.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <StudentTableHeader />
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredStudents.map((student, index) => (
                                        <StudentRow
                                            key={student._id}
                                            student={student}
                                            index={index}
                                            onEvaluate={handleEvaluate}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Showing <span className="font-semibold text-gray-900 dark:text-white">{filteredStudents.length}</span> of{" "}
                                    <span className="font-semibold text-gray-900 dark:text-white">{studentsPagination.total}</span> students
                                </p>
                                
                                {studentsPagination.pages > 1 && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handlePreviousPage}
                                            disabled={currentPage === 1}
                                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                        </button>
                                        
                                        <span className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                                            Page {studentsPagination.currentPage} of {studentsPagination.pages}
                                        </span>
                                        
                                        <button
                                            onClick={handleNextPage}
                                            disabled={currentPage >= studentsPagination.pages}
                                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AppearedStudentList;