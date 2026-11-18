const STORAGE_KEY = "skillengineAssignedAssessments";

export const readLocalAssignedAssessments = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === "object") : [];
  } catch {
    return [];
  }
};

export const saveLocalAssignedAssessment = (assessment) => {
  if (!assessment?.id || !Array.isArray(assessment.studentIds)) {
    throw new Error("An assessment ID and assigned student IDs are required.");
  }

  const existing = readLocalAssignedAssessments();
  const next = [...existing.filter((item) => item.id !== assessment.id), assessment];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("skillengine:assigned-assessments-updated"));
  return assessment;
};

export const studentIdFromUser = (user = {}) => {
  const candidates = [
    user.id,
    user.user_id,
    user.userId,
    user.student_id,
    user.studentId,
    user._id,
    user.student?.id,
    user.student?.student_id,
    user.user?.id,
    user.user?._id,
    user.profile?.id,
    user.profile?.student_id,
  ];
  const id = candidates.find((value) => value !== undefined && value !== null && value !== "");
  return id === undefined ? "" : String(id);
};

export const assignedAssessmentsForStudent = (user) => {
  const studentId = studentIdFromUser(user);
  if (!studentId) return [];
  return readLocalAssignedAssessments().filter((assessment) =>
    assessment.studentIds.some((id) => String(id) === studentId)
  );
};
