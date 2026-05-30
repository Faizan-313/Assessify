import { createContext, useContext } from "react";

const ExamContext = createContext();

export function useExam() {
    return useContext(ExamContext);
}

export { ExamContext };
