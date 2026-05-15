import { Mail, Lock, User, UserPlus, Eye, EyeClosed } from "lucide-react"
import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import logo from "/logo3.svg";

function Signup() {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [formData, setFormData] = useState({
        name: "",
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

    const checkCheckBox = () => {
        const checkbox = document.getElementById("terms");
        if(!checkbox.checked){
            toast.error("You must agree to the Terms of Service and Privacy Policy");
            return false;
        }
        return true;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        if(!checkCheckBox()) return;
        if(([formData.name, formData.email, formData.password]).some(field => field.trim() === "")){
            toast.error("Please fill in all fields")
            return
        }
        if(!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(formData.email)){
            toast.error("Please enter a valid email address")
            return;
        }
        if(formData.password.length < 6){
            toast.error("Password must be at least 6 characters long")
            return
        }

        setLoading(true);
        try {
            const res = await register(formData.name, formData.email, formData.password)
            if(res.success){
                navigate("/")
            }
        } catch (error) {
            toast.error("Something went wrong. Please try again.");
            console.error("Signup error: ", error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#092635] via-[#1b4242] to-[#5c8374] px-4 pt-20 relative overflow-hidden">
            <div className="relative z-10 w-full max-w-md">
                <div className="rounded-3xl bg-white/95 backdrop-blur-lg p-8 shadow-2xl border border-gray-200/20 transform transition-all duration-500 hover:shadow-[#5c8374]/20">
                    <div className="flex flex-col items-center text-center mb-4">
                        <div className="flex items-center gap-3 mb-5">
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
                        <h2 className="text-2xl font-bold text-[#127f6d] mb-2">Create Account</h2>
                        <p className="text-[#1b4242]">Join us and start your journey</p>
                    </div>

                    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
                                Full Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Enter your full name"
                                    required
                                    className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 text-gray-700 bg-gray-50 focus:bg-white shadow-sm focus:border-[#5c8374] focus:ring-2 focus:ring-[#5c8374] focus:outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                <input
                                    type="email"
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
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Create a password"
                                    min={6}
                                    required
                                    className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 text-gray-700 bg-gray-50 focus:bg-white shadow-sm focus:border-[#5c8374] focus:ring-2 focus:ring-[#5c8374] focus:outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div className="flex items-start">
                            <input 
                                type="checkbox" 
                                id="terms"
                                required
                                className="mt-1 mr-2 rounded focus:ring-[#5c8374] text-[#5c8374]" 
                            />
                            <label htmlFor="terms" className="text-sm text-gray-600">
                                I agree to the{" "}
                                <a href="#" className="text-[#46c196] hover:text-[#5c8374] font-medium">
                                    Terms of Service
                                </a>
                                {" "}and{" "}
                                <a href="#" className="text-[#46c196] hover:text-[#5c8374] font-medium">
                                    Privacy Policy
                                </a>
                            </label>
                        </div>

                        <button
                            type="submit"
                            className="w-full rounded-lg bg-gradient-to-r from-[#5c8374] to-[#1b4242] hover:from-[#1b4242] hover:to-[#092635] py-3 text-white font-semibold shadow-lg hover:shadow-[#5c8374]/50 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Creating account...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <UserPlus className="h-5 w-5" />
                                    Create Account
                                </span>
                            )}
                        </button>
                    </form>

                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white/95 text-gray-500">
                                Already have an account?
                            </span>
                        </div>
                    </div>

                    <div className="text-center">
                        <a 
                            href="/signin" 
                            className="text-[#46c196] hover:text-[#5c8374] font-semibold transition-colors inline-flex items-center gap-1"
                        >
                            Sign In
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Signup