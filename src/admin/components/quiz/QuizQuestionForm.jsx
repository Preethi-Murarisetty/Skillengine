import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowLeft,
  FaPlus,
  FaSave,
} from 'react-icons/fa';
import {
  createManualQuestion,
  getCategories,
  getSubjects,
  getTopics,
} from '../../services/api';

const ManualQuizAdmin = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    question_text: '',
    category_id: '',
    subject_id: '',
    topic_id: '',
    difficulty: 'medium',
    explanation: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: 'A',
  });

  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);

  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Load categories once, on mount
  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);

      try {
        const data = await getCategories();
        setCategories(data);
      } catch (error) {
        console.error('Failed to load categories:', error);
        setErrorMessage('Unable to load categories. Please refresh and try again.');
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  // Load subjects whenever the selected category changes
  useEffect(() => {
    if (!formData.category_id) {
      setSubjects([]);
      return;
    }

    const loadSubjects = async () => {
      setLoadingSubjects(true);

      try {
        const data = await getSubjects(formData.category_id);
        setSubjects(data);
      } catch (error) {
        console.error('Failed to load subjects:', error);
        setErrorMessage('Unable to load subjects for the selected category.');
      } finally {
        setLoadingSubjects(false);
      }
    };

    loadSubjects();
  }, [formData.category_id]);

  // Load topics whenever the selected subject changes
  useEffect(() => {
    if (!formData.subject_id) {
      setTopics([]);
      return;
    }

    const loadTopics = async () => {
      setLoadingTopics(true);

      try {
        const data = await getTopics(formData.subject_id);
        setTopics(data);
      } catch (error) {
        console.error('Failed to load topics:', error);
        setErrorMessage('Unable to load topics for the selected subject.');
      } finally {
        setLoadingTopics(false);
      }
    };

    loadTopics();
  }, [formData.subject_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const next = { ...prev, [name]: value };

      // Reset dependent selections when a parent dropdown changes
      if (name === 'category_id') {
        next.subject_id = '';
        next.topic_id = '';
      }

      if (name === 'subject_id') {
        next.topic_id = '';
      }

      return next;
    });

    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.category_id || !formData.subject_id || !formData.topic_id) {
      setErrorMessage('Please select a category, subject and topic.');
      return;
    }

    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const payload = {
        question_text: formData.question_text.trim(),

        category_id: formData.category_id,

        subject_id: formData.subject_id,

        topic_id: formData.topic_id,

        difficulty: formData.difficulty,

        source: 'manual',

        allow_multiple_answers: false,

        explanation: formData.explanation.trim(),

        options: [
          {
            option_text: formData.optionA.trim(),
            is_correct: formData.correctAnswer === 'A',
          },
          {
            option_text: formData.optionB.trim(),
            is_correct: formData.correctAnswer === 'B',
          },
          {
            option_text: formData.optionC.trim(),
            is_correct: formData.correctAnswer === 'C',
          },
          {
            option_text: formData.optionD.trim(),
            is_correct: formData.correctAnswer === 'D',
          },
        ],
      };

      await createManualQuestion(payload);

      setSuccessMessage('Question created successfully.');

      setFormData({
        question_text: '',
        category_id: '',
        subject_id: '',
        topic_id: '',
        difficulty: 'medium',
        explanation: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctAnswer: 'A',
      });

      setSubjects([]);
      setTopics([]);
    } catch (error) {
      console.error('Manual question creation failed:', error);

      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        'Unable to create question. Please try again.';

      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="max-w-5xl mx-auto">

        {/* Back Button */}
        <button
          type="button"
          onClick={() => navigate('/admin/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-orange-500 mb-8 transition"
        >
          <FaArrowLeft />
          Back to Quiz
        </button>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Manual Quiz Admin
              </h1>

              <p className="text-gray-500 mt-2">
                Create questions for the Manual Quiz.
              </p>
            </div>

            <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center">
              <FaPlus className="text-orange-500 text-2xl" />
            </div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3">
              {successMessage}
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Question */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Question
              </label>

              <textarea
                name="question_text"
                value={formData.question_text}
                onChange={handleChange}
                placeholder="Enter the question"
                rows={4}
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            {/* Category / Subject / Topic */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Category
                </label>

                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  required
                  disabled={loadingCategories}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-gray-100"
                >
                  <option value="">
                    {loadingCategories ? 'Loading categories...' : 'Select category'}
                  </option>

                  {categories.map((category) => (
                    <option value={category.id} key={category.id}>
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
                  name="subject_id"
                  value={formData.subject_id}
                  onChange={handleChange}
                  required
                  disabled={!formData.category_id || loadingSubjects}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-gray-100"
                >
                  <option value="">
                    {!formData.category_id
                      ? 'Select category first'
                      : loadingSubjects
                      ? 'Loading subjects...'
                      : 'Select subject'}
                  </option>

                  {subjects.map((subject) => (
                    <option value={subject.id} key={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Topic
                </label>

                <select
                  name="topic_id"
                  value={formData.topic_id}
                  onChange={handleChange}
                  required
                  disabled={!formData.subject_id || loadingTopics}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-gray-100"
                >
                  <option value="">
                    {!formData.subject_id
                      ? 'Select subject first'
                      : loadingTopics
                      ? 'Loading topics...'
                      : 'Select topic'}
                  </option>

                  {topics.map((topic) => (
                    <option value={topic.id} key={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Difficulty
              </label>

              <select
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            {/* Options */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Answer Options
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <input
                  type="text"
                  name="optionA"
                  value={formData.optionA}
                  onChange={handleChange}
                  placeholder="Option A"
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />

                <input
                  type="text"
                  name="optionB"
                  value={formData.optionB}
                  onChange={handleChange}
                  placeholder="Option B"
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />

                <input
                  type="text"
                  name="optionC"
                  value={formData.optionC}
                  onChange={handleChange}
                  placeholder="Option C"
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />

                <input
                  type="text"
                  name="optionD"
                  value={formData.optionD}
                  onChange={handleChange}
                  placeholder="Option D"
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />

              </div>
            </div>

            {/* Correct Answer */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Correct Answer
              </label>

              <select
                name="correctAnswer"
                value={formData.correctAnswer}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="A">Option A</option>
                <option value="B">Option B</option>
                <option value="C">Option C</option>
                <option value="D">Option D</option>
              </select>
            </div>

            {/* Explanation */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Explanation
              </label>

              <textarea
                name="explanation"
                value={formData.explanation}
                onChange={handleChange}
                placeholder="Enter explanation for the correct answer"
                rows={3}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full ${
                loading
                  ? 'bg-orange-300 cursor-not-allowed'
                  : 'bg-orange-500 hover:bg-orange-600'
              } text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2`}
            >
              <FaSave />

              {loading ? 'Creating Question...' : 'Create Question'}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};

export default ManualQuizAdmin;