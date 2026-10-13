import React, { useEffect, useState } from "react";
import { PDF_API_BASE_URL as API_BASE_URL } from "../../config";

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  orange: "#ea580c",
  orangeSoft: "#ffedd5",
  orangeHover: "#c2410c",
  text: "#111827",
  textMuted: "#6b7280",
  border: "#e5e7eb",
  borderSoft: "#eadfd6",
  bg: "#f7f7f8",
  card: "#ffffff",
  radius: 14,
  radiusSm: 10,
  shadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)",
  success: "#16a34a",
  successSoft: "#dcfce7",
  error: "#dc2626",
  errorSoft: "#fee2e2",
  warn: "#d97706",
  warnSoft: "#fef3c7",
  info: "#2563eb",
  infoSoft: "#dbeafe",
};

function PdfQuizManagement() {
  const [exam, setExam] = useState(null);
  const [examStatus, setExamStatus] = useState("LOADING");
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragging, setDragging] = useState(false);

  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [scheduleMessage, setScheduleMessage] = useState("");
  const [scheduleMessageType, setScheduleMessageType] = useState("");

  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadMessageType, setUploadMessageType] = useState("");
  const [uploading, setUploading] = useState(false);

  // ==========================================
  // LOAD CURRENT EXAM
  // ==========================================
  const loadCurrentExam = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/exam-status`);
      const data = await response.json();

      console.log("Exam Status:", data);

      if (!response.ok) {
        throw new Error(data.detail || "Unable to load exam.");
      }

      setExamStatus(data.status || "NONE");
      setExam(data.exam_id ? data : null);
    } catch (error) {
      console.error("Exam status error:", error);
      setExamStatus("ERROR");
      setExam(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrentExam();
  }, []);

  // ==========================================
  // SCHEDULE EXAM
  // ==========================================
  const scheduleExam = async () => {
    setScheduleMessage("");
    setScheduleMessageType("");

    if (!topic.trim()) {
      setScheduleMessage("Please enter exam topic.");
      setScheduleMessageType("error");
      return;
    }

    if (!startTime || !endTime) {
      setScheduleMessage("Please select start and end time.");
      setScheduleMessageType("error");
      return;
    }

    if (!duration || Number(duration) <= 0) {
      setScheduleMessage("Please enter a valid duration.");
      setScheduleMessageType("error");
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setScheduleMessage("Invalid date/time format.");
      setScheduleMessageType("error");
      return;
    }

    if (end <= start) {
      setScheduleMessage("End time must be after start time.");
      setScheduleMessageType("error");
      return;
    }

    const windowMinutes = (end.getTime() - start.getTime()) / 60000;

    if (Number(duration) > windowMinutes) {
      setScheduleMessage("Duration cannot exceed exam window.");
      setScheduleMessageType("error");
      return;
    }

    // datetime-local → backend India timezone
    const backendStartTime = `${startTime}:00+05:30`;
    const backendEndTime = `${endTime}:00+05:30`;

    try {
      const response = await fetch(`${API_BASE_URL}/api/exam`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          start_time: backendStartTime,
          end_time: backendEndTime,
          duration_minutes: Number(duration),
        }),
      });

      const data = await response.json();
      console.log("Schedule response:", data);

      if (!response.ok) {
        setScheduleMessage(data.detail || "Unable to schedule exam.");
        setScheduleMessageType("error");
        return;
      }

      setScheduleMessage("Exam scheduled successfully!");
      setScheduleMessageType("success");

      setTopic("");
      setDuration("");
      setStartTime("");
      setEndTime("");

      await loadCurrentExam();
    } catch (error) {
      console.error("Schedule exam error:", error);
      setScheduleMessage("Unable to connect to server.");
      setScheduleMessageType("error");
    }
  };

  // ==========================================
  // PDF FILE HANDLING (input + drop)
  // ==========================================
  const validateAndSetFile = (file) => {
    setUploadMessage("");
    setUploadMessageType("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setSelectedFile(null);
      setUploadMessage("Please select a PDF file.");
      setUploadMessageType("error");
      return;
    }

    setSelectedFile(file);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    validateAndSetFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    validateAndSetFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragging(false);
  };

  // ==========================================
  // UPLOAD PDF
  // ==========================================
  const handleUploadPdf = async () => {
    setUploadMessage("");
    setUploadMessageType("");

    if (!selectedFile) {
      setUploadMessage("Please select a PDF file first.");
      setUploadMessageType("error");
      return;
    }

    if (!exam || !exam.exam_id) {
      setUploadMessage("Please schedule an exam first.");
      setUploadMessageType("error");
      return;
    }

    try {
      setUploading(true);
      setUploadMessage("Uploading PDF and extracting questions...");
      setUploadMessageType("info");

      const formData = new FormData();
      formData.append("file", selectedFile);

      const uploadUrl = `${API_BASE_URL}/api/admin/upload-pdf?exam_id=${exam.exam_id}`;

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      console.log("PDF upload response:", data);

      if (!response.ok) {
        throw new Error(data.detail || "Unable to upload PDF.");
      }

      const questionCount =
        data.questions_count ??
        data.question_count ??
        data.saved_questions ??
        data.valid_questions ??
        data.total_questions ??
        data.questions?.length ??
        0;

      setUploadMessage(
        `PDF uploaded successfully. ${questionCount} questions extracted for Exam ID ${exam.exam_id}.`
      );
      setUploadMessageType("success");

      setSelectedFile(null);
      const fileInput = document.getElementById("pdfFile");
      if (fileInput) fileInput.value = "";

      await loadCurrentExam();
    } catch (error) {
      console.error("PDF upload error:", error);
      setUploadMessage(error.message || "Unable to upload PDF.");
      setUploadMessageType("error");
    } finally {
      setUploading(false);
    }
  };

  // ==========================================
  // HELPERS
  // ==========================================
  const formatDateTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRemaining = (seconds) => {
    if (seconds === null || seconds === undefined) return "-";
    if (seconds <= 0) return "0 min";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} min ${remainingSeconds} sec`;
  };

  // ==========================================
  // STYLE OBJECTS
  // ==========================================
  const s = {
    page: {
      minHeight: "100%",
      padding: "4px 0 40px",
    },
    header: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 16,
      marginBottom: 24,
      flexWrap: "wrap",
    },
    h1: {
      margin: 0,
      fontSize: 26,
      fontWeight: 700,
      color: T.text,
      letterSpacing: "-0.01em",
    },
    subtitle: {
      margin: "6px 0 0",
      color: T.textMuted,
      fontSize: 14,
    },
    refreshBtn: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "10px 16px",
      borderRadius: T.radiusSm,
      border: `1px solid ${T.border}`,
      background: T.card,
      color: T.text,
      fontWeight: 600,
      fontSize: 14,
      cursor: "pointer",
    },

    card: {
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: T.radius,
      padding: 24,
      boxShadow: T.shadow,
      marginBottom: 20,
    },
    cardHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 4,
      flexWrap: "wrap",
    },
    cardTitle: {
      margin: 0,
      fontSize: 17,
      fontWeight: 700,
      color: T.text,
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
    },
    cardSub: {
      margin: "4px 0 20px",
      color: T.textMuted,
      fontSize: 13,
    },

    status: {
      base: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        marginTop: 12,
        marginBottom: 4,
      },
    },

    detailsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: 14,
      marginTop: 18,
    },
    detail: {
      background: "#fafaf9",
      border: `1px solid ${T.border}`,
      borderRadius: T.radiusSm,
      padding: "12px 14px",
    },
    detailLabel: {
      display: "block",
      fontSize: 11,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      color: T.textMuted,
      marginBottom: 4,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: 600,
      color: T.text,
      wordBreak: "break-word",
    },
    noExam: {
      padding: "20px 0 4px",
      color: T.textMuted,
      fontSize: 14,
    },

    formGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 16,
      marginBottom: 8,
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
    },
    label: {
      fontSize: 13,
      fontWeight: 600,
      color: T.text,
      marginBottom: 6,
    },

    message: {
      base: {
        marginTop: 16,
        padding: "12px 14px",
        borderRadius: T.radiusSm,
        fontSize: 13,
        fontWeight: 500,
        border: "1px solid transparent",
      },
    },

    primaryBtn: {
      marginTop: 20,
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "12px 22px",
      borderRadius: T.radiusSm,
      border: "none",
      background: T.orange,
      color: "#fff",
      fontWeight: 600,
      fontSize: 14,
      cursor: "pointer",
      boxShadow: "0 2px 6px rgba(234,88,12,0.25)",
    },
    primaryBtnDisabled: {
      opacity: 0.6,
      cursor: "not-allowed",
      boxShadow: "none",
    },

    dropZone: {
      border: `2px dashed ${dragging ? T.orange : T.border}`,
      background: dragging ? T.orangeSoft : "#fafaf9",
      borderRadius: T.radius,
      padding: "32px 20px",
      textAlign: "center",
      transition: "all 0.15s ease",
      marginTop: 6,
    },
    dropIcon: {
      fontSize: 36,
      marginBottom: 8,
      display: "block",
    },
    dropText: {
      margin: "0 0 4px",
      fontWeight: 600,
      color: T.text,
      fontSize: 14,
    },
    dropHint: {
      margin: 0,
      color: T.textMuted,
      fontSize: 12,
    },
    fileInput: {
      display: "none",
    },
    chooseBtn: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      marginTop: 14,
      padding: "9px 16px",
      borderRadius: T.radiusSm,
      border: `1px solid ${T.border}`,
      background: "#fff",
      color: T.text,
      fontWeight: 600,
      fontSize: 13,
      cursor: "pointer",
    },
    selectedFile: {
      marginTop: 16,
      padding: "10px 14px",
      background: T.infoSoft,
      border: `1px solid #bfdbfe`,
      borderRadius: T.radiusSm,
      fontSize: 13,
      color: "#1e40af",
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      wordBreak: "break-all",
    },

    statusColors: {
      LOADING: { bg: "#f3f4f6", color: "#6b7280", icon: "⏳" },
      ERROR: { bg: T.errorSoft, color: T.error, icon: "❌" },
      ACTIVE: { bg: T.successSoft, color: T.success, icon: "🟢" },
      NOT_STARTED: { bg: T.warnSoft, color: T.warn, icon: "🟡" },
      ENDED: { bg: T.errorSoft, color: T.error, icon: "🔴" },
      NONE: { bg: "#f3f4f6", color: "#6b7280", icon: "⚪" },
    },
  };

  // ==========================================
  // STATUS PILL
  // ==========================================
  const renderStatus = () => {
    if (loading) {
      return (
        <span style={{ ...s.status.base, ...s.statusColors.LOADING }}>
          ⏳ Loading exam...
        </span>
      );
    }
    if (examStatus === "ERROR") {
      return (
        <span style={{ ...s.status.base, ...s.statusColors.ERROR }}>
          ❌ Unable to load exam
        </span>
      );
    }
    if (examStatus === "ACTIVE") {
      return (
        <span style={{ ...s.status.base, ...s.statusColors.ACTIVE }}>
          🟢 ACTIVE — Exam is currently running
        </span>
      );
    }
    if (examStatus === "NOT_STARTED") {
      return (
        <span style={{ ...s.status.base, ...s.statusColors.NOT_STARTED }}>
          🟡 NOT STARTED — Exam is scheduled
        </span>
      );
    }
    if (examStatus === "ENDED") {
      return (
        <span style={{ ...s.status.base, ...s.statusColors.ENDED }}>
          🔴 ENDED — Exam has ended
        </span>
      );
    }
    return (
      <span style={{ ...s.status.base, ...s.statusColors.NONE }}>
        ⚪ NO EXAM
      </span>
    );
  };

  // ==========================================
  // MESSAGE STYLE HELPER
  // ==========================================
  const messageStyle = (type) => {
    if (type === "success")
      return { ...s.message.base, background: T.successSoft, color: T.success };
    if (type === "error")
      return { ...s.message.base, background: T.errorSoft, color: T.error };
    if (type === "info")
      return { ...s.message.base, background: T.infoSoft, color: T.info };
    return s.message.base;
  };

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div style={s.page}>
      {/* Global pseudo-classes + input focus (cannot be inline) */}
      <style>{`
        .pqm-input {
          width: 100%;
          box-sizing: border-box;
          padding: 11px 14px;
          border: 1px solid ${T.border};
          border-radius: ${T.radiusSm}px;
          background: #fff;
          font-size: 14px;
          color: ${T.text};
          outline: none;
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .pqm-input:focus {
          border-color: ${T.orange};
          box-shadow: 0 0 0 3px ${T.orangeSoft};
        }
        .pqm-input::placeholder { color: #9ca3af; }

        .pqm-refresh:hover { background: ${T.orangeSoft}; border-color: ${T.orange}; color: ${T.orange}; }
        .pqm-choose:hover { border-color: ${T.orange}; color: ${T.orange}; }
        .pqm-primary:hover { background: ${T.orangeHover}; }
        .pqm-drop:hover { border-color: ${T.orange}; background: ${T.orangeSoft}; }

        @media (max-width: 640px) {
          .pqm-page-h1 { font-size: 22px !important; }
        }
      `}</style>

      {/* ==============================
          HEADER
      ============================== */}
      <div style={s.header}>
        <div>
          <h1 className="pqm-page-h1" style={s.h1}>
            PDF Quiz Management
          </h1>
          <p style={s.subtitle}>
            Manage PDF-based aptitude exams and schedules.
          </p>
        </div>
        <button
          type="button"
          className="pqm-refresh"
          onClick={loadCurrentExam}
          style={s.refreshBtn}
        >
          🔄 Refresh
        </button>
      </div>

      {/* ==============================
          CURRENT EXAM
      ============================== */}
      <div style={s.card}>
        <div style={s.cardHeader}>
          <h2 style={s.cardTitle}>
            <span>📋</span> Current Exam
          </h2>
          {renderStatus()}
        </div>

        {exam ? (
          <div style={s.detailsGrid}>
            <div style={s.detail}>
              <span style={s.detailLabel}>Exam ID</span>
              <span style={s.detailValue}>{exam.exam_id || "-"}</span>
            </div>
            <div style={s.detail}>
              <span style={s.detailLabel}>Topic</span>
              <span style={s.detailValue}>{exam.topic || "-"}</span>
            </div>
            <div style={s.detail}>
              <span style={s.detailLabel}>Start</span>
              <span style={s.detailValue}>
                {formatDateTime(exam.start_time)}
              </span>
            </div>
            <div style={s.detail}>
              <span style={s.detailLabel}>End</span>
              <span style={s.detailValue}>
                {formatDateTime(exam.end_time)}
              </span>
            </div>
            <div style={s.detail}>
              <span style={s.detailLabel}>Duration</span>
              <span style={s.detailValue}>
                {exam.duration_minutes || "-"} minutes
              </span>
            </div>
            <div style={s.detail}>
              <span style={s.detailLabel}>Remaining</span>
              <span style={s.detailValue}>
                {formatRemaining(exam.seconds_remaining)}
              </span>
            </div>
          </div>
        ) : (
          <div style={s.noExam}>No scheduled exam.</div>
        )}
      </div>

      {/* ==============================
          SCHEDULE NEW EXAM
      ============================== */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>
          <span>📅</span> Schedule New Exam
        </h2>
        <p style={s.cardSub}>
          Create a new PDF aptitude exam schedule.
        </p>

        <div style={s.formGrid}>
          <div style={s.formGroup}>
            <label style={s.label}>Topic</label>
            <input
              className="pqm-input"
              type="text"
              placeholder="Example: Number System"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div style={s.formGroup}>
            <label style={s.label}>Duration (minutes)</label>
            <input
              className="pqm-input"
              type="number"
              min="1"
              placeholder="60"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>

          <div style={s.formGroup}>
            <label style={s.label}>Start Time</label>
            <input
              className="pqm-input"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div style={s.formGroup}>
            <label style={s.label}>End Time</label>
            <input
              className="pqm-input"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        {scheduleMessage && (
          <div style={messageStyle(scheduleMessageType)}>
            {scheduleMessage}
          </div>
        )}

        <button
          type="button"
          className="pqm-primary"
          onClick={scheduleExam}
          style={s.primaryBtn}
        >
          📅 Schedule Exam
        </button>
      </div>

      {/* ==============================
          PDF UPLOAD
      ============================== */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>
          <span>📄</span> Upload PDF
        </h2>
        <p style={s.cardSub}>
          Upload the PDF containing the quiz questions.
        </p>

        <div
          className="pqm-drop"
          style={s.dropZone}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <span style={s.dropIcon}>📁</span>
          <p style={s.dropText}>
            Drag &amp; drop a PDF here, or choose a file
          </p>
          <p style={s.dropHint}>Only PDF files are accepted</p>

          <input
            id="pdfFile"
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            style={s.fileInput}
          />
          <label htmlFor="pdfFile" className="pqm-choose" style={s.chooseBtn}>
            📄 Choose PDF
          </label>

          {selectedFile && (
            <div style={s.selectedFile}>
              <span>📎</span>
              <span>
                Selected: <strong>{selectedFile.name}</strong>
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          className="pqm-primary"
          onClick={handleUploadPdf}
          disabled={uploading}
          style={{
            ...s.primaryBtn,
            ...(uploading ? s.primaryBtnDisabled : {}),
          }}
        >
          {uploading ? "⏳ Uploading..." : "⬆️ Upload PDF"}
        </button>

        {uploadMessage && (
          <div style={messageStyle(uploadMessageType)}>{uploadMessage}</div>
        )}
      </div>
    </div>
  );
}

export default PdfQuizManagement;