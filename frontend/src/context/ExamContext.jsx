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

    //Restore exam details if present
    useEffect(() => {
        const storedExam = sessionStorage.getItem("examDetails");
        if (storedExam) {
            setExam(JSON.parse(storedExam));
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
                setStudentDetails(res.data.student);
                setQuestionPaper(res.data.question);
                return { success: true };
            }
        } catch (error) {
            console.log("Error in submitting student details: ", error);
            return { success: false, error: error?.response?.data?.message };
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

