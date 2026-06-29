import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {
    Menu,
    Bell,
    LayoutDashboard,
    PlusCircle,
    LogOut,
    ChevronDown,
    Home,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContextCore";

function getUserInitials(name, email) {
    const source = (name || email || "").trim();
    const parts = source.split(" ").filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return source.slice(0, 2).toUpperCase();
}

function getPageMeta(pathname) {
    if (pathname === "/dashboard") return { title: "Dashboard", subtitle: "Manage exams and monitor sessions" };
    if (pathname === "/create-exam") return { title: "Create Exam", subtitle: "Build and publish a new assessment" };
    if (pathname.startsWith("/teacher/evaluation/")) return { title: "Evaluation", subtitle: "Review and grade student submissions" };
    if (pathname.startsWith("/teacher/evaluate/")) return { title: "Grade Paper", subtitle: "Evaluate individual student responses" };
    if (pathname.startsWith("/teacher/monitor/")) return { title: "Live Monitor", subtitle: "Proctor an active exam session" };
    return { title: "Teacher Workspace", subtitle: "Assessify teacher portal" };
}

export default function TeacherNavbar({ onMenuClick }) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef(null);
    const { title, subtitle } = getPageMeta(location.pathname);
    const initials = getUserInitials(user?.name, user?.email);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setProfileOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <header className="sticky top-0 z-30 h-[4.5rem] shrink-0 bg-[#080b12]/90 backdrop-blur-xl border-b border-white/[0.06]">
            <div className="h-full flex items-center justify-between px-5 sm:px-8">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={onMenuClick}
                        className="lg:hidden p-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
                        aria-label="Open menu"
                    >
                        <Menu size={22} />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">{title}</h1>
                        <p className="text-xs sm:text-sm text-white/30 truncate hidden sm:block">{subtitle}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4">
                    <button
                        className="p-3 rounded-xl text-white/35 hover:text-white hover:bg-white/[0.06] transition-colors relative"
                        aria-label="Notifications"
                    >
                        <Bell size={20} />
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-sky-400 ring-2 ring-[#080b12]" />
                    </button>

                    <div className="relative" ref={profileRef}>
                        <button
                            onClick={() => setProfileOpen((prev) => !prev)}
                            className={`flex items-center gap-3 pl-2 pr-3 sm:pr-4 py-2 rounded-2xl border transition-all duration-200 ${
                                profileOpen
                                    ? "bg-white/[0.08] border-white/[0.12] shadow-lg shadow-black/20"
                                    : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1]"
                            }`}
                        >
                            <div className="relative shrink-0">
                                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-sky-400 via-indigo-400 to-violet-500 opacity-80 blur-[1px]" />
                                <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-base font-bold text-white shadow-inner">
                                    {initials}
                                </div>
                            </div>
                            <div className="hidden md:block text-left min-w-0 max-w-[160px]">
                                <p className="text-base font-semibold text-white truncate leading-tight">
                                    {user?.name || "Teacher"}
                                </p>
                                <p className="text-xs text-white/35 truncate">{user?.email}</p>
                            </div>
                            <ChevronDown
                                size={16}
                                className={`text-white/35 shrink-0 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`}
                            />
                        </button>

                        {profileOpen && (
                            <div className="absolute right-0 mt-2 w-80 bg-[#0f1117] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/40 overflow-hidden z-50">
                                <div className="p-5 bg-gradient-to-br from-sky-500/10 via-indigo-500/5 to-transparent border-b border-white/[0.06]">
                                    <div className="flex items-center gap-4">
                                        <div className="relative shrink-0">
                                            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 opacity-70" />
                                            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-lg font-bold text-white">
                                                {initials}
                                            </div>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-base font-semibold text-white truncate">{user?.name || "Teacher"}</p>
                                            <p className="text-sm text-white/40 truncate">{user?.email}</p>
                                            <span className="inline-flex mt-2 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/20">
                                                Teacher
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-2">
                                    <ProfileMenuLink
                                        to="/dashboard"
                                        icon={<LayoutDashboard size={16} />}
                                        label="Dashboard"
                                        onClick={() => setProfileOpen(false)}
                                    />
                                    <ProfileMenuLink
                                        to="/create-exam"
                                        icon={<PlusCircle size={16} />}
                                        label="Create Exam"
                                        onClick={() => setProfileOpen(false)}
                                    />
                                    <ProfileMenuLink
                                        to="/"
                                        icon={<Home size={16} />}
                                        label="Home"
                                        onClick={() => setProfileOpen(false)}
                                    />
                                </div>

                                <div className="p-2 border-t border-white/[0.06]">
                                    <button
                                        onClick={() => {
                                            setProfileOpen(false);
                                            logout();
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                                    >
                                        <LogOut size={16} />
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}

function ProfileMenuLink({ to, icon, label, onClick }) {
    return (
        <Link
            to={to}
            onClick={onClick}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors"
        >
            <span className="text-sky-400/80">{icon}</span>
            {label}
        </Link>
    );
}
