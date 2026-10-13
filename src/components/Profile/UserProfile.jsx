import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FaArrowLeft,
  FaBriefcase,
  FaCalendarAlt,
  FaChartLine,
  FaCheckCircle,
  FaEdit,
  FaEnvelope,
  FaGithub,
  FaHeart,
  FaLinkedin,
  FaMapMarkerAlt,
  FaPhone,
  FaSave,
  FaTimes,
  FaTrophy,
  FaUser,
  FaGlobe,
} from "react-icons/fa";

import { useAuth } from "../../context/AuthContext";

import {
  getUserProfile,
  getUserInterviewStats,
  updateUserProfile,
} from "../../services/api";

const UserProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ============================================================
  // USER ID
  // ============================================================

  const userId = user?.id || user?.user_id;

  // ============================================================
  // STATE
  // ============================================================

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const [isEditing, setIsEditing] = useState(false);

  // ============================================================
  // FORM DATA
  // ============================================================

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    location: "",
    bio: "",
    linkedin_url: "",
    github_url: "",
    portfolio_url: "",
  });

  // ============================================================
  // LOAD PROFILE
  // ============================================================

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) {
        console.error("❌ User ID not found:", user);
        setError("User ID not found.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        console.log("👤 Loading profile for User ID:", userId);

        const profilePromise = getUserProfile(userId);

        let statsPromise;

        try {
          statsPromise = getUserInterviewStats(userId);
        } catch (statsError) {
          console.error(
            "❌ Interview stats error:",
            statsError
          );

          statsPromise = Promise.resolve(null);
        }

        const [profileData, statsData] = await Promise.all([
          profilePromise,
          statsPromise,
        ]);

        console.log(
          "✅ Profile response:",
          profileData
        );

        console.log(
          "📊 Stats response:",
          statsData
        );

        const finalProfile =
          profileData?.data ||
          profileData?.user ||
          profileData ||
          {};

        setProfile(finalProfile);
        setStats(
          statsData?.data ||
            statsData ||
            {}
        );

        // Set form values
        setFormData({
          name: finalProfile?.name || "",
          phone: finalProfile?.phone || "",
          date_of_birth:
            finalProfile?.date_of_birth || "",
          gender: finalProfile?.gender || "",
          location: finalProfile?.location || "",
          bio: finalProfile?.bio || "",
          linkedin_url:
            finalProfile?.linkedin_url || "",
          github_url:
            finalProfile?.github_url || "",
          portfolio_url:
            finalProfile?.portfolio_url || "",
        });
      } catch (err) {
        console.error(
          "❌ Failed to load profile:",
          err
        );

        setError(
          err?.message ||
            "Failed to load profile."
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

  // ============================================================
  // HANDLE INPUT CHANGE
  // ============================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ============================================================
  // EDIT PROFILE
  // ============================================================

  const handleEdit = () => {
    setError("");
    setSaveMessage("");

    setFormData({
      name: profile?.name || "",
      phone: profile?.phone || "",
      date_of_birth:
        profile?.date_of_birth || "",
      gender: profile?.gender || "",
      location: profile?.location || "",
      bio: profile?.bio || "",
      linkedin_url:
        profile?.linkedin_url || "",
      github_url:
        profile?.github_url || "",
      portfolio_url:
        profile?.portfolio_url || "",
    });

    setIsEditing(true);
  };

  // ============================================================
  // CANCEL EDIT
  // ============================================================

  const handleCancel = () => {
    setIsEditing(false);
    setError("");
    setSaveMessage("");

    setFormData({
      name: profile?.name || "",
      phone: profile?.phone || "",
      date_of_birth:
        profile?.date_of_birth || "",
      gender: profile?.gender || "",
      location: profile?.location || "",
      bio: profile?.bio || "",
      linkedin_url:
        profile?.linkedin_url || "",
      github_url:
        profile?.github_url || "",
      portfolio_url:
        profile?.portfolio_url || "",
    });
  };

  // ============================================================
  // SAVE PROFILE
  // PUT /users/{user_id}
  // ============================================================

  const handleSave = async (e) => {
    e.preventDefault();

    console.log("====================================");
    console.log("🟠 SAVE PROFILE CLICKED");
    console.log("====================================");

    if (!userId) {
      console.error(
        "❌ User ID missing:",
        user
      );

      setError("User ID not found.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSaveMessage("");

      // ========================================================
      // EXACT BACKEND PAYLOAD
      // ========================================================

      const payload = {
        name: formData.name || "",
        phone: formData.phone || "",
        date_of_birth:
          formData.date_of_birth || "",
        gender: formData.gender || "",
        location: formData.location || "",
        bio: formData.bio || "",
        linkedin_url:
          formData.linkedin_url || "",
        github_url:
          formData.github_url || "",
        portfolio_url:
          formData.portfolio_url || "",
      };

      console.log("👤 User ID:", userId);

      console.log(
        "🌐 PUT URL:",
        `http://100.124.4.91:3005/users/${userId}`
      );

      console.log(
        "📦 PUT BODY:",
        payload
      );

      // ========================================================
      // CALL PUT API
      // ========================================================

      const updatedProfile =
        await updateUserProfile(
          userId,
          payload
        );

      console.log(
        "✅ PUT API RESPONSE:",
        updatedProfile
      );

      // ========================================================
      // NORMALIZE RESPONSE
      // ========================================================

      const responseProfile =
        updatedProfile?.data ||
        updatedProfile?.user ||
        updatedProfile ||
        {};

      // ========================================================
      // UPDATE PROFILE UI
      // ========================================================

      setProfile((prev) => ({
        ...(prev || {}),
        ...payload,
        ...responseProfile,
      }));

      // ========================================================
      // UPDATE FORM
      // ========================================================

      setFormData({
        name:
          responseProfile?.name ??
          payload.name,

        phone:
          responseProfile?.phone ??
          payload.phone,

        date_of_birth:
          responseProfile?.date_of_birth ??
          payload.date_of_birth,

        gender:
          responseProfile?.gender ??
          payload.gender,

        location:
          responseProfile?.location ??
          payload.location,

        bio:
          responseProfile?.bio ??
          payload.bio,

        linkedin_url:
          responseProfile?.linkedin_url ??
          payload.linkedin_url,

        github_url:
          responseProfile?.github_url ??
          payload.github_url,

        portfolio_url:
          responseProfile?.portfolio_url ??
          payload.portfolio_url,
      });

      // ========================================================
      // CLOSE EDIT MODE
      // ========================================================

      setIsEditing(false);

      setSaveMessage(
        "Profile updated successfully!"
      );

      console.log(
        "🎉 Profile update completed successfully"
      );
    } catch (err) {
      console.error(
        "❌ UPDATE PROFILE FAILED:",
        err
      );

      console.error(
        "❌ Error message:",
        err?.message
      );

      setError(
        err?.message ||
          "Failed to update profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />

          <p className="text-gray-600">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // PROFILE NOT FOUND
  // ============================================================

  if (!profile && error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm p-8 text-center">
          <p className="text-red-500 mb-4">
            {error}
          </p>

          <button
            onClick={() => navigate("/")}
            className="px-5 py-2 bg-orange-500 text-white rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // SAFE VALUES
  // ============================================================

  const displayName =
    profile?.name ||
    user?.name ||
    "User";

  const email =
    profile?.email ||
    user?.email ||
    "Not available";

  const totalInterviews =
    stats?.totalInterviews ??
    stats?.total ??
    0;

  const completedInterviews =
    stats?.completedInterviews ??
    stats?.completed ??
    0;

  const averageScore =
    stats?.averageScore ??
    stats?.avgScore ??
    0;

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="w-full min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}

        <div className="flex items-center justify-between mb-6">

          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-gray-600 hover:text-orange-500 transition"
          >
            <FaArrowLeft />
            Back to Dashboard
          </button>

          {!isEditing && (
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition"
            >
              <FaEdit />
              Edit Profile
            </button>
          )}

        </div>

        {/* SUCCESS MESSAGE */}

        {saveMessage && (
          <div className="mb-5 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
            <FaCheckCircle />
            {saveMessage}
          </div>
        )}

        {/* ERROR MESSAGE */}

        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* PROFILE HEADER */}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">

            <div className="flex items-center gap-5">

              <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center">
                <FaUser className="text-orange-500 text-3xl" />
              </div>

              <div>

                <h1 className="text-2xl font-bold text-gray-800">
                  {displayName}
                </h1>

                <div className="flex items-center gap-2 text-gray-500 mt-1">
                  <FaEnvelope className="text-sm" />
                  {email}
                </div>

                {profile?.location && (
                  <div className="flex items-center gap-2 text-gray-500 mt-1">
                    <FaMapMarkerAlt className="text-sm" />
                    {profile.location}
                  </div>
                )}

              </div>

            </div>

            <div className="text-right">

              <p className="text-sm text-gray-500">
                Member since
              </p>

              <p className="font-semibold text-gray-700">
                {profile?.createdAt
                  ? new Date(
                      profile.createdAt
                    ).toLocaleDateString()
                  : profile?.created_at
                  ? new Date(
                      profile.created_at
                    ).toLocaleDateString()
                  : "N/A"}
              </p>

            </div>

          </div>

        </div>

        {/* ======================================================
            EDIT PROFILE
        ======================================================= */}

        {isEditing ? (

          <form
            onSubmit={handleSave}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6"
          >

            <div className="mb-6">

              <h2 className="text-xl font-bold text-gray-800">
                Edit Profile
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Update your personal and professional information.
              </p>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* NAME */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>

                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Enter your name"
                />
              </div>

              {/* PHONE */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>

                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Enter phone number"
                />
              </div>

              {/* DATE OF BIRTH */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth
                </label>

                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* GENDER */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>

                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">
                    Select Gender
                  </option>

                  <option value="Male">
                    Male
                  </option>

                  <option value="Female">
                    Female
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>

              {/* LOCATION */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>

                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Nellore, Andhra Pradesh"
                />
              </div>

              {/* BIO */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>

                <input
                  type="text"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Full Stack Developer"
                />
              </div>

              {/* LINKEDIN */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LinkedIn URL
                </label>

                <input
                  type="url"
                  name="linkedin_url"
                  value={formData.linkedin_url}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="https://linkedin.com/in/..."
                />
              </div>

              {/* GITHUB */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GitHub URL
                </label>

                <input
                  type="url"
                  name="github_url"
                  value={formData.github_url}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="https://github.com/..."
                />
              </div>

              {/* PORTFOLIO */}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Portfolio URL
                </label>

                <input
                  type="url"
                  name="portfolio_url"
                  value={formData.portfolio_url}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="https://yourportfolio.com"
                />
              </div>

            </div>

            {/* SAVE / CANCEL */}

            <div className="flex justify-end gap-3 mt-7">

              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                <FaTimes />
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-lg font-medium transition"
              >
                <FaSave />

                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>

            </div>

          </form>

        ) : (

          <>
            {/* ==================================================
                STATS
            =================================================== */}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">

              {/* TOTAL */}

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">

                <div className="flex items-center gap-4">

                  <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                    <FaChartLine className="text-orange-500 text-xl" />
                  </div>

                  <div>

                    <p className="text-sm text-gray-500">
                      Total Interviews
                    </p>

                    <p className="text-2xl font-bold text-gray-800">
                      {totalInterviews}
                    </p>

                  </div>

                </div>

              </div>

              {/* COMPLETED */}

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">

                <div className="flex items-center gap-4">

                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <FaCheckCircle className="text-green-500 text-xl" />
                  </div>

                  <div>

                    <p className="text-sm text-gray-500">
                      Completed
                    </p>

                    <p className="text-2xl font-bold text-gray-800">
                      {completedInterviews}
                    </p>

                  </div>

                </div>

              </div>

              {/* SCORE */}

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">

                <div className="flex items-center gap-4">

                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <FaTrophy className="text-blue-500 text-xl" />
                  </div>

                  <div>

                    <p className="text-sm text-gray-500">
                      Average Score
                    </p>

                    <p className="text-2xl font-bold text-gray-800">
                      {averageScore}
                    </p>

                  </div>

                </div>

              </div>

            </div>

            {/* ==================================================
                BASIC INFORMATION
            =================================================== */}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">

              <h2 className="text-xl font-bold text-gray-800 mb-5">
                Basic Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* EMAIL */}

                <div className="flex items-start gap-3">

                  <FaEnvelope className="text-orange-500 mt-1" />

                  <div>

                    <p className="text-sm text-gray-500">
                      Email
                    </p>

                    <p className="font-medium text-gray-800">
                      {email}
                    </p>

                  </div>

                </div>

                {/* PHONE */}

                <div className="flex items-start gap-3">

                  <FaPhone className="text-orange-500 mt-1" />

                  <div>

                    <p className="text-sm text-gray-500">
                      Phone
                    </p>

                    <p className="font-medium text-gray-800">
                      {profile?.phone ||
                        "Not provided"}
                    </p>

                  </div>

                </div>

                {/* DATE OF BIRTH */}

                <div className="flex items-start gap-3">

                  <FaCalendarAlt className="text-orange-500 mt-1" />

                  <div>

                    <p className="text-sm text-gray-500">
                      Date of Birth
                    </p>

                    <p className="font-medium text-gray-800">
                      {profile?.date_of_birth ||
                        "Not provided"}
                    </p>

                  </div>

                </div>

                {/* GENDER */}

                <div className="flex items-start gap-3">

                  <FaUser className="text-orange-500 mt-1" />

                  <div>

                    <p className="text-sm text-gray-500">
                      Gender
                    </p>

                    <p className="font-medium text-gray-800">
                      {profile?.gender ||
                        "Not provided"}
                    </p>

                  </div>

                </div>

                {/* LOCATION */}

                <div className="flex items-start gap-3">

                  <FaMapMarkerAlt className="text-orange-500 mt-1" />

                  <div>

                    <p className="text-sm text-gray-500">
                      Location
                    </p>

                    <p className="font-medium text-gray-800">
                      {profile?.location ||
                        "Not provided"}
                    </p>

                  </div>

                </div>

                {/* BIO */}

                <div className="flex items-start gap-3">

                  <FaBriefcase className="text-orange-500 mt-1" />

                  <div>

                    <p className="text-sm text-gray-500">
                      Bio
                    </p>

                    <p className="font-medium text-gray-800">
                      {profile?.bio ||
                        "Not provided"}
                    </p>

                  </div>

                </div>

              </div>

            </div>

            {/* ==================================================
                PROFESSIONAL LINKS
            =================================================== */}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">

              <h2 className="text-xl font-bold text-gray-800 mb-5">
                Professional Links
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* LINKEDIN */}

                <a
                  href={
                    profile?.linkedin_url ||
                    "#"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition"
                >

                  <FaLinkedin className="text-blue-600 text-xl" />

                  <div>

                    <p className="text-sm text-gray-500">
                      LinkedIn
                    </p>

                    <p className="font-medium text-gray-800 truncate max-w-[180px]">
                      {profile?.linkedin_url ||
                        "Not added"}
                    </p>

                  </div>

                </a>

                {/* GITHUB */}

                <a
                  href={
                    profile?.github_url ||
                    "#"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-xl bg-gray-100 hover:bg-gray-200 transition"
                >

                  <FaGithub className="text-gray-800 text-xl" />

                  <div>

                    <p className="text-sm text-gray-500">
                      GitHub
                    </p>

                    <p className="font-medium text-gray-800 truncate max-w-[180px]">
                      {profile?.github_url ||
                        "Not added"}
                    </p>

                  </div>

                </a>

                {/* PORTFOLIO */}

                <a
                  href={
                    profile?.portfolio_url ||
                    "#"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-xl bg-orange-50 hover:bg-orange-100 transition"
                >

                  <FaGlobe className="text-orange-500 text-xl" />

                  <div>

                    <p className="text-sm text-gray-500">
                      Portfolio
                    </p>

                    <p className="font-medium text-gray-800 truncate max-w-[180px]">
                      {profile?.portfolio_url ||
                        "Not added"}
                    </p>

                  </div>

                </a>

              </div>

            </div>

            {/* ==================================================
                ABOUT YOU
            =================================================== */}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">

              <h2 className="text-xl font-bold text-gray-800 mb-5">
                About You
              </h2>

              <div className="flex items-start gap-3">

                <FaHeart className="text-orange-500 mt-1" />

                <p className="text-gray-700 leading-relaxed">
                  {profile?.bio ||
                    "No bio added yet."}
                </p>

              </div>

            </div>

            {/* ==================================================
                ACCOUNT INFORMATION
            =================================================== */}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">

              <h2 className="text-xl font-bold text-gray-800 mb-5">
                Account Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                <div>

                  <p className="text-sm text-gray-500">
                    User ID
                  </p>

                  <p className="font-medium text-gray-800 break-all">
                    {userId || "N/A"}
                  </p>

                </div>

                <div>

                  <p className="text-sm text-gray-500">
                    Account Created
                  </p>

                  <p className="font-medium text-gray-800">
                    {profile?.createdAt
                      ? new Date(
                          profile.createdAt
                        ).toLocaleDateString()
                      : profile?.created_at
                      ? new Date(
                          profile.created_at
                        ).toLocaleDateString()
                      : "N/A"}
                  </p>

                </div>

              </div>

            </div>

            {/* ==================================================
                INTERVIEW HISTORY
            =================================================== */}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">

              <div className="flex items-center justify-between mb-5">

                <h2 className="text-xl font-bold text-gray-800">
                  Interview History
                </h2>

                <button
                  onClick={() =>
                    navigate("/interviews")
                  }
                  className="text-orange-500 hover:text-orange-600 font-medium"
                >
                  View All
                </button>

              </div>

              {stats?.interviews?.length > 0 ? (

                <div className="space-y-3">

                  {stats.interviews
                    .slice(0, 5)
                    .map(
                      (interview, index) => (
                        <div
                          key={
                            interview?.id ||
                            index
                          }
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                        >

                          <div className="flex items-center gap-3">

                            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                              <FaCalendarAlt className="text-orange-500" />
                            </div>

                            <div>

                              <p className="font-medium text-gray-800">
                                {interview?.title ||
                                  interview?.type ||
                                  "Interview"}
                              </p>

                              <p className="text-sm text-gray-500">
                                {interview?.createdAt
                                  ? new Date(
                                      interview.createdAt
                                    ).toLocaleDateString()
                                  : interview?.created_at
                                  ? new Date(
                                      interview.created_at
                                    ).toLocaleDateString()
                                  : "Date not available"}
                              </p>

                            </div>

                          </div>

                          <div className="font-semibold text-gray-700">
                            {interview?.score ??
                              interview?.totalScore ??
                              "-"}
                          </div>

                        </div>
                      )
                    )}

                </div>

              ) : (

                <div className="text-center py-8 text-gray-500">
                  No interview history available.
                </div>

              )}

            </div>

            {/* ==================================================
                START INTERVIEW
            =================================================== */}

            <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-2xl p-6 text-white">

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">

                <div>

                  <h2 className="text-xl font-bold mb-1">
                    Ready for your next interview?
                  </h2>

                  <p className="text-orange-50">
                    Practice your technical and communication skills.
                  </p>

                </div>

                <button
                  onClick={() =>
                    navigate("/interview")
                  }
                  className="px-6 py-3 bg-white text-orange-500 rounded-lg font-semibold hover:bg-orange-50 transition"
                >
                  Start Interview
                </button>

              </div>

            </div>

          </>

        )}

      </div>
    </div>
  );
};

export default UserProfile;