import { useEffect, useState, useMemo } from "react";
import {
    Clock, FileText, PlusCircle, Award, BookOpen, TrendingUp,
    AlertCircle, LayoutDashboard, BarChart3, Settings, Filter,
    Sidebar, SidebarCloseIcon , GraduationCap, ChevronDown, SlidersHorizontal, Trash2
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useTeacher } from "../../context/TeacherContextCore";
import ExamCard from "./components/ExamCard";
import ExamDetailsModal from "./components/ExamDetailsModal";

const getExamStatus = (exam) => {
    const now = new Date();
    const start = new Date(exam.startTime);
    const end = new Date(exam.endTime);
    if (now < start) return "upcoming";
    if (now > end) return "completed";
    return "live";
};

export default function TeacherDashboard() {
    const [selectedExam, setSelectedExam] = useState(null);
    const [copiedCode, setCopiedCode] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const [filterStatus, setFilterStatus] = useState("all");
    const [filterBranch, setFilterBranch] = useState("all");
    const [filterSession, setFilterSession] = useState("all");

    const { exams, examsLoading, examsError, fetchExams, deleteExam } = useTeacher();
    const navigate = useNavigate();

    useEffect(() => {
        fetchExams();
    }, [fetchExams]);

    const copyToClipboard = async (code) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedCode(code);
            setTimeout(() => setCopiedCode(null), 2000);
            toast.success("Exam code copied!");
        } catch {
            toast.error("Failed to copy code");
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        setDeletingId(deleteTarget);
        setDeleteTarget(null);
        try {
            await deleteExam(deleteTarget);
        } finally {
            setDeletingId(null);
        }
    };

    const handleEvaluate = (id) => navigate(`/teacher/evaluation/${id}`);

    const activeFilterCount = [filterStatus, filterBranch, filterSession].filter(f => f !== "all").length;

    const stats = useMemo(() => {
        if (!exams) return { total: 0, live: 0, upcoming: 0, completed: 0 };
        return {
            total: exams.length,
            live: exams.filter((e) => getExamStatus(e) === "live").length,
            upcoming: exams.filter((e) => getExamStatus(e) === "upcoming").length,
            completed: exams.filter((e) => getExamStatus(e) === "completed").length,
        };
    }, [exams]);

    const uniqueBranches = useMemo(() => {
        if (!exams) return [];
        return [...new Set(exams.map(e => e.branch).filter(Boolean))];
    }, [exams]);

    const uniqueSessions = useMemo(() => {
        if (!exams) return [];
        return [...new Set(exams.map(e => e.session).filter(Boolean))];
    }, [exams]);

    const filteredExams = useMemo(() => {
        if (!exams) return [];
        return exams.filter((exam) => {
            const matchStatus = filterStatus === "all" || getExamStatus(exam) === filterStatus;
            const matchBranch = filterBranch === "all" || exam.branch === filterBranch;
            const matchSession = filterSession === "all" || exam.session === filterSession;
            return matchStatus && matchBranch && matchSession;
        });
    }, [exams, filterStatus, filterBranch, filterSession]);

    const clearFilters = () => {
        setFilterStatus("all");
        setFilterBranch("all");
        setFilterSession("all");
    };

    if (examsLoading) return <DashboardSkeleton />;

    return (
        <div
            className="flex bg-[#080b12] text-gray-100"
            style={{ fontFamily: "'Inter', system-ui, sans-serif", height: "calc(100vh - 64px)", marginTop: "64px", overflow: "hidden" }}
        >
            {deleteTarget && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => setDeleteTarget(null)}
                    />
                    <div className="relative z-10 w-full max-w-sm bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                                <Trash2 size={22} className="text-red-400" />
                            </div>
                            <h3 className="text-base font-semibold text-white mb-1.5">Delete this exam?</h3>
                            <p className="text-sm text-white/40 leading-relaxed">
                                This will permanently remove the exam and all associated data. This action cannot be undone.
                            </p>
                        </div>
                        <div className="px-6 pb-6 flex gap-3">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white text-sm font-medium transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white text-sm font-semibold shadow-lg shadow-red-500/20 transition-all"
                            >
                                Delete exam
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-[54] bg-black/70 backdrop-blur-sm lg:hidden"
                    style={{ top: "64px" }}
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <aside className={`
                fixed lg:static z-[55]
                mt-6
                w-64 xl:w-72 bg-[#0c1018] border-r border-white/[0.06]
                flex flex-col shrink-0
                transition-transform duration-300 ease-in-out
                ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            `} style={{ top: "64px", bottom: 0 }}>
                <div className="px-3 py-4 border-b border-white/[0.15] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
                            <GraduationCap className="text-white" size={24} />
                        </div>
                        <span className="text-2xl font-semibold tracking-tight text-white">EvalCore</span>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
                    >
                        <SidebarCloseIcon size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    <nav className="space-y-0.5">
                        <p className="px-3 pb-2 text-[11px] font-semibold text-white/25 uppercase tracking-widest">Navigation</p>
                        <Link
                            to="/dashboard"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.06] text-white text-sm font-medium border border-white/[0.08]"
                        >
                            <LayoutDashboard size={16} className="text-sky-400" />
                            Dashboard
                        </Link>
                        <SidebarButton icon={<BarChart3 size={16} />} label="Analytics" />
                        <SidebarButton icon={<Settings size={16} />} label="Settings" />
                    </nav>

                    <div className="space-y-3">
                        <p className="px-3 text-[11px] font-semibold text-white/25 uppercase tracking-widest">Filter Exams</p>
                        <FilterSelect
                            label="Status"
                            value={filterStatus}
                            onChange={setFilterStatus}
                            options={[
                                { value: "all", label: "All statuses" },
                                { value: "live", label: "Live now" },
                                { value: "upcoming", label: "Upcoming" },
                                { value: "completed", label: "Completed" },
                            ]}
                        />
                        <FilterSelect
                            label="Branch"
                            value={filterBranch}
                            onChange={setFilterBranch}
                            options={[
                                { value: "all", label: "All branches" },
                                ...uniqueBranches.map(b => ({ value: b, label: b })),
                            ]}
                        />
                        <FilterSelect
                            label="Session"
                            value={filterSession}
                            onChange={setFilterSession}
                            options={[
                                { value: "all", label: "All sessions" },
                                ...uniqueSessions.map(s => ({ value: s, label: s })),
                            ]}
                        />
                        {activeFilterCount > 0 && (
                            <button
                                onClick={clearFilters}
                                className="w-full py-2 text-xs font-medium text-white/40 hover:text-white/70 transition-colors"
                            >
                                Clear all filters
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-14 mt-6 bg-[#080b12]/80 backdrop-blur-xl border-b border-white/[0.06] px-5 sm:px-8 flex items-center justify-between shrink-0 relative z-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
                        >
                            <Sidebar size={24} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
                            <p className="text-xs text-white/30 hidden sm:block">Manage exams and monitor sessions</p>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto">
                    <div className="px-5 sm:px-8 py-8 space-y-8 max-w-screen-2xl mx-auto w-full">

                        {examsError && (
                            <div className="p-4 bg-red-500/8 border border-red-500/20 rounded-xl flex items-start gap-3">
                                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-300">{examsError}</p>
                            </div>
                        )}

                        {exams?.length > 0 && (
                            <section>
                                <p className="text-[11px] font-semibold text-white/25 uppercase tracking-widest mb-4">Overview</p>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                    <StatsCard icon={<BookOpen size={18} />} label="Total Exams" value={stats.total} />
                                    <StatsCard icon={<TrendingUp size={18} />} label="Live Now" value={stats.live} accent="emerald" dot />
                                    <StatsCard icon={<Clock size={18} />} label="Upcoming" value={stats.upcoming} accent="amber" />
                                    <StatsCard icon={<Award size={18} />} label="Completed" value={stats.completed} accent="violet" />
                                </div>
                            </section>
                        )}

                        <section>
                            <div className="flex items-center gap-3 mb-5">
                                <p className="text-[11px] font-semibold text-white/25 uppercase tracking-widest">
                                    {filteredExams.length === exams?.length ? "All Exams" : "Filtered"}
                                </p>
                                <span className="text-[11px] font-semibold text-white/40 bg-white/[0.05] border border-white/[0.08] px-2 py-0.5 rounded-full">
                                    {filteredExams.length}
                                </span>
                            </div>

                            {exams?.length === 0 ? (
                                <EmptyState />
                            ) : filteredExams.length === 0 ? (
                                <NoResultsState onClear={clearFilters} />
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-8">
                                    {filteredExams.map((exam) => (
                                        <ExamCard
                                            key={exam._id}
                                            exam={exam}
                                            onViewDetails={() => setSelectedExam(exam)}
                                            onEvaluate={() => handleEvaluate(exam._id)}
                                            onCopyCode={() => copyToClipboard(exam.examCode)}
                                            onDeleteExam={() => setDeleteTarget(exam._id)}
                                            copiedCode={copiedCode}
                                            isDeleting={deletingId === exam._id}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </main>

            {selectedExam && (
                <ExamDetailsModal
                    exam={selectedExam}
                    onClose={() => setSelectedExam(null)}
                    copiedCode={copiedCode}
                    onCopyCode={() => copyToClipboard(selectedExam.examCode)}
                />
            )}
        </div>
    );
}

function SidebarButton({ icon, label }) {
    return (
        <button
            disabled
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/25 text-sm font-medium cursor-not-allowed"
        >
            <span className="text-white/20">{icon}</span>
            {label}
            <span className="ml-auto text-[9px] tracking-wider text-white/20 font-semibold uppercase">Soon</span>
        </button>
    );
}

function FilterSelect({ label, value, onChange, options }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-white/30 uppercase tracking-wider block px-1">
                {label}
            </label>
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full appearance-none bg-white/[0.04] border border-white/[0.08] text-white/70 text-sm rounded-lg px-3 py-2 pr-7 focus:outline-none focus:border-sky-500/50 focus:bg-white/[0.06] transition-all cursor-pointer"
                >
                    {options.map(opt => (
                        <option key={opt.value} value={opt.value} className="bg-[#0c1018]">
                            {opt.label}
                        </option>
                    ))}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>
        </div>
    );
}

const accentStyles = {
    default: { icon: "text-sky-400",     bar: "bg-sky-500",     iconBg: "bg-sky-500/10 border-sky-500/20"        },
    emerald: { icon: "text-emerald-400", bar: "bg-emerald-500", iconBg: "bg-emerald-500/10 border-emerald-500/20" },
    amber:   { icon: "text-amber-400",   bar: "bg-amber-500",   iconBg: "bg-amber-500/10 border-amber-500/20"     },
    violet:  { icon: "text-violet-400",  bar: "bg-violet-500",  iconBg: "bg-violet-500/10 border-violet-500/20"   },
};

function StatsCard({ icon, label, value, accent = "default", dot }) {
    const s = accentStyles[accent] || accentStyles.default;
    return (
        <div className="relative rounded-xl p-5 border border-white/[0.06] bg-white/[0.03] overflow-hidden group hover:border-white/[0.12] hover:bg-white/[0.05] transition-all duration-200">
            <div className={`absolute bottom-0 left-0 h-[2px] w-full ${s.bar} opacity-40 group-hover:opacity-70 transition-opacity`} />
            <div className="flex items-center gap-2.5 mb-4">
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${s.iconBg}`}>
                    <span className={s.icon}>{icon}</span>
                </div>
                <p className="text-lg text-white/40 font-medium leading-tight">{label}</p>
                {dot && value > 0 && (
                    <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live
                    </span>
                )}
            </div>
            <p className="text-3xl font-bold tabular-nums text-white">{value}</p>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-12 sm:p-16 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] mx-auto mb-5">
                <FileText size={24} className="text-white/20" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No exams yet</h3>
            <p className="text-sm text-white/30 mb-8 max-w-xs mx-auto leading-relaxed">
                Create your first exam to get started. It takes less than a minute to set up.
            </p>
            <Link
                to="/create-exam"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-sky-500 text-white text-sm font-semibold shadow-lg shadow-sky-500/20 hover:bg-sky-400 transition-all"
            >
                <PlusCircle size={16} />
                Create your first exam
            </Link>
        </div>
    );
}

function NoResultsState({ onClear }) {
    return (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
            <Filter size={28} className="mx-auto text-white/15 mb-4" />
            <h3 className="text-base font-semibold text-white mb-1.5">No exams match these filters</h3>
            <p className="text-sm text-white/30 mb-6">Adjust your status, branch, or session criteria.</p>
            <button
                onClick={onClear}
                className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.08] text-white/60 hover:text-white rounded-lg text-sm font-medium transition-all border border-white/[0.08]"
            >
                Reset filters
            </button>
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="flex bg-[#080b12] overflow-hidden animate-pulse" style={{ height: "calc(100vh - 64px)", marginTop: "64px" }}>
            <aside className="w-72 bg-[#0c1018] border-r border-white/[0.06] hidden lg:flex flex-col p-5 gap-6">
                <div className="h-8 w-32 bg-white/[0.05] rounded-lg" />
                <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-9 bg-white/[0.04] rounded-lg" />
                    ))}
                </div>
                <div className="space-y-3 mt-4">
                    <div className="h-3 w-20 bg-white/[0.04] rounded" />
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-9 bg-white/[0.04] rounded-lg" />
                    ))}
                </div>
            </aside>
            <main className="flex-1 p-6 lg:p-8 space-y-8">
                <div className="flex justify-between items-center">
                    <div className="space-y-2">
                        <div className="h-5 w-40 bg-white/[0.05] rounded-md" />
                        <div className="h-3 w-64 bg-white/[0.03] rounded-md" />
                    </div>
                    <div className="h-9 w-28 bg-white/[0.05] rounded-lg" />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-32 rounded-xl bg-white/[0.03] border border-white/[0.06]" />
                    ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-56 rounded-xl bg-white/[0.03] border border-white/[0.06]" />
                    ))}
                </div>
            </main>
        </div>
    );
}