// src/components/Assessment/AssessmentInterview.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaArrowRight,
    FaChartLine,
    FaCheckCircle,
    FaExclamationTriangle,
    FaLightbulb,
    FaPlus,
    FaArrowLeft
} from "react-icons/fa";

const SUGGESTED_SKILLS = [
    "JavaScript",
    "React",
    "Node.js",
    "Python",
    "Java",
    "SQL",
    "Data Structures",
    "System Design",
    "HTML & CSS",
    "Git",
    "REST APIs",
    "Problem Solving",
];

const DIFFICULTIES = [
    { value: "easy", label: "Easy" },
    { value: "medium", label: "Medium" },
    { value: "hard", label: "Hard" },
];

const INTERVIEW_TYPES = [
    { value: "technical", label: "Technical" },
    { value: "behavioral", label: "Behavioral (HR)" },
    { value: "mixed", label: "Mixed" },
];

const QUESTION_COUNTS = [5, 8, 10, 15];
const MAX_SKILLS = 8;

const AssessmentInterview = () => {
    const navigate = useNavigate();

    const [skills, setSkills] = useState([]);
    const [customSkill, setCustomSkill] = useState("");
    const [difficulty, setDifficulty] = useState("");
    const [interviewType, setInterviewType] = useState("technical");
    const [numberOfQuestions, setNumberOfQuestions] = useState("8");
    const [error, setError] = useState("");

    const handleBack = () => {
        navigate(-1);
    };

    const toggleSkill = (skill) => {
        setError("");
        setSkills((previous) => {
            if (previous.includes(skill)) return previous.filter((s) => s !== skill);
            if (previous.length >= MAX_SKILLS) {
                setError(`You can choose up to ${MAX_SKILLS} skills.`);
                return previous;
            }
            return [...previous, skill];
        });
    };

    const addCustomSkill = () => {
        const value = customSkill.trim();
        if (!value) return;

        const exists = skills.some((s) => s.toLowerCase() === value.toLowerCase());
        if (!exists) {
            if (skills.length >= MAX_SKILLS) {
                setError(`You can choose up to ${MAX_SKILLS} skills.`);
                return;
            }
            setSkills((previous) => [...previous, value]);
        }
        setCustomSkill("");
        setError("");
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError("");

        if (skills.length === 0) return setError("Please choose at least one skill.");
        if (!difficulty) return setError("Please select a difficulty level.");

        const configuration = {
            skills,
            difficulty, // lowercase: easy | medium | hard
            interviewType,
            numberOfQuestions: Number(numberOfQuestions),
        };

        localStorage.setItem(
            "assessmentInterviewConfig",
            JSON.stringify(configuration)
        );

        // ASSUMPTION: /interview is the page that starts the interview.
        // Change this path if your interview flow starts elsewhere.
        navigate("/interview", { state: configuration });
    };

    const isReady = skills.length > 0 && difficulty;
    const difficultyLabel =
        DIFFICULTIES.find((d) => d.value === difficulty)?.label || "";
    const typeLabel =
        INTERVIEW_TYPES.find((t) => t.value === interviewType)?.label || "";

    const customSkills = skills.filter((s) => !SUGGESTED_SKILLS.includes(s));

    return (
        <div className="resume-page">
            {/* HERO */}
            <section className="resume-hero">
                <div>
                    <button
                        type="button"
                        onClick={handleBack}
                        className="inline-flex items-center gap-2 px-4 py-2 mb-5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-600 hover:text-orange-500 hover:border-orange-400 transition"
                    >
                        <FaArrowLeft />
                        Back to Dashboard
                    </button>
                    <span>INTERVIEW ASSESSMENT</span>
                    <h1>Get Interviewed on What You Know Best</h1>
                    <p>
                        Tell us your skills and level. Your interview questions will be
                        based on them.
                    </p>
                </div>
            </section>

            <div className="resume-page-grid">
                {/* MAIN CARD */}
                <div className="resume-upload-container" style={styles.container}>
                    <div className="resume-upload-card" style={styles.card}>
                        <div className="resume-upload-header">
                            <div>
                                <h2 style={styles.title}>Set Up Your Interview</h2>
                                <p style={styles.subtitle}>
                                    Choose your skills, difficulty and interview style.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {/* Skills */}
                            <label style={styles.fieldLabel}>
                                Skills you are interested in{" "}
                                <span style={styles.hint}>
                                    ({skills.length}/{MAX_SKILLS} selected)
                                </span>
                            </label>

                            <div style={styles.chipRow}>
                                {[...SUGGESTED_SKILLS, ...customSkills].map((skill) => {
                                    const selected = skills.includes(skill);
                                    return (
                                        <button
                                            type="button"
                                            key={skill}
                                            onClick={() => toggleSkill(skill)}
                                            aria-pressed={selected}
                                            style={{
                                                ...styles.chip,
                                                ...(selected && styles.chipSelected),
                                            }}
                                        >
                                            {selected && <FaCheckCircle style={{ marginRight: 6 }} />}
                                            {skill}
                                        </button>
                                    );
                                })}
                            </div>

                            <div style={styles.customRow}>
                                <input
                                    type="text"
                                    value={customSkill}
                                    onChange={(e) => setCustomSkill(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            addCustomSkill();
                                        }
                                    }}
                                    placeholder="Add another skill (e.g. Docker)"
                                    style={styles.input}
                                />
                                <button
                                    type="button"
                                    onClick={addCustomSkill}
                                    style={styles.addButton}
                                >
                                    <FaPlus style={{ marginRight: 6 }} /> Add
                                </button>
                            </div>

                            {/* Other fields */}
                            <div style={styles.grid}>
                                <div>
                                    <label htmlFor="ai-difficulty" style={styles.fieldLabel}>
                                        Difficulty level
                                    </label>
                                    <select
                                        id="ai-difficulty"
                                        value={difficulty}
                                        onChange={(e) => setDifficulty(e.target.value)}
                                        style={styles.select}
                                    >
                                        <option value="">Select Difficulty</option>
                                        {DIFFICULTIES.map((d) => (
                                            <option key={d.value} value={d.value}>
                                                {d.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="ai-type" style={styles.fieldLabel}>
                                        Interview type
                                    </label>
                                    <select
                                        id="ai-type"
                                        value={interviewType}
                                        onChange={(e) => setInterviewType(e.target.value)}
                                        style={styles.select}
                                    >
                                        {INTERVIEW_TYPES.map((t) => (
                                            <option key={t.value} value={t.value}>
                                                {t.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="ai-count" style={styles.fieldLabel}>
                                        Number of questions
                                    </label>
                                    <select
                                        id="ai-count"
                                        value={numberOfQuestions}
                                        onChange={(e) => setNumberOfQuestions(e.target.value)}
                                        style={styles.select}
                                    >
                                        {QUESTION_COUNTS.map((n) => (
                                            <option key={n} value={n}>
                                                {n} Questions
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {error && (
                                <div style={styles.errorBox}>
                                    <span style={styles.inlineIcon}>
                                        <FaExclamationTriangle />
                                    </span>
                                    {error}
                                </div>
                            )}

                            {isReady && (
                                <div style={styles.summary}>
                                    <h4 style={styles.summaryTitle}>
                                        <FaCheckCircle style={styles.headerIcon} /> Your Interview
                                    </h4>
                                    <p style={styles.summaryLine}>
                                        <strong>Skills:</strong> {skills.join(", ")}
                                    </p>
                                    <p style={styles.summaryLine}>
                                        <strong>Difficulty:</strong> {difficultyLabel} &nbsp;|&nbsp;{" "}
                                        <strong>Type:</strong> {typeLabel} &nbsp;|&nbsp;{" "}
                                        <strong>Questions:</strong> {numberOfQuestions}
                                    </p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={!isReady}
                                style={{
                                    ...styles.button,
                                    ...(!isReady && styles.buttonDisabled),
                                }}
                            >
                                Start Interview <FaArrowRight style={{ marginLeft: 8 }} />
                            </button>
                        </form>
                    </div>
                </div>

                {/* SIDE PANELS */}
                <aside className="resume-side-panels">
                    <section className="resume-side-card">
                        <div className="resume-side-heading">
                            <span className="resume-side-icon">
                                <FaLightbulb />
                            </span>
                            <div>
                                <h2>Quick Tips</h2>
                                <p>Make the most of your interview.</p>
                            </div>
                        </div>
                        <ul>
                            <li>
                                <FaCheckCircle /> Pick skills you can talk about in depth.
                            </li>
                            <li>
                                <FaCheckCircle /> Choose a level that challenges you.
                            </li>
                            <li>
                                <FaCheckCircle /> Answer out loud, as in a real interview.
                            </li>
                            <li>
                                <FaCheckCircle /> Use a quiet place and check your microphone.
                            </li>
                        </ul>
                    </section>

                    <section className="resume-side-card resume-progress-card">
                        <div className="resume-side-heading">
                            <span className="resume-side-icon">
                                <FaChartLine />
                            </span>
                            <div>
                                <h2>Track Your Progress</h2>
                                <p>View your interview history and feedback.</p>
                            </div>
                        </div>
                        <button type="button" onClick={() => navigate("/report")}>
                            Go to Reports <FaArrowRight />
                        </button>
                        <div className="resume-progress-graph" aria-label="Progress chart">
                            <span className="resume-progress-bar" style={{ height: "38%" }} />
                            <span className="resume-progress-bar" style={{ height: "52%" }} />
                            <span className="resume-progress-bar" style={{ height: "68%" }} />
                            <span className="resume-progress-bar" style={{ height: "82%" }} />
                            <span className="resume-progress-bar" style={{ height: "96%" }} />
                        </div>
                        <div className="resume-progress-illustration">
                            <FaChartLine />
                            <span>◎</span>
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    );
};

const styles = {
    container: { maxWidth: "800px", margin: "0 auto", padding: "20px" },
    card: {
        background: "#fffdf9",
        borderRadius: "13px",
        padding: "30px",
        boxShadow: "0 7px 18px rgba(91, 52, 37, 0.055)",
    },
    title: {
        fontSize: "24px",
        fontWeight: "700",
        marginBottom: "8px",
        color: "#3b2924",
    },
    subtitle: { color: "#98786a", marginBottom: "24px", fontSize: "16px" },
    fieldLabel: {
        display: "block",
        marginBottom: "8px",
        fontSize: "14px",
        fontWeight: "600",
        color: "#3b2924",
    },
    hint: { fontWeight: "400", color: "#98786a" },
    chipRow: { display: "flex", flexWrap: "wrap", gap: "8px" },
    chip: {
        display: "inline-flex",
        alignItems: "center",
        padding: "7px 14px",
        borderRadius: "20px",
        border: "1px solid #f5c6a9",
        backgroundColor: "#fff0e5",
        color: "#a94727",
        fontSize: "13px",
        fontWeight: "500",
        cursor: "pointer",
    },
    chipSelected: {
        backgroundColor: "#f4511e",
        borderColor: "#f4511e",
        color: "#ffffff",
    },
    customRow: { display: "flex", gap: "10px", margin: "14px 0 22px" },
    input: {
        flex: 1,
        padding: "11px 14px",
        borderRadius: "10px",
        border: "1px solid #e5cdbb",
        backgroundColor: "#ffffff",
        color: "#3b2924",
        fontSize: "14px",
        outlineColor: "#f4511e",
    },
    addButton: {
        display: "inline-flex",
        alignItems: "center",
        padding: "0 16px",
        borderRadius: "10px",
        border: "1px solid #f4511e",
        backgroundColor: "#ffffff",
        color: "#f4511e",
        fontWeight: "600",
        cursor: "pointer",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "18px",
    },
    select: {
        width: "100%",
        padding: "12px 14px",
        borderRadius: "10px",
        border: "1px solid #e5cdbb",
        backgroundColor: "#ffffff",
        color: "#3b2924",
        fontSize: "15px",
        outlineColor: "#f4511e",
    },
    errorBox: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginTop: "16px",
        padding: "12px 16px",
        backgroundColor: "#fee2e2",
        border: "1px solid #fecaca",
        borderRadius: "8px",
        color: "#dc2626",
    },
    inlineIcon: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
    },
    summary: {
        marginTop: "20px",
        padding: "16px",
        backgroundColor: "#fff8ef",
        borderRadius: "12px",
        border: "1px solid #f0dfd2",
    },
    summaryTitle: { margin: "0 0 10px", color: "#3b2924", fontSize: "16px" },
    headerIcon: {
        marginRight: "8px",
        verticalAlign: "middle",
        color: "#f4511e",
        fontSize: "0.9rem",
    },
    summaryLine: { margin: "4px 0", fontSize: "14px", color: "#3b2924" },
    button: {
        marginTop: "20px",
        width: "100%",
        padding: "14px 24px",
        backgroundColor: "#f4511e",
        color: "#ffffff",
        border: "none",
        borderRadius: "10px",
        fontSize: "16px",
        fontWeight: "600",
        cursor: "pointer",
    },
    buttonDisabled: { backgroundColor: "#d8aa8f", cursor: "not-allowed" },
};

export default AssessmentInterview;