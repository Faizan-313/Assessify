export const teacherInputClass =
    "w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/50 transition";

export const teacherCardClass =
    "rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01]";

export const teacherCardHeaderClass =
    "rounded-t-2xl px-6 py-4 border-b border-white/10 bg-gradient-to-r from-sky-500/10 to-indigo-500/10";

export function TeacherPageShell({ children, maxWidth = "max-w-7xl" }) {
    return (
        <div className="relative min-h-full bg-[#080b12] text-gray-100 overflow-hidden">
            <div className="absolute -top-40 -left-40 w-[35rem] h-[35rem] bg-slate-700/15 rounded-full blur-[130px] pointer-events-none" />
            <div className="absolute top-1/3 -right-40 w-[35rem] h-[35rem] bg-sky-400/10 rounded-full blur-[130px] pointer-events-none" />
            <div className={`relative ${maxWidth} mx-auto pb-12 py-6 px-4 sm:px-6 lg:px-8`}>
                {children}
            </div>
        </div>
    );
}
