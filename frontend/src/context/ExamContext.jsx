import { useState, useEffect } from "react";
import axios from "axios";
import { ExamContext } from "./ExamContextCore";

const url = import.meta.env.VITE_API_URL;

export function ExamProvider({ children }) {
    const [exam, setExam] = useState(null);
    const [loading, setLoading] = useState(false);
    const [studentDetails, setStudentDetails] = useState(null);
    const [questionPaper, setQuestionPaper] = useState(null); 
    const [particularExamDetails, setParticularExamDetails] = useState(null);

    //get particular exam details
    const fetchParticularExamDetails = async (examId) => {
        try {
                const response = await axios.get(
                    `${import.meta.env.VITE_API_URL}/api/v1/exams/${examId}`,
                    { withCredentials: true }
                ); 
                if (response.status === 200) {
                    setParticularExamDetails(response.data);
                    return { success: true, data: response.data};
                }
        } catch (error) {
            console.error("Error fetching exam details:", error);
            return { success: false, error: error.response?.data?.message };
        }
    }

    //Restore exam + student session if present (survives navigation before context re-renders)
    useEffect(() => {
        const storedExam = sessionStorage.getItem("examDetails");
        if (storedExam) {
            setExam(JSON.parse(storedExam));
        }
        const storedSession = sessionStorage.getItem("studentExamSession");
        if (storedSession) {
            try {
                const { student, question } = JSON.parse(storedSession);
                if (student) setStudentDetails(student);
                if (question) setQuestionPaper(question);
            } catch {
                sessionStorage.removeItem("studentExamSession");
            }
        }
    }, []);

    //Persist exam details when updated
    useEffect(() => {
        if (exam) {
            sessionStorage.setItem("examDetails", JSON.stringify(exam));
        }
    }, [exam]);

    const validateExamCode = async (examCode) => {
        try {
            setLoading(true);
            const res = await axios.post(
                `${url}/api/v1/exams/validate-code`,
                { examCode },
                { withCredentials: true }
            );

            if (res.status === 200) {
                setExam(res.data.examDetails);
                return { success: true };
            }
        } catch (error) {
            console.log("Error in validating exam code:", error);
            return { success: false, error: error.response?.data?.message };
        } finally {
            setLoading(false);
        }
    };

    const submitStudentDetails = async (details) => {
        try {
            setLoading(true);
            const res = await axios.post(`${url}/api/v1/exams/submit-student-details`, details, { withCredentials: true});
            if(res.status === 200){
                const student = res.data.student;
                const question = res.data.question;
                setStudentDetails(student);
                setQuestionPaper(question);
                sessionStorage.setItem(
                    "studentExamSession",
                    JSON.stringify({ student, question })
                );
                return { success: true, student, question };
            }
        } catch (error) {
            const message =
                error?.response?.data?.message ||
                "Could not register for this exam. Please check your details and try again.";
            console.error("Error in submitting student details:", message, error);
            return { success: false, error: message };
        }finally{
            setLoading(false);
        }
    }

    const value = {
        exam,
        setExam,
        validateExamCode,
        submitStudentDetails,
        questionPaper,
        studentDetails,
        loading,
        fetchParticularExamDetails,
        particularExamDetails
    };

    return (
        <ExamContext.Provider value={value}>
            {children}
        </ExamContext.Provider>
    );
}

