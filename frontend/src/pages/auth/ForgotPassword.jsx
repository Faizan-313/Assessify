import { useState } from "react"
import { Mail, ArrowLeft, Lock, EyeClosed, Eye } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import toast from "react-hot-toast"
import axios from "axios"

// using same-origin `/api` proxy routes

function ForgotPassword() {
    const [formData, setFormData] = useState({
        email: "",
        verificationCode: "",
        password: "",
        confirmPassword: ""
    })
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false)
    const [step, setStep] = useState("email")                        // email, verification-code, resetPassword
    const [message, setMessage] = useState("")

    const navigate = useNavigate()

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    }

    const handleEmailSubmit = async (e) => {
        e.preventDefault()
        setMessage("")

        if (!formData.email || formData.email.trim() === "") {
            toast.error("Please enter your email")
            return
        }
        if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
            toast.error("Please enter a valid email address")
            return;
        }
        const email = formData.email

        setIsLoading(true)

        try {
            const response = await axios.post(
                `/api/v1/forgot-password/verify-email`,
                { email },
                { withCredentials: true }
            );
            if (response.status == 200) {
                setMessage(response.data.message || `verfication code sent to ${email}`);
                setStep("verification-code")
            }
        } catch (error) {
            console.log(error);
            const errorMessage = error?.response?.data?.message || "Could not send the mail. Please try again later.";
            setMessage(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false)
        }
    }

    const handleCodeVerification = async (e) => {
        e?.preventDefault?.()
        setMessage("")

        const code = (formData.verificationCode || "").trim()
        if (!code || !/^\d{6}$/.test(code)) {
            toast.error("Please enter a valid verification code (6 digits).")
            return
        }

        setIsLoading(true)
        try {
            const response = await axios.post(
                `/api/v1/forgot-password/verify-reset-code`,
                { code },
                { withCredentials: true }
            );
            if (response.status == 200) {
                setMessage(response.data.message || "verification sucessfull")
                setStep("resetPassword")
            }
        } catch (error) {
            console.log(error);
            toast.error(
                error?.response?.data?.message ||
                "Something went wrong. Please try again"
            );
        } finally {
            setIsLoading(false)
        }
    }

    const handlePasswordReset = async (e) => {
        e?.preventDefault?.();
        setMessage("");

        const password = (formData.password || "").trim();
        const confirmPassword = (formData.confirmPassword || "").trim();

        if (!password || !confirmPassword) {
            toast.error("Both password fields are required");
            return;
        }

        if (password.length < 6) {
            toast.error("Password must be at least 6 characters long");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setIsLoading(true);

        try {
            const response = await axios.post(
                `/api/v1/forgot-password/reset-password`,
                { password },
                { withCredentials: true }
            );

            if (response.status === 200) {
                setMessage(response.data.message || "Password updated successfully");
                navigate("/signin");
            }
        } catch (error) {
            console.error(error);
            toast.error(
                error?.response?.data?.message ||
                "Something went wrong. Please try again"
            );
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-[#092635] via-[#1b4242] to-[#5c8374] px-4 py-12 relative overflow-hidden'>
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 left-0 w-96 h-96 bg-[#5c8374] opacity-10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#092635] opacity-10 rounded-full blur-3xl"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-2">
                        <span className="text-white">Assess</span>
                        <span className="bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">ify</span>
                    </h1>
                    <p className="text-sm text-gray-300">Password Recovery</p>
                </div>

                <div className="bg-white bg-opacity-95 backdrop-blur rounded-2xl shadow-2xl overflow-hidden">
                    <div className="p-8">
                        {step === "email" && (
                            <form onSubmit={handleEmailSubmit} className="space-y-6">
                                <div className="mb-6">
                                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Reset Your Password</h2>
                                    <p className="text-sm text-gray-600">
                                        Enter your email address and we'll send you a verification code to reset your password.
                                    </p>
                                    {message && (
                                        <div className={`text-sm px-3 py-2 rounded mt-3 ${
                                            message.includes("Could not") || message.includes("could not") 
                                                ? "text-red-700 bg-red-50" 
                                                : "text-green-700 bg-green-50"
                                        }`}>
                                            {message}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        <input
                                            type="email"
                                            autoComplete="email"
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="your.email@example.com"
                                            required
                                            className="w-full rounded-lg border border-gray-300 py-3 pl-12 pr-4 text-gray-700 bg-gray-50 hover:bg-white focus:bg-white shadow-sm focus:border-[#5c8374] focus:ring-2 focus:ring-[#5c8374] focus:outline-none transition-all placeholder-gray-400"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-gradient-to-r from-[#092635] to-[#1b4242] hover:from-[#0d3140] hover:to-[#1f4a4f] text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                                >
                                    {isLoading ? "Sending..." : "Send Verification Code"}
                                </button>

                                <div className="text-center">
                                    <Link
                                        to="/signin"
                                        className="inline-flex items-center justify-center text-sm text-gray-600 hover:text-[#5c8374] transition-colors gap-1"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Back to Sign In
                                    </Link>
                                </div>
                            </form>
                        )}

                        {step === "verification-code" && (
                            <form onSubmit={handleCodeVerification} className="space-y-6">
                                <div className="mb-4">
                                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Verify Your Email</h2>
                                    <p className="text-sm text-gray-600">Enter the verification code sent to {formData.email}</p>
                                </div>
                                {message && (
                                    <div className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded text-center">{message}</div>    
                                )}

                                <div className="flex flex-col mt-1 gap-3">
                                    <input
                                        type="text"
                                        id="verification-code"
                                        name="verificationCode"
                                        placeholder="Enter verification code"
                                        value={formData.verificationCode}
                                        onChange={handleChange}
                                        className="w-full p-3 border border-gray-300 rounded-lg text-center tracking-widest text-lg placeholder-gray-400"
                                    />

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full bg-gradient-to-r from-[#092635] to-[#1b4242] text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow"
                                    >
                                        {isLoading ? 'Verifying...' : 'Verify Code'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => { setStep("email"); setMessage("") }}
                                        className="w-full text-gray-600 hover:text-gray-800 hover:bg-amber-50 font-medium py-2 rounded-lg border border-gray-300 transition-colors"
                                    >
                                        Back
                                    </button>
                                </div>
                            </form>
                        )}

                        {step === "resetPassword" && (
                            <form onSubmit={handlePasswordReset} className="space-y-6">
                                <div className="mb-4">
                                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Create New Password</h2>
                                    <p className="text-sm text-gray-600">Enter your new password below</p>
                                </div>
                                {message && (
                                    <div className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded">{message}</div>
                                )}

                                <div className="space-y-3">
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">New Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                        <div className="cursor-pointer" onClick={() => setShowPassword((prev) => !prev)}>
                                            {showPassword ? <Eye className="absolute right-3 top-3.5 h-5 w-5 text-gray-600" /> : <EyeClosed className="absolute right-3 top-3.5 h-5 w-5 text-gray-600" />}
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            id="password"
                                            name="password"
                                            placeholder="At least 6 characters"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                            autoComplete="new-password"
                                            className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 text-gray-700 bg-gray-50 focus:bg-white shadow-sm focus:border-[#5c8374] focus:ring-2 focus:ring-[#5c8374] focus:outline-none transition-all"
                                        />
                                    </div>
                                    <div className="relative">
                                        <label htmlFor="confirmPassword" className="block text-sm mb-2 font-medium text-gray-700">Confirm Password</label>
                                        <input
                                            type="password"
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            placeholder="Retype your password"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            required
                                            autoComplete="new-password"
                                            className="w-full rounded-lg border border-gray-300 py-3 px-3 text-gray-700 bg-gray-50 focus:bg-white shadow-sm focus:border-[#5c8374] focus:ring-2 focus:ring-[#5c8374] focus:outline-none transition-all"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full bg-gradient-to-r from-[#092635] to-[#1b4242] text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow"
                                    >
                                        {isLoading ? 'Saving...' : 'Reset Password'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => { setStep("verification-code"); setMessage("") }}
                                        className="w-full text-gray-600 hover:text-gray-800 font-medium py-2 rounded-lg border border-gray-300 transition-colors"
                                    >
                                        Back
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    <div className="bg-gradient-to-r from-[#092635] to-[#1b4242] bg-opacity-5 px-8 py-4 border-t border-gray-200">
                        <p className="text-xs text-gray-500 text-center">
                            Don't have an account? <Link to="/signup" className="text-[#b5d0c6] hover:underline font-semibold">Sign up</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ForgotPassword
