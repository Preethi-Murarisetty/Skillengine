import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaTrash, FaSave, FaTimes } from "react-icons/fa";
import { useAuth } from "../../../hooks/useAuth";
import {
  createAssessment,
  getCategories,
  getSubjects,
  getTopics,
  getUsers,
} from "../../services/api";

const CANDIDATE_EXAM_BASE_URL = "https://skillenginetest.stackenzo.com/exam";

// One page to create a complete exam: project title + description,
// MCQ section and coding section, schedule and candidates.
// Submits everything in a single request: POST /api/assessment

const inputCls =
  "w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500";

const selectCls =
  "w-full border border-gray-300 rounded-lg px-4 py-3 bg-white outline-none focus:border-orange-500";

const labelCls =
  "block text-sm font-semibold text-gray-700 mb-1";

let uid = 0;

const newSection = (type, sequence) => ({
  key: ++uid,
  name: type === "coding" ? "Coding" : "MCQ",
  description: "",
  sequence,
  duration_minutes: 30,
  question_count: type === "coding" ? 2 : 10,
  total_marks: type === "coding" ? 20 : 10,
  negative_marks: 0,
  section_type: type,
  unlock_rule: sequence === 1 ? "immediate" : "previous_completed",
  category_id: "",
  subject_id: "",
  topic_id: "",
  difficulty: "easy",
});

// "2026-09-28T22:30" -> "2026-09-28T22:30:00"
const toApiDate = (v) =>
  v && v.length === 16 ? `${v}:00` : v;


/* ============================================================
   SECTION EDITOR
============================================================ */

function SectionEditor({
  section,
  index,
  categories,
  onChange,
  onRemove,
  canRemove,
}) {
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);

  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);

  // Load subjects when category changes
  useEffect(() => {
    let cancelled = false;

    setSubjects([]);
    setTopics([]);

    if (!section.category_id) return;

    setLoadingSubjects(true);

    getSubjects(section.category_id)
      .then((data) => {
        if (!cancelled) {
          setSubjects(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        console.error("Failed to load subjects:", err);

        if (!cancelled) {
          setSubjects([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingSubjects(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [section.category_id]);

  // Load topics when subject changes
  useEffect(() => {
    let cancelled = false;

    setTopics([]);

    if (!section.subject_id) return;

    setLoadingTopics(true);

    getTopics(section.subject_id)
      .then((data) => {
        if (!cancelled) {
          setTopics(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        console.error("Failed to load topics:", err);

        if (!cancelled) {
          setTopics([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingTopics(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [section.subject_id]);

  const set = (patch) => onChange(section.key, patch);

  const num = (e) => e.target.value;

  return (
    <div className="border border-gray-200 rounded-xl p-5 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800">
          Section {index + 1}{" "}
          <span
            className={`ml-2 text-xs px-2 py-1 rounded-full ${
              section.section_type === "coding"
                ? "bg-purple-100 text-purple-700"
                : "bg-orange-100 text-orange-700"
            }`}
          >
            {section.section_type === "coding" ? "Coding" : "MCQ"}
          </span>
        </h3>

        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(section.key)}
            className="text-red-500 hover:text-red-700"
            title="Remove section"
          >
            <FaTrash />
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">

        {/* Section Name */}
        <div>
          <label className={labelCls}>
            Section Name *
          </label>

          <input
            className={inputCls}
            value={section.name}
            onChange={(e) =>
              set({ name: e.target.value })
            }
          />
        </div>

        {/* Section Type */}
        <div>
          <label className={labelCls}>
            Section Type
          </label>

          <select
            className={selectCls}
            value={section.section_type}
            onChange={(e) =>
              set({
                section_type: e.target.value,
              })
            }
          >
            <option value="mcq">MCQ</option>
            <option value="coding">Coding</option>
          </select>
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className={labelCls}>
            Section Description
          </label>

          <input
            className={inputCls}
            value={section.description}
            onChange={(e) =>
              set({
                description: e.target.value,
              })
            }
          />
        </div>

        {/* Category */}
        <div>
          <label className={labelCls}>
            Category *
          </label>

          <select
            className={selectCls}
            value={section.category_id}
            onChange={(e) =>
              set({
                category_id: e.target.value,
                subject_id: "",
                topic_id: "",
              })
            }
          >
            <option value="">
              Select category
            </option>

            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div>
          <label className={labelCls}>
            Subject *
          </label>

          <select
            className={selectCls}
            value={section.subject_id}
            disabled={
              !section.category_id ||
              loadingSubjects
            }
            onChange={(e) =>
              set({
                subject_id: e.target.value,
                topic_id: "",
              })
            }
          >
            <option value="">
              {loadingSubjects
                ? "Loading..."
                : "Select subject"}
            </option>

            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Topic */}
        <div>
          <label className={labelCls}>
            Topic *
          </label>

          <select
            className={selectCls}
            value={section.topic_id}
            disabled={
              !section.subject_id ||
              loadingTopics
            }
            onChange={(e) =>
              set({
                topic_id: e.target.value,
              })
            }
          >
            <option value="">
              {loadingTopics
                ? "Loading..."
                : "Select topic"}
            </option>

            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty */}
        <div>
          <label className={labelCls}>
            Difficulty
          </label>

          <select
            className={selectCls}
            value={section.difficulty}
            onChange={(e) =>
              set({
                difficulty: e.target.value,
              })
            }
          >
            <option value="easy">
              Easy
            </option>

            <option value="medium">
              Medium
            </option>

            <option value="hard">
              Hard
            </option>
          </select>
        </div>

        {/* Number of Questions */}
        <div>
          <label className={labelCls}>
            Number of Questions *
          </label>

          <input
            type="number"
            min="1"
            className={inputCls}
            value={section.question_count}
            onChange={(e) =>
              set({
                question_count: num(e),
              })
            }
          />
        </div>

        {/* Total Marks */}
        <div>
          <label className={labelCls}>
            Total Marks *
          </label>

          <input
            type="number"
            min="0"
            className={inputCls}
            value={section.total_marks}
            onChange={(e) =>
              set({
                total_marks: num(e),
              })
            }
          />
        </div>

        {/* Duration */}
        <div>
          <label className={labelCls}>
            Duration (minutes) *
          </label>

          <input
            type="number"
            min="1"
            className={inputCls}
            value={section.duration_minutes}
            onChange={(e) =>
              set({
                duration_minutes: num(e),
              })
            }
          />
        </div>

        {/* Negative Marks */}
        <div>
          <label className={labelCls}>
            Negative Marks
          </label>

          <input
            type="number"
            min="0"
            step="0.25"
            className={inputCls}
            value={section.negative_marks}
            onChange={(e) =>
              set({
                negative_marks: num(e),
              })
            }
          />
        </div>

        {/* Unlock Rule */}
        <div className="md:col-span-2">
          <label className={labelCls}>
            Unlock Rule
          </label>

          <select
            className={selectCls}
            value={section.unlock_rule}
            onChange={(e) =>
              set({
                unlock_rule: e.target.value,
              })
            }
          >
            <option value="immediate">
              Immediate
            </option>

            <option value="previous_completed">
              After previous section is completed
            </option>
          </select>
        </div>
      </div>
    </div>
  );
}


/* ============================================================
   ASSESSMENT CREATE
============================================================ */

export default function AssessmentCreate() {
  const navigate = useNavigate();

  const { user } = useAuth();

  /* ------------------------------------------------------------
     FORM
  ------------------------------------------------------------ */

  const [form, setForm] = useState({
    title: "",
    description: "",
    instructions:
      "Answer all questions carefully. Do not refresh the page during the assessment.",
    schedule_type: "scheduled",
    starts_at: "",
    ends_at: "",
    duration_minutes: 60,
    passing_percentage: 60,
    result_status: "pass_fail",
  });

  /* ------------------------------------------------------------
     SECTIONS
  ------------------------------------------------------------ */

  const [sections, setSections] = useState(() => [
    newSection("mcq", 1),
    newSection("coding", 2),
  ]);

  /* ------------------------------------------------------------
     USERS / CANDIDATES
  ------------------------------------------------------------ */

  const [users, setUsers] = useState([]);

  const [selectedUsers, setSelectedUsers] =
    useState([]);

  const [loadingUsers, setLoadingUsers] =
    useState(false);

  /* ------------------------------------------------------------
     CATEGORIES
  ------------------------------------------------------------ */

  const [categories, setCategories] =
    useState([]);

  /* ------------------------------------------------------------
     STATUS
  ------------------------------------------------------------ */

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [created, setCreated] =
    useState(null);


  /* ============================================================
     LOAD CATEGORIES + USERS
  ============================================================ */

  useEffect(() => {
    let cancelled = false;

    /* Load categories */
    getCategories()
      .then((data) => {
        if (!cancelled) {
          setCategories(
            Array.isArray(data) ? data : []
          );
        }
      })
      .catch((err) => {
        console.error(
          "Failed to load categories:",
          err
        );

        if (!cancelled) {
          setError(
            "Unable to load categories."
          );
        }
      });

    /* Load users */
    setLoadingUsers(true);

    getUsers()
      .then((data) => {
        if (cancelled) return;

        console.log(
          "Users API response:",
          data
        );

        /*
         * Support common API response formats:
         *
         * [
         *   {...},
         *   {...}
         * ]
         *
         * {
         *   users: [...]
         * }
         *
         * {
         *   data: [...]
         * }
         *
         * {
         *   data: {
         *      users: [...]
         *   }
         * }
         */

        let userList = [];

        if (Array.isArray(data)) {
          userList = data;
        } else if (
          Array.isArray(data?.users)
        ) {
          userList = data.users;
        } else if (
          Array.isArray(data?.data)
        ) {
          userList = data.data;
        } else if (
          Array.isArray(data?.data?.users)
        ) {
          userList = data.data.users;
        }

        setUsers(userList);
      })
      .catch((err) => {
        console.error(
          "Failed to load users:",
          err
        );

        if (!cancelled) {
          setUsers([]);
          setError(
            "Unable to load users."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingUsers(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);


  /* ============================================================
     FORM FIELD
  ============================================================ */

  const setField = (e) => {
    setForm((p) => ({
      ...p,
      [e.target.name]: e.target.value,
    }));

    setError("");
  };


  /* ============================================================
     SECTION UPDATE
  ============================================================ */

  const updateSection = (
    key,
    patch
  ) =>
    setSections((list) =>
      list.map((s) => {
        if (s.key !== key) return s;

        const next = {
          ...s,
          ...patch,
        };

        if (
          patch.section_type &&
          patch.section_type !==
            s.section_type
        ) {
          next.question_count =
            patch.section_type === "coding"
              ? 2
              : 10;

          next.total_marks =
            patch.section_type === "coding"
              ? 20
              : 10;
        }

        return next;
      })
    );


  /* ============================================================
     ADD SECTION
  ============================================================ */

  const addSection = (type) =>
    setSections((list) => [
      ...list,
      newSection(
        type,
        list.length + 1
      ),
    ]);


  /* ============================================================
     REMOVE SECTION
  ============================================================ */

  const removeSection = (key) =>
    setSections((list) =>
      list
        .filter(
          (s) => s.key !== key
        )
        .map((s, i) => ({
          ...s,
          sequence: i + 1,
        }))
    );


  /* ============================================================
     TOTAL MINUTES
  ============================================================ */

  const totalMinutes = useMemo(
    () =>
      sections.reduce(
        (sum, s) =>
          sum +
          (Number(
            s.duration_minutes
          ) || 0),
        0
      ),
    [sections]
  );


  /* ============================================================
     SELECT / REMOVE USERS
  ============================================================ */

  const toggleUser = (selectedUser) => {
    setSelectedUsers((current) => {
      const exists = current.some(
        (item) =>
          String(item.id) ===
          String(selectedUser.id)
      );

      if (exists) {
        return current.filter(
          (item) =>
            String(item.id) !==
            String(selectedUser.id)
        );
      }

      return [
        ...current,
        selectedUser,
      ];
    });

    setError("");
  };


  const removeUser = (userId) => {
    setSelectedUsers((current) =>
      current.filter(
        (item) =>
          String(item.id) !==
          String(userId)
      )
    );

    setError("");
  };


  /* ============================================================
     USER DISPLAY NAME
  ============================================================ */

  const getUserName = (userItem) => {
    if (!userItem) {
      return "Unknown User";
    }

    if (userItem.name) {
      return userItem.name;
    }

    if (userItem.full_name) {
      return userItem.full_name;
    }

    if (userItem.username) {
      return userItem.username;
    }

    if (
      userItem.first_name ||
      userItem.last_name
    ) {
      return [
        userItem.first_name,
        userItem.last_name,
      ]
        .filter(Boolean)
        .join(" ");
    }

    if (userItem.email) {
      return userItem.email;
    }

    return userItem.id || "Unknown User";
  };


  const getUserEmail = (userItem) => {
    if (!userItem) return "";

    return (
      userItem.email ||
      userItem.email_id ||
      userItem.mail ||
      ""
    );
  };


  /* ============================================================
     CANDIDATE IDS
  ============================================================ */

  const candidateIds = useMemo(
    () =>
      selectedUsers
        .map(
          (selectedUser) =>
            selectedUser.id ||
            selectedUser.user_id ||
            selectedUser._id ||
            selectedUser.userId
        )
        .filter(Boolean),
    [selectedUsers]
  );


  /* ============================================================
     VALIDATION
  ============================================================ */

  const validate = () => {
    if (!form.title.trim()) {
      return "Project title is required.";
    }

    if (!form.description.trim()) {
      return "Project description is required.";
    }

    if (
      form.schedule_type ===
      "scheduled"
    ) {
      if (
        !form.starts_at ||
        !form.ends_at
      ) {
        return "Start and end date/time are required.";
      }

      if (
        new Date(form.ends_at) <=
        new Date(form.starts_at)
      ) {
        return "End time must be after start time.";
      }
    }

    if (
      !(Number(form.duration_minutes) > 0)
    ) {
      return "Total duration must be greater than 0.";
    }

    if (sections.length === 0) {
      return "Add at least one section.";
    }

    for (
      const [i, s] of sections.entries()
    ) {
      if (!s.name.trim()) {
        return `Section ${
          i + 1
        }: name is required.`;
      }

      if (
        !s.category_id ||
        !s.subject_id ||
        !s.topic_id
      ) {
        return `Section ${
          i + 1
        }: select category, subject and topic.`;
      }

      if (
        !(Number(s.question_count) > 0)
      ) {
        return `Section ${
          i + 1
        }: question count must be greater than 0.`;
      }

      if (
        !(Number(s.duration_minutes) > 0)
      ) {
        return `Section ${
          i + 1
        }: duration must be greater than 0.`;
      }
    }

    if (selectedUsers.length === 0) {
      return "Select at least one user.";
    }

    return "";
  };


  /* ============================================================
     SUBMIT
  ============================================================ */

  const handleSubmit = async (e) => {
    e.preventDefault();

    const problem = validate();

    if (problem) {
      setError(problem);
      return;
    }

    const createdBy =
      user?.id ||
      user?.user_id ||
      user?._id ||
      user?.userId;

    const payload = {
      title: form.title.trim(),

      description:
        form.description.trim(),

      source: "manual",

      schedule_type:
        form.schedule_type,

      ...(form.schedule_type ===
      "scheduled"
        ? {
            starts_at: toApiDate(
              form.starts_at
            ),
            ends_at: toApiDate(
              form.ends_at
            ),
          }
        : {}),

      duration_seconds:
        Math.round(
          Number(
            form.duration_minutes
          ) * 60
        ),

      instructions:
        form.instructions.trim(),

      passing_percentage:
        Number(
          form.passing_percentage
        ),

      result_status:
        form.result_status,

      ...(createdBy
        ? {
            created_by:
              createdBy,
          }
        : {}),

      sections:
        sections.map((s, i) => ({
          name: s.name.trim(),

          description:
            s.description.trim(),

          sequence: i + 1,

          duration_seconds:
            Math.round(
              Number(
                s.duration_minutes
              ) * 60
            ),

          question_count:
            Number(
              s.question_count
            ),

          total_marks:
            Number(
              s.total_marks
            ),

          negative_marks:
            Number(
              s.negative_marks
            ) || 0,

          section_type:
            s.section_type,

          unlock_rule:
            i === 0
              ? "immediate"
              : s.unlock_rule,

          subject_id:
            s.subject_id,

          topic_id:
            s.topic_id,

          difficulty:
            s.difficulty,
        })),

      /*
       * IMPORTANT:
       * Selected users are converted to the same backend
       * structure that was previously being generated
       * from manually entered Student IDs.
       */
      candidates:
        selectedUsers.map(
          (selectedUser) => ({
            student_id:
              selectedUser.id ||
              selectedUser.user_id ||
              selectedUser._id ||
              selectedUser.userId,
          })
        ),
    };

    console.log(
      "Create Assessment Payload:",
      payload
    );

    setSaving(true);
    setError("");

    try {
      const data =
        await createAssessment(
          payload
        );

      setCreated(data);
    } catch (err) {
      console.error(
        "Create assessment error:",
        err
      );

      setError(
        err.message ||
          "Unable to create assessment."
      );
    } finally {
      setSaving(false);
    }
  };


  /* ============================================================
     FIND LINK / TOKEN
  ============================================================ */

  const findDeep = (
    obj,
    keys
  ) => {
    if (
      !obj ||
      typeof obj !== "object"
    ) {
      return null;
    }

    for (const k of keys) {
      if (
        typeof obj[k] ===
          "string" &&
        obj[k]
      ) {
        return obj[k];
      }
    }

    for (const v of Object.values(
      obj
    )) {
      const r = findDeep(
        v,
        keys
      );

      if (r) {
        return r;
      }
    }

    return null;
  };


  /* ============================================================
     CREATED SCREEN
  ============================================================ */

  if (created) {
    const link = findDeep(
      created,
      [
        "exam_link",
        "assessment_link",
        "link",
        "url",
      ]
    );

    const token = findDeep(
      created,
      [
        "token",
        "access_token",
        "jwt",
      ]
    );

    const tokenFromLink = link?.match(
      /\/(?:exam|assessment)\/([^/?#\s]+)/i
    )?.[1];
    const candidateToken = tokenFromLink || token;
    const shareLink = candidateToken
      ? `${CANDIDATE_EXAM_BASE_URL}/${encodeURIComponent(candidateToken)}`
      : null;

    return (
      <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-xl p-8">

        <h2 className="text-2xl font-bold text-green-600 mb-2">
          Assessment created
        </h2>

        <p className="text-gray-600 mb-4">
          {form.title}
        </p>

        {shareLink && (
          <div className="mb-4">

            <label className={labelCls}>
              Candidate exam link
            </label>

            <input
              readOnly
              className={inputCls}
              value={shareLink}
              onFocus={(e) =>
                e.target.select()
              }
            />

          </div>
        )}

        <details className="mb-6">
          <summary className="cursor-pointer text-sm text-gray-600">
            Server response
          </summary>

          <pre className="text-xs bg-gray-50 p-3 rounded mt-2 overflow-auto">
            {JSON.stringify(
              created,
              null,
              2
            )}
          </pre>
        </details>

        <button
          type="button"
          onClick={() =>
            window.location.reload()
          }
          className="px-5 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600"
        >
          Create another
        </button>

      </div>
    );
  }


  /* ============================================================
     MAIN UI
  ============================================================ */

  return (
    <div className="max-w-5xl mx-auto">

      {/* Back */}
      <button
        type="button"
        onClick={() =>
          navigate(
            "/admin/dashboard"
          )
        }
        className="flex items-center gap-2 text-gray-600 hover:text-orange-500 mb-6 transition"
      >
        <FaArrowLeft />
        Back to Dashboard
      </button>


      {/* Title */}
      <h1 className="text-3xl font-bold text-gray-800 mb-1">
        Create Assessment
      </h1>

      <p className="text-gray-500 mb-6">
        Project details, MCQ section and coding section are created together in one request.
      </p>


      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}


      <form
        onSubmit={handleSubmit}
        className="space-y-8"
      >

        {/* =====================================================
            PROJECT DETAILS
        ====================================================== */}

        <div className="border border-gray-200 rounded-xl p-6 bg-white space-y-4">

          <h2 className="text-lg font-bold text-gray-800">
            Project Details
          </h2>

          <div>
            <label className={labelCls}>
              Project Title *
            </label>

            <input
              name="title"
              className={inputCls}
              value={form.title}
              onChange={setField}
              placeholder="Python Beginner Assessment"
            />
          </div>

          <div>
            <label className={labelCls}>
              Project Description *
            </label>

            <textarea
              name="description"
              rows={3}
              className={inputCls}
              value={form.description}
              onChange={setField}
              placeholder="Basic Python assessment for beginners"
            />
          </div>

          <div>
            <label className={labelCls}>
              Instructions
            </label>

            <textarea
              name="instructions"
              rows={2}
              className={inputCls}
              value={form.instructions}
              onChange={setField}
            />
          </div>

        </div>


        {/* =====================================================
            SCHEDULE
        ====================================================== */}

        <div className="border border-gray-200 rounded-xl p-6 bg-white">

          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Schedule & Result
          </h2>

          <div className="grid md:grid-cols-2 gap-4">

            {/* Schedule Type */}
            <div>
              <label className={labelCls}>
                Schedule Type
              </label>

              <select
                name="schedule_type"
                className={selectCls}
                value={
                  form.schedule_type
                }
                onChange={setField}
              >
                <option value="scheduled">
                  Scheduled
                </option>

                <option value="anytime">
                  Anytime
                </option>
              </select>
            </div>


            {/* Total Duration */}
            <div>
              <label className={labelCls}>
                Total Duration (minutes) *
              </label>

              <input
                type="number"
                min="1"
                name="duration_minutes"
                className={inputCls}
                value={
                  form.duration_minutes
                }
                onChange={setField}
              />

              <p className="text-xs text-gray-500 mt-1">
                Sections add up to{" "}
                {totalMinutes} min.
              </p>
            </div>


            {/* Scheduled Dates */}
            {form.schedule_type ===
              "scheduled" && (
              <>
                <div>
                  <label className={labelCls}>
                    Starts At *
                  </label>

                  <input
                    type="datetime-local"
                    name="starts_at"
                    className={inputCls}
                    value={
                      form.starts_at
                    }
                    onChange={
                      setField
                    }
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    Ends At *
                  </label>

                  <input
                    type="datetime-local"
                    name="ends_at"
                    className={inputCls}
                    value={
                      form.ends_at
                    }
                    onChange={
                      setField
                    }
                  />
                </div>
              </>
            )}


            {/* Passing Percentage */}
            <div>
              <label className={labelCls}>
                Passing Percentage
              </label>

              <input
                type="number"
                min="0"
                max="100"
                name="passing_percentage"
                className={inputCls}
                value={
                  form.passing_percentage
                }
                onChange={setField}
              />
            </div>


            {/* Result Status */}
            <div>
              <label className={labelCls}>
                Result Status
              </label>

              <select
                name="result_status"
                className={selectCls}
                value={
                  form.result_status
                }
                onChange={setField}
              >
                <option value="pass_fail">
                  Pass / Fail
                </option>

                <option value="score_only">
                  Score only
                </option>
              </select>
            </div>

          </div>
        </div>


        {/* =====================================================
            SECTIONS
        ====================================================== */}

        <div className="space-y-4">

          <div className="flex items-center justify-between">

            <h2 className="text-lg font-bold text-gray-800">
              Sections (MCQ &amp; Coding)
            </h2>

            <div className="flex gap-2">

              <button
                type="button"
                onClick={() =>
                  addSection("mcq")
                }
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:border-orange-500"
              >
                <FaPlus />
                MCQ
              </button>

              <button
                type="button"
                onClick={() =>
                  addSection("coding")
                }
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:border-orange-500"
              >
                <FaPlus />
                Coding
              </button>

            </div>

          </div>


          {sections.map(
            (s, i) => (
              <SectionEditor
                key={s.key}
                section={s}
                index={i}
                categories={
                  categories
                }
                onChange={
                  updateSection
                }
                onRemove={
                  removeSection
                }
                canRemove={
                  sections.length > 1
                }
              />
            )
          )}

        </div>


        {/* =====================================================
            USERS / CANDIDATES
        ====================================================== */}

        <div className="border border-gray-200 rounded-xl p-6 bg-white">

          <div className="flex items-center justify-between mb-2">

            <div>
              <h2 className="text-lg font-bold text-gray-800">
                Assign Users
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Select one or more users who should be assigned this assessment.
              </p>
            </div>

            {selectedUsers.length > 0 && (
              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold">
                {selectedUsers.length} selected
              </span>
            )}

          </div>


          {/* User Dropdown */}
          <div className="mt-4">

            <label className={labelCls}>
              Select Users *
            </label>

            <select
              className={selectCls}
              value=""
              disabled={loadingUsers}
              onChange={(e) => {

                const userId =
                  e.target.value;

                if (!userId) {
                  return;
                }

                const foundUser =
                  users.find(
                    (item) =>
                      String(
                        item.id
                      ) ===
                      String(
                        userId
                      )
                  );

                if (foundUser) {
                  toggleUser(
                    foundUser
                  );
                }
              }}
            >

              <option value="">
                {loadingUsers
                  ? "Loading users..."
                  : users.length === 0
                  ? "No users available"
                  : "Select a user"}
              </option>


              {users.map(
                (userItem) => {

                  const userId =
                    userItem.id ||
                    userItem.user_id ||
                    userItem._id ||
                    userItem.userId;

                  const alreadySelected =
                    selectedUsers.some(
                      (selected) =>
                        String(
                          selected.id ||
                            selected.user_id ||
                            selected._id ||
                            selected.userId
                        ) ===
                        String(
                          userId
                        )
                    );

                  const name =
                    getUserName(
                      userItem
                    );

                  const email =
                    getUserEmail(
                      userItem
                    );

                  return (
                    <option
                      key={userId}
                      value={userId}
                      disabled={
                        alreadySelected
                      }
                    >
                      {name}
                      {email
                        ? ` - ${email}`
                        : ""}
                    </option>
                  );
                }
              )}

            </select>

          </div>


          {/* Selected Users */}
          <div className="mt-5">

            {selectedUsers.length >
            0 ? (
              <>
                <div className="flex items-center justify-between mb-3">

                  <p className="text-sm font-semibold text-gray-700">
                    Selected Users
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedUsers(
                        []
                      )
                    }
                    className="text-xs text-red-500 hover:text-red-700 font-semibold"
                  >
                    Clear all
                  </button>

                </div>


                <div className="grid md:grid-cols-2 gap-3">

                  {selectedUsers.map(
                    (selectedUser) => {

                      const userId =
                        selectedUser.id ||
                        selectedUser.user_id ||
                        selectedUser._id ||
                        selectedUser.userId;

                      const name =
                        getUserName(
                          selectedUser
                        );

                      const email =
                        getUserEmail(
                          selectedUser
                        );

                      return (
                        <div
                          key={userId}
                          className="flex items-center justify-between gap-3 border border-orange-200 bg-orange-50 rounded-lg px-4 py-3"
                        >

                          <div className="min-w-0">

                            <div className="font-semibold text-sm text-gray-800 truncate">
                              {name}
                            </div>

                            {email && (
                              <div className="text-xs text-gray-500 truncate">
                                {email}
                              </div>
                            )}

                            <div className="text-xs text-gray-400 mt-1 break-all">
                              ID: {userId}
                            </div>

                          </div>


                          <button
                            type="button"
                            onClick={() =>
                              removeUser(
                                userId
                              )
                            }
                            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-red-500 hover:bg-red-100 hover:text-red-700"
                            title="Remove user"
                          >
                            <FaTimes />
                          </button>

                        </div>
                      );
                    }
                  )}

                </div>
              </>
            ) : (
              <div className="border border-dashed border-gray-300 rounded-lg p-5 text-center">

                <p className="text-sm text-gray-500">
                  No users selected.
                </p>

                {!loadingUsers &&
                  users.length >
                    0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      Select users from the dropdown above.
                    </p>
                  )}

              </div>
            )}

          </div>

        </div>


        {/* =====================================================
            SUBMIT
        ====================================================== */}

        <button
          type="submit"
          disabled={
            saving ||
            loadingUsers
          }
          className="flex items-center justify-center gap-2 w-full py-4 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <FaSave />

          {saving
            ? "Creating..."
            : "Create Assessment"}
        </button>

      </form>
    </div>
  );
}