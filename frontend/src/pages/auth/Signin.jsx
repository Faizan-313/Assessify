import { Mail, Lock, LogIn, Eye, EyeClosed } from "lucide-react"
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom"
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContextCore";
import logo from "/logo3.svg";

function Signin() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    })
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await login(formData.email, formData.password)
            if (res.success) {
                navigate("/dashboard")
            }
        } catch (error) {
            toast.error("Something went wrong. Please try again.");
            console.error("Signip error: ", error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#092635] via-[#1b4242] to-[#5c8374] px-4 pt-20 relative overflow-hidden">
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative z-10 w-full max-w-md rounded-3xl bg-white/95 backdrop-blur-lg p-8 shadow-2xl border border-gray-200/20"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="flex flex-col items-center text-center mb-8"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="relative">
                            <div className="absolute -inset-2 bg-gradient-to-br from-violet-400/40 to-fuchsia-400/40 blur-xl rounded-full"></div>
                            <img
                                src={logo}
                                alt="Assessify"
                                className="relative w-14 h-14 drop-shadow-[0_0_14px_rgba(168,85,247,0.5)]"
                            />
                        </div>
                        <h1 className="text-3xl font-bold leading-none">
                            <span className="text-[#1b4242]">Assess</span>
                            <span className="bg-gradient-to-r from-violet-500 to-fuchsia-600 bg-clip-text text-transparent">ify</span>
                        </h1>
                    </div>
                    <h2 className="text-2xl font-bold text-[#092635] mb-2">Welcome Back</h2>
                    <p className="text-[#1b4242]">Sign in to continue your journey</p>
                </motion.div>

                <form onSubmit={handleSubmit} className="space-y-5" autoComplete="on">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                            <input
                                type="email"
                                autoComplete="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Enter your email"
                                required
                                className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 text-gray-700 bg-gray-50 focus:bg-white shadow-sm focus:border-[#5c8374] focus:ring-2 focus:ring-[#5c8374] focus:outline-none transition-all"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                            <div className="cursor-pointer" onClick={()=> setShowPassword((prev)=> !prev)}>
                                {showPassword ?<Eye className="absolute right-3 top-3.5 h-5 w-5 text-gray-600"/> : <EyeClosed  className="absolute right-3 top-3.5 h-5 w-5 text-gray-600"/>}
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Enter your password"
                                required
                                className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 text-gray-700 bg-gray-50 focus:bg-white shadow-sm focus:border-[#5c8374] focus:ring-2 focus:ring-[#5c8374] focus:outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <Link to="/forgot-password" className="text-[#46c196] hover:text-[#5c8374] font-medium transition-colors">
                            Forgot Password?
                        </Link>
                    </div>

                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ scale: 1.02 }}
                        type="submit"
                        className="w-full rounded-lg bg-gradient-to-r from-[#5c8374] to-[#1b4242] hover:from-[#1b4242] hover:to-[#092635] py-3 text-white font-semibold shadow-lg hover:shadow-[#5c8374]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Signing in...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                <LogIn className="h-5 w-5" />
                                Sign In
                            </span>
                        )}
                    </motion.button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white/95 text-gray-500">
                            Don't have an account?
                        </span>
                    </div>
                </div>

                <div className="text-center">
                    <Link 
                        to="/signup" 
                        className="text-[#46c196] hover:text-[#5c8374] font-semibold transition-colors inline-flex items-center gap-1"
                    >
                        Create Account
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>

                <p className="text-center text-gray-500 text-xs mt-6">
                    By signing in, you agree to our Terms of Service and Privacy Policy
                </p>
            </motion.div>
        </div>
    )
}

export default Signin