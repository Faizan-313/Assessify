import { NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    PlusCircle,
    Home,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    X,
    GraduationCap,
} from "lucide-react";

const menuItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/create-exam", label: "Create Exam", icon: PlusCircle },
];

const secondaryItems = [
    { to: "/", label: "Home", icon: Home },
    { to: "/docs", label: "Docs", icon: BookOpen },
];

export default function TeacherSidebar({ mobileOpen, onMobileClose, collapsed, onToggleCollapse }) {
    const linkClass = ({ isActive }) =>
        `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
            isActive
                ? "bg-gradient-to-r from-sky-500/15 to-indigo-500/15 text-white border border-sky-500/25 shadow-lg shadow-sky-500/5"
                : "text-white/45 hover:text-white hover:bg-white/[0.05] border border-transparent"
        }`;

    return (
        <>
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
                    onClick={onMobileClose}
                />
            )}

            <aside
                className={`fixed lg:static inset-y-0 left-0 z-50 lg:z-auto h-full shrink-0 bg-[#0c1018] border-r border-white/[0.06] flex flex-col transition-all duration-300
                    ${collapsed ? "w-[80px]" : "w-72"}
                    ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
            >
                <div className={`relative flex items-center border-b border-white/[0.06] shrink-0 ${collapsed ? "justify-center px-3 py-5" : "justify-between px-5 py-5"}`}>
                    {!collapsed ? (
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
                                <GraduationCap size={20} className="text-white" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold tracking-widest uppercase text-sky-400/80">Teacher</p>
                                <p className="text-lg font-bold text-white tracking-tight truncate">Assessify</p>
                            </div>
                        </div>
                    ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
                            <GraduationCap size={20} className="text-white" />
                        </div>
                    )}
                    {!collapsed && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={onToggleCollapse}
                                className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors"
                                aria-label="Collapse sidebar"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={onMobileClose}
                                className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors"
                                aria-label="Close menu"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}
                    {collapsed && (
                        <button
                            onClick={onToggleCollapse}
                            className="hidden lg:flex absolute top-5 right-2 items-center justify-center w-8 h-8 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors"
                            aria-label="Expand sidebar"
                        >
                            <ChevronRight size={16} />
                        </button>
                    )}
                </div>

                <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                    {!collapsed && (
                        <p className="px-3 pt-1 pb-2 text-[11px] font-semibold text-white/25 uppercase tracking-widest">Workspace</p>
                    )}
                    {menuItems.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={linkClass}
                            onClick={onMobileClose}
                            title={collapsed ? label : undefined}
                        >
                            <Icon size={20} className={`shrink-0 ${collapsed ? "mx-auto" : ""}`} />
                            {!collapsed && <span>{label}</span>}
                        </NavLink>
                    ))}

                    {!collapsed && (
                        <p className="px-3 pt-6 pb-2 text-[11px] font-semibold text-white/25 uppercase tracking-widest">Explore</p>
                    )}
                    {collapsed && <div className="my-3 mx-2 border-t border-white/[0.06]" />}
                    {secondaryItems.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === "/"}
                            className={linkClass}
                            onClick={onMobileClose}
                            title={collapsed ? label : undefined}
                        >
                            <Icon size={20} className={`shrink-0 ${collapsed ? "mx-auto" : ""}`} />
                            {!collapsed && <span>{label}</span>}
                        </NavLink>
                    ))}
                </nav>

                {!collapsed && (
                    <div className="p-4 border-t border-white/[0.06]">
                        <div className="rounded-xl bg-gradient-to-br from-sky-500/10 to-indigo-500/10 border border-sky-500/15 p-4">
                            <p className="text-sm font-semibold text-white mb-1">Teacher Portal</p>
                            <p className="text-xs text-white/35 leading-relaxed">Create and manage exams from your dashboard.</p>
                        </div>
                    </div>
                )}
            </aside>
        </>
    );
}
