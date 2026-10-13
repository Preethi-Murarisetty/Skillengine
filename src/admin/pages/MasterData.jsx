import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaPlus,
    FaTag,
    FaBook,
    FaListUl,
    FaArrowLeft,
} from "react-icons/fa";

import {
    getCategories,
    getSubjects,
    getTopics,
    createCategory,
    createSubject,
    createTopic,
} from "../../admin/services/api";

const MasterData = () => {
    const [categories, setCategories] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [topics, setTopics] = useState([]);

    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedSubject, setSelectedSubject] = useState("");

    const [activeTab, setActiveTab] = useState("category");

    const [categoryForm, setCategoryForm] = useState({
        name: "",
        description: "",
    });

    const [subjectForm, setSubjectForm] = useState({
        name: "",
        description: "",
        category_id: "",
    });

    const [topicForm, setTopicForm] = useState({
        name: "",
        description: "",
        subject_id: "",
        difficulty: "medium",
    });

    const [loading, setLoading] = useState(false);
    const [loadingMaster, setLoadingMaster] = useState(false);

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    // --------------------------------------------------------------------------
    // LOAD CATEGORIES
    // --------------------------------------------------------------------------

    const loadCategories = async () => {
        try {
            const data = await getCategories();

            const list = Array.isArray(data)
                ? data
                : Array.isArray(data?.data)
                    ? data.data
                    : [];

            setCategories(list);

            return list;
        } catch (err) {
            console.error("Failed to load categories:", err);
            setError("Failed to load categories.");
            return [];
        }
    };

    // --------------------------------------------------------------------------
    // LOAD SUBJECTS
    // --------------------------------------------------------------------------

    const loadSubjects = async (categoryId) => {
        if (!categoryId) {
            setSubjects([]);
            return;
        }

        try {
            const data = await getSubjects(categoryId);

            const list = Array.isArray(data)
                ? data
                : Array.isArray(data?.data)
                    ? data.data
                    : [];

            setSubjects(list);
        } catch (err) {
            console.error("Failed to load subjects:", err);
            setSubjects([]);
            setError("Failed to load subjects.");
        }
    };
    const navigate = useNavigate();

    const handleBack = () => {
        navigate("/admin/dashboard");
    };

    // --------------------------------------------------------------------------
    // LOAD TOPICS
    // --------------------------------------------------------------------------

    const loadTopics = async (subjectId) => {
        if (!subjectId) {
            setTopics([]);
            return;
        }

        try {
            const data = await getTopics(subjectId);

            const list = Array.isArray(data)
                ? data
                : Array.isArray(data?.data)
                    ? data.data
                    : [];

            setTopics(list);
        } catch (err) {
            console.error("Failed to load topics:", err);
            setTopics([]);
            setError("Failed to load topics.");
        }
    };

    // --------------------------------------------------------------------------
    // INITIAL LOAD
    // --------------------------------------------------------------------------

    useEffect(() => {
        const load = async () => {
            setLoadingMaster(true);
            await loadCategories();
            setLoadingMaster(false);
        };

        load();
    }, []);

    // --------------------------------------------------------------------------
    // CATEGORY CHANGE
    // --------------------------------------------------------------------------

    useEffect(() => {
        if (selectedCategory) {
            loadSubjects(selectedCategory);
        } else {
            setSubjects([]);
        }

        setSelectedSubject("");
        setTopics([]);
    }, [selectedCategory]);

    // --------------------------------------------------------------------------
    // SUBJECT CHANGE
    // --------------------------------------------------------------------------

    useEffect(() => {
        if (selectedSubject) {
            loadTopics(selectedSubject);
        } else {
            setTopics([]);
        }
    }, [selectedSubject]);

    // --------------------------------------------------------------------------
    // CREATE CATEGORY
    // --------------------------------------------------------------------------

    const handleCreateCategory = async (e) => {
        e.preventDefault();

        if (!categoryForm.name.trim()) {
            setError("Category name is required.");
            return;
        }

        try {
            setLoading(true);
            setError("");
            setMessage("");

            await createCategory({
                name: categoryForm.name.trim(),
                description: categoryForm.description.trim(),
            });

            setMessage("Category created successfully.");

            setCategoryForm({
                name: "",
                description: "",
            });

            await loadCategories();
        } catch (err) {
            console.error("Create category error:", err);

            setError(
                err?.response?.data?.message ||
                err?.response?.data?.detail ||
                "Failed to create category."
            );
        } finally {
            setLoading(false);
        }
    };

    // --------------------------------------------------------------------------
    // CREATE SUBJECT
    // --------------------------------------------------------------------------

    const handleCreateSubject = async (e) => {
        e.preventDefault();

        if (!subjectForm.category_id) {
            setError("Please select a category.");
            return;
        }

        if (!subjectForm.name.trim()) {
            setError("Subject name is required.");
            return;
        }

        try {
            setLoading(true);
            setError("");
            setMessage("");

            await createSubject({
                name: subjectForm.name.trim(),
                description: subjectForm.description.trim(),
                category_id: subjectForm.category_id,
            });

            setMessage("Subject created successfully.");

            const categoryId = subjectForm.category_id;

            setSubjectForm({
                name: "",
                description: "",
                category_id: categoryId,
            });

            setSelectedCategory(categoryId);

            await loadSubjects(categoryId);
        } catch (err) {
            console.error("Create subject error:", err);

            setError(
                err?.response?.data?.message ||
                err?.response?.data?.detail ||
                "Failed to create subject."
            );
        } finally {
            setLoading(false);
        }
    };

    // --------------------------------------------------------------------------
    // CREATE TOPIC
    // --------------------------------------------------------------------------

    const handleCreateTopic = async (e) => {
        e.preventDefault();

        if (!topicForm.subject_id) {
            setError("Please select a subject.");
            return;
        }

        if (!topicForm.name.trim()) {
            setError("Topic name is required.");
            return;
        }

        try {
            setLoading(true);
            setError("");
            setMessage("");

            await createTopic({
                name: topicForm.name.trim(),
                description: topicForm.description.trim(),
                subject_id: topicForm.subject_id,
                difficulty: topicForm.difficulty,
            });

            setMessage("Topic created successfully.");

            const subjectId = topicForm.subject_id;

            setTopicForm({
                name: "",
                description: "",
                subject_id: subjectId,
                difficulty: "medium",
            });

            setSelectedSubject(subjectId);

            await loadTopics(subjectId);
        } catch (err) {
            console.error("Create topic error:", err);

            setError(
                err?.response?.data?.message ||
                err?.response?.data?.detail ||
                "Failed to create topic."
            );
        } finally {
            setLoading(false);
        }
    };

    // --------------------------------------------------------------------------
    // TABS
    // --------------------------------------------------------------------------

    const tabs = [
        { key: "category", label: "Category", icon: FaTag },
        { key: "subject", label: "Subject", icon: FaBook },
        { key: "topic", label: "Topic", icon: FaListUl },
    ];

    return (
        <>
            {/* Ensures .page-content-width is available even if the global
          stylesheet hasn't loaded it (Vite CSS import scoping). */}
            <style>{`
        .md-page-content-width {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding-left: 32px;
          padding-right: 32px;
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .md-page-content-width {
            padding-left: 20px;
            padding-right: 20px;
          }
        }
        @media (max-width: 480px) {
          .md-page-content-width {
            padding-left: 16px;
            padding-right: 16px;
          }
        }
      `}</style>

            <div className="md-page-content-width pt-8 pb-10">
                {/* HEADER */}

                <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex items-center gap-2 px-4 py-2 mb-5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-600 hover:text-orange-500 hover:border-orange-400 transition"
                >
                    <FaArrowLeft />
                    Back to Dashboard
                </button>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mt-6">Master Data</h1>

                    <p className="text-gray-500 mt-2">
                        Manage categories, subjects and topics for your SkillEngine
                        platform.
                    </p>
                </div>

                {/* MESSAGE */}

                {message && (
                    <div className="mb-5 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-700">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 flex items-center justify-between gap-4">
                        <span>{error}</span>

                        <button
                            type="button"
                            onClick={() => setError("")}
                            className="font-semibold text-lg leading-none hover:text-red-900"
                            aria-label="Dismiss error"
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* TABS + FORM */}

                <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-6">
                    <div className="flex border-b border-gray-200 overflow-x-auto">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;

                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => {
                                        setActiveTab(tab.key);
                                        setMessage("");
                                        setError("");
                                    }}
                                    className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm border-b-2 transition whitespace-nowrap ${activeTab === tab.key
                                        ? "border-orange-500 text-orange-500"
                                        : "border-transparent text-gray-500 hover:text-gray-800"
                                        }`}
                                >
                                    <Icon />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* ================================================================
              CATEGORY
          ================================================================= */}

                    {activeTab === "category" && (
                        <div className="p-6">
                            <div className="max-w-2xl">
                                <h2 className="text-xl font-bold text-gray-800">
                                    Create Category
                                </h2>

                                <p className="text-sm text-gray-500 mt-1 mb-6">
                                    Example: Programming, Aptitude, Reasoning, Communication.
                                </p>

                                <form onSubmit={handleCreateCategory} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Category Name
                                        </label>

                                        <input
                                            type="text"
                                            value={categoryForm.name}
                                            onChange={(e) =>
                                                setCategoryForm({
                                                    ...categoryForm,
                                                    name: e.target.value,
                                                })
                                            }
                                            placeholder="Programming"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Description
                                        </label>

                                        <textarea
                                            value={categoryForm.description}
                                            onChange={(e) =>
                                                setCategoryForm({
                                                    ...categoryForm,
                                                    description: e.target.value,
                                                })
                                            }
                                            rows={4}
                                            placeholder="Programming and software development"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="inline-flex items-center gap-2 px-5 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-60"
                                    >
                                        <FaPlus />
                                        {loading ? "Creating..." : "Create Category"}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* ================================================================
              SUBJECT
          ================================================================= */}

                    {activeTab === "subject" && (
                        <div className="p-6">
                            <div className="max-w-2xl">
                                <h2 className="text-xl font-bold text-gray-800">
                                    Create Subject
                                </h2>

                                <p className="text-sm text-gray-500 mt-1 mb-6">
                                    A subject belongs to a category.
                                </p>

                                <form onSubmit={handleCreateSubject} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Category
                                        </label>

                                        <select
                                            value={subjectForm.category_id}
                                            onChange={(e) => {
                                                const value = e.target.value;

                                                setSubjectForm({
                                                    ...subjectForm,
                                                    category_id: value,
                                                });

                                                setSelectedCategory(value);
                                            }}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                                        >
                                            <option value="">
                                                {loadingMaster
                                                    ? "Loading categories..."
                                                    : "Select category"}
                                            </option>

                                            {categories.map((category) => (
                                                <option key={category.id} value={category.id}>
                                                    {category.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Subject Name
                                        </label>

                                        <input
                                            type="text"
                                            value={subjectForm.name}
                                            onChange={(e) =>
                                                setSubjectForm({
                                                    ...subjectForm,
                                                    name: e.target.value,
                                                })
                                            }
                                            placeholder="JavaScript"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Description
                                        </label>

                                        <textarea
                                            value={subjectForm.description}
                                            onChange={(e) =>
                                                setSubjectForm({
                                                    ...subjectForm,
                                                    description: e.target.value,
                                                })
                                            }
                                            rows={4}
                                            placeholder="Modern JavaScript programming"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="inline-flex items-center gap-2 px-5 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-60"
                                    >
                                        <FaPlus />
                                        {loading ? "Creating..." : "Create Subject"}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* ================================================================
              TOPIC
          ================================================================= */}

                    {activeTab === "topic" && (
                        <div className="p-6">
                            <div className="max-w-2xl">
                                <h2 className="text-xl font-bold text-gray-800">
                                    Create Topic
                                </h2>

                                <p className="text-sm text-gray-500 mt-1 mb-6">
                                    A topic belongs to a subject.
                                </p>

                                <form onSubmit={handleCreateTopic} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Category
                                        </label>

                                        <select
                                            value={selectedCategory}
                                            onChange={(e) => {
                                                const value = e.target.value;

                                                setSelectedCategory(value);

                                                setTopicForm({
                                                    ...topicForm,
                                                    subject_id: "",
                                                });
                                            }}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                                        >
                                            <option value="">Select category</option>

                                            {categories.map((category) => (
                                                <option key={category.id} value={category.id}>
                                                    {category.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Subject
                                        </label>

                                        <select
                                            value={topicForm.subject_id}
                                            onChange={(e) => {
                                                const value = e.target.value;

                                                setTopicForm({
                                                    ...topicForm,
                                                    subject_id: value,
                                                });

                                                setSelectedSubject(value);
                                            }}
                                            disabled={!selectedCategory}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-gray-100"
                                        >
                                            <option value="">
                                                {!selectedCategory
                                                    ? "Select category first"
                                                    : "Select subject"}
                                            </option>

                                            {subjects.map((subject) => (
                                                <option key={subject.id} value={subject.id}>
                                                    {subject.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Topic Name
                                        </label>

                                        <input
                                            type="text"
                                            value={topicForm.name}
                                            onChange={(e) =>
                                                setTopicForm({
                                                    ...topicForm,
                                                    name: e.target.value,
                                                })
                                            }
                                            placeholder="Arrays"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Description
                                        </label>

                                        <textarea
                                            value={topicForm.description}
                                            onChange={(e) =>
                                                setTopicForm({
                                                    ...topicForm,
                                                    description: e.target.value,
                                                })
                                            }
                                            rows={4}
                                            placeholder="JavaScript arrays and their operations"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Difficulty
                                        </label>

                                        <select
                                            value={topicForm.difficulty}
                                            onChange={(e) =>
                                                setTopicForm({
                                                    ...topicForm,
                                                    difficulty: e.target.value,
                                                })
                                            }
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                                        >
                                            <option value="easy">Easy</option>
                                            <option value="medium">Medium</option>
                                            <option value="hard">Hard</option>
                                        </select>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="inline-flex items-center gap-2 px-5 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-60"
                                    >
                                        <FaPlus />
                                        {loading ? "Creating..." : "Create Topic"}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>

                {/* ================================================================
            EXISTING MASTER DATA
        ================================================================= */}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Categories */}

                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                        <div className="p-5 border-b border-gray-200">
                            <div className="flex items-center gap-2">
                                <FaTag className="text-orange-500" />

                                <h3 className="font-bold text-gray-800">Categories</h3>
                            </div>

                            <p className="text-sm text-gray-500 mt-1">
                                {categories.length} categories
                            </p>
                        </div>

                        <div className="p-4 max-h-80 overflow-y-auto">
                            {categories.length === 0 ? (
                                <p className="text-sm text-gray-500">No categories found.</p>
                            ) : (
                                categories.map((category) => (
                                    <div
                                        key={category.id}
                                        className="p-3 border-b border-gray-100 last:border-0"
                                    >
                                        <p className="font-semibold text-gray-800">
                                            {category.name}
                                        </p>

                                        {category.description && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                {category.description}
                                            </p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Subjects */}

                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                        <div className="p-5 border-b border-gray-200">
                            <div className="flex items-center gap-2">
                                <FaBook className="text-blue-500" />

                                <h3 className="font-bold text-gray-800">Subjects</h3>
                            </div>

                            <p className="text-sm text-gray-500 mt-1">
                                Select a category above to load subjects.
                            </p>
                        </div>

                        <div className="p-4 max-h-80 overflow-y-auto">
                            {subjects.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                    Select a category to view subjects.
                                </p>
                            ) : (
                                subjects.map((subject) => (
                                    <div
                                        key={subject.id}
                                        className="p-3 border-b border-gray-100 last:border-0"
                                    >
                                        <p className="font-semibold text-gray-800">
                                            {subject.name}
                                        </p>

                                        {subject.description && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                {subject.description}
                                            </p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Topics */}

                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                        <div className="p-5 border-b border-gray-200">
                            <div className="flex items-center gap-2">
                                <FaListUl className="text-purple-500" />

                                <h3 className="font-bold text-gray-800">Topics</h3>
                            </div>

                            <p className="text-sm text-gray-500 mt-1">
                                Select a subject to load topics.
                            </p>
                        </div>

                        <div className="p-4 max-h-80 overflow-y-auto">
                            {topics.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                    Select a subject to view topics.
                                </p>
                            ) : (
                                topics.map((topic) => (
                                    <div
                                        key={topic.id}
                                        className="p-3 border-b border-gray-100 last:border-0"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="font-semibold text-gray-800">
                                                {topic.name}
                                            </p>

                                            {topic.difficulty && (
                                                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 capitalize">
                                                    {topic.difficulty}
                                                </span>
                                            )}
                                        </div>

                                        {topic.description && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                {topic.description}
                                            </p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default MasterData;