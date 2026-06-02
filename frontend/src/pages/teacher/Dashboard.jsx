import { useEffect, useState } from "react";
import {
    Clock, FileText, PlusCircle, Award, BookOpen, TrendingUp,
    AlertCircle
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useTeacher } from "../../context/TeacherContextCore";
import ExamCard from "./components/ExamCard";
import ExamDetailsModal from "./components/ExamDetailsModal";


export default function TeacherDashboard() {

    const [selectedExam, setSelectedExam] = useState(null);
    const [copiedCode, setCopiedCode] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
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
        } catch (err) {
            console.error("Failed to copy:", err);
            toast.error("Failed to copy code");
        }
    };

    const handleDeleteAction = async (id, toastId) => {
        toast.dismiss(toastId);
        setDeletingId(id);
        try {
            await deleteExam(id);
        } finally {
            setDeletingId(null);
        }
    };

    const handleDeleteExam = (id) => {
        toast.custom((t) => (
            <div className="bg-gray-900 border border-white/10 p-5 rounded-xl shadow-2xl text-sm flex flex-col gap-4 w-80">
                <p className="text-gray-200 leading-relaxed">
                    Are you sure you want to{" "}
                    <span className="font-semibold text-red-400">delete</span> this exam?
                    This action cannot be undone.
                </p>
                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="px-4 cursor-pointer py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 rounded-lg text-xs font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => handleDeleteAction(id, t.id)}
                        className="px-4 cursor-pointer py-1.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-red-500/20 transition-all"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        ));
    };

    const handleEvaluate = (id) => {
        navigate(`/teacher/evaluation/${id}`);
    };

    const stats = {
        total: exams.length,
        live: exams.filter((e) => {
            const now = new Date();
            return now >= new Date(e.startTime) && now <= new Date(e.endTime);
        }).length,
        upcoming: exams.filter((e) => new Date() < new Date(e.startTime)).length,
        completed: exams.filter((e) => new Date() > new Date(e.endTime)).length,
    };

    if (examsLoading) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="relative min-h-screen bg-gray-950 text-gray-100 overflow-hidden">
            <div className="absolute -top-40 -left-40 w-[35rem] h-[35rem] bg-indigo-600/15 rounded-full blur-[130px] pointer-events-none" />
            <div className="absolute top-1/3 -right-40 w-[35rem] h-[35rem] bg-violet-600/15 rounded-full blur-[130px] pointer-events-none" />

            <div className="relative max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pt-24 sm:pt-28 lg:pt-32">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
                    <div>
                        <span className="inline-block px-3 py-1 mb-3 text-xs font-semibold tracking-wider uppercase rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                            Instructor Workspace
                        </span>
                        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-2">
                            Teacher{" "}
                            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                                Dashboard
                            </span>
                        </h1>
                        <div className="flex items-center gap-3 text-gray-400">
                            <span>Manage and monitor your exams</span>
                            {stats.live > 0 && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/10 text-emerald-300 text-xs font-semibold rounded-full border border-emerald-500/20">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                                    </span>
                                    {stats.live} Live
                                </span>
                            )}
                        </div>
                    </div>
                    <Link
                        to="/create-exam"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 hover:scale-[1.02] whitespace-nowrap"
                    >
                        <PlusCircle size={20} />
                        Create Exam
                    </Link>
                </div>

                {examsError && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-red-300">{examsError}</p>
                        </div>
                    </div>
                )}

                {exams?.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                        <StatsCard
                            icon={<BookOpen size={22} />}
                            label="Total Exams"
                            value={stats.total}
                            accent="indigo"
                        />
                        <StatsCard
                            icon={<TrendingUp size={22} />}
                            label="Live Now"
                            value={stats.live}
                            accent="emerald"
                        />
                        <StatsCard
                            icon={<Clock size={22} />}
                            label="Upcoming"
                            value={stats.upcoming}
                            accent="amber"
                        />
                        <StatsCard
                            icon={<Award size={22} />}
                            label="Completed"
                            value={stats.completed}
                            accent="violet"
                        />
                    </div>
                )}

                {exams?.length === 0 ? (
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-12 text-center">
                        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />
                        <div className="relative max-w-md mx-auto">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 mx-auto mb-6 shadow-lg shadow-violet-500/30">
                                <FileText size={36} className="text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3">
                                No Exams Yet
                            </h3>
                            <p className="text-gray-400 mb-8">
                                Get started by creating your first exam. It only takes a few minutes.
                            </p>
                            <Link
                                to="/create-exam"
                                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 hover:scale-[1.02]"
                            >
                                <PlusCircle size={20} />
                                Create Your First Exam
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {exams.map((exam) => (
                            <ExamCard
                                key={exam._id}
                                exam={exam}
                                onViewDetails={() => setSelectedExam(exam)}
                                onEvaluate={() => handleEvaluate(exam._id)}
                                onCopyCode={() => copyToClipboard(exam.examCode)}
                                onDeleteExam={() => handleDeleteExam(exam._id)}
                                copiedCode={copiedCode}
                                isDeleting={deletingId === exam._id}
                            />
                        ))}
                    </div>
                )}
            </div>
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

const accentMap = {
    indigo: {
        iconWrap: "bg-indigo-500/15 text-indigo-300 border-indigo-500/20",
        glow: "hover:shadow-indigo-500/10 hover:border-indigo-500/30",
    },
    emerald: {
        iconWrap: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
        glow: "hover:shadow-emerald-500/10 hover:border-emerald-500/30",
    },
    amber: {
        iconWrap: "bg-amber-500/15 text-amber-300 border-amber-500/20",
        glow: "hover:shadow-amber-500/10 hover:border-amber-500/30",
    },
    violet: {
        iconWrap: "bg-violet-500/15 text-violet-300 border-violet-500/20",
        glow: "hover:shadow-violet-500/10 hover:border-violet-500/30",
    },
};

function DashboardSkeleton() {
    return (
        <div className="relative min-h-screen bg-gray-950 text-gray-400 overflow-hidden animate-pulse">
            <div className="absolute -top-40 -left-40 w-[35rem] h-[35rem] bg-indigo-600/15 rounded-full blur-[130px] pointer-events-none" />
            <div className="absolute top-1/3 -right-40 w-[35rem] h-[35rem] bg-violet-600/15 rounded-full blur-[130px] pointer-events-none" />

            <div className="relative max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pt-24 sm:pt-28 lg:pt-32">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
                    <div className="space-y-4 w-full sm:w-auto">
                        <div className="h-5 w-40 rounded-full bg-white/10" />
                        <div className="h-12 w-72 rounded-full bg-white/10" />
                        <div className="h-4 w-56 rounded-full bg-white/10" />
                    </div>
                    <div className="h-12 w-48 rounded-xl bg-white/10" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-36 rounded-3xl border border-white/10 bg-white/5 p-5" />
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="rounded-xl p-5 border border-white/10 bg-white/5 h-56" />
                    ))}
                </div>
            </div>
        </div>
    );
}

function StatsCard({ icon, label, value, accent = "indigo" }) {
    const a = accentMap[accent] || accentMap.indigo;
    return (
        <div className={`rounded-xl p-5 border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5 ${a.glow}`}>
            <div className="flex items-center justify-between mb-4">
                <div className={`inline-flex items-center justify-center w-11 h-11 rounded-lg border ${a.iconWrap}`}>
                    {icon}
                </div>
                <span className="text-3xl font-bold text-white tabular-nums">
                    {value}
                </span>
            </div>
            <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">
                {label}
            </p>
        </div>
    );
}
