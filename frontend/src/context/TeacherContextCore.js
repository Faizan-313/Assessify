import { createContext, useContext } from "react";

const TeacherContext = createContext();

export const useTeacher = () => useContext(TeacherContext);

export { TeacherContext };
