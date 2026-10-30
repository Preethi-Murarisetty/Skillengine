import { normalizeStudent } from "./studentDirectory.js";

const STORAGE_KEY = "skillengineStudentPlacements";
const STACKENZO = {
  institutionId: "inst-stackenzo",
  institution: "Stackenzo",
  campusId: "camp-stackenzo-nellore",
  campus: "Nellore",
  year: "1st Year",
  semester: "Semester 1",
};

export const readStudentPlacements = () => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
};

export const saveStudentPlacements = (placements) => {
  const next = { ...readStudentPlacements(), ...placements };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("skillengine:student-placements-updated"));
  return next;
};

export const applyStudentPlacements = (records) => {
  const placements = readStudentPlacements();
  return (Array.isArray(records) ? records : []).map((record) => {
    const id = normalizeStudent(record).id;
    const placement = placements[id];
    if (!placement) return record;
    return {
      ...record,
      institution_id: placement.institutionId,
      institution: placement.institution,
      campus_id: placement.campusId,
      campus: placement.campus,
      course_id: placement.courseId,
      course: placement.course,
      academic_year: placement.year,
      department_id: placement.departmentId,
      department: placement.department,
      section: placement.section,
      semester: placement.semester,
    };
  });
};

export const createStackenzoPlacements = (records) => {
  const existingStudents = (Array.isArray(records) ? records : [])
    .filter((record) => {
      const student = normalizeStudent(record);
      return student.id && student.isStudent;
    });

  if (existingStudents.length !== 23) {
    return { error: `Expected 23 existing student records; found ${existingStudents.length}. No placements were changed.` };
  }

  const assignments = {};
  const btechSections = ["A", "A", "A", "B", "C"];
  const mbaSections = ["A", "A", "A", "A", "A", "B", "B", "B", "B", "C", "C", "C", "C"];

  existingStudents.forEach((record, index) => {
    const student = normalizeStudent(record);
    let courseId;
    let course;
    let departmentId;
    let department;
    let section;

    if (index < 5) {
      courseId = "course-stackenzo-btech";
      course = "B.Tech";
      departmentId = "stackenzo-computers";
      department = "Computers";
      section = btechSections[index];
    } else if (index < 10) {
      courseId = "course-stackenzo-btech";
      course = "B.Tech";
      departmentId = "stackenzo-electronics";
      department = "Electronics";
      section = btechSections[index - 5];
    } else {
      courseId = "course-stackenzo-mba";
      course = "MBA";
      departmentId = "stackenzo-management";
      department = "Management";
      section = mbaSections[index - 10];
    }

    assignments[student.id] = {
      ...STACKENZO,
      courseId,
      course,
      year: STACKENZO.year,
      departmentId,
      department,
      section,
      semester: STACKENZO.semester,
    };
  });

  return { assignments, studentIds: existingStudents.map((record) => normalizeStudent(record).id) };
};
