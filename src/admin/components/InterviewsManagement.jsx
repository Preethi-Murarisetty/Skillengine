import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaPlus,
  FaTrash,
  FaSave,
  FaTimes,
  FaUserTie,
  FaCalendarAlt,
  FaUsers,
  FaClipboardList,
} from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";
import {
  getUsers,
  createInterview,
  getInterviews,
  assignInterviewToUsers,
} from "../../services/api";

// ============================================================================
// STYLE CONSTANTS  (same look as AssessmentCreate)
// ============================================================================
const inputCls =
  "w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500";
const selectCls =
  "w-full border border-gray-300 rounded-lg px-4 py-3 bg-white outline-none focus:border-orange-500";
const labelCls = "block text-sm font-semibold text-gray-700 mb-1";

// ============================================================================
// USER HELPERS (identical to AssessmentCreate)
// ============================================================================
const getUserId = (u) => u?.id ?? u?.user_id ?? u?._id ?? u?.userId ?? null;

const getUserName = (u) => {
  if (!u) return "Unknown User";
  if (u.name) return u.name;
  if (u.full_name) return u.full_name;
  if (u.fullName) return u.fullName;
  if (u.username) return u.username;
  if (u.first_name || u.last_name) {
    return [u.first_name, u.last_name].filter(Boolean).join(" ");
  }
  if (u.email) return u.email;
  return getUserId(u) || "Unknown User";
};

const getUserEmail = (u) => u?.email || u?.email_id || u?.mail || "";

const unwrapUsers = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.users)) return data.data.users;
  return [];
};

// ============================================================================
// STATUS BADGE
// ============================================================================
function StatusBadge({ status }) {
  const map = {
    scheduled: "bg-blue-100 text-blue-700",
    active: "bg-green-100 text-green-700",
    completed: "bg-gray-100 text-gray-700",
    cancelled: "bg-red-100 text-red-700",
    draft: "bg-yellow-100 text-yellow-700",
  };
  const cls = map[String(status || "").toLowerCase()] || map.draft;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${cls}`}
    >
      {status || "draft"}
    </span>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================
export default function InterviewsManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // -------------------------------------------------------------
  // Form state
  // -------------------------------------------------------------
  const [form, setForm] = useState({
    title: "",
    role: "",
    description: "",
    interview_type: "technical", // technical | hr | behavioral | mixed
    level: "medium",             // easy | medium | hard
    question_count: 5,
    duration_minutes: 30,
    schedule_type: "anytime",    // anytime | scheduled
    starts_at: "",
    ends_at: "",
    instructions: "",
  });

  // -------------------------------------------------------------
  // Users
  // -------------------------------------------------------------
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userSearch, setUserSearch] = useState("");

  // -------------------------------------------------------------
  // Existing interviews
  // -------------------------------------------------------------
  const [interviews, setInterviews] = useState([]);
  const [loadingInterviews, setLoadingInterviews] = useState(true);
  const [interviewsError, setInterviewsError] = useState("");

  // -------------------------------------------------------------
  // Submit state
  // -------------------------------------------------------------
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==========================================================================
  // LOAD USERS + INTERVIEWS
  // ==========================================================================
  useEffect(() => {
    let cancelled = false;

    // -------- Users --------
    setLoadingUsers(true);
    getUsers()
      .then((data) => {
        if (cancelled) return;
        setUsers(unwrapUsers(data));
      })
      .catch((err) => {
        console.error("Failed to load users:", err);
        if (!cancelled) {
          setUsers([]);
          setError("Unable to load users.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingUsers(false);
      });

    // -------- Interviews --------
    setLoadingInterviews(true);
    getInterviews()
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.interviews)
          ? data.interviews
          : Array.isArray(data?.data)
          ? data.data
          : [];
        setInterviews(list);
      })
      .catch((err) => {
        console.error("Failed to load interviews:", err);
        if (!cancelled) {
          setInterviews([]);
          setInterviewsError("Unable to load interviews.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingInterviews(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================================================
  // FIELD UPDATE
  // ==========================================================================
  const setField = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
    setSuccess("");
  };

  // ==========================================================================
  // USER SELECTION
  // ==========================================================================
  const toggleUser = (u) => {
    setSelectedUsers((current) => {
      const exists = current.some(
        (item) => String(getUserId(item)) === String(getUserId(u))
      );
      if (exists) {
        return current.filter(
          (item) => String(getUserId(item)) !== String(getUserId(u))
        );
      }
      return [...current, u];
    });
    setError("");
  };

  const removeUser = (userId) => {
    setSelectedUsers((current) =>
      current.filter((item) => String(getUserId(item)) !== String(userId))
    );
    setError("");
  };

  // ==========================================================================
  // SEARCH-FILTERED USERS (for dropdown)
  // ==========================================================================
  const filteredUsers = useMemo(() => {
    const search = userSearch.trim().toLowerCase();
    if (!search) return users;
    return users.filter((u) => {
      const name = getUserName(u).toLowerCase();
      const email = getUserEmail(u).toLowerCase();
      return name.includes(search) || email.includes(search);
    });
  }, [users, userSearch]);

  // ==========================================================================
  // VALIDATION
  // ==========================================================================
  const validate = () => {
    if (!form.title.trim()) return "Interview title is required.";
    if (!form.role.trim()) return "Target role is required.";
    if (!(Number(form.question_count) > 0))
      return "Number of questions must be greater than 0.";
    if (!(Number(form.duration_minutes) > 0))
      return "Duration must be greater than 0.";

    if (form.schedule_type === "scheduled") {
      if (!form.starts_at || !form.ends_at)
        return "Start and end date/time are required for scheduled interviews.";
      if (new Date(form.ends_at) <= new Date(form.starts_at))
        return "End time must be after start time.";
    }

    if (selectedUsers.length === 0)
      return "Select at least one user to assign this interview.";

    return "";
  };

  // ==========================================================================
  // SUBMIT
  // ==========================================================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    const createdBy =
      user?.id || user?.user_id || user?._id || user?.userId;

    const payload = {
      title: form.title.trim(),
      role: form.role.trim(),
      description: form.description.trim(),
      interview_type: form.interview_type,
      level: form.level,
      question_count: Number(form.question_count),
      duration_minutes: Number(form.duration_minutes),
      schedule_type: form.schedule_type,
      ...(form.schedule_type === "scheduled"
        ? {
            starts_at: form.starts_at.length === 16
              ? `${form.starts_at}:00`
              : form.starts_at,
            ends_at: form.ends_at.length === 16
              ? `${form.ends_at}:00`
              : form.ends_at,
          }
        : {}),
      instructions: form.instructions.trim(),
      source: "manual",
      ...(createdBy ? { created_by: createdBy } : {}),
      // Assigned users
      candidates: selectedUsers.map((u) => ({
        student_id: getUserId(u),
      })),
    };

    console.log("Create Interview Payload:", payload);

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const created = await createInterview(payload);
      setSuccess(
        `Interview "${form.title}" created and assigned to ${selectedUsers.length} user(s).`
      );

      // Reset form
      setForm({
        title: "",
        role: "",
        description: "",
        interview_type: "technical",
        level: "medium",
        question_count: 5,
        duration_minutes: 30,
        schedule_type: "anytime",
        starts_at: "",
        ends_at: "",
        instructions: "",
      });
      setSelectedUsers([]);

      // Refresh list
      const refreshed = await getInterviews();
      const list = Array.isArray(refreshed)
        ? refreshed
        : Array.isArray(refreshed?.interviews)
        ? refreshed.interviews
        : Array.isArray(refreshed?.data)
        ? refreshed.data
        : [];
      setInterviews(list);

      return created;
    } catch (err) {
      console.error("Create interview error:", err);
      setError(err.message || "Unable to create interview.");
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================================
  // ASSIGN EXISTING INTERVIEW TO MORE USERS
  // ==========================================================================
  const handleAssignMore = async (interview) => {
    const interviewId =
      interview.id || interview.interview_id || interview._id;
    if (!interviewId) return;

    // Simple prompt-based selection is intentional here — full modal would be a
    // separate component. Replace with your own picker if you prefer.
    const unassigned = users.filter(
      (u) =>
        !(interview.candidates || []).some(
          (c) =>
            String(c.student_id || c.user_id || c.id) ===
            String(getUserId(u))
        )
    );

    if (unassigned.length === 0) {
      alert("All users are already assigned to this interview.");
      return;
    }

    try {
      await assignInterviewToUsers(interviewId, {
        candidates: unassigned.map((u) => ({ student_id: getUserId(u) })),
      });

      const refreshed = await getInterviews();
      const list = Array.isArray(refreshed)
        ? refreshed
        : Array.isArray(refreshed?.interviews)
        ? refreshed.interviews
        : Array.isArray(refreshed?.data)
        ? refreshed.data
        : [];
      setInterviews(list);

      setSuccess(
        `Assigned ${unassigned.length} more user(s) to "${interview.title}".`
      );
    } catch (err) {
      console.error("Assign interview error:", err);
      setError(err.message || "Unable to assign interview.");
    }
  };

  // ==========================================================================
  // HELPERS
  // ==========================================================================
  const formatDate = (date) => {
    if (!date) return "—";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <div className="max-w-6xl mx-auto">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate("/admin/dashboard")}
        className="flex items-center gap-2 text-gray-600 hover:text-orange-500 mb-6 transition"
      >
        <FaArrowLeft /> Back to Dashboard
      </button>

      {/* Title */}
      <h1 className="text-3xl font-bold text-gray-800 mb-1">
        Interview Management
      </h1>
      <p className="text-gray-500 mb-6">
        Create interviews and assign them to specific users.
      </p>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 border border-green-200">
          {success}
        </div>
      )}

      {/* ==================================================================
          CREATE INTERVIEW FORM
      ================================================================== */}
      <form onSubmit={handleSubmit} className="space-y-6 mb-10">
        {/* Details */}
        <div className="border border-gray-200 rounded-xl p-6 bg-white space-y-4">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FaUserTie className="text-orange-500" />
            Interview Details
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Interview Title *</label>
              <input
                name="title"
                className={inputCls}
                value={form.title}
                onChange={setField}
                placeholder="Frontend Developer Interview"
              />
            </div>
            <div>
              <label className={labelCls}>Target Role *</label>
              <input
                name="role"
                className={inputCls}
                value={form.role}
                onChange={setField}
                placeholder="React Developer"
              />
            </div>

            <div>
              <label className={labelCls}>Interview Type</label>
              <select
                name="interview_type"
                className={selectCls}
                value={form.interview_type}
                onChange={setField}
              >
                <option value="technical">Technical</option>
                <option value="hr">HR</option>
                <option value="behavioral">Behavioral</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Level</label>
              <select
                name="level"
                className={selectCls}
                value={form.level}
                onChange={setField}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className={labelCls}>Description</label>
              <textarea
                name="description"
                rows={3}
                className={inputCls}
                value={form.description}
                onChange={setField}
                placeholder="Short description shown to the candidate before starting."
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelCls}>Instructions</label>
              <textarea
                name="instructions"
                rows={2}
                className={inputCls}
                value={form.instructions}
                onChange={setField}
                placeholder="Answer all questions. Do not refresh the page."
              />
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="border border-gray-200 rounded-xl p-6 bg-white">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FaCalendarAlt className="text-orange-500" />
            Schedule &amp; Format
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Schedule Type</label>
              <select
                name="schedule_type"
                className={selectCls}
                value={form.schedule_type}
                onChange={setField}
              >
                <option value="anytime">Anytime</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Number of Questions *</label>
              <input
                type="number"
                min="1"
                name="question_count"
                className={inputCls}
                value={form.question_count}
                onChange={setField}
              />
            </div>

            {form.schedule_type === "scheduled" && (
              <>
                <div>
                  <label className={labelCls}>Starts At *</label>
                  <input
                    type="datetime-local"
                    name="starts_at"
                    className={inputCls}
                    value={form.starts_at}
                    onChange={setField}
                  />
                </div>
                <div>
                  <label className={labelCls}>Ends At *</label>
                  <input
                    type="datetime-local"
                    name="ends_at"
                    className={inputCls}
                    value={form.ends_at}
                    onChange={setField}
                  />
                </div>
              </>
            )}

            <div>
              <label className={labelCls}>Duration (minutes) *</label>
              <input
                type="number"
                min="1"
                name="duration_minutes"
                className={inputCls}
                value={form.duration_minutes}
                onChange={setField}
              />
            </div>
          </div>
        </div>

        {/* Assign Users */}
        <div className="border border-gray-200 rounded-xl p-6 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FaUsers className="text-orange-500" />
                Assign Users
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Select one or more users who should take this interview.
              </p>
            </div>
            {selectedUsers.length > 0 && (
              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold">
                {selectedUsers.length} selected
              </span>
            )}
          </div>

          {/* Search */}
          <div className="mt-4 mb-3">
            <label className={labelCls}>Search Users</label>
            <input
              type="text"
              className={inputCls}
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search by name or email..."
              disabled={loadingUsers}
            />
          </div>

          {/* Dropdown */}
          <div>
            <label className={labelCls}>Select a User *</label>
            <select
              className={selectCls}
              value=""
              disabled={loadingUsers || filteredUsers.length === 0}
              onChange={(e) => {
                const userId = e.target.value;
                if (!userId) return;
                const found = users.find(
                  (u) => String(getUserId(u)) === String(userId)
                );
                if (found) toggleUser(found);
              }}
            >
              <option value="">
                {loadingUsers
                  ? "Loading users..."
                  : users.length === 0
                  ? "No users available"
                  : filteredUsers.length === 0
                  ? "No users match your search"
                  : "Select a user"}
              </option>

              {filteredUsers.map((u) => {
                const userId = getUserId(u);
                const already = selectedUsers.some(
                  (s) => String(getUserId(s)) === String(userId)
                );
                return (
                  <option key={userId} value={userId} disabled={already}>
                    {getUserName(u)}
                    {getUserEmail(u) ? ` — ${getUserEmail(u)}` : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Chips */}
          <div className="mt-5">
            {selectedUsers.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">
                    Selected Users
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedUsers([])}
                    className="text-xs text-red-500 hover:text-red-700 font-semibold"
                  >
                    Clear all
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  {selectedUsers.map((u) => {
                    const userId = getUserId(u);
                    return (
                      <div
                        key={userId}
                        className="flex items-center justify-between gap-3 border border-orange-200 bg-orange-50 rounded-lg px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-gray-800 truncate">
                            {getUserName(u)}
                          </div>
                          {getUserEmail(u) && (
                            <div className="text-xs text-gray-500 truncate">
                              {getUserEmail(u)}
                            </div>
                          )}
                          <div className="text-xs text-gray-400 mt-1 break-all">
                            ID: {userId}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeUser(userId)}
                          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-red-500 hover:bg-red-100 hover:text-red-700"
                          title="Remove user"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="border border-dashed border-gray-300 rounded-lg p-5 text-center">
                <p className="text-sm text-gray-500">No users selected.</p>
                {!loadingUsers && users.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Select users from the dropdown above.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving || loadingUsers}
          className="flex items-center justify-center gap-2 w-full py-4 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <FaSave />
          {saving ? "Creating..." : "Create Interview & Assign"}
        </button>
      </form>

      {/* ==================================================================
          EXISTING INTERVIEWS
      ================================================================== */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FaClipboardList className="text-orange-500" />
            Existing Interviews
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Review and assign more users to already-created interviews.
          </p>
        </div>

        <div className="p-6">
          {loadingInterviews ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
              <p className="text-gray-500 mt-3">Loading interviews...</p>
            </div>
          ) : interviewsError ? (
            <div className="text-center py-12 text-red-500">
              {interviewsError}
            </div>
          ) : interviews.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-300 text-5xl mb-3">
                <FaUserTie className="mx-auto" />
              </div>
              <p className="text-gray-500 font-medium">
                No interviews created yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {interviews.map((iv) => {
                const id = iv.id || iv.interview_id || iv._id;
                const candidates =
                  iv.candidates || iv.assigned_users || iv.users || [];
                return (
                  <div
                    key={id}
                    className="border border-gray-200 rounded-xl p-5 hover:border-orange-200 transition"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-gray-800">
                            {iv.title || "Untitled Interview"}
                          </h3>
                          <StatusBadge status={iv.status} />
                        </div>
                        <p className="text-sm text-gray-500">
                          Role: <strong>{iv.role || "—"}</strong> ·{" "}
                          {iv.question_count || iv.questions_count || "—"}{" "}
                          questions · {iv.duration_minutes || "—"} min
                        </p>
                        {iv.starts_at && (
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(iv.starts_at)} →{" "}
                            {formatDate(iv.ends_at)}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">
                          {candidates.length} assigned
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAssignMore(iv)}
                          className="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600"
                        >
                          Assign More
                        </button>
                      </div>
                    </div>

                    {candidates.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {candidates.slice(0, 8).map((c, i) => {
                          const u = users.find(
                            (x) =>
                              String(getUserId(x)) ===
                              String(c.student_id || c.user_id || c.id)
                          );
                          const name = u ? getUserName(u) : c.name || "User";
                          return (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium"
                            >
                              {name}
                            </span>
                          );
                        })}
                        {candidates.length > 8 && (
                          <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-xs">
                            +{candidates.length - 8} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}