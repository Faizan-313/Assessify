import { createElement, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    FaBook,
    FaUserGraduate,
    FaChalkboardTeacher,
    FaShieldAlt,
    FaLaptop,
    FaQuestionCircle,
    FaArrowRight,
    FaChevronRight,
} from "react-icons/fa";

const SECTION_IDS = [
    "overview",
    "students",
    "instructors",
    "proctoring",
    "requirements",
    "support",
];

function Docs() {
    const [activeId, setActiveId] = useState("overview");

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                    }
                }
            },
            { rootMargin: "-20% 0px -55% 0px", threshold: 0 }
        );

        for (const id of SECTION_IDS) {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        }
        return () => observer.disconnect();
    }, []);

    const navItems = [
        { id: "overview", label: "Overview", icon: FaBook },
        { id: "students", label: "For students", icon: FaUserGraduate },
        { id: "instructors", label: "For instructors", icon: FaChalkboardTeacher },
        { id: "proctoring", label: "Secure monitoring", icon: FaShieldAlt },
        { id: "requirements", label: "Requirements", icon: FaLaptop },
        { id: "support", label: "Help & support", icon: FaQuestionCircle },
    ];

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100">
            <div className="absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-slate-950/60 via-gray-950 to-gray-950 pointer-events-none" />
            <div className="absolute top-24 right-0 w-[28rem] h-[28rem] bg-slate-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative max-w-7xl mx-auto px-6 pt-28 pb-20 lg:flex lg:gap-12">
                <aside className="hidden lg:block w-64 shrink-0">
                    <div className="sticky top-28 space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4 px-3">
                            On this page
                        </p>
                        {navItems.map(({ id, label, icon }) => (
                            <a
                                key={id}
                                href={`#${id}`}
                                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                    activeId === id
                                        ? "bg-sky-500/15 text-sky-200 border border-sky-500/30"
                                        : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                                }`}
                            >
                                {createElement(icon, {
                                    className: "text-xs opacity-80 shrink-0",
                                })}
                                {label}
                            </a>
                        ))}
                        <div className="pt-6 mt-6 border-t border-white/10 px-3 space-y-2">
                            <Link
                                to="/exam"
                                className="flex items-center justify-between text-sm text-sky-300 hover:text-sky-200 transition-colors group"
                            >
                                Start exam portal
                                <FaArrowRight className="text-xs group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                            <Link
                                to="/signin"
                                className="flex items-center justify-between text-sm text-sky-300 hover:text-sky-200 transition-colors group"
                            >
                                Instructor login
                                <FaArrowRight className="text-xs group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </aside>

                <main className="flex-1 min-w-0 max-w-3xl">
                    <nav
                        className="lg:hidden flex gap-2 overflow-x-auto pb-4 mb-6 -mx-1 px-1 scrollbar-thin"
                        aria-label="Documentation sections"
                    >
                        {navItems.map(({ id, label }) => (
                            <a
                                key={id}
                                href={`#${id}`}
                                className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-gray-300 hover:border-indigo-500/40 hover:text-white transition-colors"
                            >
                                {label}
                                <FaChevronRight className="text-[10px] opacity-60" />
                            </a>
                        ))}
                    </nav>

                    <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-white/10 bg-white/5 text-xs font-semibold uppercase tracking-wider text-sky-300">
                        <FaBook className="text-sm" />
                        Documentation
                    </div>

                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                        Assessify{" "}
                        <span className="bg-gradient-to-r from-sky-100 via-emerald-400 to-amber-700 bg-clip-text text-transparent">
                            product guide
                        </span>
                    </h1>
                    <p className="text-lg text-gray-400 leading-relaxed mb-12 max-w-2xl">
                        Everything students and instructors need to run secure, proctored
                        exams—with multi-format questions built for computer science programs.
                    </p>

                    <div className="space-y-20">
                        <section id="overview" className="scroll-mt-28">
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500 shadow-lg shadow-sky-500/20">
                                    <FaBook className="text-white text-lg" />
                                </span>
                                Overview
                            </h2>
                            <div className="prose-docs space-y-4 text-gray-400 leading-relaxed">
                                <p>
                                    <strong className="text-gray-200">Assessify</strong> is an online
                                    examination platform that combines a unified workspace for
                                    MCQs, code, diagrams, and descriptive answers with{" "}
                                    <strong className="text-gray-200">real-time monitoring</strong>{" "}
                                    and a live teacher dashboard. It is designed for academic
                                    integrity, clarity, and operational scale.
                                </p>
                                <ul className="list-disc pl-5 space-y-2 marker:text-sky-400">
                                    <li>
                                        Students join via the public exam portal using an{" "}
                                        <strong className="text-gray-300">exam code</strong> supplied
                                        by their instructor.
                                    </li>
                                    <li>
                                        Instructors register, create assessments, monitor sessions,
                                        and evaluate submissions from the protected dashboard.
                                    </li>
                                    <li>
                                        Proctoring uses the device webcam for calibration, monitoring,
                                        and anomaly detection during the attempt.
                                    </li>
                                </ul>
                            </div>
                        </section>

                        <section id="students" className="scroll-mt-28">
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-sky-500 shadow-lg shadow-emerald-500/20">
                                    <FaUserGraduate className="text-white text-lg" />
                                </span>
                                For students
                            </h2>
                            <div className="prose-docs space-y-4 text-gray-400 leading-relaxed">
                                <h3 className="text-lg font-semibold text-white mt-6 mb-2">
                                    Before you begin
                                </h3>
                                <ol className="list-decimal pl-5 space-y-2 marker:text-emerald-400/90">
                                    <li>
                                        Use a laptop or desktop with a working{" "}
                                        <strong className="text-gray-300">webcam</strong> and stable
                                        internet.
                                    </li>
                                    <li>
                                        Close unnecessary apps. You will need permission for camera
                                        access when the portal requests it.
                                    </li>
                                    <li>
                                        Have your <strong className="text-gray-300">exam code</strong>{" "}
                                        ready; you cannot proceed without a valid code.
                                    </li>
                                </ol>
                                <h3 className="text-lg font-semibold text-white mt-6 mb-2">
                                    Exam flow
                                </h3>
                                <ol className="list-decimal pl-5 space-y-2 marker:text-emerald-400/90">
                                    <li>
                                        Open the{" "}
                                        <Link
                                            to="/exam"
                                            className="text-sky-300 hover:text-sky-200 underline underline-offset-2"
                                        >
                                            Exam Portal
                                        </Link>
                                        .
                                    </li>
                                    <li>
                                        Read all on-screen instructions and confirm that you have
                                        done so.
                                    </li>
                                    <li>
                                        Allow camera access when prompted. The system verifies access
                                        before you enter your code.
                                    </li>
                                    <li>
                                        Enter your exam code, complete any required details, then
                                        begin the timed session in the exam workspace.
                                    </li>
                                    <li>
                                        Submit before the timer ends; otherwise your attempt may be{" "}
                                        <strong className="text-gray-300">auto-submitted</strong>.
                                    </li>
                                </ol>
                            </div>
                        </section>

                        <section id="instructors" className="scroll-mt-28">
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500 shadow-lg shadow-sky-500/20">
                                    <FaChalkboardTeacher className="text-white text-lg" />
                                </span>
                                For instructors
                            </h2>
                            <div className="prose-docs space-y-4 text-gray-400 leading-relaxed">
                                <p>
                                    Instructor features require an authenticated account. After{" "}
                                    <Link
                                        to="/signup"
                                        className="text-sky-300 hover:text-sky-200 underline underline-offset-2"
                                    >
                                        registration
                                    </Link>{" "}
                                    and{" "}
                                    <Link
                                        to="/signin"
                                        className="text-sky-300 hover:text-sky-200 underline underline-offset-2"
                                    >
                                        login
                                    </Link>
                                    , you can create exams, publish codes to students, and use the
                                    dashboard for operations.
                                </p>
                                <h3 className="text-lg font-semibold text-white mt-6 mb-2">
                                    Typical workflow
                                </h3>
                                <ul className="list-disc pl-5 space-y-2 marker:text-sky-400">
                                    <li>
                                        <strong className="text-gray-300">Create an exam</strong>—set
                                        duration, formats, and questions (including coding tasks where
                                        applicable).
                                    </li>
                                    <li>
                                        <strong className="text-gray-300">Share the exam code</strong>{" "}
                                        with your cohort so they can enter it at the exam portal.
                                    </li>
                                    <li>
                                        <strong className="text-gray-300">Monitor live</strong>{" "}
                                        sessions when enabled, and review monitoring alerts from
                                        the dashboard.
                                    </li>
                                    <li>
                                        <strong className="text-gray-300">Evaluate</strong>{" "}
                                        submissions and assign marks through the teacher evaluation
                                        tools linked from your dashboard.
                                    </li>
                                </ul>
                            </div>
                        </section>

                        <section id="proctoring" className="scroll-mt-28">
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-sky-500 shadow-lg shadow-sky-500/20">
                                    <FaShieldAlt className="text-white text-lg" />
                                </span>
                                Monitoring &amp; conduct
                            </h2>
                            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5 mb-6">
                                <p className="text-sm text-amber-100/90 leading-relaxed">
                                    Proctoring supports academic integrity. Serious or repeated
                                    violations may result in session actions as defined by your
                                    institution and the exam configuration.
                                </p>
                            </div>
                            <div className="prose-docs space-y-4 text-gray-400 leading-relaxed">
                                <p>
                                    During an attempt, the platform may analyze webcam input to
                                    detect patterns associated with{" "}
                                    <strong className="text-gray-300">head pose</strong>,{" "}
                                    <strong className="text-gray-300">gaze</strong>, presence of{" "}
                                    <strong className="text-gray-300">multiple faces</strong>, or{" "}
                                    <strong className="text-gray-300">phone-like objects</strong>.
                                    Monitoring typically includes a{" "}
                                    <strong className="text-gray-300">calibration phase</strong> so
                                    alerts are judged relative to your neutral seated position.
                                </p>
                                <p>
                                    Students should follow the same rules shown in the live exam
                                    instructions: avoid frequent looking away, keep the workspace
                                    clear of unauthorized aids, do not switch tabs or rely on
                                    copy-paste where prohibited, and maintain a single person in
                                    frame unless your invigilator directs otherwise.
                                </p>
                                <h3 className="text-lg font-semibold text-white mt-6 mb-2">
                                    Privacy note
                                </h3>
                                <p>
                                    Camera processing is used for exam integrity during the session.
                                    Consult your institution&apos;s privacy policy and consent
                                    materials for retention, access, and lawful basis for processing.
                                </p>
                            </div>
                        </section>

                        <section id="requirements" className="scroll-mt-28">
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow-lg shadow-sky-500/20">
                                    <FaLaptop className="text-white text-lg" />
                                </span>
                                Technical requirements
                            </h2>
                            <div className="prose-docs space-y-4 text-gray-400 leading-relaxed">
                                <ul className="list-disc pl-5 space-y-2 marker:text-sky-400">
                                    <li>
                                        <strong className="text-gray-300">Browser:</strong> a recent
                                        evergreen browser (Chrome, Edge, or Firefox recommended).
                                    </li>
                                    <li>
                                        <strong className="text-gray-300">Camera &amp; microphone:</strong>{" "}
                                        webcam required for proctoring; unblock permissions if
                                        denied.
                                    </li>
                                    <li>
                                        <strong className="text-gray-300">Network:</strong> stable
                                        connection; avoid hotspot congestion if possible.
                                    </li>
                                    <li>
                                        <strong className="text-gray-300">Environment:</strong>{" "}
                                        quiet, well-lit room; screen and face visible to the camera.
                                    </li>
                                </ul>
                            </div>
                        </section>

                        <section id="support" className="scroll-mt-28">
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gray-600 to-gray-800 border border-white/10">
                                    <FaQuestionCircle className="text-white text-lg" />
                                </span>
                                Help &amp; support
                            </h2>
                            <div className="prose-docs space-y-4 text-gray-400 leading-relaxed">
                                <p>
                                    If the portal rejects your exam code, confirm you are using the
                                    exact characters your instructor provided and that the exam is
                                    currently active.
                                </p>
                                <p>
                                    If the camera check fails, try another browser, ensure no other
                                    app is locking the camera, and verify OS-level privacy settings.
                                </p>
                                <p>
                                    For account recovery, use the{" "}
                                    <Link
                                        to="/forgot-password"
                                        className="text-sky-300 hover:text-sky-200 underline underline-offset-2"
                                    >
                                        forgot password
                                    </Link>{" "}
                                    flow on the sign-in page.
                                </p>
                                <p>
                                    For other questions, contact us at{" "}
                                    <a
                                        href="mailto:assessify.iust@gmail.com"
                                        className="text-sky-300 hover:text-sky-200 underline underline-offset-2"
                                    >
                                        assessify.iust@gmail.com
                                    </a>
                                    .
                                </p>
                                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 mt-8">
                                    <p className="text-sm text-gray-300 mb-4">
                                        Ready to run your next assessment?
                                    </p>
                                    <div className="flex flex-wrap gap-3">
                                        <Link
                                            to="/exam"
                                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-slate-700 to-sky-500 text-white text-sm font-semibold shadow-lg shadow-sky-500/20 hover:shadow-sky-500/35 transition-shadow"
                                        >
                                            Student portal
                                            <FaArrowRight className="text-xs" />
                                        </Link>
                                        <Link
                                            to="/signup"
                                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/15 bg-white/5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                                        >
                                            Create instructor account
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Docs;
