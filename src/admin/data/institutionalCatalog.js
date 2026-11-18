export const LOCAL_INSTITUTIONAL_CATALOG = {
  institutions: [
    { id: "inst-stackenzo", name: "Stackenzo", type: "Institution", code: "STACKENZO", location: "Nellore", status: "Active" },
    { id: "inst-1", name: "Narayana Engineering College", type: "Standalone College", code: "NEC", location: "Nellore", status: "Active" },
    { id: "inst-2", name: "SkillEngine University Group", type: "University / Group", code: "SEUG", location: "Andhra Pradesh", status: "Active" },
  ],
  campuses: [
    { id: "camp-stackenzo-nellore", institutionId: "inst-stackenzo", name: "Nellore", location: "Nellore" },
    { id: "camp-1", institutionId: "inst-1", name: "Nellore Campus", location: "Nellore" },
    { id: "camp-2", institutionId: "inst-2", name: "Main Campus", location: "Visakhapatnam" },
    { id: "camp-3", institutionId: "inst-2", name: "City Campus", location: "Vijayawada" },
  ],
  courses: [
    {
      id: "course-stackenzo-btech", institutionId: "inst-stackenzo", campusId: "camp-stackenzo-nellore", name: "B.Tech", programType: "Engineering",
      years: ["1st Year", "2nd Year", "3rd Year", "4th Year"].map((name) => ({
        name,
        semesters: [{ name: "Semester 1" }, { name: "Semester 2" }],
        departments: [
          { id: "stackenzo-computers", name: "Computers", aliases: ["Computer Science", "Computer Science / Computers"], sections: ["A", "B", "C"] },
          { id: "stackenzo-electronics", name: "Electronics", sections: ["A", "B", "C"] },
        ],
      })),
    },
    {
      id: "course-stackenzo-mba", institutionId: "inst-stackenzo", campusId: "camp-stackenzo-nellore", name: "MBA", programType: "Management",
      years: ["1st Year", "2nd Year"].map((name) => ({
        name,
        semesters: [{ name: "Semester 1" }, { name: "Semester 2" }],
        departments: [{ id: "stackenzo-management", name: "Management", sections: ["A", "B", "C"] }],
      })),
    },
    {
      id: "course-1", institutionId: "inst-1", campusId: "camp-1", name: "B.Tech", programType: "Engineering",
      years: ["1st Year", "2nd Year", "3rd Year", "4th Year"].map((name) => ({
        name,
        semesters: [{ name: "1st Semester" }, { name: "2nd Semester" }],
        departments: [
          { name: "Computer Science", sections: ["A", "B"] },
          { name: "Electronics", sections: ["A"] },
        ],
      })),
    },
    {
      id: "course-2", institutionId: "inst-1", campusId: "camp-1", name: "MBA", programType: "Management",
      years: ["1st Year", "2nd Year"].map((name) => ({
        name,
        semesters: [{ name: "1st Semester" }, { name: "2nd Semester" }],
        departments: [{ name: "Finance", sections: ["A"] }],
      })),
    },
    {
      id: "course-3", institutionId: "inst-2", campusId: "camp-2", name: "B.Sc", programType: "Science",
      years: ["1st Year", "2nd Year", "3rd Year"].map((name) => ({
        name,
        semesters: [{ name: "1st Semester" }, { name: "2nd Semester" }],
        departments: [{ name: "Mathematics", sections: ["A"] }],
      })),
    },
    {
      id: "course-4", institutionId: "inst-2", campusId: "camp-3", name: "B.Com", programType: "Commerce",
      years: ["1st Year", "2nd Year", "3rd Year"].map((name) => ({
        name,
        semesters: [{ name: "1st Semester" }, { name: "2nd Semester" }],
        departments: [{ name: "General", sections: ["A", "B"] }],
      })),
    },
  ],
};
