import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getAssessments, getUsers } from "../../services/api";
import { hasInstitutionalMetadata, matchesStudentFilters, normalizeInstitutionalUsers, uniqueOptions } from "../../utils/studentDirectory";
import { LOCAL_INSTITUTIONAL_CATALOG } from "../../data/institutionalCatalog";
import { readLocalAssignedAssessments } from "../../../services/localAssignedAssessments";

// Dashboard records are adapted from the authenticated users/assessment APIs.

const ALL = "ALL";
// Filter levels, parent -> child. Changing one resets everything after it.
const LEVELS = ["institutionId", "campusId", "courseId", "year", "department", "section", "semester"];
const FILTER_QUERY_KEYS = {
  institutionId: "institution",
  campusId: "campus",
  courseId: "course",
  year: "year",
  department: "department",
  section: "section",
  semester: "semester",
};

const byId = (list, id) => list.find((x) => x.id === id);
const departmentValue = (department) => String(department?.id || department?.name || "");
const average = (nums) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);
const pct = (v) => `${Math.round(v || 0)}%`;
const initials = (name = "") => name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

const uniqueEntities = (students, field, parentField) => {
  const entities = new Map();
  students.forEach((student) => {
    const id = student[field]?.key;
    const parentValue = student[parentField]?.key || student[parentField] || "";
    const entityKey = parentField ? `${parentValue}:${id}` : id;
    if (id && !entities.has(entityKey)) entities.set(entityKey, { id, name: student[field].label, ...(parentField ? { [parentField]: parentValue } : {}) });
  });
  return [...entities.values()];
};

const apiErrorMessage = (endpoint, error) => {
  const status = error?.response?.status;
  const detail = error?.response?.data?.message || error?.response?.data?.error || error?.message || "Request failed";
  return `${endpoint}${status ? ` (HTTP ${status})` : ""}: ${detail}`;
};

const dashboardStudent = (student) => ({
  ...student,
  institutionId: student.institution.key,
  campusId: student.campus.key,
  courseId: student.course.key,
  year: student.year.label,
  semester: student.semester.label,
  department: student.department.label,
  departmentId: student.department.key,
  section: student.section,
  status: /^active$/i.test(student.status) ? "Active" : /^inactive$/i.test(student.status) ? "Inactive" : student.status || "Unknown",
});

const courseCatalog = (students) => {
  const groupedCourses = new Map();
  students.forEach((student) => {
    if (!student.institutionId || !student.courseId) return;
    const key = [student.institutionId, student.campusId, student.courseId].join("::");
    if (!groupedCourses.has(key)) groupedCourses.set(key, []);
    groupedCourses.get(key).push(student);
  });

  const liveCourses = [...groupedCourses.values()].map((enrolled) => {
    const first = enrolled[0];
    const yearNames = [...new Set(enrolled.map((student) => student.year).filter(Boolean))];
    const configuredCourse = LOCAL_INSTITUTIONAL_CATALOG.courses.find((item) =>
      item.institutionId === first.institutionId &&
      item.campusId === first.campusId &&
      item.name.trim().toLowerCase() === first.course.label.trim().toLowerCase());
    const allYearNames = [...new Set([...yearNames, ...(configuredCourse?.years || []).map((year) => year.name)])];
    return {
      id: first.courseId,
      name: first.course.label,
      institutionId: first.institutionId,
      sourceId: first.course.key,
      campusId: first.campusId,
      years: allYearNames.map((name) => {
        const yearStudents = enrolled.filter((student) => student.year === name);
        const configuredYear = configuredCourse?.years.find((year) => year.name === name);
        const liveDepartments = uniqueEntities(yearStudents, "department", "courseId").map((department) => ({
          id: department.id,
          name: department.name,
          sections: yearStudents.filter((student) => student.departmentId === department.id).map((student) => student.section).filter(Boolean),
        }));
        const configuredDepartments = (configuredYear?.departments || []).map((department) => {
          const live = liveDepartments.find((item) => item.name.toLowerCase() === department.name.toLowerCase() || department.aliases?.some((alias) => alias.toLowerCase() === item.name.toLowerCase()));
          return {
            id: live?.id || department.id || department.name,
            name: department.name,
            sections: [...new Set([...(live?.sections || []), ...(department.sections || [])])],
          };
        });
        const departments = [
          ...liveDepartments.filter((item) => !configuredDepartments.some((configured) => configured.name.toLowerCase() === item.name.toLowerCase())),
          ...configuredDepartments,
        ];
        return {
          name,
          semesters: [...new Set([
            ...yearStudents.map((student) => student.semester).filter(Boolean),
            ...(configuredYear?.semesters || []).map((semester) => semester.name),
          ])].map((semesterName) => ({ name: semesterName })),
          departments,
        };
      }),
    };
  });

  const configuredCourses = LOCAL_INSTITUTIONAL_CATALOG.courses.filter((configuredCourse) =>
    students.some((student) => student.institutionId === configuredCourse.institutionId && student.campusId === configuredCourse.campusId) &&
    !liveCourses.some((course) => course.institutionId === configuredCourse.institutionId && course.campusId === configuredCourse.campusId && course.name.toLowerCase() === configuredCourse.name.toLowerCase())
  );

  return [...liveCourses, ...configuredCourses];
};

const assessmentCandidates = (assessment) => {
  for (const key of ["candidates", "assignments", "assigned_students", "assignedStudents", "participants", "attempts", "candidate_results", "candidateResults", "assessment_candidates", "student_assignments"]) {
    if (Array.isArray(assessment?.[key])) return assessment[key];
  }
  return [];
};

const candidateStudentId = (candidate) => String(
  (typeof candidate === "string" || typeof candidate === "number" ? candidate : "") ||
  candidate?.student_id || candidate?.studentId || candidate?.user_id || candidate?.userId || candidate?.candidate_id || candidate?.candidateId ||
  candidate?.student?.id || candidate?.student?._id || candidate?.user?.id || candidate?.user?._id || candidate?.candidate?.id || candidate?.id || ""
);

const resultRecordsFromAssessments = (assessments) => assessments.flatMap((assessment) =>
  assessmentCandidates(assessment).flatMap((candidate) => {
    const result = candidate?.result || candidate?.submission || candidate?.attempt_result || candidate?.attemptResult || candidate?.attempt || candidate;
    const score = result?.score ?? result?.marks_obtained ?? result?.marksObtained ?? result?.total_score ?? result?.totalScore;
    const status = String(result?.result_status || result?.status || candidate?.result_status || candidate?.attempt_status || candidate?.status || "").toLowerCase();
    if (score === undefined && !["passed", "failed"].includes(status)) return [];
    return [{ ...result, studentId: candidateStudentId(candidate), assessmentId: assessment.id, score: score === undefined ? null : Number(score), status }];
  }).filter((result) => result.studentId)
);

const normalizeAssessment = (assessment) => ({
  ...assessment,
  candidates: assessment.candidates || assessment.studentIds?.map((student_id) => ({ student_id })) || [],
  title: assessment.title || assessment.name || assessment.assessment_name || "Untitled assessment",
  courseId: String(assessment.course_id || assessment.courseId || assessment.course?.id || assessment.course?._id || ""),
  courseName: typeof assessment.course === "string" ? assessment.course : assessment.course?.name || assessment.course_name || assessment.courseName || "",
  institutionName: typeof assessment.institution === "string" ? assessment.institution : assessment.institution?.name || assessment.institution_name || assessment.institutionName || "",
  campusName: typeof assessment.campus === "string" ? assessment.campus : assessment.campus?.name || assessment.campus_name || assessment.campusName || "",
  institutionId: String(assessment.institution_id || assessment.institutionId || assessment.institution?.id || assessment.institution?._id || ""),
  campusId: String(assessment.campus_id || assessment.campusId || assessment.campus?.id || assessment.campus?._id || ""),
  departmentId: String(assessment.department_id || assessment.departmentId || assessment.department?.id || assessment.department?._id || ""),
  section: String(assessment.section || assessment.section_name || assessment.sectionName || ""),
  date: assessment.starts_at || assessment.startsAt || assessment.start_at || assessment.startAt || assessment.scheduled_at || assessment.scheduledAt || assessment.scheduled_date || assessment.scheduledDate || assessment.exam_date || assessment.examDate || assessment.date || assessment.details?.starts_at || "",
  maxScore: Number(assessment.max_score || assessment.maxScore || assessment.total_marks || 0),
  passMark: Number(assessment.pass_mark || assessment.passMark || assessment.passing_score || ((Number(assessment.passing_percentage) / 100) * Number(assessment.max_score || assessment.maxScore || assessment.total_marks)) || 0),
  status: assessment.status || assessment.assessment_status || assessment.assessmentStatus || assessment.schedule_type || "",
  year: assessment.academic_year?.name || assessment.academic_year || assessment.academicYear?.name || assessment.academicYear || assessment.year?.name || assessment.year || "",
  semester: assessment.semester_name || assessment.semester?.name || assessment.semester || "",
  department: assessment.department_name || assessment.department?.name || assessment.department || "",
});

const assignmentState = (candidate) => {
  const result = candidate?.result || candidate?.submission || candidate?.attempt_result || candidate?.attemptResult || candidate?.attempt || {};
  const rawStatus = String(result?.result_status || result?.status || candidate?.result_status || candidate?.attempt_status || candidate?.attemptStatus || candidate?.progress || candidate?.status || "").toLowerCase().replace(/[\s-]+/g, "_");
  if (["absent", "missed", "no_show"].includes(rawStatus)) return "absent";
  if (["submitted", "completed", "graded", "passed", "failed"].includes(rawStatus) || candidate?.submitted_at || candidate?.submittedAt || result?.submitted_at || result?.submittedAt || result?.score !== undefined || candidate?.score !== undefined) return "submitted";
  if (["in_progress", "started", "ongoing", "attempting"].includes(rawStatus) || candidate?.started_at || candidate?.startedAt || result?.started_at || result?.startedAt) return "in_progress";
  if (["not_started", "pending", "assigned", "invited"].includes(rawStatus)) return "not_started";
  return "unknown";
};

const isUpcoming = (assessment, now = Date.now()) => {
  const timestamp = new Date(assessment.date).getTime();
  return Number.isFinite(timestamp) && timestamp > now;
};

// Turn a raw result into { ...result, assessment, percentage, passed }
const scoreRow = (result, assessment) => ({
  ...result,
  assessment,
  percentage: assessment?.maxScore && Number.isFinite(result.score) ? (result.score / assessment.maxScore) * 100 : 0,
  passed: ["passed", "failed"].includes(String(result.status || result.result_status || "").toLowerCase())
    ? String(result.status || result.result_status).toLowerCase() === "passed"
    : assessment?.passMark > 0 && Number.isFinite(result.score) ? result.score >= assessment.passMark : null,
});

const summarize = (rows) => {
  const classifiedRows = rows.filter((row) => row.passed !== null);
  const passCount = classifiedRows.filter((r) => r.passed).length;
  return {
    count: rows.length,
    passCount,
    failCount: classifiedRows.length - passCount,
    averageScore: average(rows.filter((row) => Number.isFinite(row.score)).map((r) => r.percentage)),
    passRate: classifiedRows.length ? (passCount / classifiedRows.length) * 100 : 0,
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
  return <button type="button" {...props} className={`rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${small ? "px-3 py-2 text-sm" : "px-4 py-2.5 text-[15px]"} ${look} ${className}`} />;
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

const Stat = ({ label, value, note, onClick }) => {
  const className = `rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm ${onClick ? "cursor-pointer transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-300" : ""}`;
  const contents = <><p className="text-[15px] text-gray-600">{label}</p><p className="mt-1 text-2xl font-bold text-gray-800">{value}</p>{note && <p className="mt-1 text-sm text-gray-500">{note}</p>}</>;
  return onClick ? <button type="button" className={className} onClick={onClick}>{contents}</button> : <div className={className}>{contents}</div>;
};

const Stats = ({ children, className = "" }) => <div className={`mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6 ${className}`}>{children}</div>;

const Badge = ({ tone = "green", children }) => (
  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${{ green: "bg-green-50 text-green-700", gray: "bg-gray-100 text-gray-600", red: "bg-red-50 text-red-600" }[tone]}`}>{children}</span>
);
const StatusBadge = ({ status }) => <Badge tone={status === "Active" ? "green" : "gray"}>{status}</Badge>;
const Outcome = ({ passed }) => <Badge tone={passed ? "green" : "red"}>{passed ? "Pass" : "Fail"}</Badge>;

// <Select options=[{value,label}] />  — the first option is the "all/none" choice
function Select({ label, value, onChange, options, placeholder, disabled, loading = false }) {
  return (
    <label className="block text-xs font-semibold text-gray-500">
      {label}
      <select className={`${inputCls} mt-1 font-normal text-gray-800`} value={value || ALL} disabled={disabled || loading} onChange={(e) => onChange(e.target.value)}>
        <option value={ALL}>{loading ? "Loading..." : placeholder}</option>
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
      <table className="w-full text-left text-[15px]">
        <thead>
          <tr className="border-b border-gray-200 bg-orange-50/70 text-sm text-gray-600">
            {columns.map((c) => <th key={c.header} className="px-4 py-3.5 font-semibold">{c.header}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
              {columns.map((c) => <td key={c.header} className="whitespace-nowrap px-4 py-3.5 text-gray-700">{c.render(row)}</td>)}
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

const TABS = ["Dashboard", "Overview", "Students", "Institutional Student Data", "Assessments", "Academics", "Institutions"];
const emptyFilters = () => Object.fromEntries(LEVELS.map((l) => [l, ALL]));
const emptyDirectoryFilters = () => ({ institution: "", campus: "", course: "", year: "", department: "", section: "", semester: "" });
const emptyStudentForm = (f = emptyFilters()) => ({
  name: "", email: "", phone: "",
  ...Object.fromEntries(LEVELS.map((l) => [l, f[l] === ALL ? "" : f[l]])),
});

export default function AdminDashboard() {
  // ---------- STATE (replace the initial values with API data later) ----------
  const [institutions, setInstitutions] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [results, setResults] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [catalogSource, setCatalogSource] = useState("loading");
  const [directoryStudents, setDirectoryStudents] = useState([]);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState("");
  const [directoryFilters, setDirectoryFilters] = useState(emptyDirectoryFilters);
  const [directorySearch, setDirectorySearch] = useState("");
  const [directoryPage, setDirectoryPage] = useState(1);
  const directoryPageSize = 10;

  useEffect(() => {
    let cancelled = false;
    const useLocalCatalog = (liveStudents = [], liveAssessments = []) => {
      setDirectoryStudents(liveStudents);
      setStudents(liveStudents);
      setInstitutions(LOCAL_INSTITUTIONAL_CATALOG.institutions);
      setCampuses(LOCAL_INSTITUTIONAL_CATALOG.campuses);
      setCourses(LOCAL_INSTITUTIONAL_CATALOG.courses);
      setAssessments(liveAssessments);
      setResults(resultRecordsFromAssessments(liveAssessments));
      setCatalogSource("local");
    };

    const loadDashboardData = async () => {
      setDashboardLoading(true);
      setDashboardError("");
      const [usersResponse, assessmentsResponse] = await Promise.allSettled([getUsers(), getAssessments()]);
      if (cancelled) return;

      const errors = [];
      const localAssessments = readLocalAssignedAssessments().map(normalizeAssessment);
      if (usersResponse.status === "fulfilled") {
        const normalizedUsers = normalizeInstitutionalUsers(usersResponse.value);
        const institutionalUsers = normalizedUsers.filter((student) => student.institution.key).map(dashboardStudent);
        if (!institutionalUsers.length) {
          const liveStudents = normalizedUsers.filter((student) => student.isStudent).map(dashboardStudent);
          const remoteAssessments = assessmentsResponse.status === "fulfilled" ? assessmentsResponse.value.map(normalizeAssessment) : [];
          const remoteIds = new Set(remoteAssessments.map((assessment) => assessment.id));
          const liveAssessments = [...remoteAssessments, ...localAssessments.filter((assessment) => !remoteIds.has(assessment.id))];
          useLocalCatalog(liveStudents, liveAssessments);
          if (assessmentsResponse.status === "rejected") errors.push(apiErrorMessage("GET /api/assessment", assessmentsResponse.reason));
          setDashboardError(errors.join(" "));
          setDashboardLoading(false);
          setDirectoryLoading(false);
          return;
        }
        const normalizedStudents = normalizedUsers.filter((student) => student.isStudent);
        const liveStudents = normalizedStudents.map(dashboardStudent);
        setDirectoryStudents(normalizedStudents);
        const liveCourses = courseCatalog(liveStudents);
        setStudents(liveStudents);
        const liveInstitutions = uniqueEntities(institutionalUsers, "institution");
        const mergedInstitutions = [...liveInstitutions];
        LOCAL_INSTITUTIONAL_CATALOG.institutions.forEach((configured) => {
          if (!mergedInstitutions.some((item) => item.id === configured.id || item.name.trim().toLowerCase() === configured.name.trim().toLowerCase())) {
            mergedInstitutions.push(configured);
          }
        });
        const liveCampuses = uniqueEntities(institutionalUsers.filter((student) => student.campus.key), "campus", "institutionId");
        const mergedCampuses = [...liveCampuses];
        LOCAL_INSTITUTIONAL_CATALOG.campuses.forEach((configured) => {
          if (!mergedCampuses.some((item) => item.id === configured.id)) mergedCampuses.push(configured);
        });
        const mergedCourses = [...liveCourses];
        LOCAL_INSTITUTIONAL_CATALOG.courses.forEach((configured) => {
          if (!mergedCourses.some((item) => item.id === configured.id)) mergedCourses.push(configured);
        });
        setInstitutions(mergedInstitutions);
        setCampuses(mergedCampuses);
        setCourses(mergedCourses);
        if (assessmentsResponse.status === "fulfilled") {
          const remoteAssessments = assessmentsResponse.value.map(normalizeAssessment);
          const remoteIds = new Set(remoteAssessments.map((assessment) => assessment.id));
          const allAssessments = [...remoteAssessments, ...localAssessments.filter((assessment) => !remoteIds.has(assessment.id))];
          const liveAssessments = allAssessments.map((assessment) => {
            let matchedCourse = liveCourses.find((courseItem) =>
              courseItem.id === assessment.courseId || courseItem.sourceId === assessment.courseId ||
              (assessment.courseName && courseItem.name.toLowerCase() === assessment.courseName.toLowerCase()));
            if (!matchedCourse && !assessment.courseId) {
              const candidateCourseIds = [...new Set(assessmentCandidates(assessment)
                .map(candidateStudentId)
                .map((studentId) => liveStudents.find((student) => student.id === studentId)?.courseId)
                .filter(Boolean))];
              if (candidateCourseIds.length === 1) matchedCourse = liveCourses.find((courseItem) => courseItem.id === candidateCourseIds[0]);
            }
            return { ...assessment, courseId: matchedCourse?.id || assessment.courseId };
          });
          setAssessments(liveAssessments);
          setResults(resultRecordsFromAssessments(liveAssessments));
        }
        setCatalogSource("api");
      } else {
        errors.push(apiErrorMessage("GET /api/users/users", usersResponse.reason));
        const remoteAssessments = assessmentsResponse.status === "fulfilled" ? assessmentsResponse.value.map(normalizeAssessment) : [];
        const remoteIds = new Set(remoteAssessments.map((assessment) => assessment.id));
        const liveAssessments = [...remoteAssessments, ...localAssessments.filter((assessment) => !remoteIds.has(assessment.id))];
        useLocalCatalog([], liveAssessments);
      }

      if (assessmentsResponse.status === "fulfilled") {
        if (usersResponse.status !== "fulfilled") {
          const remoteAssessments = assessmentsResponse.value.map(normalizeAssessment);
          const remoteIds = new Set(remoteAssessments.map((assessment) => assessment.id));
          const liveAssessments = [...remoteAssessments, ...localAssessments.filter((assessment) => !remoteIds.has(assessment.id))];
          setAssessments(liveAssessments);
          setResults(resultRecordsFromAssessments(liveAssessments));
        }
      } else {
        setAssessments([]);
        setResults([]);
        errors.push(apiErrorMessage("GET /api/assessment", assessmentsResponse.reason));
      }

      setDashboardError(errors.join(" "));
      setDashboardLoading(false);
      setDirectoryLoading(false);
    };

    loadDashboardData();
    return () => { cancelled = true; };
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const skipAppliedFilterRestore = useRef(false);
  const requestedTab = searchParams.get("dashboardTab") || searchParams.get("section");
  const [tab, setTab] = useState(() => TABS.includes(requestedTab) ? requestedTab : "Dashboard");

  useEffect(() => {
    setTab(TABS.includes(requestedTab) ? requestedTab : "Dashboard");
  }, [requestedTab]);

  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [performanceSearch, setPerformanceSearch] = useState("");
  const [performanceSort, setPerformanceSort] = useState({ field: "student", direction: "asc" });
  const [performancePage, setPerformancePage] = useState(1);
  const [modal, setModal] = useState(null); // "student" | "institution" | null
  const [openStudent, setOpenStudent] = useState(null);
  const [notice, setNotice] = useState("");
  const [studentForm, setStudentForm] = useState(emptyStudentForm);
  const [institutionForm, setInstitutionForm] = useState({ name: "", type: "Standalone College", code: "", location: "" });
  const [formError, setFormError] = useState("");

  const notify = (msg) => { setNotice(msg); setTimeout(() => setNotice(""), 3000); };
  const openSection = (section) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("dashboardTab", section);
      if (TABS.includes(next.get("section"))) next.delete("section");
      return next;
    });
    setTab(section);
  };

  useEffect(() => {
    const hasCohortQuery = Object.entries(FILTER_QUERY_KEYS).some(([filterKey, queryKey]) => {
      const value = searchParams.get(queryKey);
      if (!value) return false;
      return filterKey !== "section" || ["A", "B", "C"].includes(value.toUpperCase());
    });
    if (!hasCohortQuery) return;
    const restored = emptyFilters();
    Object.entries(FILTER_QUERY_KEYS).forEach(([filterKey, queryKey]) => {
      const value = searchParams.get(queryKey);
      if (value) restored[filterKey] = value;
    });
    setFilters(restored);
    if (skipAppliedFilterRestore.current) {
      skipAppliedFilterRestore.current = false;
    } else {
      setAppliedFilters(restored);
    }
  }, [searchParams]);

  // ---------- FILTERS (cascading) ----------
  const setFilter = (level, value) => {
    const nextFilters = { ...filters, [level]: value };
    LEVELS.slice(LEVELS.indexOf(level) + 1).forEach((child) => (nextFilters[child] = ALL));
    setFilters(nextFilters);
    skipAppliedFilterRestore.current = true;
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      Object.values(FILTER_QUERY_KEYS).forEach((key) => next.delete(key));
      Object.entries(FILTER_QUERY_KEYS).forEach(([filterKey, queryKey]) => {
        if (nextFilters[filterKey] !== ALL) next.set(queryKey, nextFilters[filterKey]);
      });
      return next;
    });
  };
  const applyFilters = () => {
    setAppliedFilters({ ...filters });
    setAppliedSearch(search);
    setFiltersOpen(false);
    setPerformancePage(1);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      Object.values(FILTER_QUERY_KEYS).forEach((key) => next.delete(key));
      next.set("dashboardTab", tab);
      Object.entries(FILTER_QUERY_KEYS).forEach(([filterKey, queryKey]) => {
        if (filters[filterKey] !== ALL) next.set(queryKey, filters[filterKey]);
      });
      return next;
    });
  };
  const resetFilters = () => {
    const cleared = emptyFilters();
    setFilters(cleared);
    setAppliedFilters(cleared);
    setSearch("");
    setAppliedSearch("");
    setPerformancePage(1);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      Object.values(FILTER_QUERY_KEYS).forEach((key) => next.delete(key));
      next.set("dashboardTab", tab);
      return next;
    });
  };

  // Options shown in each dropdown depend on the parent selection
  const campusOptions = campuses.filter((c) => filters.institutionId === ALL || c.institutionId === filters.institutionId);
  const courseOptions = courses.filter((c) =>
    (filters.institutionId === ALL || c.institutionId === filters.institutionId) &&
    (filters.campusId === ALL || c.campusId === filters.campusId));
  const appliedInstitutionOptions = institutions.filter((institution) =>
    appliedFilters.institutionId === ALL || institution.id === appliedFilters.institutionId);
  const appliedCampusOptions = campuses.filter((campus) =>
    (appliedFilters.institutionId === ALL || campus.institutionId === appliedFilters.institutionId) &&
    (appliedFilters.campusId === ALL || campus.id === appliedFilters.campusId));
  const appliedCourseOptions = courses.filter((courseItem) =>
    (appliedFilters.institutionId === ALL || courseItem.institutionId === appliedFilters.institutionId) &&
    (appliedFilters.campusId === ALL || courseItem.campusId === appliedFilters.campusId));
  const course = byId(courses, filters.courseId);
  const yearOptions = course?.years ?? [];
  const selectedYear = yearOptions.find((year) => year.name === filters.year);
  const semesterOptions = selectedYear?.semesters ?? [];
  const departmentOptions = selectedYear?.departments || [];
  const selectedDepartment = departmentOptions.find((department) => departmentValue(department) === String(filters.department) || department.name === filters.department);
  const sectionOptions = selectedDepartment?.sections ?? [];
  const activeFilterLabels = [
    appliedFilters.institutionId !== ALL && byId(institutions, appliedFilters.institutionId)?.name,
    appliedFilters.campusId !== ALL && byId(campuses, appliedFilters.campusId)?.name,
    appliedFilters.courseId !== ALL && byId(courses, appliedFilters.courseId)?.name,
    appliedFilters.year !== ALL && appliedFilters.year,
    appliedFilters.semester !== ALL && appliedFilters.semester,
    appliedFilters.department !== ALL && (departmentOptions.find((department) => departmentValue(department) === String(appliedFilters.department) || department.name === appliedFilters.department)?.name || appliedFilters.department),
    appliedFilters.section !== ALL && `Section ${appliedFilters.section}`,
  ].filter(Boolean);
  const hasAppliedStudentFilters = LEVELS.some((level) => appliedFilters[level] !== ALL);
  const hasCompleteAssessmentCohort = Boolean(
    institutions.some((item) => item.id === filters.institutionId) &&
    campuses.some((item) => item.id === filters.campusId && item.institutionId === filters.institutionId) &&
    courses.some((item) => item.id === filters.courseId && item.institutionId === filters.institutionId && item.campusId === filters.campusId) &&
    yearOptions.some((item) => item.name === filters.year) &&
    Boolean(selectedDepartment) &&
    sectionOptions.some((item) => item === filters.section)
  );
  const hasStudentPerformanceScope = Boolean(
    institutions.some((item) => item.id === filters.institutionId) &&
    courses.some((item) => item.id === filters.courseId && item.institutionId === filters.institutionId) &&
    selectedDepartment
  );

  // ---------- DERIVED NUMBERS ----------
  const shownStudents = useMemo(() => {
    const q = appliedSearch.trim().toLowerCase();
    return students.filter((s) =>
      LEVELS.every((field) => {
        if (appliedFilters[field] === ALL) return true;
        const studentValue = field === "department" ? s.departmentId : s[field];
        return String(studentValue || "") === String(appliedFilters[field]);
      }) &&
      (!q || [s.id, s.name, s.email].some((v) => String(v).toLowerCase().includes(q))));
  }, [students, appliedFilters, appliedSearch]);

  const assessmentCohortStudents = useMemo(() => students.filter((student) =>
    ["institutionId", "campusId", "courseId", "year", "department", "section"].every((field) => {
      if (filters[field] === ALL) return false;
      const value = field === "department" ? student.departmentId : student[field];
      return String(value || "") === String(filters[field]);
    })
  ), [students, filters]);

  const shownAssessments = assessments.filter((assessment) => {
    const assignedIds = new Set(assessmentCandidates(assessment).map(candidateStudentId).filter(Boolean));
    const eligibleStudents = students.filter((student) =>
      (appliedFilters.institutionId === ALL || student.institutionId === appliedFilters.institutionId) &&
      (appliedFilters.campusId === ALL || student.campusId === appliedFilters.campusId) &&
      (appliedFilters.courseId === ALL || student.courseId === appliedFilters.courseId) &&
      (appliedFilters.year === ALL || student.year === appliedFilters.year) &&
      (appliedFilters.semester === ALL || student.semester === appliedFilters.semester) &&
      (appliedFilters.department === ALL || student.departmentId === appliedFilters.department) &&
      (appliedFilters.section === ALL || student.section === appliedFilters.section));
    const courseMatches = Boolean(assessment.courseId) && appliedCourseOptions.some((courseItem) =>
      courseItem.id === assessment.courseId || courseItem.name === assessment.courseId);
    const matchesCohort = (field, selected) => selected === ALL ||
      assessment[field] === selected || (!assessment[field] && eligibleStudents.some((student) => assignedIds.has(student.id) && student[field] === selected));

    return courseMatches &&
      (appliedFilters.courseId === ALL || assessment.courseId === appliedFilters.courseId) &&
      matchesCohort("year", appliedFilters.year) &&
      matchesCohort("semester", appliedFilters.semester) &&
      (appliedFilters.department === ALL || assessment.departmentId === appliedFilters.department || eligibleStudents.some((student) => assignedIds.has(student.id) && student.departmentId === appliedFilters.department)) &&
      (appliedFilters.section === ALL || eligibleStudents.some((student) => assignedIds.has(student.id)));
  });

  const allRows = useMemo(() => results.map((r) => scoreRow(r, byId(assessments, r.assessmentId))), [results, assessments]);
  const rows = allRows.filter((r) => shownStudents.some((s) => s.id === r.studentId) && shownAssessments.some((a) => a.id === r.assessmentId));
  const summary = summarize(rows);

  const studentAverage = (id) => {
    const own = allRows.filter((r) => r.studentId === id && Number.isFinite(r.score));
    return own.length ? pct(average(own.map((r) => r.percentage))) : "—";
  };
  const activeCount = shownStudents.filter((s) => s.status === "Active").length;
  const studentAssessmentSummary = useMemo(() => shownStudents.map((student) => {
    const eligibleAssessments = shownAssessments.filter((assessment) =>
      assessment.courseId === student.courseId &&
      (!assessment.year || assessment.year === student.year) &&
      (!assessment.semester || assessment.semester === student.semester) &&
      assessmentCandidates(assessment).some((candidate) => candidateStudentId(candidate) === student.id));
    const attemptedResults = allRows.filter((result) =>
      result.studentId === student.id && eligibleAssessments.some((assessment) => assessment.id === result.assessmentId));
    const attemptedAssessmentIds = new Set(attemptedResults.map((result) => result.assessmentId));
    const outcomesByAssessment = [...attemptedAssessmentIds].map((assessmentId) =>
      attemptedResults.filter((result) => result.assessmentId === assessmentId));
    const passed = outcomesByAssessment.filter((outcomes) => outcomes.some((result) => result.passed)).length;

    return {
      ...student,
      assessmentCount: attemptedAssessmentIds.size,
      passed,
      failed: outcomesByAssessment.filter((outcomes) => outcomes.some((result) => result.passed === false)).length,
      notAttended: eligibleAssessments.length ? Math.max(eligibleAssessments.length - attemptedAssessmentIds.size, 0) : null,
    };
  }), [shownStudents, shownAssessments, allRows]);

  const assignmentRows = shownAssessments.flatMap((assessment) =>
    assessmentCandidates(assessment).map((candidate) => ({ assessment, candidate, studentId: candidateStudentId(candidate), state: assignmentState(candidate) })));
  const visibleStudentIds = new Set(shownStudents.map((student) => student.id));
  const knownAssignmentRows = assignmentRows.filter((assignment) => assignment.studentId && visibleStudentIds.has(assignment.studentId));
  const assignmentProgress = {
    total: knownAssignmentRows.length,
    notStarted: knownAssignmentRows.filter((assignment) => assignment.state === "not_started").length,
    inProgress: knownAssignmentRows.filter((assignment) => assignment.state === "in_progress").length,
    submitted: knownAssignmentRows.filter((assignment) => assignment.state === "submitted").length,
    absent: knownAssignmentRows.filter((assignment) => assignment.state === "absent").length,
    unknown: knownAssignmentRows.filter((assignment) => assignment.state === "unknown").length,
    hasAssignments: knownAssignmentRows.length > 0,
  };

  const upcomingAssessments = shownAssessments.filter((assessment) => isUpcoming(assessment))
    .sort((left, right) => new Date(left.date) - new Date(right.date));
  const completedAssessments = shownAssessments.filter((assessment) => {
    const candidates = assessmentCandidates(assessment);
    return candidates.length > 0 && candidates.every((candidate) => assignmentState(candidate) === "submitted");
  });
  const institutionDistribution = institutions.map((institution) => ({
    ...institution,
    studentCount: students.filter((student) => student.institutionId === institution.id).length,
  })).filter((institution) => institution.studentCount > 0);
  const courseDistribution = appliedCourseOptions.map((courseItem) => ({
    ...courseItem,
    studentCount: students.filter((student) => student.courseId === courseItem.id).length,
  }));
  const maxInstitutionCount = Math.max(1, ...institutionDistribution.map((item) => item.studentCount));
  const maxCourseCount = Math.max(1, ...courseDistribution.map((item) => item.studentCount));

  const attentionMap = new Map();
  rows.filter((result) => result.passed === false).forEach((result) => {
    const student = byId(students, result.studentId);
    if (!student) return;
    const key = `${student.id}:${result.assessmentId}`;
    attentionMap.set(key, { student, assessment: result.assessment, reason: "Below passing mark" });
  });
  knownAssignmentRows.filter((assignment) => {
    const date = new Date(assignment.assessment.date).getTime();
    const overdue = Number.isFinite(date) && date < Date.now();
    return assignment.state === "absent" || (overdue && ["not_started", "in_progress"].includes(assignment.state));
  }).forEach((assignment) => {
    const student = byId(students, assignment.studentId);
    if (!student) return;
    const reason = assignment.state === "absent" ? "Missed assessment" : "Assessment not completed";
    attentionMap.set(`${student.id}:${assignment.assessment.id}`, { student, assessment: assignment.assessment, reason });
  });
  const attentionRows = [...attentionMap.values()];

  const performanceRows = shownStudents.flatMap((student) => {
    const studentResults = rows.filter((result) => result.studentId === student.id);
    const course = byId(courses, student.courseId);
    return studentResults.length
      ? studentResults.map((result) => ({ ...result, student, course, performanceStatus: "Result available" }))
      : [{ id: `${student.id}:no-result`, student, course, assessment: null, score: null, passed: null, performanceStatus: "No result yet" }];
  });
  const filteredPerformanceRows = performanceRows.filter((result) => {
    const query = performanceSearch.trim().toLowerCase();
    return !query || [result.student.name, result.student.id, result.student.email, result.assessment?.title]
      .some((value) => String(value || "").toLowerCase().includes(query));
  }).sort((left, right) => {
    const leftValue = performanceSort.field === "score" ? (Number.isFinite(left.score) ? Number(left.score) : null) :
      performanceSort.field === "assessment" ? left.assessment?.title || "" : left.student.name || "";
    const rightValue = performanceSort.field === "score" ? (Number.isFinite(right.score) ? Number(right.score) : null) :
      performanceSort.field === "assessment" ? right.assessment?.title || "" : right.student.name || "";
    const comparison = typeof leftValue === "number" && typeof rightValue === "number"
      ? leftValue - rightValue
      : typeof leftValue === "number" ? -1
        : typeof rightValue === "number" ? 1
          : String(leftValue).localeCompare(String(rightValue));
    return performanceSort.direction === "asc" ? comparison : -comparison;
  });
  useEffect(() => { setPerformancePage(1); }, [performanceSearch, performanceSort, appliedFilters]);
  const performancePageSize = 10;
  const performancePageCount = Math.max(1, Math.ceil(filteredPerformanceRows.length / performancePageSize));
  const pagedPerformanceRows = filteredPerformanceRows.slice((performancePage - 1) * performancePageSize, performancePage * performancePageSize);

  const directoryOptions = Object.keys(directoryFilters).reduce((options, field, index, fields) => {
    const parents = fields.slice(0, index).reduce((selected, parent) => ({ ...selected, [parent]: directoryFilters[parent] ? [directoryFilters[parent]] : [] }), {});
    const matching = directoryStudents.filter((student) => matchesStudentFilters(student, parents));
    if (field === "section") {
      options[field] = [...new Set(matching.map((student) => student.section).filter(Boolean))].sort().map((value) => ({ value, label: value }));
    } else {
      options[field] = uniqueOptions(matching, field);
    }
    return options;
  }, {});
  const directoryRows = useMemo(() => {
    const query = directorySearch.trim().toLowerCase();
    return directoryStudents.filter((student) =>
      matchesStudentFilters(student, Object.fromEntries(Object.entries(directoryFilters).map(([field, value]) => [field, value ? [value] : []]))) &&
      (!query || [student.name, student.studentId, student.email].some((value) => String(value || "").toLowerCase().includes(query)))
    );
  }, [directoryStudents, directoryFilters, directorySearch]);
  const directoryPageCount = Math.max(1, Math.ceil(directoryRows.length / directoryPageSize));
  const pagedDirectoryRows = directoryRows.slice((directoryPage - 1) * directoryPageSize, directoryPage * directoryPageSize);

  const setDirectoryFilter = (field, value) => {
    const fields = Object.keys(directoryFilters);
    const start = fields.indexOf(field);
    setDirectoryFilters((current) => Object.fromEntries(fields.map((key, index) => [key, index < start ? current[key] : key === field ? value : ""])));
    setDirectoryPage(1);
  };
  const resetDirectoryFilters = () => {
    setDirectoryFilters(emptyDirectoryFilters());
    setDirectorySearch("");
    setDirectoryPage(1);
  };

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
    const name = askName("Academic year name (e.g. 5th Year):", course.years.map((y) => y.name));
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
    const department = departmentOptions.find((item) => departmentValue(item) === String(filters.department) || item.name === filters.department);
    const name = askName("Section name (e.g. A, B, C):", sectionOptions);
    if (name) {
      editCourse((c) => ({ ...c, years: c.years.map((y) => y.name !== filters.year ? y : { ...y, departments: y.departments.map((d) => d.name !== department?.name ? d : { ...d, sections: [...d.sections, name] }) }) }));
      notify("Section added.");
    }
  };

  const viewInstitution = (id) => {
    const nextFilters = { ...emptyFilters(), institutionId: id };
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setSearch("");
    setAppliedSearch("");
    setSearchParams({ dashboardTab: "Overview" });
    setTab("Overview");
  };

  const createAssessmentForFilters = () => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== ALL) query.set(FILTER_QUERY_KEYS[key], value);
    });
    setAppliedFilters({ ...filters });
    setAppliedSearch(search);
    navigate(`/admin/assessment?${query.toString()}`, {
      state: { cohortStudents: assessmentCohortStudents.map((student) => ({ ...student })) },
    });
  };

  const openStudentPerformance = () => {
    setAppliedFilters({ ...filters });
    setAppliedSearch(search);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("dashboardTab", "Students");
      Object.entries(FILTER_QUERY_KEYS).forEach(([filterKey, queryKey]) => {
        next.delete(queryKey);
        if (filters[filterKey] !== ALL) next.set(queryKey, filters[filterKey]);
      });
      return next;
    });
    setTab("Students");
  };

  // CSV exports follow the current filters
  const exportStudents = () =>
    downloadCSV("students.csv",
      ["Student ID", "Name", "Email", "Phone", "Institution", "Campus", "Course", "Year", "Semester", "Department", "Section", "Status", "Average"],
      shownStudents.map((s) => [s.id, s.name, s.email, s.phone, byId(institutions, s.institutionId)?.name, byId(campuses, s.campusId)?.name, byId(courses, s.courseId)?.name, s.year, s.semester, s.department, s.section, s.status, studentAverage(s.id)]));

  const exportResults = () =>
    downloadCSV("assessment-results.csv",
      ["Student ID", "Student", "Course", "Assessment", "Score", "Max score", "Percentage", "Pass mark", "Outcome"],
      rows.map((r) => { const s = byId(students, r.studentId); return [s?.id, s?.name, byId(courses, s?.courseId)?.name, r.assessment?.title, r.score ?? "", r.assessment?.maxScore, Number.isFinite(r.score) ? Math.round(r.percentage) : "", r.assessment?.passMark, r.passed === null ? "Pass mark unavailable" : r.passed ? "Pass" : "Fail"]; }));

  // ---------- REUSABLE TABLE: students ----------
  const studentTable = (list, empty = "No students match these filters.") => (
    <Table rows={list} empty={empty} columns={[
      { header: "Student", render: (s) => (
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-orange-100 text-xs font-bold text-orange-700">{initials(s.name)}</span>
          <div><p className="font-semibold">{s.name}</p><p className="text-xs text-gray-400">{s.id}</p></div>
        </div>) },
      { header: "Institution / campus", render: (s) => `${byId(institutions, s.institutionId)?.name} · ${byId(campuses, s.campusId)?.name}` },
      { header: "Course / year / semester", render: (s) => `${byId(courses, s.courseId)?.name} · ${s.year} · ${s.semester || "—"}` },
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
            {tab === "Institutional Student Data" && <Button onClick={resetDirectoryFilters}>Reset filters</Button>}
            {["Dashboard", "Overview", "Students", "Assessments", "Academics"].includes(tab) && <>
              <Button onClick={() => setFiltersOpen((open) => !open)}>{filtersOpen ? "Hide filters" : "Show filters"}</Button>
              <Button onClick={resetFilters}>Reset filters</Button>
            </>}
            {tab === "Students" && <Button primary onClick={openAddStudent}>+ Add student</Button>}
            {tab === "Assessments" && <Button primary onClick={createAssessmentForFilters}>Create Assessment</Button>}
            {tab === "Institutions" && <Button primary onClick={() => setModal("institution")}>+ Add institution</Button>}
          </div>
        </div>

        {/* ---------- FILTERS ---------- */}
        {["Dashboard", "Overview", "Students", "Assessments", "Academics"].includes(tab) && filtersOpen && (
          <div className="mb-6 grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-white p-4 lg:grid-cols-4">
            <Select label="Institution" value={filters.institutionId} onChange={(v) => setFilter("institutionId", v)} placeholder={institutions.length ? "All institutions" : "No institution data"} loading={dashboardLoading} options={opts(institutions)} />
            <Select label="Campus" value={filters.campusId} onChange={(v) => setFilter("campusId", v)} placeholder="Select institution first" disabled={filters.institutionId === ALL} loading={dashboardLoading} options={opts(campusOptions)} />
            <Select label="Course" value={filters.courseId} onChange={(v) => setFilter("courseId", v)} placeholder="Select campus first" disabled={filters.campusId === ALL} loading={dashboardLoading} options={opts(courseOptions)} />
            <Select label="Year" value={filters.year} onChange={(v) => setFilter("year", v)} placeholder="Select course first" disabled={filters.courseId === ALL} loading={dashboardLoading} options={opts(yearOptions, nameOf, nameOf)} />
            <Select label="Department" value={filters.department} onChange={(v) => setFilter("department", v)} placeholder={filters.year === ALL ? "Select year first" : "All departments"} disabled={filters.year === ALL} loading={dashboardLoading} options={opts(departmentOptions, departmentValue, nameOf)} />
            <Select label="Section" value={filters.section} onChange={(v) => setFilter("section", v)} placeholder="Select department first" disabled={!selectedDepartment} loading={dashboardLoading} options={sectionOptions.map((section) => ({ value: section, label: `Section ${section}` }))} />
            <Select label="Semester" value={filters.semester} onChange={(v) => setFilter("semester", v)} placeholder={filters.year === ALL ? "Select year first" : semesterOptions.length ? "All semesters" : "No semester data"} disabled={filters.year === ALL} loading={dashboardLoading} options={opts(semesterOptions, nameOf, nameOf)} />
            <div className="col-span-2">
              <Field label="Search name, ID, email">
                <input className={inputCls} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search students..." />
              </Field>
            </div>
            <div className="col-span-full flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
              <div className="flex flex-wrap gap-2" aria-label="Applied filters">
                {activeFilterLabels.length ? activeFilterLabels.map((label) => <Badge key={label} tone="gray">{label}</Badge>) : <span className="text-xs text-gray-500">No filters applied</span>}
              </div>
              <Button primary onClick={applyFilters}>Apply filters</Button>
              {tab === "Dashboard" && <>
                <Button primary disabled={!hasCompleteAssessmentCohort || dashboardLoading} onClick={createAssessmentForFilters}>Create Assessment</Button>
                <Button disabled={!hasStudentPerformanceScope || dashboardLoading} onClick={openStudentPerformance}>Student Performance</Button>
                {hasCompleteAssessmentCohort && !assessmentCohortStudents.length && <span className="w-full text-sm text-red-600">No students found for the selected filters.</span>}
              </>}
            </div>
          </div>
        )}

        {["Dashboard", "Overview", "Students", "Assessments", "Academics"].includes(tab) && !filtersOpen && (
          <div className="mb-5 flex flex-wrap items-center gap-2 text-xs" aria-label="Applied filters">
            <span className="font-semibold text-gray-600">Applied filters:</span>
            {activeFilterLabels.length ? activeFilterLabels.map((label) => <Badge key={label} tone="gray">{label}</Badge>) : <span className="text-gray-500">None</span>}
          </div>
        )}

        {tab === "Institutional Student Data" && (
          <>
            <div className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["institution", "Institution"], ["campus", "Campus"], ["course", "Course"], ["year", "Year"], ["department", "Department"], ["section", "Section"], ["semester", "Semester"],
              ].map(([field, label], index, fields) => (
                <Select
                  key={field}
                  label={label}
                  value={directoryFilters[field] || ALL}
                  placeholder={`All ${label.toLowerCase()}s`}
                  disabled={index > 0 && !directoryFilters[fields[index - 1]]}
                  options={directoryOptions[field] || []}
                  onChange={(value) => setDirectoryFilter(field, value === ALL ? "" : value)}
                />
              ))}
                <div className="sm:col-span-2 lg:col-span-5">
                <Field label="Search name, ID, email">
                  <input className={inputCls} value={directorySearch} onChange={(event) => { setDirectorySearch(event.target.value); setDirectoryPage(1); }} placeholder="Search students..." />
                </Field>
              </div>
            </div>
            <Card title="Institutional Student Data" subtitle={`${directoryRows.length} matching students`}>
              {directoryLoading ? <p className="p-8 text-center text-sm text-gray-500">Loading student records...</p> : directoryError ? <p role="alert" className="p-8 text-center text-sm text-red-600">{directoryError}</p> : !hasInstitutionalMetadata(directoryStudents) ? <p className="p-8 text-center text-sm text-gray-500">Student records are available, but institution, campus, year, course, and department details are not present in the users API response.</p> : (
                <>
                  <Table rows={pagedDirectoryRows} empty="No students match the selected filters." columns={[
                    { header: "Student Name", render: (student) => student.name || "Unnamed student" },
                    { header: "Student ID", render: (student) => student.studentId || "—" },
                    { header: "Email", render: (student) => student.email || "—" },
                    { header: "Institution", render: (student) => student.institution.label || "—" },
                    { header: "Campus", render: (student) => student.campus.label || "—" },
                    { header: "Course", render: (student) => student.course.label || "—" },
                    { header: "Year", render: (student) => student.year.label || "—" },
                    { header: "Department", render: (student) => student.department.label || "—" },
                    { header: "Section", render: (student) => student.section || "—" },
                    { header: "Semester", render: (student) => student.semester.label || "—" },
                  ]} />
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-500">
                    <span>Showing {directoryRows.length ? (directoryPage - 1) * directoryPageSize + 1 : 0}-{Math.min(directoryPage * directoryPageSize, directoryRows.length)} of {directoryRows.length}</span>
                    <div className="flex gap-2">
                      <Button small disabled={directoryPage <= 1} onClick={() => setDirectoryPage((page) => Math.max(1, page - 1))}>Previous</Button>
                      <span className="px-2 py-1">{directoryPage} / {directoryPageCount}</span>
                      <Button small disabled={directoryPage >= directoryPageCount} onClick={() => setDirectoryPage((page) => Math.min(directoryPageCount, page + 1))}>Next</Button>
                    </div>
                  </div>
                </>
              )}
            </Card>
          </>
        )}

        {/* ---------- DASHBOARD ---------- */}
        {tab === "Dashboard" && (
          <>
            {dashboardLoading ? <p className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Loading dashboard data...</p> : <>
              {dashboardError && <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{dashboardError}</p>}
              {catalogSource === "local" && <p className="mb-5 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">Academic filter values are from the local catalog. Student and assessment records are loaded only from the existing APIs.</p>}
              {!institutions.length && !dashboardError && <p className="mb-5 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">The users API returned no student institution records, so institution-dependent filters have no options yet.</p>}
              <Stats>
                <Stat label="Total Institutions" value={institutions.length} onClick={() => openSection("Institutions")} />
                <Stat label="Total Courses" value={courses.length} onClick={() => openSection("Academics")} />
                <Stat label="Total Students" value={students.length} note={`${activeCount} active in current scope`} onClick={() => openSection("Students")} />
                <Stat label="Total Assessments" value={assessments.length} onClick={() => openSection("Assessments")} />
                <Stat label="Completed Assessments" value={completedAssessments.length} note={summary.count ? `${pct(summary.passRate)} pass rate` : "Result details unavailable"} onClick={() => openSection("Assessments")} />
                <Stat label="Upcoming Assessments" value={upcomingAssessments.length} onClick={() => openSection("Assessments")} />
              </Stats>

              {hasCompleteAssessmentCohort && (
                <Card title="Assessment cohort" subtitle={`${assessmentCohortStudents.length} students match the selected hierarchy`} actions={<Button primary disabled={!hasCompleteAssessmentCohort || dashboardLoading} onClick={createAssessmentForFilters}>Create Assessment</Button>}>
                  {studentTable(assessmentCohortStudents, "No students found for the selected filters.")}
                </Card>
              )}

              <div className="grid gap-4 lg:grid-cols-3">
                <Card title="Institution-wise students" subtitle="Current enrolled records">
                  <div className="space-y-4 p-5">
                    {institutionDistribution.length ? institutionDistribution.map((institution) => (
                      <div key={institution.id}>
                        <div className="mb-1 flex justify-between gap-3 text-sm"><span className="truncate font-medium">{institution.name}</span><span className="font-semibold">{institution.studentCount}</span></div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-orange-100"><div className="h-full rounded-full bg-orange-500" style={{ width: `${(institution.studentCount / maxInstitutionCount) * 100}%` }} /></div>
                      </div>
                    )) : <p className="text-sm text-gray-500">Institution enrollment data is unavailable.</p>}
                  </div>
                </Card>
                <Card title="Course-wise students" subtitle="Current enrolled records">
                  <div className="space-y-4 p-5">
                    {courseDistribution.length ? courseDistribution.map((courseItem) => (
                      <div key={`${courseItem.institutionId}:${courseItem.id}`}>
                        <div className="mb-1 flex justify-between gap-3 text-sm"><span className="truncate font-medium">{courseItem.name}</span><span className="font-semibold">{courseItem.studentCount}</span></div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-orange-100"><div className="h-full rounded-full bg-orange-500" style={{ width: `${(courseItem.studentCount / maxCourseCount) * 100}%` }} /></div>
                      </div>
                    )) : <p className="text-sm text-gray-500">Course enrollment data is unavailable.</p>}
                  </div>
                </Card>
                <Card title="Course performance" subtitle="Average score for the selected filters">
                  <div className="space-y-4 p-5">
                  {appliedCourseOptions.map((courseItem) => {
                    const courseRows = rows.filter((result) => result.assessment?.courseId === courseItem.id);
                    const courseAverage = average(courseRows.map((result) => result.percentage));
                    return (
                      <div key={courseItem.id}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="font-semibold">{courseItem.name} <span className="font-normal text-gray-400">{courseItem.programType}</span></span>
                          <span>{courseRows.length ? pct(courseAverage) : "No data"}</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-orange-500" style={{ width: `${courseAverage}%` }} /></div>
                      </div>
                    );
                  })}
                  {!appliedCourseOptions.length && <p className="text-sm text-gray-400">No course records match these filters.</p>}
                  {!rows.length && appliedCourseOptions.length > 0 && <p className="text-sm text-gray-400">Assessment result records are not available for these courses.</p>}
                  </div>
                </Card>

                <Card title="Assessment completion overview" subtitle="Assigned student progress">
                  {assignmentProgress.hasAssignments ? <div className="space-y-4 p-5">
                    {[["Completed", assignmentProgress.submitted], ["In progress", assignmentProgress.inProgress], ["Not started", assignmentProgress.notStarted], ["Absent", assignmentProgress.absent]].map(([label, count], index) => (
                      <div key={label}>
                        <div className="mb-1 flex justify-between gap-3 text-sm"><span>{label}</span><span className="font-semibold">{count} <span className="font-normal text-gray-500">({pct((count / assignmentProgress.total) * 100)})</span></span></div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-orange-100"><div className={`h-full rounded-full ${index === 0 ? "bg-green-600" : index === 1 ? "bg-amber-500" : index === 2 ? "bg-gray-400" : "bg-red-500"}`} style={{ width: `${(count / assignmentProgress.total) * 100}%` }} /></div>
                      </div>
                    ))}
                  </div> : <p className="p-5 text-sm text-gray-500">No assignment progress records are available.</p>}
                </Card>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card title="Upcoming assessments" subtitle="Scheduled assessments with a future start time" actions={<Button small onClick={() => openSection("Assessments")}>View all</Button>}>
                  {upcomingAssessments.length ? <Table rows={upcomingAssessments.slice(0, 5)} columns={[
                    { header: "Assessment", render: (assessment) => <strong>{assessment.title}</strong> },
                    { header: "Institution", render: (assessment) => assessment.institutionName || byId(institutions, byId(courses, assessment.courseId)?.institutionId)?.name || "—" },
                    { header: "Campus", render: (assessment) => assessment.campusName || byId(campuses, byId(courses, assessment.courseId)?.campusId)?.name || "—" },
                    { header: "Course", render: (assessment) => byId(courses, assessment.courseId)?.name || assessment.courseName || "—" },
                    { header: "Year", render: (assessment) => assessment.year || "—" },
                    { header: "Department", render: (assessment) => assessment.department || "—" },
                    { header: "Exam date", render: (assessment) => new Date(assessment.date).toLocaleString() },
                    { header: "Assigned", render: (assessment) => { const candidates = assessmentCandidates(assessment); return candidates.length || "Unavailable"; } },
                    { header: "Status", render: (assessment) => assessment.status || "Not provided" },
                  ]} /> : <p className="p-5 text-sm text-gray-500">No upcoming assessments with a future schedule are available.</p>}
                </Card>

                <Card title="Student assessment progress" subtitle="Current progress from assigned-student records">
                  {assignmentProgress.hasAssignments ? <div className="space-y-3 p-5">
                    <p className="text-sm text-gray-600">{assignmentProgress.total} assigned assessment-student records · {assignmentProgress.unknown} status unavailable</p>
                    {[["Not started", assignmentProgress.notStarted, "bg-gray-400"], ["In progress", assignmentProgress.inProgress, "bg-amber-500"], ["Submitted", assignmentProgress.submitted, "bg-green-600"], ["Absent", assignmentProgress.absent, "bg-red-500"]].map(([label, count, color]) => (
                      <div key={label}>
                        <div className="mb-1 flex justify-between text-xs text-gray-600"><span>{label}</span><span>{count}</span></div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className={`h-full ${color}`} style={{ width: `${assignmentProgress.total ? (count / assignmentProgress.total) * 100 : 0}%` }} /></div>
                      </div>
                    ))}
                  </div> : <p className="p-5 text-sm text-gray-500">Assignment totals and student progress statuses are not included in the assessment records returned by the current API.</p>}
                </Card>
              </div>

              <Card title="Students requiring attention" subtitle="Failed, missed, or overdue incomplete assessments" actions={<Button small onClick={() => openSection("Overview")}>View details</Button>}>
                {attentionRows.length ? <Table rows={attentionRows.slice(0, 6)} columns={[
                  { header: "Student", render: (item) => `${item.student.name} · ${item.student.id}` },
                  { header: "Assessment", render: (item) => item.assessment.title },
                  { header: "Course", render: (item) => byId(courses, item.student.courseId)?.name || "—" },
                  { header: "Reason", render: (item) => item.reason },
                  { header: "Action", render: (item) => <Button small onClick={() => setOpenStudent(item.student)}>View details</Button> },
                ]} /> : <p className="p-5 text-sm text-gray-500">No attention items can be derived from the available assessment/result data.</p>}
              </Card>

              {hasStudentPerformanceScope && <Card title="Student performance" subtitle={`${new Set(filteredPerformanceRows.map((row) => row.student.id)).size} students · ${filteredPerformanceRows.length} rows`} actions={<div className="flex flex-wrap gap-2">
                <input className="w-48 rounded-lg border border-gray-300 px-3 py-1.5 text-xs" value={performanceSearch} onChange={(event) => setPerformanceSearch(event.target.value)} placeholder="Search students or assessments" aria-label="Search student performance" />
                <select className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs" value={`${performanceSort.field}:${performanceSort.direction}`} onChange={(event) => { const [field, direction] = event.target.value.split(":"); setPerformanceSort({ field, direction }); }} aria-label="Sort student performance">
                  <option value="student:asc">Student A-Z</option><option value="student:desc">Student Z-A</option><option value="assessment:asc">Assessment A-Z</option><option value="score:desc">Highest score</option><option value="score:asc">Lowest score</option>
                </select>
              </div>}>
                <Table rows={pagedPerformanceRows} empty="No students match the selected filters." columns={[
                  { header: "Student", render: (result) => result.student.name },
                  { header: "Student ID", render: (result) => result.student.studentId || result.student.id },
                  { header: "Course", render: (result) => result.course?.name || "—" },
                  { header: "Academic year", render: (result) => result.student.year || "—" },
                  { header: "Department", render: (result) => result.student.department || "—" },
                  { header: "Section", render: (result) => result.student.section || "—" },
                  { header: "Assessment", render: (result) => result.assessment?.title || "—" },
                  { header: "Score", render: (result) => Number.isFinite(result.score) ? `${result.score}${result.assessment?.maxScore ? ` / ${result.assessment.maxScore}` : ""}` : "—" },
                  { header: "Result", render: (result) => !result.assessment ? result.performanceStatus : result.passed === null ? "Pass mark unavailable" : <Outcome passed={result.passed} /> },
                  { header: "Action", render: (result) => <Button small onClick={() => setOpenStudent(result.student)}>View details</Button> },
                ]} />
                <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
                  <span>{filteredPerformanceRows.length ? `Showing ${(performancePage - 1) * performancePageSize + 1}-${Math.min(performancePage * performancePageSize, filteredPerformanceRows.length)} of ${filteredPerformanceRows.length}` : "No records"}</span>
                  <div className="flex gap-2"><Button small disabled={performancePage <= 1} onClick={() => setPerformancePage((page) => page - 1)}>Previous</Button><span className="px-2 py-1">{performancePage} / {performancePageCount}</span><Button small disabled={performancePage >= performancePageCount} onClick={() => setPerformancePage((page) => page + 1)}>Next</Button></div>
                </div>
              </Card>}
            </>}
          </>
        )}

        {/* ---------- OVERVIEW ---------- */}
        {tab === "Overview" && (
          !hasStudentPerformanceScope ? (
            <p className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-600">Select an institution, course, and department on the dashboard to view student overview.</p>
          ) : (
            <Card title="Student assessment overview" subtitle={`${studentAssessmentSummary.length} students matching the Dashboard filters`}>
              <p className="border-b border-gray-100 px-4 py-3 text-sm text-gray-600">
                <span className="font-semibold text-gray-700">Selected filters: </span>
                {activeFilterLabels.join(" · ")}
              </p>
              <Table rows={studentAssessmentSummary} empty="No students match the selected Dashboard filters." columns={[
                { header: "Student", render: (student) => <div><p className="font-semibold">{student.name}</p><p className="text-xs text-gray-500">{student.id}</p></div> },
                { header: "Email", render: (student) => student.email || "—" },
                { header: "Institution", render: (student) => byId(institutions, student.institutionId)?.name || "—" },
                { header: "Campus", render: (student) => byId(campuses, student.campusId)?.name || "—" },
                { header: "Course / year / semester", render: (student) => `${byId(courses, student.courseId)?.name || "—"} · ${student.year} · ${student.semester || "—"}` },
                { header: "Department", render: (student) => student.department || "—" },
                { header: "Assessments taken", render: (student) => student.assessmentCount },
                { header: "Passed", render: (student) => student.passed },
                { header: "Failed", render: (student) => student.failed },
                { header: "Not attended", render: (student) => student.notAttended ?? "—" },
                { header: "Actions", render: (student) => <Button small onClick={() => setOpenStudent(student)}>View</Button> },
              ]} />
            </Card>
          )
        )}

        {/* ---------- STUDENTS ---------- */}
        {tab === "Students" && (
          <>
            {!hasStudentPerformanceScope ? (
              <p className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-600">Select an institution, course, and department on the dashboard to view student performance.</p>
            ) : (
              <>
                <Stats>
                  <Stat label="Students" value={shownStudents.length} />
                  <Stat label="Active" value={activeCount} />
                  <Stat label="Inactive" value={shownStudents.length - activeCount} />
                  <Stat label="Average score" value={summary.count ? pct(summary.averageScore) : "—"} />
                </Stats>
                <Card title="Students" subtitle={`${shownStudents.length} matching records`} actions={<Button small onClick={exportStudents}>Export CSV</Button>}>
                  {studentTable(shownStudents)}
                </Card>
              </>
            )}
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
                { header: "Assigned", render: (a) => assessmentCandidates(a).length || "Unavailable" },
                { header: "Completed", render: (a) => rows.filter((r) => r.assessmentId === a.id).length },
                { header: "Pending", render: (a) => { const candidates = assessmentCandidates(a); return candidates.length ? candidates.filter((candidate) => !["submitted", "in_progress"].includes(assignmentState(candidate))).length : "Unavailable"; } },
                { header: "Average", render: (a) => { const r = rows.filter((x) => x.assessmentId === a.id); return r.length ? pct(summarize(r).averageScore) : "—"; } },
              ]} />
            </Card>

            <Card title="Individual results">
              <Table rows={rows} empty="No completed results for these filters." columns={[
                { header: "Student", render: (r) => <button className="font-semibold text-orange-600" onClick={() => setOpenStudent(byId(students, r.studentId))}>{byId(students, r.studentId)?.name}</button> },
                { header: "Assessment", render: (r) => r.assessment?.title },
                  { header: "Score", render: (r) => `${r.score ?? "—"} / ${r.assessment?.maxScore || "—"}` },
                { header: "Percentage", render: (r) => pct(r.percentage) },
                { header: "Outcome", render: (r) => r.passed === null ? "Pass mark unavailable" : <Outcome passed={r.passed} /> },
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
              const selectedAcademicYear = fYears.find((year) => year.name === studentForm.year);
              const fSemesters = selectedAcademicYear?.semesters ?? [];
              const fDepts = (selectedAcademicYear?.departments ?? []).filter((department) =>
                !department.semesters?.length || !studentForm.semester || department.semesters.includes(studentForm.semester));
              const fSections = fDepts.find((department) => department.name === studentForm.department)?.sections ?? [];
              return (
                <>
                  <Select label="Year *" value={studentForm.year} placeholder="Select year" options={opts(fYears, nameOf, nameOf)} onChange={(v) => setStudentField("year", v === ALL ? "" : v)} />
                  <Select label="Semester *" value={studentForm.semester} placeholder={studentForm.year ? "Select semester" : "Select year first"} disabled={!studentForm.year} options={fSemesters} onChange={(v) => setStudentField("semester", v === ALL ? "" : v)} />
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
          ["Course", byId(courses, s.courseId)?.name], ["Year", s.year], ["Semester", s.semester],
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

