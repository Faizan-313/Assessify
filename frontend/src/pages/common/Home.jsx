import {
    FaGithub,
    FaLinkedin,
    FaTwitter,
    FaShieldAlt,
    FaChartLine,
    FaLaptopCode,
    FaUsers,
    FaLock,
    FaArrowRight,
    FaPlay,
    FaCheckCircle,
    FaEnvelope,
} from "react-icons/fa";

function Home() {
    const features = [
        {
            icon: <FaShieldAlt className="text-3xl text-white" />,
            iconBg: "from-sky-500 to-cyan-600",
            title: "Secure Proctoring",
            description:
                "Real-time webcam analysis flags suspicious behavior the moment it happens keeping every exam fair.",
        },
        {
            icon: <FaLock className="text-3xl text-white" />,
            iconBg: "from-emerald-500 to-teal-600",
            title: "Lockdown Mode",
            description:
                "Prevents tab switching, copy-paste, and external app access so students stay focused on the exam.",
        },
        {
            icon: <FaLaptopCode className="text-3xl text-white" />,
            iconBg: "from-amber-500 to-orange-500",
            title: "Multi-Format Workspace",
            description:
                "MCQs, code, descriptive text, and diagrams all answered in one unified, distraction-free editor.",
        },
        {
            icon: <FaChartLine className="text-3xl text-white" />,
            iconBg: "from-slate-500 to-sky-600",
            title: "Live Teacher Dashboard",
            description:
                "Monitor every student in real time, receive alerts, and intervene the moment integrity is at risk.",
        },
    ];

    const studentSteps = [
        {
            step: "01",
            title: "Enter Exam Portal",
            desc: (
                <>
                    Click{" "}
                    <a
                        href="/exam"
                        className="text-sky-300 hover:text-sky-200 font-semibold underline-offset-4 hover:underline transition-colors"
                    >
                        Start Exam
                    </a>
                    , read the instructions, and enter your exam code with your details to begin.
                </>
            ),
        },
        {
            step: "02",
            title: "Attempt Questions",
            desc: "Answer MCQs, write code, draw diagrams, or compose text all from one unified workspace.",
        },
        {
            step: "03",
            title: "Submit & Done",
            desc: "Submit when finished or let the timer auto-submit. Your responses are saved instantly and securely.",
        },
    ];

    const teacherSteps = [
        {
            step: "01",
            title: "Register & Login",
            desc: "Create your instructor account and access the admin dashboard.",
        },
        {
            step: "02",
            title: "Create Assessment",
            desc: "Design exams across multiple formats, set duration, and assign students.",
        },
        {
            step: "03",
            title: "Monitor Live",
            desc: "Track student activity in real time with proctoring alerts.",
        },
        {
            step: "04",
            title: "Generate Results",
            desc: "Access detailed analytics and per-student performance reports instantly.",
        },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100" id="home">
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
                <div className="absolute -top-40 -left-40 w-[40rem] h-[40rem] bg-slate-900/12 rounded-full blur-[130px]" />
                <div className="absolute top-1/2 -right-40 w-[40rem] h-[40rem] bg-sky-400/10 rounded-full blur-[130px]" />
                <div className="absolute bottom-0 left-1/3 w-[30rem] h-[30rem] bg-emerald-400/10 rounded-full blur-[130px]" />

                <div
                    className="absolute inset-0 opacity-[0.04]"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
                        backgroundSize: "44px 44px",
                    }}
                />

                <div className="relative z-10 max-w-5xl mx-auto px-6 pt-28 pb-16 text-center">
                    <div className="mb-8 flex justify-center">
                        <img
                            src="/logo3.svg"
                            alt="Assessify"
                            className="w-28 h-28 md:w-32 md:h-32 cursor-pointer hover:rotate-12 transition-transform duration-300 drop-shadow-[0_0_20px_rgba(14,165,233,0.22)]"
                        />
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.05]">
                        Online exams, reimagined with{" "}
                        <span className="text-slate-100">
                            trusted integrity
                        </span>
                    </h1>

                    <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Assessify is a secure, multi-format examination platform with code, MCQs, diagrams, and text in a single,
                        proctored workspace.
                    </p>

                    <div className="flex gap-4 flex-wrap justify-center">
                        <a
                            href="/exam"
                            className="group inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 rounded-full font-semibold text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all duration-300 hover:scale-[1.03]"
                        >
                            <FaPlay className="text-sm" />
                            Start Exam
                            <FaArrowRight className="text-sm group-hover:translate-x-1 transition-transform" />
                        </a>
                        <a
                            href="#features"
                            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-full font-semibold text-white border border-white/15 hover:border-white/25 transition-all duration-300"
                        >
                            Explore Features
                        </a>
                    </div>

                    <div className="mt-14 flex flex-wrap justify-center items-center gap-x-10 gap-y-4 text-sm text-slate-300">
                        <div className="flex items-center gap-2">
                            <FaCheckCircle className="text-emerald-300" />
                            Tamper-proof environment
                        </div>
                        <div className="flex items-center gap-2">
                            <FaCheckCircle className="text-emerald-300" />
                            Real-time monitoring alerts
                        </div>
                        <div className="flex items-center gap-2">
                            <FaCheckCircle className="text-emerald-300" />
                            Built for secure exam delivery
                        </div>
                    </div>
                </div>
            </section>

            <section id="features" className="relative py-24 bg-slate-950">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16 max-w-3xl mx-auto">
                        <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider uppercase rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
                            Core Capabilities
                        </span>
                        <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
                            Everything you need to run{" "}
                            <span className="bg-gradient-to-r from-sky-400 to-emerald-300 bg-clip-text text-transparent">
                                secure, modern exams
                            </span>
                        </h2>
                        <p className="text-lg text-slate-400">
                            A complete, intelligent solution for secure, modern, and
                            scalable online assessments.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="group relative p-6 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 hover:border-sky-500/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-sky-500/10"
                            >
                                <div
                                    className={`inline-flex items-center justify-center w-14 h-14 mb-5 rounded-xl bg-gradient-to-br ${feature.iconBg} shadow-lg group-hover:scale-110 transition-transform duration-300`}
                                >
                                    {feature.icon}
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">
                                    {feature.title}
                                </h3>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="relative py-24 bg-slate-950">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20 max-w-3xl mx-auto">
                        <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider uppercase rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
                            Workflow
                        </span>
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                            How{" "}
                            <span className="bg-gradient-to-r from-sky-400 to-emerald-300 bg-clip-text text-transparent">
                                Assessify
                            </span>{" "}
                            works
                        </h2>
                        <p className="text-lg text-gray-400 mt-4">
                            A streamlined journey for both students and instructors.
                        </p>
                    </div>

                    <div className="mb-24">
                        <div className="flex items-center justify-center mb-12">
                            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-sky-500/20 to-emerald-500/20 border border-sky-500/30 text-sky-200">
                                <FaUsers className="text-base" />
                                <span className="text-sm font-semibold tracking-wide uppercase">
                                    For Students
                                </span>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            {studentSteps.map((item, index) => (
                                <div
                                    key={index}
                                    className="group relative p-7 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 hover:border-sky-500/40 transition-all duration-300 hover:-translate-y-1"
                                >
                                    <div className="absolute -top-4 left-7 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white font-bold shadow-lg shadow-sky-500/20 group-hover:scale-110 transition-transform">
                                        {item.step}
                                    </div>
                                    <h4 className="text-xl font-semibold text-white mt-6 mb-3">
                                        {item.title}
                                    </h4>
                                    <p className="text-gray-400 leading-relaxed text-sm">
                                        {item.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-center mb-12">
                            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-emerald-500/20 to-slate-500/20 border border-emerald-500/30 text-emerald-200">
                                <FaChartLine className="text-base" />
                                <span className="text-sm font-semibold tracking-wide uppercase">
                                    For Teachers
                                </span>
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {teacherSteps.map((item, index) => (
                                <div
                                    key={index}
                                    className="group relative p-7 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 hover:border-emerald-500/40 transition-all duration-300 hover:-translate-y-1"
                                >
                                    <div className="absolute -top-4 left-7 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-bold shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                                        {item.step}
                                    </div>
                                    <h4 className="text-xl font-semibold text-white mt-6 mb-3">
                                        {item.title}
                                    </h4>
                                    <p className="text-gray-400 leading-relaxed text-sm">
                                        {item.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="relative py-20">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="max-w-5xl mx-auto px-6">
                    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-sky-600/20 via-emerald-600/20 to-amber-500/20 p-10 md:p-14 text-center">
                        <div className="absolute -top-20 -left-20 w-60 h-60 bg-sky-500/20 rounded-full blur-3xl" />
                        <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-amber-400/20 rounded-full blur-3xl" />
                        <div className="relative">
                            <h3 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">
                                Ready to host your next exam with confidence?
                            </h3>
                            <p className="text-gray-300 mb-8 max-w-xl mx-auto">
                                Join instructors and institutions running secure, proctored
                                assessments on Assessify.
                            </p>
                            <a
                                href="/create-exam"
                                className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-gray-900 hover:bg-gray-100 rounded-full font-semibold shadow-lg transition-all duration-300 hover:scale-[1.03]"
                            >
                                Get Started
                                <FaArrowRight className="text-sm" />
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="border-t border-white/10 bg-slate-950">
                <div className="max-w-7xl mx-auto px-6 py-14">
                    <div className="grid md:grid-cols-3 gap-12 mb-10">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <img src="/logo3.svg" alt="Assessify" className="w-9 h-9" />
                                <span className="text-2xl font-bold">
                                    <span className="text-white">Assess</span>
                                    <span className="bg-gradient-to-r from-sky-400 to-emerald-300 bg-clip-text text-transparent">ify</span>
                                    <span className="text-amber-300">.</span>
                                </span>
                            </div>
                            <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
                                Revolutionizing online assessments with real-time security and
                                intelligent evaluation.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
                                Quick Links
                            </h3>
                            <ul className="space-y-3 text-sm">
                                <li>
                                    <a
                                        href="#home"
                                        className="text-gray-400 hover:text-sky-300 transition-colors"
                                    >
                                        Home
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="/exam"
                                        className="text-gray-400 hover:text-sky-300 transition-colors"
                                    >
                                        Start Exam
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="#features"
                                        className="text-gray-400 hover:text-sky-300 transition-colors"
                                    >
                                        Features
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="/docs"
                                        className="text-gray-400 hover:text-sky-300 transition-colors"
                                    >
                                        Documentation
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
                                Connect
                            </h3>
                            <div className="flex gap-3">
                                <a
                                    target="_blank"
                                    rel="noreferrer"
                                    href="#"
                                    aria-label="GitHub"
                                    className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:border-sky-500/40 hover:bg-sky-500/10 transition-all"
                                >
                                    <FaGithub />
                                </a>
                                <a
                                    target="_blank"
                                    rel="noreferrer"
                                    href="#"
                                    aria-label="LinkedIn"
                                    className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:border-sky-500/40 hover:bg-sky-500/10 transition-all"
                                >
                                    <FaLinkedin />
                                </a>
                                <a
                                    target="_blank"
                                    rel="noreferrer"
                                    href="#"
                                    aria-label="Twitter"
                                    className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:border-sky-500/40 hover:bg-sky-500/10 transition-all"
                                >
                                    <FaTwitter />
                                </a>
                                <a
                                    href="mailto:assessify.iust@gmail.com"
                                    aria-label="Email"
                                    className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:border-sky-500/40 hover:bg-sky-500/10 transition-all"
                                >
                                    <FaEnvelope />
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-white/10 pt-6 text-center text-gray-500 text-sm">
                        © {new Date().getFullYear()} Assessify. All rights reserved. Built
                        with passion for education.
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default Home;
