import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaTrash, FaSave } from "react-icons/fa";
import {
  createCodingQuestions,
  getCategories,
  getSubjects,
  getTopics,
} from "../../services/api";

const LANGUAGES = ["python", "java", "javascript", "cpp", "c"];
const selectCls =
  "w-full border border-gray-300 rounded-lg px-4 py-3 bg-white outline-none focus:border-orange-500";
const inputCls =
  "w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500";

function CodingQuestionForm() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [inputDescription, setInputDescription] = useState("");
  const [outputDescription, setOutputDescription] = useState("");
  const [constraints, setConstraints] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [languages, setLanguages] = useState(["python"]);
  const [timeLimit, setTimeLimit] = useState("");
  const [memoryLimit, setMemoryLimit] = useState("");

  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const emptyCase = { input: "", expectedOutput: "", isSample: false };
  const [testCases, setTestCases] = useState([{ ...emptyCase, isSample: true }]);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setError("Unable to load categories."));
  }, []);

  useEffect(() => {
    setSubjects([]);
    if (!categoryId) return;
    getSubjects(categoryId).then(setSubjects).catch(() => setError("Unable to load subjects."));
  }, [categoryId]);

  useEffect(() => {
    setTopics([]);
    if (!subjectId) return;
    getTopics(subjectId).then(setTopics).catch(() => setError("Unable to load topics."));
  }, [subjectId]);

  const toggleLanguage = (lang) =>
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );

  const addTestCase = () => setTestCases([...testCases, { ...emptyCase }]);

  const removeTestCase = (index) => {
    if (testCases.length === 1) return;
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const updateTestCase = (index, field, value) => {
    setTestCases(testCases.map((tc, i) => (i === index ? { ...tc, [field]: value } : tc)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess("");
    setError("");

    if (languages.length === 0) {
      setError("Select at least one supported language.");
      return;
    }

    const payload = {
      title: title.trim(),
      problem_statement: question.trim(),
      input_description: inputDescription.trim() || undefined,
      output_description: outputDescription.trim() || undefined,
      constraints: constraints.trim() || undefined,
      category_id: categoryId || undefined,
      subject_id: subjectId || undefined,
      topic_id: topicId || undefined,
      difficulty,
      source: "manual",
      supported_languages: languages,
      time_limit_ms: timeLimit ? Number(timeLimit) : null,
      memory_limit_mb: memoryLimit ? Number(memoryLimit) : null,
      test_cases: testCases.map((tc, i) => ({
        input_data: tc.input,
        expected_output: tc.expectedOutput,
        is_sample: tc.isSample,
        is_hidden: !tc.isSample,
        test_order: i + 1,
      })),
    };

    setSaving(true);
    try {
      await createCodingQuestions([payload]);
      setSuccess("Coding question created successfully.");
      setTitle("");
      setQuestion("");
      setInputDescription("");
      setOutputDescription("");
      setConstraints("");
      setTimeLimit("");
      setMemoryLimit("");
      setTestCases([{ ...emptyCase, isSample: true }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">

        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Create Coding Question
          </h1>

          <p className="text-gray-500 mt-2">
            Add a coding problem and its test cases
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/admin/dashboard")}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <FaArrowLeft />
          Back
        </button>

      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-gray-200 shadow-sm p-8"
      >

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3">{success}</div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">{error}</div>
        )}

        {/* Title */}
        <div className="mb-7">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Two Sum"
            required
            className={inputCls}
          />
        </div>

        {/* Category / Subject / Topic */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-7">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
            <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setSubjectId(""); setTopicId(""); }} className={selectCls}>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
            <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTopicId(""); }} disabled={!categoryId} className={selectCls}>
              <option value="">Select subject</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Topic</label>
            <select value={topicId} onChange={(e) => setTopicId(e.target.value)} disabled={!subjectId} className={selectCls}>
              <option value="">Select topic</option>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        {/* Question */}
        <div className="mb-7">

          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Problem Statement
          </label>

          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter the coding problem statement..."
            rows={7}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-y"
          />

        </div>

        {/* Difficulty */}
        <div className="mb-8 max-w-sm">

          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Difficulty
          </label>

          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white outline-none focus:border-orange-500"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

        </div>

        {/* Input / Output description + constraints */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-7">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Input Description</label>
            <textarea value={inputDescription} onChange={(e) => setInputDescription(e.target.value)} rows={3} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Output Description</label>
            <textarea value={outputDescription} onChange={(e) => setOutputDescription(e.target.value)} rows={3} className={inputCls} />
          </div>
        </div>
        <div className="mb-7">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Constraints</label>
          <textarea value={constraints} onChange={(e) => setConstraints(e.target.value)} rows={2} className={inputCls} />
        </div>

        {/* Languages + limits */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Supported Languages</label>
          <div className="flex flex-wrap gap-4 mb-5">
            {LANGUAGES.map((lang) => (
              <label key={lang} className="flex items-center gap-2 text-gray-700">
                <input type="checkbox" checked={languages.includes(lang)} onChange={() => toggleLanguage(lang)} />
                {lang}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <input type="number" min="0" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} placeholder="Time limit (ms) - optional" className={inputCls} />
            <input type="number" min="0" value={memoryLimit} onChange={(e) => setMemoryLimit(e.target.value)} placeholder="Memory limit (MB) - optional" className={inputCls} />
          </div>
        </div>

        {/* Test Cases */}
        <div>

          <div className="flex items-center justify-between mb-5">

            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Test Cases
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Add input and expected output for each test case.
              </p>
            </div>

            <button
              type="button"
              onClick={addTestCase}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              <FaPlus />
              Add Test Case
            </button>

          </div>

          {/* Test Case Cards */}
          <div className="space-y-5">

            {testCases.map((testCase, index) => (

              <div
                key={index}
                className="border border-gray-200 rounded-xl p-6 bg-gray-50"
              >

                <div className="flex items-center justify-between mb-5">

                  <h3 className="font-semibold text-gray-800">
                    Test Case {index + 1}
                  </h3>

                  {testCases.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTestCase(index)}
                      className="flex items-center gap-2 text-red-500 hover:text-red-700"
                    >
                      <FaTrash />
                      Remove
                    </button>
                  )}

                </div>

                <label className="flex items-center gap-2 text-sm text-gray-700 mb-4">
                  <input
                    type="checkbox"
                    checked={testCase.isSample}
                    onChange={(e) => updateTestCase(index, "isSample", e.target.checked)}
                  />
                  Sample test case (visible to students; unchecked = hidden)
                </label>

                {/* Input */}
                <div className="mb-5">

                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Input
                  </label>

                  <textarea
                    value={testCase.input}
                    onChange={(e) =>
                      updateTestCase(index, "input", e.target.value)
                    }
                    placeholder="Enter test case input..."
                    rows={4}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white outline-none focus:border-orange-500 resize-y"
                  />

                </div>

                {/* Expected Output */}
                <div>

                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Expected Output
                  </label>

                  <textarea
                    value={testCase.expectedOutput}
                    onChange={(e) =>
                      updateTestCase(
                        index,
                        "expectedOutput",
                        e.target.value
                      )
                    }
                    placeholder="Enter expected output..."
                    rows={3}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white outline-none focus:border-orange-500 resize-y"
                  />

                </div>

              </div>

            ))}

          </div>

        </div>

        {/* Submit */}
        <div className="flex justify-end mt-8 pt-6 border-t border-gray-200">

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <FaSave />
            {saving ? "Creating..." : "Create Question"}
          </button>

        </div>

      </form>

    </div>
  );
}

export default CodingQuestionForm;