import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

/*
 * SkillEngine Admin Dashboard — single file, demo mode.
 * Needs: React + Tailwind. Changes live in React state and reset on refresh.
 *
 * Reading order:
 *   1. MOCK DATA   2. HELPERS   3. SMALL UI PIECES   4. MAIN COMPONENT
 *   (state -> filters -> derived numbers -> actions -> render)
 *
 * To go live: replace the MOCK_* arrays with API data (see the notes at the bottom).
 */

// =========================================================
// 1. MOCK DATA
// =========================================================

const CS = { name: "Computer Science", sections: ["A", "B"] };
const ECE = { name: "Electronics", sections: ["A"] };
const years = (labels, departments) =>
  labels.map((name) => ({ name, departments: departments.map((d) => ({ ...d })) }));

const MOCK_INSTITUTIONS = [
  { id: "inst-1", name: "Narayana Engineering College", type: "Standalone College", code: "NEC", location: "Nellore", status: "Active" },
  { id: "inst-2", name: "SkillEngine University Group", type: "University / Group", code: "SEUG", location: "Andhra Pradesh", status: "Active" },
];

const MOCK_CAMPUSES = [
  { id: "camp-1", institutionId: "inst-1", name: "Nellore Campus", location: "Nellore" },
  { id: "camp-2", institutionId: "inst-2", name: "Main Campus", location: "Visakhapatnam" },
  { id: "camp-3", institutionId: "inst-2", name: "City Campus", location: "Vijayawada" },
];

// Each course has its OWN structure (4 years, 4 semesters, 3 years...).
const MOCK_COURSES = [
  { id: "course-1", institutionId: "inst-1", campusId: "camp-1", name: "B.Tech", programType: "Engineering", years: years(["1st Year", "2nd Year", "3rd Year", "4th Year"], [CS, ECE]) },
  { id: "course-2", institutionId: "inst-1", campusId: "camp-1", name: "MBA", programType: "Management", years: years(["Semester 1", "Semester 2", "Semester 3", "Semester 4"], [{ name: "Finance", sections: ["A"] }]) },
  { id: "course-3", institutionId: "inst-2", campusId: "camp-2", name: "B.Sc", programType: "Science", years: years(["1st Year", "2nd Year", "3rd Year"], [{ name: "Mathematics", sections: ["A"] }]) },
  { id: "course-4", institutionId: "inst-2", campusId: "camp-3", name: "B.Com", programType: "Commerce", years: years(["1st Year", "2nd Year", "3rd Year"], [{ name: "General", sections: ["A", "B"] }]) },
];

const MOCK_STUDENTS = [
  { id: "STU001", name: "Arjun Kumar", email: "arjun@example.com", phone: "9876501001", institutionId: "inst-1", campusId: "camp-1", courseId: "course-1", year: "3rd Year", department: "Computer Science", section: "A", enrollmentDate: "2024-07-15", status: "Active" },
  { id: "STU002", name: "Priya Sharma", email: "priya@example.com", phone: "", institutionId: "inst-1", campusId: "camp-1", courseId: "course-1", year: "3rd Year", department: "Computer Science", section: "B", enrollmentDate: "2024-07-15", status: "Active" },
  { id: "STU003", name: "Sneha Patel", email: "sneha@example.com", phone: "", institutionId: "inst-1", campusId: "camp-1", courseId: "course-2", year: "Semester 1", department: "Finance", section: "A", enrollmentDate: "2026-07-10", status: "Active" },
  { id: "STU004", name: "Ananya Das", email: "ananya@example.com", phone: "", institutionId: "inst-2", campusId: "camp-2", courseId: "course-3", year: "2nd Year", department: "Mathematics", section: "A", enrollmentDate: "2025-07-10", status: "Inactive" },
  { id: "STU005", name: "Kiran Kumar", email: "kiran@example.com", phone: "9876501005", institutionId: "inst-2", campusId: "camp-3", courseId: "course-4", year: "1st Year", department: "General", section: "B", enrollmentDate: "2026-07-10", status: "Active" },
];

const MOCK_ASSESSMENTS = [
  { id: "ASM1", title: "Java Fundamentals", courseId: "course-1", date: "2026-09-12", maxScore: 100, passMark: 60 },
  { id: "ASM2", title: "Communication Skills", courseId: "course-2", date: "2026-09-15", maxScore: 50, passMark: 25 },
  { id: "ASM3", title: "Programming Basics", courseId: "course-3", date: "2026-09-18", maxScore: 100, passMark: 60 },
  { id: "ASM4", title: "Accounting Fundamentals", courseId: "course-4", date: "2026-09-22", maxScore: 100, passMark: 60 },
];

// No row for a student = "not attempted". It is never counted as 0.
const MOCK_RESULTS = [
  { studentId: "STU001", assessmentId: "ASM1", score: 86 },
  { studentId: "STU002", assessmentId: "ASM1", score: 48 },
  { studentId: "STU003", assessmentId: "ASM2", score: 42 },
  { studentId: "STU004", assessmentId: "ASM3", score: 81 },
];

// =========================================================
// 2. HELPERS
// =========================================================

const ALL = "ALL";
// Filter levels, parent -> child. Changing one resets everything after it.
const LEVELS = ["institutionId", "campusId", "courseId", "year", "department", "section"];

const byId = (list, id) => list.find((x) => x.id === id);
const average = (nums) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);
const pct = (v) => `${Math.round(v || 0)}%`;
const initials = (name = "") => name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

// Turn a raw result into { ...result, assessment, percentage, passed }
const scoreRow = (result, assessment) => ({
  ...result,
  assessment,
  percentage: assessment?.maxScore ? (result.score / assessment.maxScore) * 100 : 0,
  passed: !!assessment && result.score >= assessment.passMark,
});

const summarize = (rows) => {
  const passCount = rows.filter((r) => r.passed).length;
  return {
    count: rows.length,
    passCount,
    failCount: rows.length - passCount,
    averageScore: average(rows.map((r) => r.percentage)),
    passRate: rows.length ? (passCount / rows.length) * 100 : 0,
  };
};

// CSV with quotes, commas and line breaks escaped
const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
function downloadCSV(filename, headers, rows) {
  const text = [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", text], { type: "text/csv;charset=utf-8;" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// =========================================================
// 3. SMALL UI PIECES
// =========================================================

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 disabled:bg-gray-100";

function Button({ primary, small, className = "", ...props }) {
  const look = primary ? "bg-orange-500 text-white hover:bg-orange-600" : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50";
  return <button type="button" {...props} className={`rounded-lg font-semibold disabled:opacity-50 ${small ? "px-2.5 py-1.5 text-xs" : "px-4 py-2 text-sm"} ${look} ${className}`} />;
}

function Card({ title, subtitle, actions, children }) {
  return (
    <section className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5">
          <div>
            <h2 className="font-bold text-gray-800">{title}</h2>
            {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
          </div>
          <div className="flex gap-2">{actions}</div>
        </div>
      )}
      {children}
    </section>
  );
}

const Stat = ({ label, value, note }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
    <p className="text-sm text-gray-500">{label}</p>
    <p className="mt-1 text-2xl font-bold text-gray-800">{value}</p>
    {note && <p className="mt-1 text-xs text-gray-400">{note}</p>}
  </div>
);

const Stats = ({ children }) => <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">{children}</div>;

const Badge = ({ tone = "green", children }) => (
  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${{ green: "bg-green-50 text-green-700", gray: "bg-gray-100 text-gray-600", red: "bg-red-50 text-red-600" }[tone]}`}>{children}</span>
);
const StatusBadge = ({ status }) => <Badge tone={status === "Active" ? "green" : "gray"}>{status}</Badge>;
const Outcome = ({ passed }) => <Badge tone={passed ? "green" : "red"}>{passed ? "Pass" : "Fail"}</Badge>;

// <Select options=[{value,label}] />  — the first option is the "all/none" choice
function Select({ label, value, onChange, options, placeholder, disabled }) {
  return (
    <label className="block text-xs font-semibold text-gray-500">
      {label}
      <select className={`${inputCls} mt-1 font-normal text-gray-800`} value={value || ALL} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        <option value={ALL}>{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

const Field = ({ label, children }) => (
  <label className="block text-xs font-semibold text-gray-500">{label}<div className="mt-1 font-normal">{children}</div></label>
);

// columns: [{ header, render: (row) => node }]
function Table({ columns, rows, empty = "Nothing to show." }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs text-gray-400">
            {columns.map((c) => <th key={c.header} className="px-4 py-3 font-semibold">{c.header}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
              {columns.map((c) => <td key={c.header} className="whitespace-nowrap px-4 py-3">{c.render(row)}</td>)}
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-gray-400">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center overflow-y-auto bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">{title}</h2>
          <Button small onClick={onClose}>Close</Button>
        </div>
        {children}
      </div>
    </div>
  );
}

// =========================================================
// 4. MAIN COMPONENT
// =========================================================

const TABS = ["Overview", "Students", "Assessments", "Academics", "Institutions"];
const emptyFilters = () => Object.fromEntries(LEVELS.map((l) => [l, ALL]));
const emptyStudentForm = (f = emptyFilters()) => ({
  name: "", email: "", phone: "",
  ...Object.fromEntries(LEVELS.map((l) => [l, f[l] === ALL ? "" : f[l]])),
});

export default function AdminDashboard() {
  // ---------- STATE (replace the initial values with API data later) ----------
  const [institutions, setInstitutions] = useState(MOCK_INSTITUTIONS);
  const [campuses] = useState(MOCK_CAMPUSES);
  const [courses, setCourses] = useState(MOCK_COURSES);
  const [students, setStudents] = useState(MOCK_STUDENTS);
  const [assessments] = useState(MOCK_ASSESSMENTS);
  const [results] = useState(MOCK_RESULTS);

  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("section");
  const [tab, setTab] = useState(() => TABS.includes(requestedTab) ? requestedTab : "Overview");

  useEffect(() => {
    setTab(TABS.includes(requestedTab) ? requestedTab : "Overview");
  }, [requestedTab]);
  const [filters, setFilters] = useState(emptyFilters);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // "student" | "institution" | null
  const [openStudent, setOpenStudent] = useState(null);
  const [notice, setNotice] = useState("");
  const [studentForm, setStudentForm] = useState(emptyStudentForm);
  const [institutionForm, setInstitutionForm] = useState({ name: "", type: "Standalone College", code: "", location: "" });
  const [formError, setFormError] = useState("");

  const notify = (msg) => { setNotice(msg); setTimeout(() => setNotice(""), 3000); };

  // ---------- FILTERS (cascading) ----------
  const setFilter = (level, value) =>
    setFilters((prev) => {
      const next = { ...prev, [level]: value };
      LEVELS.slice(LEVELS.indexOf(level) + 1).forEach((l) => (next[l] = ALL)); // clear children
      return next;
    });
  const resetFilters = () => { setFilters(emptyFilters()); setSearch(""); };

  // Options shown in each dropdown depend on the parent selection
  const campusOptions = campuses.filter((c) => filters.institutionId === ALL || c.institutionId === filters.institutionId);
  const courseOptions = courses.filter((c) =>
    (filters.institutionId === ALL || c.institutionId === filters.institutionId) &&
    (filters.campusId === ALL || c.campusId === filters.campusId));
  const course = byId(courses, filters.courseId);
  const yearOptions = course?.years ?? [];
  const departmentOptions = yearOptions.find((y) => y.name === filters.year)?.departments ?? [];
  const sectionOptions = departmentOptions.find((d) => d.name === filters.department)?.sections ?? [];

  // ---------- DERIVED NUMBERS ----------
  const shownStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) =>
      LEVELS.every((l) => filters[l] === ALL || s[l] === filters[l]) &&
      (!q || [s.id, s.name, s.email].some((v) => String(v).toLowerCase().includes(q))));
  }, [students, filters, search]);

  const shownAssessments = assessments.filter((a) => courseOptions.some((c) => c.id === a.courseId) && (filters.courseId === ALL || a.courseId === filters.courseId));

  const allRows = useMemo(() => results.map((r) => scoreRow(r, byId(assessments, r.assessmentId))), [results, assessments]);
  const rows = allRows.filter((r) => shownStudents.some((s) => s.id === r.studentId) && shownAssessments.some((a) => a.id === r.assessmentId));
  const summary = summarize(rows);

  const studentAverage = (id) => {
    const own = allRows.filter((r) => r.studentId === id);
    return own.length ? pct(average(own.map((r) => r.percentage))) : "—";
  };
  const activeCount = shownStudents.filter((s) => s.status === "Active").length;

  // ---------- ACTIONS ----------
  const toggleStatus = (student) => {
    const status = student.status === "Active" ? "Inactive" : "Active";
    setStudents((list) => list.map((s) => (s.id === student.id ? { ...s, status } : s)));
    setOpenStudent((open) => (open?.id === student.id ? { ...open, status } : open));
    notify(`Student is now ${status}.`);
  };

  const openAddStudent = () => { setStudentForm(emptyStudentForm(filters)); setFormError(""); setModal("student"); };

  // Add-student form uses the same parent -> child reset rule
  const setStudentField = (field, value) =>
    setStudentForm((prev) => {
      const next = { ...prev, [field]: value };
      if (LEVELS.includes(field)) LEVELS.slice(LEVELS.indexOf(field) + 1).forEach((l) => (next[l] = ""));
      return next;
    });

  const addStudent = (e) => {
    e.preventDefault();
    const f = studentForm;
    if (!f.name.trim() || !f.email.trim() || LEVELS.some((l) => !f[l])) return setFormError("Fill in every field marked *.");
    if (students.some((s) => s.email.toLowerCase() === f.email.trim().toLowerCase())) return setFormError("A student with this email already exists.");
    setStudents((list) => [{ ...f, name: f.name.trim(), email: f.email.trim(), id: `STU${String(Date.now()).slice(-6)}`, enrollmentDate: new Date().toISOString().slice(0, 10), status: "Active" }, ...list]);
    setModal(null);
    notify("Student added.");
  };

  const addInstitution = (e) => {
    e.preventDefault();
    if (!institutionForm.name.trim()) return;
    setInstitutions((list) => [...list, { ...institutionForm, id: `inst-${Date.now()}`, name: institutionForm.name.trim(), code: institutionForm.code.trim() || "NEW", status: "Active" }]);
    setInstitutionForm({ name: "", type: "Standalone College", code: "", location: "" });
    setModal(null);
    notify("Institution added.");
  };

  // Academic structure: ask for a name, reject duplicates, update the selected course
  const askName = (question, existing) => {
    const name = window.prompt(question)?.trim();
    if (!name) return null;
    if (existing.some((x) => x.toLowerCase() === name.toLowerCase())) { notify(`"${name}" already exists.`); return null; }
    return name;
  };
  const editCourse = (edit) => setCourses((list) => list.map((c) => (c.id === course.id ? edit(c) : c)));

  const addYear = () => {
    const name = askName("Year or semester name (e.g. 5th Year, Semester 1):", course.years.map((y) => y.name));
    if (name) { editCourse((c) => ({ ...c, years: [...c.years, { name, departments: [] }] })); notify("Year added."); }
  };
  const addDepartment = () => {
    const year = yearOptions.find((y) => y.name === filters.year);
    const name = askName("Department or specialization name:", year.departments.map((d) => d.name));
    if (name) {
      editCourse((c) => ({ ...c, years: c.years.map((y) => y.name !== year.name ? y : { ...y, departments: [...y.departments, { name, sections: [] }] }) }));
      notify("Department added.");
    }
  };
  const addSection = () => {
    const name = askName("Section name (e.g. A, B, C):", sectionOptions);
    if (name) {
      editCourse((c) => ({ ...c, years: c.years.map((y) => y.name !== filters.year ? y : { ...y, departments: y.departments.map((d) => d.name !== filters.department ? d : { ...d, sections: [...d.sections, name] }) }) }));
      notify("Section added.");
    }
  };

  const viewInstitution = (id) => { setFilters({ ...emptyFilters(), institutionId: id }); setSearch(""); setSearchParams({ section: "Overview" }); setTab("Overview"); };

  // CSV exports follow the current filters
  const exportStudents = () =>
    downloadCSV("students.csv",
      ["Student ID", "Name", "Email", "Phone", "Institution", "Campus", "Course", "Year", "Department", "Section", "Status", "Average"],
      shownStudents.map((s) => [s.id, s.name, s.email, s.phone, byId(institutions, s.institutionId)?.name, byId(campuses, s.campusId)?.name, byId(courses, s.courseId)?.name, s.year, s.department, s.section, s.status, studentAverage(s.id)]));

  const exportResults = () =>
    downloadCSV("assessment-results.csv",
      ["Student ID", "Student", "Course", "Assessment", "Score", "Max score", "Percentage", "Pass mark", "Outcome"],
      rows.map((r) => { const s = byId(students, r.studentId); return [s?.id, s?.name, byId(courses, s?.courseId)?.name, r.assessment?.title, r.score, r.assessment?.maxScore, Math.round(r.percentage), r.assessment?.passMark, r.passed ? "Pass" : "Fail"]; }));

  // ---------- REUSABLE TABLE: students ----------
  const studentTable = (list) => (
    <Table rows={list} empty="No students match these filters." columns={[
      { header: "Student", render: (s) => (
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-orange-100 text-xs font-bold text-orange-700">{initials(s.name)}</span>
          <div><p className="font-semibold">{s.name}</p><p className="text-xs text-gray-400">{s.id}</p></div>
        </div>) },
      { header: "Institution / campus", render: (s) => `${byId(institutions, s.institutionId)?.name} · ${byId(campuses, s.campusId)?.name}` },
      { header: "Course / year", render: (s) => `${byId(courses, s.courseId)?.name} · ${s.year}` },
      { header: "Department / section", render: (s) => `${s.department} · ${s.section}` },
      { header: "Average", render: (s) => studentAverage(s.id) },
      { header: "Status", render: (s) => <StatusBadge status={s.status} /> },
      { header: "Actions", render: (s) => (
        <div className="flex gap-1">
          <Button small onClick={() => setOpenStudent(s)}>View</Button>
          <Button small onClick={() => toggleStatus(s)}>{s.status === "Active" ? "Deactivate" : "Activate"}</Button>
        </div>) },
    ]} />
  );

  const opts = (list, v = (x) => x.id, l = (x) => x.name) => list.map((x) => ({ value: v(x), label: l(x) }));
  const nameOf = (x) => x.name;

  // =========================================================
  // RENDER
  // =========================================================
  return (
    <div className="w-full min-w-0 text-gray-800">
      <div className="min-w-0 w-full">
        {/* ---------- HEADER ---------- */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{tab}</h1>
          <div className="flex gap-2">
            {tab !== "Institutions" && <Button onClick={resetFilters}>Reset filters</Button>}
            {(tab === "Overview" || tab === "Students") && <Button primary onClick={openAddStudent}>+ Add student</Button>}
            {tab === "Institutions" && <Button primary onClick={() => setModal("institution")}>+ Add institution</Button>}
          </div>
        </div>

        {/* ---------- FILTERS ---------- */}
        {tab !== "Institutions" && (
          <div className="mb-6 grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-white p-4 lg:grid-cols-4">
            <Select label="Institution" value={filters.institutionId} onChange={(v) => setFilter("institutionId", v)} placeholder="All institutions" options={opts(institutions)} />
            <Select label="Campus" value={filters.campusId} onChange={(v) => setFilter("campusId", v)} placeholder="All campuses" options={opts(campusOptions)} />
            <Select label="Course" value={filters.courseId} onChange={(v) => setFilter("courseId", v)} placeholder="All courses" options={opts(courseOptions)} />
            <Select label="Year / semester" value={filters.year} onChange={(v) => setFilter("year", v)} placeholder={course ? "All" : "Pick a course first"} disabled={!course} options={opts(yearOptions, nameOf, nameOf)} />
            <Select label="Department" value={filters.department} onChange={(v) => setFilter("department", v)} placeholder="All departments" disabled={filters.year === ALL} options={opts(departmentOptions, nameOf, nameOf)} />
            <Select label="Section" value={filters.section} onChange={(v) => setFilter("section", v)} placeholder="All sections" disabled={filters.department === ALL} options={sectionOptions.map((s) => ({ value: s, label: s }))} />
            <div className="col-span-2">
              <Field label="Search name, ID, email">
                <input className={inputCls} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search students..." />
              </Field>
            </div>
          </div>
        )}

        {/* ---------- OVERVIEW ---------- */}
        {tab === "Overview" && (
          <>
            <Stats>
              <Stat label="Institutions" value={institutions.length} note={`${campuses.length} campuses`} />
              <Stat label="Courses" value={courseOptions.length} />
              <Stat label="Students" value={shownStudents.length} note={`${activeCount} active`} />
              <Stat label="Average score" value={summary.count ? pct(summary.averageScore) : "—"} note={`${summary.count} results`} />
            </Stats>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card title="Course performance" subtitle="Average score for the current filters">
                <div className="space-y-4 p-5">
                  {courseOptions.map((c) => {
                    const cr = rows.filter((r) => r.assessment?.courseId === c.id);
                    const avg = average(cr.map((r) => r.percentage));
                    return (
                      <div key={c.id}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="font-semibold">{c.name} <span className="font-normal text-gray-400">{c.programType}</span></span>
                          <span>{cr.length ? pct(avg) : "No data"}</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-orange-500" style={{ width: `${avg}%` }} /></div>
                      </div>
                    );
                  })}
                  {!courseOptions.length && <p className="text-sm text-gray-400">No courses for these filters.</p>}
                </div>
              </Card>

              <Card title="Assessment outcomes" subtitle="Completed results only">
                <div className="grid grid-cols-3 gap-4 p-5 text-center">
                  <div><p className="text-2xl font-bold">{summary.count ? pct(summary.passRate) : "—"}</p><p className="text-xs text-gray-500">Pass rate</p></div>
                  <div><p className="text-2xl font-bold text-green-600">{summary.passCount}</p><p className="text-xs text-gray-500">Passed</p></div>
                  <div><p className="text-2xl font-bold text-red-500">{summary.failCount}</p><p className="text-xs text-gray-500">Failed</p></div>
                </div>
              </Card>
            </div>

            <Card title="Students" actions={<><Button small onClick={exportStudents}>Export students CSV</Button><Button small onClick={exportResults}>Export results CSV</Button></>}>
              {studentTable(shownStudents.slice(0, 8))}
            </Card>
          </>
        )}

        {/* ---------- STUDENTS ---------- */}
        {tab === "Students" && (
          <>
            <Stats>
              <Stat label="Students" value={shownStudents.length} />
              <Stat label="Active" value={activeCount} />
              <Stat label="Inactive" value={shownStudents.length - activeCount} />
              <Stat label="Average score" value={summary.count ? pct(summary.averageScore) : "—"} />
            </Stats>
            <Card title="All students" subtitle={`${shownStudents.length} records`} actions={<Button small onClick={exportStudents}>Export CSV</Button>}>
              {studentTable(shownStudents)}
            </Card>
          </>
        )}

        {/* ---------- ASSESSMENTS ---------- */}
        {tab === "Assessments" && (
          <>
            <Stats>
              <Stat label="Assessments" value={shownAssessments.length} />
              <Stat label="Completed results" value={summary.count} />
              <Stat label="Average score" value={summary.count ? pct(summary.averageScore) : "—"} />
              <Stat label="Pass rate" value={summary.count ? pct(summary.passRate) : "—"} />
            </Stats>

            <Card title="Assessment catalog" actions={<Button small onClick={exportResults}>Export results CSV</Button>}>
              <Table rows={shownAssessments} empty="No assessments for these filters." columns={[
                { header: "Assessment", render: (a) => <strong>{a.title}</strong> },
                { header: "Course", render: (a) => byId(courses, a.courseId)?.name },
                { header: "Date", render: (a) => a.date },
                { header: "Max / pass", render: (a) => `${a.maxScore} / ${a.passMark}` },
                { header: "Assigned", render: (a) => shownStudents.filter((s) => s.courseId === a.courseId).length },
                { header: "Completed", render: (a) => rows.filter((r) => r.assessmentId === a.id).length },
                { header: "Pending", render: (a) => shownStudents.filter((s) => s.courseId === a.courseId).length - rows.filter((r) => r.assessmentId === a.id).length },
                { header: "Average", render: (a) => { const r = rows.filter((x) => x.assessmentId === a.id); return r.length ? pct(summarize(r).averageScore) : "—"; } },
              ]} />
            </Card>

            <Card title="Individual results">
              <Table rows={rows} empty="No completed results for these filters." columns={[
                { header: "Student", render: (r) => <button className="font-semibold text-orange-600" onClick={() => setOpenStudent(byId(students, r.studentId))}>{byId(students, r.studentId)?.name}</button> },
                { header: "Assessment", render: (r) => r.assessment?.title },
                { header: "Score", render: (r) => `${r.score} / ${r.assessment?.maxScore}` },
                { header: "Percentage", render: (r) => pct(r.percentage) },
                { header: "Outcome", render: (r) => <Outcome passed={r.passed} /> },
              ]} />
            </Card>
          </>
        )}

        {/* ---------- ACADEMICS ---------- */}
        {tab === "Academics" && (
          <>
            <Card title="Configure a course" subtitle="Pick a course (then year, department) in the filters above, then add to its structure.">
              <div className="flex flex-wrap gap-2 p-5">
                <Button primary disabled={!course} onClick={addYear}>+ Add year / semester</Button>
                <Button disabled={filters.year === ALL} onClick={addDepartment}>+ Add department</Button>
                <Button disabled={filters.department === ALL} onClick={addSection}>+ Add section</Button>
              </div>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {courseOptions.map((c) => (
                <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-5">
                  <div className="flex justify-between"><h3 className="text-lg font-bold">{c.name}</h3><Badge>{c.programType}</Badge></div>
                  <p className="mt-1 text-xs text-gray-400">{byId(institutions, c.institutionId)?.name} · {byId(campuses, c.campusId)?.name}</p>
                  <p className="mt-3 text-sm">Students: <strong>{students.filter((s) => s.courseId === c.id).length}</strong></p>
                  <p className="mt-2 flex flex-wrap gap-1">
                    {c.years.map((y) => <span key={y.name} className="rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-600">{y.name}</span>)}
                  </p>
                </div>
              ))}
              {!courseOptions.length && <p className="text-sm text-gray-400">No courses for these filters.</p>}
            </div>
          </>
        )}

        {/* ---------- INSTITUTIONS ---------- */}
        {tab === "Institutions" && (
          <>
            <Card title="Institutions" subtitle="A standalone college or a university group with several campuses.">
              <Table rows={institutions} columns={[
                { header: "Institution", render: (i) => <><p className="font-semibold">{i.name}</p><p className="text-xs text-gray-400">{i.code}</p></> },
                { header: "Type", render: (i) => i.type },
                { header: "Location", render: (i) => i.location || "—" },
                { header: "Campuses", render: (i) => campuses.filter((c) => c.institutionId === i.id).length },
                { header: "Courses", render: (i) => courses.filter((c) => c.institutionId === i.id).length },
                { header: "Students", render: (i) => students.filter((s) => s.institutionId === i.id).length },
                { header: "Status", render: (i) => <StatusBadge status={i.status} /> },
                { header: "", render: (i) => <Button small onClick={() => viewInstitution(i.id)}>View dashboard</Button> },
              ]} />
            </Card>

            <Card title="Campuses">
              <Table rows={campuses} columns={[
                { header: "Campus", render: (c) => c.name },
                { header: "Institution", render: (c) => byId(institutions, c.institutionId)?.name },
                { header: "Location", render: (c) => c.location },
                { header: "Courses", render: (c) => courses.filter((x) => x.campusId === c.id).length },
                { header: "Students", render: (c) => students.filter((s) => s.campusId === c.id).length },
              ]} />
            </Card>
          </>
        )}
      </div>

      {/* ---------- MODAL: add student ---------- */}
      {modal === "student" && (
        <Modal title="Add student" onClose={() => setModal(null)}>
          <form onSubmit={addStudent} className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name *"><input className={inputCls} value={studentForm.name} onChange={(e) => setStudentField("name", e.target.value)} /></Field>
            <Field label="Email *"><input type="email" className={inputCls} value={studentForm.email} onChange={(e) => setStudentField("email", e.target.value)} /></Field>
            <Field label="Phone"><input className={inputCls} value={studentForm.phone} onChange={(e) => setStudentField("phone", e.target.value)} /></Field>
            <Select label="Institution *" value={studentForm.institutionId} placeholder="Select institution" options={opts(institutions)} onChange={(v) => setStudentField("institutionId", v === ALL ? "" : v)} />
            <Select label="Campus *" value={studentForm.campusId} placeholder="Select campus" options={opts(campuses.filter((c) => c.institutionId === studentForm.institutionId))} onChange={(v) => setStudentField("campusId", v === ALL ? "" : v)} />
            <Select label="Course *" value={studentForm.courseId} placeholder="Select course" options={opts(courses.filter((c) => c.campusId === studentForm.campusId))} onChange={(v) => setStudentField("courseId", v === ALL ? "" : v)} />
            {(() => {
              const fYears = byId(courses, studentForm.courseId)?.years ?? [];
              const fDepts = fYears.find((y) => y.name === studentForm.year)?.departments ?? [];
              const fSections = fDepts.find((d) => d.name === studentForm.department)?.sections ?? [];
              return (
                <>
                  <Select label="Year / semester *" value={studentForm.year} placeholder="Select year" options={opts(fYears, nameOf, nameOf)} onChange={(v) => setStudentField("year", v === ALL ? "" : v)} />
                  <Select label="Department *" value={studentForm.department} placeholder="Select department" options={opts(fDepts, nameOf, nameOf)} onChange={(v) => setStudentField("department", v === ALL ? "" : v)} />
                  <Select label="Section *" value={studentForm.section} placeholder="Select section" options={fSections.map((s) => ({ value: s, label: s }))} onChange={(v) => setStudentField("section", v === ALL ? "" : v)} />
                </>
              );
            })()}
            {formError && <p className="text-sm text-red-600 sm:col-span-2">{formError}</p>}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button onClick={() => setModal(null)}>Cancel</Button>
              <Button primary type="submit">Add student</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ---------- MODAL: add institution ---------- */}
      {modal === "institution" && (
        <Modal title="Add institution" onClose={() => setModal(null)}>
          <form onSubmit={addInstitution} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Institution name *"><input required className={inputCls} value={institutionForm.name} onChange={(e) => setInstitutionForm({ ...institutionForm, name: e.target.value })} /></Field>
            </div>
            <Field label="Type">
              <select className={inputCls} value={institutionForm.type} onChange={(e) => setInstitutionForm({ ...institutionForm, type: e.target.value })}>
                <option>Standalone College</option>
                <option>University / Group</option>
              </select>
            </Field>
            <Field label="Code"><input className={inputCls} value={institutionForm.code} onChange={(e) => setInstitutionForm({ ...institutionForm, code: e.target.value })} /></Field>
            <div className="sm:col-span-2">
              <Field label="Location"><input className={inputCls} value={institutionForm.location} onChange={(e) => setInstitutionForm({ ...institutionForm, location: e.target.value })} /></Field>
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button onClick={() => setModal(null)}>Cancel</Button>
              <Button primary type="submit">Create institution</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ---------- MODAL: student profile ---------- */}
      {openStudent && (() => {
        const s = openStudent;
        const own = allRows.filter((r) => r.studentId === s.id);
        const details = [
          ["Email", s.email], ["Phone", s.phone || "Not provided"],
          ["Institution", byId(institutions, s.institutionId)?.name], ["Campus", byId(campuses, s.campusId)?.name],
          ["Course", byId(courses, s.courseId)?.name], ["Year / semester", s.year],
          ["Department", s.department], ["Section", s.section],
          ["Enrolled", s.enrollmentDate], ["Status", s.status],
        ];
        return (
          <Modal title={`${s.name} (${s.id})`} onClose={() => setOpenStudent(null)}>
            <Stats>
              <Stat label="Assessments taken" value={own.length} />
              <Stat label="Average score" value={studentAverage(s.id)} />
            </Stats>
            <div className="mb-5 grid grid-cols-2 gap-3">
              {details.map(([label, value]) => (
                <div key={label} className="rounded-lg border border-gray-100 p-3">
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="break-words text-sm font-semibold">{value || "—"}</p>
                </div>
              ))}
            </div>
            <h3 className="mb-2 font-bold">Assessment history</h3>
            <Table rows={own} empty="No assessment results yet." columns={[
              { header: "Assessment", render: (r) => r.assessment?.title },
              { header: "Score", render: (r) => `${r.score} / ${r.assessment?.maxScore}` },
              { header: "Percentage", render: (r) => pct(r.percentage) },
              { header: "Outcome", render: (r) => <Outcome passed={r.passed} /> },
            ]} />
            <div className="mt-5 flex justify-end">
              <Button onClick={() => toggleStatus(s)}>{s.status === "Active" ? "Deactivate" : "Activate"} student</Button>
            </div>
          </Modal>
        );
      })()}

      {notice && <div className="fixed bottom-5 right-5 z-50 rounded-lg bg-slate-800 px-4 py-3 text-sm text-white shadow-lg">{notice}</div>}
    </div>
  );
}

/*
 * GOING LIVE
 * - Replace the MOCK_* arrays with API data (fetch in useEffect, then setInstitutions / setStudents ...).
 * - Make each action (addStudent, toggleStatus, addInstitution, editCourse) call your API first,
 *   then update state with the saved record.
 * - Do backend authorization and institution-level access checks on the server, not in filters.
 * - Compute official analytics on the backend for large datasets.
 */