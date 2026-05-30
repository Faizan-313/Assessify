import { CheckCircle, Clock, FileText, Home, Award } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

function ThankYou() {
    const navigate = useNavigate();
    const { name } = useParams();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl w-full">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700 text-center">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                    </div>

                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                        Exam Submitted Successfully!
                    </h1>

                    <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                        Thank you{" "}
                        <span className="font-bold text-2xl text-gray-900 dark:text-amber-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md shadow-sm">
                            {name}
                        </span>{" "}
                        for completing the exam. Your answers have been recorded and submitted for evaluation.
                        You will be notified once the results are available.
                    </p>


                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="bg-[#9ec8b9] dark:bg-[#092635]/20 rounded-xl p-4 border border-[#9ec8b9] dark:border-[#092635]">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <FileText className="w-5 h-5 text-[#1b4242] dark:text-[#5c8374]" />
                                <span className="text-sm font-medium text-[#092635] dark:text-[#9ec8b9]">Status</span>
                            </div>
                            <p className="text-lg font-semibold text-[#092635] dark:text-[#9ec8b9]">Submitted</p>
                        </div>

                        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-700">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
                                <span className="text-sm font-medium text-green-700 dark:text-green-300">Time</span>
                            </div>
                            <p className="text-lg font-semibold text-green-900 dark:text-green-100">
                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>

                        <div className="bg-[#f0f8f7] dark:bg-[#5c8374]/20 rounded-xl p-4 border border-[#9ec8b9] dark:border-[#5c8374]">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Award className="w-5 h-5 text-[#5c8374] dark:text-[#9ec8b9]" />
                                <span className="text-sm font-medium text-[#5c8374] dark:text-[#9ec8b9]">Result</span>
                            </div>
                            <p className="text-lg font-semibold text-[#1b4242] dark:text-[#9ec8b9]">Pending</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-[#1b4242] to-[#092635] hover:from-[#1b4242] hover:to-[#092635] text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold"
                        >
                            <Home className="w-5 h-5" />
                            Back to Home
                        </button>

                        <button
                            onClick={() => window.print()}
                            className="flex items-center justify-center gap-3 px-6 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-300 font-semibold"
                        >
                            <FileText className="w-5 h-5" />
                            Print Confirmation
                        </button>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Submitted on {new Date().toLocaleDateString()}
                        </p>
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Need help? <a href="#" className="text-[#5c8374] dark:text-[#9ec8b9] hover:underline">Contact Exam Support</a>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default ThankYou;