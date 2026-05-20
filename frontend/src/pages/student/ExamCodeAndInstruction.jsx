import React from "react";
import ExamInstructions from "./components/ExamInstruction"
import { toast } from "react-hot-toast";
import { useExam } from "../../context/ExamContextCore";
import { useNavigate } from "react-router-dom";
import { checkCamera } from "../../features/ai-monitoring/checkCamera.js";

function ExamCodeAndInstruction() {
    const [openCodeWindow, setOpenCodeWindow] = React.useState(false);
    const [examCode, setExamCode] = React.useState("");
    const [loading, setLoading] = React.useState(false)
    const [checkingCamera, setCheckingCamera] = React.useState(false);

    const { validateExamCode } = useExam();
    const navigate = useNavigate();

    const checkCheckBox = () => {
        const checkbox = document.getElementById("instructionsAck");
        if(!checkbox.checked){
            toast.error("Please acknowledge that you have read the instructions.");
            return false;
        }
        return true;
    }

    const handleClick = async () => {
        if(!checkCheckBox()) return;
        setCheckingCamera(true);

        const result = await checkCamera();
        if(!result.ok){
            toast.error(result.reason);
            setCheckingCamera(false);
            return;
        }
        toast.success("Camera access granted. You will be monitored during the exam.");
        setCheckingCamera(false);
        setOpenCodeWindow(true);
    }

    const handleEnterExam = async () => {
        if(!examCode.trim()){
            toast.error("Please enter a valid exam code.");
            return;
        }
        setLoading(true)
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            const res = await validateExamCode(examCode.trim());
            if (res?.success) {
                navigate("/exam/student/details");
                return;
            }

            if (res?.error) {
                toast.error(res.error);
                return;
            }

             // fallback (unexpected response)
            toast.error("Invalid response from server");

        } catch (error) {
            console.error(error);
            toast.error("Something went wrong. Please try again");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#f0f8f7] to-[#e0f2f0] dark:from-[#092635] dark:to-[#1b4242] pt-24 pb-12 px-4 sm:px-6">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-5 text-[#5c8374] dark:text-[#9ec8b9]">
                    Exam Portal
                </h1>
                
                <ExamInstructions />
                
                <div className="flex items-start sm:items-center justify-center mb-6 mt-4 px-2">
                    <input 
                        type="checkbox" 
                        id="instructionsAck"
                        required
                        className="mt-1 mr-3 w-4 h-4 sm:w-5 sm:h-5 rounded focus:ring-[#5c8374] text-[#5c8374] cursor-pointer flex-shrink-0" 
                    />
                    <label htmlFor="instructionsAck" className="text-sm sm:text-base text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                        I have read and understood the instructions.
                    </label>
                </div>

                <div className="text-center">
                    <button
                        className="px-6 sm:px-8 py-3 sm:py-3.5 text-base sm:text-lg font-semibold rounded-xl bg-gradient-to-r from-[#5c8374] to-[#1b4242] text-white shadow-lg hover:shadow-[#5c8374]/50 hover:scale-105 transition-all duration-300"
                        onClick={handleClick}
                    >
                        Enter Exam Code
                    </button>
                </div>

                {openCodeWindow && !checkingCamera && (
                    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md text-center relative animate-fade-in">
                            <button
                                onClick={() => setOpenCodeWindow(false)}
                                className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                ✕
                            </button>

                            <div className="mb-6">
                                <div className="w-16 h-16 bg-gradient-to-r from-[#5c8374] to-[#1b4242] rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">🔐</span>
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-800 dark:text-white">
                                    Enter Exam Code
                                </h2>
                                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                                    Please enter the exam code provided by your instructor to begin.
                                </p>
                            </div>

                            <input
                                type="text"
                                placeholder="Type your exam code here"
                                value={examCode}
                                onChange={(e) => setExamCode(e.target.value)}
                                className="w-full p-3 sm:p-4 text-gray-800 dark:text-white bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#5c8374] focus:border-[#5c8374] focus:outline-none mb-6 text-sm sm:text-base transition-all"
                                autoFocus
                            />
                            
                            <button
                                onClick={handleEnterExam}
                                className="w-full px-6 py-3 sm:py-3.5 text-base sm:text-lg font-semibold rounded-xl bg-gradient-to-r from-[#5c8374] to-[#1b4242] text-white shadow-lg hover:shadow-[#5c8374]/50 hover:scale-105 transition-all duration-300"
                            >
                                {loading ? "Verifying ...": "Start Assessment"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ExamCodeAndInstruction;