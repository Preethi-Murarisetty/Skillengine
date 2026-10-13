// src/components/Quiz/Quiz.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaArrowRight,
    FaArrowLeft,
    FaChartLine,
    FaCheckCircle,
    FaExclamationTriangle,
    FaLightbulb,
} from "react-icons/fa";



const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://100.117.158.50:3005/api";

const DIFFICULTIES = [
    { value: "easy", label: "Easy" },
    { value: "medium", label: "Medium" },
    { value: "hard", label: "Hard" },
];

const QUESTION_COUNTS = [5, 10, 15, 20, 25, 30];

// Handles { data: [...] }, { items: [...] }, { data: { items: [...] } } or a plain array
const extractList = (json) => {
    const list =
        (Array.isArray(json) && json) ||
        (Array.isArray(json?.data) && json.data) ||
        (Array.isArray(json?.items) && json.items) ||
        (Array.isArray(json?.data?.items) && json.data.items) ||
        [];

    return list.map((item) => ({
        id: item.id ?? item.category_id ?? item.subject_id ?? item.topic_id,
        name: item.name ?? item.title ?? item.label ?? String(item.id),
    }));
};

const fetchMaster = async (params) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/master/master-category?${query}`);
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return extractList(await res.json());
};

const Quiz = () => {
    const navigate = useNavigate();

    const [categories, setCategories] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [topics, setTopics] = useState([]);

    const [categoryId, setCategoryId] = useState("");
    const [subjectId, setSubjectId] = useState("");
    const [topicId, setTopicId] = useState("");
    const [difficulty, setDifficulty] = useState("");
    const [numberOfQuestions, setNumberOfQuestions] = useState("10");

    const [loading, setLoading] = useState({
        categories: false,
        subjects: false,
        topics: false,
    });
    const [error, setError] = useState("");

    const setLoad = (key, value) =>
        setLoading((previous) => ({ ...previous, [key]: value }));

    // Categories on mount
    useEffect(() => {
        (async () => {
            try {
                setLoad("categories", true);
                setCategories(await fetchMaster({ type: "category" }));
            } catch (e) {
                setError(`Could not load categories: ${e.message}`);
            } finally {
                setLoad("categories", false);
            }
        })();
    }, []);

    // Subjects when category changes
    useEffect(() => {
        setSubjects([]);
        setSubjectId("");
        setTopics([]);
        setTopicId("");

        if (!categoryId) return;

        (async () => {
            try {
                setLoad("subjects", true);
                setSubjects(
                    await fetchMaster({ type: "subject", category_id: categoryId })
                );
            } catch (e) {
                setError(`Could not load subjects: ${e.message}`);
            } finally {
                setLoad("subjects", false);
            }
        })();
    }, [categoryId]);

    // Topics when subject changes
    useEffect(() => {
        setTopics([]);
        setTopicId("");

        if (!subjectId) return;

        (async () => {
            try {
                setLoad("topics", true);
                setTopics(await fetchMaster({ type: "topic", subject_id: subjectId }));
            } catch (e) {
                setError(`Could not load topics: ${e.message}`);
            } finally {
                setLoad("topics", false);
            }
        })();
    }, [subjectId]);

    const nameOf = (list, id) =>
        list.find((item) => String(item.id) === String(id))?.name || "";

    const difficultyLabel =
        DIFFICULTIES.find((d) => d.value === difficulty)?.label || "";

    const isReady = categoryId && subjectId && topicId && difficulty;

    // -------------------- BACK BUTTON (unchanged logic) --------------------
    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate("/admin/dashboard");
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError("");

        if (!categoryId) return setError("Please select a category.");
        if (!subjectId) return setError("Please select a subject.");
        if (!topicId) return setError("Please select a topic.");
        if (!difficulty) return setError("Please select difficulty.");

        const configuration = {
            category_id: categoryId,
            subject_id: subjectId,
            topic_id: topicId,
            category: nameOf(categories, categoryId),
            subject: nameOf(subjects, subjectId),
            topic: nameOf(topics, topicId),
            difficulty,
            numberOfQuestions: Number(numberOfQuestions),
        };

        localStorage.setItem("quizConfiguration", JSON.stringify(configuration));

        sessionStorage.removeItem("phase1Answers");
        sessionStorage.removeItem("phase1Reviewed");
        sessionStorage.removeItem("phase1Result");

        navigate("/quiz/start", { state: configuration });
    };

    return (
        <div className="resume-page">
            {/* ======================================================
                HERO
            ====================================================== */}
            <section className="resume-hero">
                <div className="page-content-width">
                    {/* HERO TOP ROW — Back button */}
                    <div className="resume-hero-top">
                        <button
                            type="button"
                            onClick={handleBack}
                            aria-label="Go back"
                            className="quiz-back-button"
                        >
                            <span className="quiz-back-icon">
                                <FaArrowLeft />
                            </span>

                            <span className="quiz-back-text">
                                Back
                            </span>
                        </button>
                    </div>

                    {/* HERO CONTENT */}
                    <div className="resume-hero-content">
                        <span>PRACTICE MAKES PROGRESS</span>

                        <h1>Sharpen Your Skills, Build Confidence!</h1>

                        <p>
                            Pick a topic, choose your level and test yourself with a timed quiz.
                        </p>

                        <button
                            type="button"
                            className="resume-hero-button"
                            onClick={() =>
                                document.getElementById("quiz-category")?.focus()
                            }
                        >
                            Start Practice
                            <FaArrowRight />
                        </button>
                    </div>
                </div>
            </section>

            {/* ======================================================
                MAIN GRID — uses the SAME alignment container
            ====================================================== */}
            <div className="page-content-width">
                <div className="resume-page-grid">
                    {/* MAIN CARD */}
                    <div className="resume-upload-container" style={styles.container}>
                        <div className="resume-upload-card" style={styles.card}>
                            <div className="resume-upload-header">
                                <div>
                                    <h2 style={styles.title}>Set Up Your Quiz</h2>
                                    <p style={styles.subtitle}>
                                        Choose a category, subject and topic to get matching questions.
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div style={styles.grid}>
                                    {/* Category */}
                                    <div>
                                        <label htmlFor="quiz-category" style={styles.fieldLabel}>
                                            Category
                                        </label>
                                        <select
                                            id="quiz-category"
                                            value={categoryId}
                                            onChange={(e) => setCategoryId(e.target.value)}
                                            style={styles.select}
                                        >
                                            <option value="">
                                                {loading.categories ? "Loading..." : "Select Category"}
                                            </option>
                                            {categories.map((item) => (
                                                <option key={item.id} value={item.id}>
                                                    {item.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Subject */}
                                    <div>
                                        <label htmlFor="quiz-subject" style={styles.fieldLabel}>
                                            Subject
                                        </label>
                                        <select
                                            id="quiz-subject"
                                            value={subjectId}
                                            onChange={(e) => setSubjectId(e.target.value)}
                                            disabled={!categoryId}
                                            style={{
                                                ...styles.select,
                                                ...(!categoryId && styles.selectDisabled),
                                            }}
                                        >
                                            <option value="">
                                                {!categoryId
                                                    ? "Select Category First"
                                                    : loading.subjects
                                                        ? "Loading..."
                                                        : "Select Subject"}
                                            </option>
                                            {subjects.map((item) => (
                                                <option key={item.id} value={item.id}>
                                                    {item.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Topic */}
                                    <div>
                                        <label htmlFor="quiz-topic" style={styles.fieldLabel}>
                                            Topic
                                        </label>
                                        <select
                                            id="quiz-topic"
                                            value={topicId}
                                            onChange={(e) => setTopicId(e.target.value)}
                                            disabled={!subjectId}
                                            style={{
                                                ...styles.select,
                                                ...(!subjectId && styles.selectDisabled),
                                            }}
                                        >
                                            <option value="">
                                                {!subjectId
                                                    ? "Select Subject First"
                                                    : loading.topics
                                                        ? "Loading..."
                                                        : "Select Topic"}
                                            </option>
                                            {topics.map((item) => (
                                                <option key={item.id} value={item.id}>
                                                    {item.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Difficulty */}
                                    <div>
                                        <label htmlFor="quiz-difficulty" style={styles.fieldLabel}>
                                            Difficulty
                                        </label>
                                        <select
                                            id="quiz-difficulty"
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

                                    {/* Number of questions */}
                                    <div>
                                        <label htmlFor="quiz-count" style={styles.fieldLabel}>
                                            Number of Questions
                                        </label>
                                        <select
                                            id="quiz-count"
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

                                {/* Selected quiz summary */}
                                {isReady && (
                                    <div style={styles.summary}>
                                        <h4 style={styles.summaryTitle}>
                                            <FaCheckCircle style={styles.headerIcon} /> Selected Quiz
                                        </h4>

                                        <div style={styles.summaryGrid}>
                                            {[
                                                ["Category", nameOf(categories, categoryId)],
                                                ["Subject", nameOf(subjects, subjectId)],
                                                ["Topic", nameOf(topics, topicId)],
                                                ["Difficulty", difficultyLabel],
                                                ["Questions", numberOfQuestions],
                                            ].map(([label, value]) => (
                                                <div key={label}>
                                                    <p style={styles.summaryLabel}>{label}</p>
                                                    <p style={styles.summaryValue}>{value}</p>
                                                </div>
                                            ))}
                                        </div>
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
                                    Continue to Instructions{" "}
                                    <FaArrowRight style={{ marginLeft: 8 }} />
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
                                    <p>Get more out of every practice session.</p>
                                </div>
                            </div>
                            <ul>
                                <li>
                                    <FaCheckCircle /> Start with Easy and move up gradually.
                                </li>
                                <li>
                                    <FaCheckCircle /> Stick to one topic per session.
                                </li>
                                <li>
                                    <FaCheckCircle /> Mark tricky questions for review.
                                </li>
                                <li>
                                    <FaCheckCircle /> Read the explanations after you finish.
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
                                    <p>View your practice history and improvement over time.</p>
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
        </div>
    );
};

// Same palette and card style as ResumeUpload
// NOTE: All back-button, hero, and page-width styling has been moved to Quiz.css.
const styles = {
    container: {
        maxWidth: "800px",
        margin: "0 auto",
        padding: "20px",
    },
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
    subtitle: {
        color: "#98786a",
        marginBottom: "24px",
        fontSize: "16px",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "18px",
    },
    fieldLabel: {
        display: "block",
        marginBottom: "6px",
        fontSize: "14px",
        fontWeight: "600",
        color: "#3b2924",
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
    selectDisabled: {
        backgroundColor: "#f7efe8",
        color: "#b08a76",
        cursor: "not-allowed",
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
    summaryTitle: {
        margin: "0 0 12px",
        color: "#3b2924",
        fontSize: "16px",
    },
    headerIcon: {
        marginRight: "8px",
        verticalAlign: "middle",
        color: "#f4511e",
        fontSize: "0.9rem",
    },
    summaryGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: "12px",
    },
    summaryLabel: {
        margin: 0,
        fontSize: "12px",
        color: "#98786a",
    },
    summaryValue: {
        margin: "4px 0 0",
        fontSize: "15px",
        fontWeight: "600",
        color: "#3b2924",
    },
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
        transition: "all 0.2s ease",
    },
    buttonDisabled: {
        backgroundColor: "#d8aa8f",
        cursor: "not-allowed",
    },
};

export default Quiz;