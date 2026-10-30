const ID_FIELDS = ["id", "user_id", "userId", "_id", "student_id", "studentId"];

const ENTITY_FIELDS = {
  institution: {
    values: ["institution", "institution_name", "institutionName", "institution_details", "institutionDetails", "college", "college_name", "collegeName", "college_details", "collegeDetails", "organization"],
    ids: ["institution_id", "institutionId", "college_id", "collegeId", "organization_id", "organizationId"],
  },
  campus: {
    values: ["campus", "campus_name", "campusName", "campus_details", "campusDetails"],
    ids: ["campus_id", "campusId"],
  },
  year: {
    values: ["academic_year", "academicYear", "year_of_study", "yearOfStudy", "current_year", "currentYear", "year"],
    ids: ["academic_year_id", "academicYearId", "year_id", "yearId"],
  },
  course: {
    values: ["course", "course_name", "courseName", "course_details", "courseDetails", "program", "program_name", "programName", "degree"],
    ids: ["course_id", "courseId", "program_id", "programId"],
  },
  department: {
    values: ["department", "department_name", "departmentName", "branch", "branch_name", "branchName"],
    ids: ["department_id", "departmentId", "branch_id", "branchId"],
  },
  semester: {
    values: ["semester", "semester_name", "semesterName", "term", "term_name", "termName"],
    ids: ["semester_id", "semesterId", "term_id", "termId"],
  },
};

const PROFILE_OBJECTS = ["profile", "student", "student_profile", "studentProfile", "student_details", "studentDetails", "academic", "academics", "academic_details", "academicDetails", "academic_info", "academicInfo", "education", "education_details", "educationDetails", "user", "user_profile", "userProfile", "details", "metadata"];

const asLabel = (value) => {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "object") {
    return String(value.name || value.label || value.title || value.value || value.id || "");
  }
  return String(value);
};

const normalizeSection = (value) => asLabel(value).replace(/^section\s+/i, "").trim();

const firstValue = (objects, keys) => {
  for (const object of objects) {
    for (const key of keys) {
      if (object?.[key] !== undefined && object?.[key] !== null && object?.[key] !== "") {
        return object[key];
      }
    }
  }
  return "";
};

const collectProfileObjects = (record) => {
  const found = [];
  const seen = new Set();
  const visit = (value, depth) => {
    if (!value || typeof value !== "object" || seen.has(value) || depth > 4) return;
    seen.add(value);
    if (!Array.isArray(value)) found.push(value);
    Object.values(value).forEach((nested) => {
      if (Array.isArray(nested)) nested.forEach((item) => visit(item, depth + 1));
      else if (nested && typeof nested === "object") visit(nested, depth + 1);
    });
  };
  visit(record, 0);
  return found;
};

const entityFor = (record, field, objects) => {
  const definition = ENTITY_FIELDS[field];
  const value = firstValue(objects, definition.values);
  const id = firstValue(objects, definition.ids);
  const nestedId = typeof value === "object" ? value.id || value._id || value.value : "";
  const resolvedId = id || nestedId;
  const label = asLabel(value) || asLabel(resolvedId);
  const allowLabelKey = field === "year" || field === "semester" || field === "department";
  return { key: resolvedId ? String(resolvedId) : allowLabelKey ? label : "", label };
};

export const normalizeStudent = (record = {}) => {
  const nestedObjects = collectProfileObjects(record);
  const namedProfiles = PROFILE_OBJECTS.map((key) => record[key]).filter((value) => value && typeof value === "object");
  const objects = [...new Set([record, ...namedProfiles, ...nestedObjects])];
  const id = firstValue(objects, ID_FIELDS);
  const roleValue = firstValue(objects, ["role", "user_type", "userType", "account_type", "accountType", "user_role", "userRole"]);
  const role = (Array.isArray(roleValue) ? roleValue.map(asLabel).join(" ") : asLabel(roleValue)).toLowerCase();
  const entities = Object.fromEntries(Object.keys(ENTITY_FIELDS).map((field) => [field, entityFor(record, field, objects)]));

  return {
    ...record,
    id: String(id || ""),
    studentId: asLabel(firstValue(objects, ["student_number", "studentNumber", "roll_number", "rollNumber", "roll_no", "rollno", "enrollment_number", "enrollmentNumber", "registration_number", "registrationNumber", "admission_number", "admissionNumber"])) || String(id || ""),
    name: asLabel(firstValue(objects, ["name", "full_name", "fullName", "username"])) || [record.first_name, record.last_name].filter(Boolean).join(" "),
    email: asLabel(firstValue(objects, ["email", "email_address", "emailAddress"])),
    phone: asLabel(firstValue(objects, ["phone", "phone_number", "phoneNumber", "mobile", "mobile_number"])),
    section: normalizeSection(firstValue(objects, ["section", "section_name", "sectionName", "class_section", "classSection"])),
    status: asLabel(firstValue(objects, ["status", "student_status", "studentStatus", "account_status", "accountStatus"])),
    role,
    isStudent: !role || role.includes("student") || role.includes("learner"),
    ...entities,
  };
};

export const normalizeStudentList = (records) =>
  (Array.isArray(records) ? records : [])
    .map(normalizeStudent)
    .filter((student) => student.id && student.isStudent);

export const normalizeInstitutionalUsers = (records) =>
  (Array.isArray(records) ? records : [])
    .map(normalizeStudent)
    .filter((student) => student.id);

export const uniqueOptions = (students, field) => {
  const options = new Map();
  students.forEach((student) => {
    const entity = student[field];
    if (entity?.key && !options.has(entity.key)) options.set(entity.key, entity.label);
  });
  return [...options].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
};

export const matchesStudentFilters = (student, filters) =>
  Object.entries(filters).every(([field, selected]) => {
    if (!selected?.length) return true;
    const value = field === "section" ? student.section : student[field]?.key;
    return selected.map(String).includes(String(value || ""));
  });

export const hasInstitutionalMetadata = (students) =>
  students.some((student) => Object.keys(ENTITY_FIELDS).some((field) => student[field]?.key));