import toast from "react-hot-toast";

const validateExamDetails = (examDetails, questions = []) => {
    let isValid = true;

    if (!examDetails.title.trim()) {
        toast.error("Please enter an exam title");
        isValid = false;
    }

    if (!examDetails.examCode.trim()) {
        toast.error("Please set an exam code");
        isValid = false;
    }

    if (!examDetails.duration || parseInt(examDetails.duration) <= 0) {
        toast.error("Please enter a valid duration");
        isValid = false;
    }

    if (!examDetails.branch.trim()) {
        toast.error("Please enter a branch");
        isValid = false;
    }

    if (!examDetails.semester) {
        toast.error("Please enter a semester");
        isValid = false;
    }

    if (!examDetails.session) {
        toast.error("Please enter a session");
        isValid = false;
    }

    if (!examDetails.startTime || !examDetails.endTime) {
        toast.error("Please select start and end times");
        isValid = false;
    }

    if (new Date(examDetails.startTime) >= new Date(examDetails.endTime)) {
        toast.error("End time must be after start time");
        isValid = false;
    }

    if (questions.length === 0) {
        toast.error("Please add at least one question");
        isValid = false;
    }

    return isValid;

}

export default validateExamDetails;