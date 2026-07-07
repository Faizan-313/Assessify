import { useState, useEffect, useRef } from 'react'
import { useExam } from '../../context/ExamContextCore'
import { useProctoringCtx } from '../../context/proctoringContextCore'
import { initializeFaceMesh } from '../../features/ai-monitoring/loadFaceMesh.js'
import toast from 'react-hot-toast'
import { User, Hash, Calendar, Users, Clock, FileText, Target, Award, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'


const StudentDetailsFilling = () => {
    const { exam, submitStudentDetails } = useExam()
    const { phase, startCalibration, finishCalibration, stop, setStatusMessage } = useProctoringCtx()

    const [formData, setFormData] = useState({
        examId: exam?._id ?? "",
        fullName: '',
        rollNumber: '',
        collegeId: '',
        batch: ''
    })

    useEffect(() => {
        if (!exam?._id) return;
        setFormData((prev) => ({
            ...prev,
            examId: exam._id,
        }));
    }, [exam?._id]);

    const [submitting, setSubmitting] = useState(false);
    const registrationOkRef = useRef(false);
    const handledRef = useRef(false);

    const navigate = useNavigate();

    // ProctoringProvider stays mounted across details exam routes; reset stale "monitoring" state.
    useEffect(() => {
        stop();
    }, [stop]);

    useEffect(() => {
        initializeFaceMesh().catch(() => undefined);
    }, []);

    // After registration succeeds, calibrate; only then enter the exam (never navigate before details API finishes).
    useEffect(() => {
        if (!submitting || !registrationOkRef.current || phase !== "monitoring" || handledRef.current) {
            return;
        }
        handledRef.current = true;

        setStatusMessage("Starting your exam…");
        toast.dismiss();
        toast.success("You're all set. Starting exam…");

        const timer = window.setTimeout(() => {
            finishCalibration();
            navigate("/exam/student/section", { replace: true });
        }, 0);
        return () => window.clearTimeout(timer);
    }, [phase, submitting, finishCalibration, setStatusMessage, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.fullName || !formData.fullName.trim()) {
            toast.error("Please enter your full name");
            return;
        }

        if (!formData.rollNumber || !formData.rollNumber.trim()) {
            toast.error("Please enter your roll number");
            return;
        }

        if (!formData.collegeId || !formData.collegeId.trim()) {
            toast.error("Please enter your college ID");
            return;
        }

        if (!formData.batch || !formData.batch.trim()) {
            toast.error("Please enter your batch");
            return;
        }

        if (!exam?.session?.trim()) {
            toast.error("This exam has no academic session configured. Contact your instructor.");
            return;
        }

        if (!exam?._id) {
            toast.error("Exam session expired. Please enter your exam code again.");
            navigate("/exam");
            return;
        }

        const nameParts = formData.fullName.trim().split(/\s+/);
        if (nameParts.length < 2) {
            toast.error("Please enter your full name (first and last name)");
            return;
        }

        if (!/^[a-zA-Z\s]+$/.test(formData.fullName)) {
            toast.error("Name should only contain letters and spaces");
            return;
        }

        if (formData.rollNumber.length < 3) {
            toast.error("Please enter a valid roll number");
            return;
        }

        if (formData.collegeId.length < 6) {
            toast.error("Please enter a valid college ID");
            return;
        }

        try {
            const elem = document.documentElement;
            const req =
                elem.requestFullscreen?.bind(elem) ??
                elem.webkitRequestFullscreen?.bind(elem) ??
                elem.msRequestFullscreen?.bind(elem);
            req?.();
        } catch (err) {
            console.error("Fullscreen request failed:", err);
        }

        setSubmitting(true);
        handledRef.current = false;
        registrationOkRef.current = false;

        const res = await submitStudentDetails({
            ...formData,
            examId: exam._id,
            batch: formData.batch.trim(),
        });
        if (!res?.success) {
            toast.error(res?.error || "Failed to submit details");
            stop();
            setSubmitting(false);
            return;
        }

        if (!res.student || !res.question?.questions?.length) {
            toast.error("Could not load the question paper. Please try again.");
            stop();
            setSubmitting(false);
            return;
        }

        registrationOkRef.current = true;
        setStatusMessage("Calibrating camera — hold still and look at the screen…");
        startCalibration();
    }

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const inputClass =
        "w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 transition";

    return (
        <div className="relative min-h-screen bg-gray-950 text-gray-100 overflow-hidden">
            <div className="absolute -top-40 -left-40 w-[35rem] h-[35rem] bg-indigo-600/15 rounded-full blur-[130px] pointer-events-none" />
            <div className="absolute top-1/3 -right-40 w-[35rem] h-[35rem] bg-violet-600/15 rounded-full blur-[130px] pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 w-[28rem] h-[28rem] bg-fuchsia-600/10 rounded-full blur-[130px] pointer-events-none" />

            <div className={`relative max-w-5xl mx-auto py-12 pt-24 sm:pt-28 px-4 sm:px-6 transition-all ${submitting ? 'blur-sm pointer-events-none' : ''}`}>

                <div className="rounded-2xl p-6 sm:p-8 mb-8 bg-gradient-to-br from-indigo-600/15 via-violet-600/15 to-fuchsia-600/15 border border-white/10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-violet-500/25">
                            <Award className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <span className="inline-block px-2.5 py-0.5 mb-1 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/20">
                                Examination
                            </span>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                                {exam.title}
                            </h1>
                        </div>
                    </div>

                    {exam.description && (
                        <div className="mb-6 pb-6 border-b border-white/10">
                            <p className="text-gray-300 leading-relaxed text-sm">{exam.description}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <InfoTile
                            icon={<Clock className="w-4 h-4" />}
                            accent="indigo"
                            label="Duration"
                            value={exam.duration}
                            unit="minutes"
                        />
                        <InfoTile
                            icon={<Target className="w-4 h-4" />}
                            accent="violet"
                            label="Total Marks"
                            value={exam.totalMarks}
                            unit="marks"
                        />
                        <InfoTile
                            icon={<FileText className="w-4 h-4" />}
                            accent="fuchsia"
                            label="Exam Code"
                            value={<span className="font-mono text-base">{exam.examCode}</span>}
                        />
                        <InfoTile
                            icon={<Calendar className="w-4 h-4" />}
                            accent="emerald"
                            label="Schedule"
                            value={<span className="text-base">{new Date(exam.startTime).toLocaleDateString()}</span>}
                            unit={new Date(exam.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        />
                    </div>
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <InfoTile
                            icon={<Calendar className="w-4 h-4" />}
                            accent="emerald"
                            label="Session"
                            value={exam.session || "N/A"}
                        />
                        <InfoTile
                            icon={<Users className="w-4 h-4" />}
                            accent="indigo"
                            label="Branch"
                            value={exam.branch || "N/A"}
                        />
                        <InfoTile
                            icon={<FileText className="w-4 h-4" />}
                            accent="violet"
                            label="Semester"
                            value={exam.semester || "N/A"}
                        />
                    </div>
                </div>

                <div className="rounded-2xl overflow-hidden bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10">
                    <div className="px-6 sm:px-8 py-6 border-b border-white/10 bg-gradient-to-r from-indigo-600/10 to-violet-600/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-white/10 border border-white/10">
                                <User className="w-5 h-5 text-violet-300" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Student Registration</h2>
                                <p className="text-sm text-gray-400">Please fill in your details to continue</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 sm:p-8">
                        <div className="space-y-6">
                            <FormField
                                label="Full Name"
                                required
                                icon={<User className="w-5 h-5" />}
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                placeholder="Enter your full name"
                                inputClass={inputClass}
                            />

                            <div className="grid md:grid-cols-2 gap-6">
                                <FormField
                                    label="Roll Number"
                                    required
                                    icon={<Hash className="w-5 h-5" />}
                                    name="rollNumber"
                                    value={formData.rollNumber}
                                    onChange={handleChange}
                                    placeholder="CSE-22-80"
                                    maxLength={15}
                                    inputClass={inputClass}
                                />
                                <FormField
                                    label="Batch"
                                    required
                                    icon={<Users className="w-5 h-5" />}
                                    name="batch"
                                    value={formData.batch}
                                    onChange={handleChange}
                                    placeholder="2022"
                                    maxLength={10}
                                    inputClass={inputClass}
                                />
                            </div>

                            <FormField
                                label="College ID"
                                required
                                icon={<Hash className="w-5 h-5" />}
                                name="collegeId"
                                value={formData.collegeId}
                                onChange={handleChange}
                                placeholder="Enter college ID"
                                maxLength={16}
                                inputClass={inputClass}
                            />

                            <div className="pt-2">
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white py-4 px-6 rounded-xl font-semibold text-base shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-200 hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                    {submitting ? "Registering & calibrating…" : "Proceed to Examination"}
                                </button>
                            </div>

                            <div className="pt-1">
                                <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                                    <AlertCircle className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-amber-200/90 leading-relaxed">
                                        <span className="font-semibold text-amber-200">Important: </span>
                                        Please ensure all details are accurate before submitting. Do not refresh the page.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

const tileAccentMap = {
    indigo: "bg-indigo-500/10 border-indigo-500/20 text-indigo-300",
    violet: "bg-violet-500/10 border-violet-500/20 text-violet-300",
    fuchsia: "bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-300",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
};

function InfoTile({ icon, accent = "indigo", label, value, unit }) {
    return (
        <div className="rounded-xl p-4 bg-white/[0.04] border border-white/10">
            <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md border ${tileAccentMap[accent]}`}>
                    {icon}
                </span>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{label}</p>
            </div>
            <p className="text-2xl font-bold text-white tabular-nums leading-tight">{value}</p>
            {unit && <p className="text-xs text-gray-500 mt-0.5">{unit}</p>}
        </div>
    );
}

function FormField({ label, required, icon, name, value, onChange, placeholder, maxLength, inputClass, readOnly }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                {label} {required && <span className="text-red-400 normal-case">*</span>}
            </label>
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    {icon}
                </div>
                <input
                    type="text"
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    readOnly={readOnly}
                    className={`${inputClass}${readOnly ? " opacity-80 cursor-not-allowed" : ""}`}
                />
            </div>
        </div>
    );
}

export default StudentDetailsFilling
