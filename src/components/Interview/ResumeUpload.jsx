// src/components/Interview/ResumeUpload.jsx
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaArrowRight,
  FaBriefcase,
  FaChartLine,
  FaCheckCircle,
  FaCloudUploadAlt,
  FaExclamationTriangle,
  FaFileAlt,
  FaFolderOpen,
  FaGraduationCap,
  FaLaptopCode,
  FaLightbulb,
  FaMicrophone,
  FaPaperclip,
  FaUser,
} from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth';
import { interviewAPI } from '../../services/api';
import { getResumeSkills } from '../../utils/skills';
import { analyzeResumeFile } from '../../services/atsResumeChecker';
import { analyzeResumeWithBackend, discoverRolesFromResume, getRoleRequirements } from '../../services/resumeRoleApi';

const ResumeUpload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAtsPage = location.pathname === '/upload-resume';
  const [file, setFile] = useState(() => location.state?.selectedResumeFile || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [atsResult, setAtsResult] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [resumeAnalysis, setResumeAnalysis] = useState(null);
  const [discoveredRoles, setDiscoveredRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [roleRequirements, setRoleRequirements] = useState(null);
  const [requirementsLoading, setRequirementsLoading] = useState(false);

  const handleSelectedFile = (selectedFile) => {
    if (!selectedFile) return;
    if (isAtsPage) {
      const extension = selectedFile.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'doc', 'docx'].includes(extension)) {
        setFile(null);
        setAtsResult(null);
        setError('Choose a PDF, DOC, or DOCX resume.');
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        setFile(null);
        setAtsResult(null);
        setError('The resume must be 5 MB or smaller.');
        return;
      }
      setAtsResult(null);
      setResumeAnalysis(null);
      setResumeText('');
      setDiscoveredRoles([]);
      setSelectedRole('');
      setRoleRequirements(null);
    }
    setFile(selectedFile);
    setError('');
    setAnalysisResult(null);
  };

  const handleFileChange = (e) => {
    handleSelectedFile(e.target.files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleSelectedFile(e.dataTransfer.files[0]);
  };

  const formatFileSize = (size) => size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;
  const fileType = file?.type?.split('/').pop()?.toUpperCase() || file?.name?.split('.').pop()?.toUpperCase() || 'FILE';

  const handleViewResume = () => {
    if (!file) return;
    const fileUrl = URL.createObjectURL(file);
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a resume file');
      return;
    }

    setLoading(true);
    setError('');
    setProgress('Uploading resume...');

    try {
      setProgress('Analyzing resume with AI...');
      const response = await interviewAPI.analyzeResume(file, user?.email);
      const payload = response?.data ?? response ?? {};
      const normalizedResponse = payload?.success === false
        ? payload
        : {
            success: payload?.success ?? true,
            data: payload?.data ?? payload,
            message: payload?.message || 'Analysis complete',
          };

      console.log('Analysis response:', response);
      console.log('Normalized response:', normalizedResponse);

      const result = normalizedResponse.data ?? payload ?? {};
      const hasAnalysisData = !!result && (
        Array.isArray(result)
        || result.skills !== undefined
        || result.summary !== undefined
        || result.candidate_name !== undefined
        || result.projects !== undefined
        || result.education !== undefined
        || result.questions !== undefined
      );

      if (normalizedResponse.success !== false && hasAnalysisData) {
        setAnalysisResult(result);
        setProgress('Analysis complete!');

        const skills = Array.isArray(result)
          ? getResumeSkills({ skills: result })
          : getResumeSkills(result);
        const resumeData = {
          candidate_name: result.candidate_name || 'Candidate',
          candidate_email: result.candidate_email || '',
          skills,
          resume_skills: skills,
          technical_skills: skills,
          projects: result.projects || [],
          work_experience: result.experience || [],
          education: result.education || [],
          summary: result.summary || '',
          experience_level: result.experience_level || { seniority_level: 'Professional' }
        };

        sessionStorage.setItem('resumeData', JSON.stringify(resumeData));
        sessionStorage.setItem('resumeSkills', JSON.stringify(skills));

        if (result.questions && result.questions.length > 0) {
          sessionStorage.setItem('analysisQuestions', JSON.stringify(result.questions));
        }

        setProgress('Navigating to voice introduction...');

        setTimeout(() => {
          navigate('/intro', {
            state: {
              resumeData: resumeData,
              skills: skills,
              analysisResult: result
            }
          });
        }, 500);

      } else {
        const backendMessage = payload?.detail
          || payload?.message
          || normalizedResponse.message
          || (Array.isArray(payload) ? payload.map((item) => item?.msg || item?.error || JSON.stringify(item)).join(', ') : null)
          || 'Analysis failed';
        setError(backendMessage);
        setProgress('');
      }

    } catch (error) {
      console.error('Analysis error:', error);
      const backendData = error?.response?.data;
      const hasBackendMessage = Boolean(
        backendData?.detail
        || backendData?.message
        || backendData?.error
        || (Array.isArray(backendData) && backendData.length)
      );
      const detail = backendData?.detail
        || backendData?.message
        || backendData?.error
        || (Array.isArray(backendData) ? backendData.map((item) => item?.msg || item?.error || JSON.stringify(item)).join(', ') : null)
        || (error?.response?.status >= 500 && !hasBackendMessage
          ? `Resume analysis service returned HTTP ${error.response.status} without an error message. Confirm the FastAPI service is running at ${import.meta.env.VITE_RESUME_API_URL || 'http://127.0.0.1:8000'} and check its server logs.`
          : null)
        || error?.message
        || 'Failed to analyze resume';
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
      setProgress('');
    } finally {
      setLoading(false);
    }
  };

  const unwrapResponse = (response) => response?.data?.data ?? response?.data ?? response ?? {};

  const findResumeText = (value) => {
    if (!value || typeof value !== 'object') return '';
    const candidates = [
      value.resume_text, value.extracted_text, value.extractedText,
      value.text, value.full_text, value.fullText, value.content,
      value.data?.resume_text, value.data?.extracted_text,
      value.data?.text, value.result?.resume_text, value.result?.text,
      value.analysis?.resume_text, value.analysis?.text,
    ];
    const textValue = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim());
    if (textValue) return textValue.trim();
    for (const child of Object.values(value)) {
      if (child && typeof child === 'object') {
        const nested = findResumeText(child);
        if (nested) return nested;
      }
    }
    return '';
  };

  const normalizeRoles = (payload) => {
    const value = unwrapResponse({ data: payload });
    const candidates = [value.roles, value.recommended_roles, value.suggested_roles, value.discovered_roles, value.data?.roles, value.result?.roles];
    const roles = candidates.find(Array.isArray) || (Array.isArray(value) ? value : []);
    return roles.map((item) => {
      if (typeof item === 'string') return { name: item, description: '' };
      const name = item?.role || item?.title || item?.name || item?.job_title || item?.role_name;
      return name ? { ...item, name: String(name), description: item.description || item.reason || item.match_reason || '' } : null;
    }).filter(Boolean);
  };

  const handleAtsSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a resume file first.');
      return;
    }

    setLoading(true);
    setError('');
    setProgress('Analyzing resume with backend...');
    setDiscoveredRoles([]);
    setSelectedRole('');
    setRoleRequirements(null);
    setResumeText('');
    setResumeAnalysis(null);

    try {
      // Keep the existing local ATS score while the new backend workflow runs.
      const [localAtsResult, backendResponse] = await Promise.all([
        analyzeResumeFile(file).catch(() => null),
        analyzeResumeWithBackend(file),
      ]);
      const analysis = unwrapResponse(backendResponse);
      const extractedText = findResumeText(analysis);
      setResumeAnalysis(analysis);
      if (localAtsResult) setAtsResult(localAtsResult);
      if (!extractedText) {
        throw new Error('Resume analysis completed, but the response did not include extracted resume text. Please check that POST /resume/analyze returns resume_text (or extracted_text/text).');
      }
      setResumeText(extractedText);
      setProgress('Finding suitable roles from your resume...');
      const rolesResponse = await discoverRolesFromResume(extractedText);
      const rolesPayload = unwrapResponse(rolesResponse);
      const roles = normalizeRoles(rolesPayload);
      setDiscoveredRoles(roles);
      if (!roles.length) {
        setError('Resume was analyzed, but no roles were returned. Check the response from POST /roles/discover.');
      }
      setProgress('');
    } catch (analysisError) {
      const backendData = analysisError?.response?.data;
      const message = backendData?.detail || backendData?.message || backendData?.error || analysisError?.message || 'We could not analyze this resume. Please try again.';
      setError(typeof message === 'string' ? message : JSON.stringify(message));
      setProgress('');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = async (roleName) => {
    if (!roleName || !resumeText) return;
    setSelectedRole(roleName);
    setRequirementsLoading(true);
    setRoleRequirements(null);
    setError('');
    try {
      const response = await getRoleRequirements(roleName, resumeText);
      setRoleRequirements(unwrapResponse(response));
    } catch (requirementsError) {
      const backendData = requirementsError?.response?.data;
      const message = backendData?.detail || backendData?.message || backendData?.error || requirementsError?.message || 'Could not load role requirements.';
      setError(typeof message === 'string' ? message : JSON.stringify(message));
    } finally {
      setRequirementsLoading(false);
    }
  };

  const renderValueList = (value) => {
    if (Array.isArray(value)) {
      return value.map((item, index) => {
        const label = typeof item === 'string' ? item : item?.name || item?.skill || item?.concept || item?.title || item?.text || JSON.stringify(item);
        return <li key={`${label}-${index}`}>{label}</li>;
      });
    }
    if (typeof value === 'string' && value.trim()) return <li>{value}</li>;
    return null;
  };

  // Helper to safely render experience
  const renderExperience = (experience) => {
    if (!experience || !Array.isArray(experience)) return null;
    
    return experience.map((exp, index) => (
      <div key={index} className="experience-item" style={styles.experienceItem}>
        <p><strong>Role:</strong> {exp.role || exp.position || 'N/A'}</p>
        <p><strong>Company:</strong> {exp.company || 'N/A'}</p>
        <p><strong>Duration:</strong> {exp.duration || exp.years || 'N/A'}</p>
        {exp.responsibilities && (
          <p><strong>Responsibilities:</strong> {exp.responsibilities}</p>
        )}
      </div>
    ));
  };

  // Helper to safely render education
  const renderEducation = (education) => {
    if (!education || !Array.isArray(education)) return null;
    
    return education.map((edu, index) => (
      <div key={index} style={styles.educationItem}>
        <p><strong>Institution:</strong> {edu.institution || edu.school || 'N/A'}</p>
        <p><strong>Degree:</strong> {edu.degree || 'N/A'}</p>
        <p><strong>Field:</strong> {edu.field || edu.major || 'N/A'}</p>
        <p><strong>Year:</strong> {edu.year || edu.graduation_year || 'N/A'}</p>
      </div>
    ));
  };

  // Helper to safely render projects
  const renderProjects = (projects) => {
    if (!projects || !Array.isArray(projects)) return null;
    
    return projects.map((project, index) => (
      <div key={index} style={styles.projectItem}>
        <p><strong>Name:</strong> {project.name || 'N/A'}</p>
        <p><strong>Description:</strong> {project.description || 'N/A'}</p>
        {project.technologies && (
          <p><strong>Technologies:</strong> {project.technologies.join(', ')}</p>
        )}
      </div>
    ));
  };

  if (isAtsPage) {
    const atsFileType = file?.name?.split('.').pop()?.toUpperCase() || '';
    return (
      <div className="resume-page ats-page">
        <section className="resume-upload-card ats-card">
          <header className="ats-heading">
            <span>RESUME CHECK</span>
            <h1>Upload Your Resume</h1>
            <p>Upload your resume to analyze it, discover matching job roles, and view the skills required for a selected role.</p>
          </header>

          <form onSubmit={handleAtsSubmit}>
            <div
              className={`resume-drop-zone ${isDragging ? 'is-dragging' : ''}`}
              onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDragging(false); }}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="hidden"
                id="ats-resume-upload"
              />
              <label htmlFor="ats-resume-upload" className="resume-drop-label">
                <span className="resume-drop-icon"><FaCloudUploadAlt /></span>
                <span className="resume-drop-title">Drag &amp; drop your resume here</span>
                <span className="resume-drop-or">or</span>
                <span className="resume-choose-button"><FaPaperclip /> Browse / Choose File</span>
                <span className="resume-drop-formats">PDF, DOC, or DOCX. Maximum file size: 5 MB.</span>
              </label>
            </div>

            {file && (
              <div className="resume-selected-file ats-selected-file">
                <span className="resume-file-icon"><FaFileAlt /></span>
                <div className="ats-file-details">
                  <strong>{file.name}</strong>
                  <small>{(file.size / (1024 * 1024)).toFixed(2)} MB · {atsFileType}</small>
                </div>
                <button
                  type="button"
                  className="ats-remove-button"
                  onClick={() => {
                    setFile(null);
                    setAtsResult(null);
                    setResumeAnalysis(null);
                    setResumeText('');
                    setDiscoveredRoles([]);
                    setSelectedRole('');
                    setRoleRequirements(null);
                    setError('');
                    const input = document.getElementById('ats-resume-upload');
                    if (input) input.value = '';
                  }}
                >
                  Remove
                </button>
              </div>
            )}

            {error && <div className="ats-message ats-error" role="alert"><FaExclamationTriangle />{error}</div>}
            {loading && <div className="ats-message ats-progress" role="status">{progress || 'Analyzing Resume...'}</div>}

            <button type="submit" className="btn-primary ats-analyze-button" disabled={!file || loading}>
              {loading ? (progress || 'Analyzing Resume...') : 'Analyze Resume & Discover Roles'}
            </button>
          </form>

          {atsResult && (
            <section className="ats-result" aria-live="polite">
              <div className="ats-score-heading">YOUR ATS SCORE</div>
              <div className="ats-score-line">
                <strong>{atsResult.score}</strong>
                <span>/ 100</span>
                <span className="ats-interpretation">{atsResult.interpretation}</span>
              </div>
              <div
                className="ats-progress-track"
                role="progressbar"
                aria-label="ATS score"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={atsResult.score}
              >
                <span style={{ width: `${atsResult.score}%` }} />
              </div>
              <div className="ats-suggestions">
                <h2>How to improve your resume</h2>
                <ul>
                  {atsResult.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}
                </ul>
              </div>
              <button
                type="button"
                className="btn-primary ats-continue-button"
                onClick={() => navigate('/resume', { state: { selectedResumeFile: file } })}
              >
                Continue to Interview Resume Analysis <FaArrowRight />
              </button>
            </section>
          )}

          {resumeAnalysis && (
            <section className="ats-result" aria-live="polite" style={{ marginTop: 20 }}>
              <div className="ats-score-heading">RESUME ANALYSIS</div>
              <p style={{ color: '#5f4a40', marginTop: 8 }}>
                Resume analysis succeeded. {resumeText ? `Extracted ${resumeText.length.toLocaleString()} characters of resume text.` : 'Extracted resume text was not found.'}
              </p>
              {Array.isArray(resumeAnalysis.skills) && resumeAnalysis.skills.length > 0 && (
                <div className="ats-suggestions">
                  <h2>Skills detected in your resume</h2>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {resumeAnalysis.skills.map((skill, index) => <span key={`${skill}-${index}`} style={{ background: '#fff0e5', color: '#a94727', borderRadius: 20, padding: '5px 10px', fontSize: 13 }}>{typeof skill === 'string' ? skill : skill.name || skill.skill || JSON.stringify(skill)}</span>)}
                  </div>
                </div>
              )}
            </section>
          )}

          {discoveredRoles.length > 0 && (
            <section className="ats-result" aria-live="polite" style={{ marginTop: 20 }}>
              <div className="ats-score-heading">MATCHING ROLE SUGGESTIONS</div>
              <p style={{ color: '#5f4a40', marginTop: 8 }}>Choose a role to see its required skills, resume evidence, and concepts to learn.</p>
              <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                {discoveredRoles.map((role, index) => (
                  <button
                    key={`${role.name}-${index}`}
                    type="button"
                    onClick={() => handleRoleSelect(role.name)}
                    disabled={requirementsLoading}
                    aria-pressed={selectedRole === role.name}
                    style={{ textAlign: 'left', padding: 14, borderRadius: 10, border: selectedRole === role.name ? '2px solid #f4511e' : '1px solid #ead8ca', background: selectedRole === role.name ? '#fff3e9' : '#fffdf9', cursor: requirementsLoading ? 'wait' : 'pointer', color: '#3b2924' }}
                  >
                    <strong>{role.name}</strong>
                    {role.description && <span style={{ display: 'block', marginTop: 5, color: '#80685d', fontWeight: 400 }}>{role.description}</span>}
                  </button>
                ))}
              </div>
            </section>
          )}

          {requirementsLoading && <div className="ats-message ats-progress" role="status">Loading requirements for {selectedRole}...</div>}

          {roleRequirements && (
            <section className="ats-result" aria-live="polite" style={{ marginTop: 20 }}>
              <div className="ats-score-heading">ROLE REQUIREMENTS: {selectedRole}</div>
              {(() => {
                const requirementData = roleRequirements.requirements || roleRequirements.data?.requirements || roleRequirements.result?.requirements || roleRequirements;
                const skills = requirementData.required_skills || requirementData.skills || requirementData.technical_skills || requirementData.skill_requirements;
                const evidence = requirementData.resume_evidence || requirementData.evidence || requirementData.matching_evidence || requirementData.skills_evidence;
                const concepts = requirementData.concepts_to_learn || requirementData.concepts || requirementData.learning_topics || requirementData.knowledge_areas;
                const otherKeys = Object.keys(requirementData).filter((key) => !['required_skills','skills','technical_skills','skill_requirements','resume_evidence','evidence','matching_evidence','skills_evidence','concepts_to_learn','concepts','learning_topics','knowledge_areas','role','title','description'].includes(key));
                return <>
                  {requirementData.description && <p style={{ margin: '10px 0', color: '#5f4a40' }}>{requirementData.description}</p>}
                  {skills && <div className="ats-suggestions"><h2>Required skills</h2><ul>{renderValueList(skills)}</ul></div>}
                  {evidence && <div className="ats-suggestions"><h2>Evidence from your resume</h2><ul>{renderValueList(evidence)}</ul></div>}
                  {concepts && <div className="ats-suggestions"><h2>Concepts to learn</h2><ul>{renderValueList(concepts)}</ul></div>}
                  {otherKeys.map((key) => <div className="ats-suggestions" key={key}><h2>{key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}</h2>{Array.isArray(requirementData[key]) ? <ul>{renderValueList(requirementData[key])}</ul> : <p>{typeof requirementData[key] === 'object' ? JSON.stringify(requirementData[key], null, 2) : String(requirementData[key])}</p>}</div>)}
                  {!skills && !evidence && !concepts && otherKeys.length === 0 && <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(requirementData, null, 2)}</pre>}
                </>;
              })()}
            </section>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="resume-page">
      <section className="resume-hero">
        <div><span>PRACTICE MAKES PROGRESS</span><h1>Sharpen Your Skills, Build Confidence!</h1><p>Take practice sessions, improve your answers and get ready for real interviews.</p><button type="button" className="resume-hero-button" onClick={() => document.getElementById('resume-upload')?.click()}>Start Practice <FaArrowRight /></button></div>
      </section>

      <div className="resume-page-grid">
      <div className="resume-upload-container" style={styles.container}>
      <div className="resume-upload-card" style={styles.card}>
        <div className="resume-upload-header">
          <div><h2 style={styles.title}>Upload Your Resume</h2><p style={styles.subtitle}>Get personalized questions based on your resume and skills.</p></div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={`resume-drop-zone ${isDragging ? 'is-dragging' : ''}`} onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }} onDragOver={(e) => e.preventDefault()} onDragLeave={(e) => { if (e.currentTarget === e.target) setIsDragging(false); }} onDrop={handleDrop}>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              className="hidden"
              id="resume-upload"
            />
            <label htmlFor="resume-upload" className="resume-drop-label" style={styles.label}>
              <span className="resume-drop-icon"><FaFileAlt /></span>
              <p className="resume-drop-title">Drag &amp; drop your resume here</p>
              <p className="resume-drop-or">or</p>
              <span className="resume-choose-button"><FaPaperclip /> Choose File</span>
              <p className="resume-drop-formats">Supported formats: PDF, DOC, DOCX (Max 5MB)</p>
            </label>
          </div>

          {file && <div className="resume-selected-file"><span className="resume-file-icon"><FaFileAlt /></span><div><strong>Resume Uploaded <FaCheckCircle /></strong><p>{file.name}</p><small>{fileType} · {formatFileSize(file.size)}</small></div><button type="button" className="resume-view-button" onClick={handleViewResume}>View Resume <FaArrowRight /></button></div>}

          {error && (
            <div style={styles.errorBox}>
              <span style={styles.inlineIcon}><FaExclamationTriangle /></span>
              {error}
            </div>
          )}

          {progress && (
            <div style={styles.progressBox}>
              <span style={styles.inlineIcon}><FaChartLine /></span>
              {progress}
            </div>
          )}

          <button
            type="submit"
            disabled={!file || loading}
            style={{
              ...styles.button,
              ...((!file || loading) && styles.buttonDisabled)
            }}
          >
            {loading ? (
              <span style={styles.loadingText}>
                <span style={styles.spinner}></span>
                {progress || 'Analyzing...'}
              </span>
            ) : (
              <><FaFileAlt style={{ marginRight: 8 }} /> Analyze Resume</>
            )}
          </button>
        </form>

        {/* Display Analysis Results */}
        {analysisResult && (
          <div style={styles.results}>
            <h3 style={styles.resultsTitle}>📊 Analysis Results</h3>
            
            <div style={styles.section}>
              <h4><FaUser style={styles.headerIcon} /> Candidate Info</h4>
              <p><strong>Name:</strong> {analysisResult.candidate_name || 'N/A'}</p>
              <p><strong>Email:</strong> {analysisResult.candidate_email || 'N/A'}</p>
              <p><strong>Experience Level:</strong> {analysisResult.experience_level?.seniority_level || 'N/A'}</p>
            </div>

            {analysisResult.skills && analysisResult.skills.length > 0 && (
              <div style={styles.section}>
                <h4><FaLaptopCode style={styles.headerIcon} /> Skills ({analysisResult.skills.length})</h4>
                <div style={styles.skillContainer}>
                  {analysisResult.skills.map((skill, index) => (
                    <span key={index} style={styles.skillTag}>{skill}</span>
                  ))}
                </div>
              </div>
            )}

            {analysisResult.projects && analysisResult.projects.length > 0 && (
              <div style={styles.section}>
                <h4><FaFolderOpen style={styles.headerIcon} /> Projects ({analysisResult.projects.length})</h4>
                {renderProjects(analysisResult.projects)}
              </div>
            )}

            {analysisResult.experience && analysisResult.experience.length > 0 && (
              <div style={styles.section}>
                <h4><FaBriefcase style={styles.headerIcon} /> Experience</h4>
                {renderExperience(analysisResult.experience)}
              </div>
            )}

            {analysisResult.education && analysisResult.education.length > 0 && (
              <div style={styles.section}>
                <h4><FaGraduationCap style={styles.headerIcon} /> Education</h4>
                {renderEducation(analysisResult.education)}
              </div>
            )}

            {analysisResult.summary && (
              <div style={styles.section}>
                <h4><FaFileAlt style={styles.headerIcon} /> Summary</h4>
                <p>{analysisResult.summary}</p>
              </div>
            )}

            {analysisResult.questions && analysisResult.questions.length > 0 && (
              <div style={styles.section}>
                <h4><FaLightbulb style={styles.headerIcon} /> Sample Questions ({analysisResult.questions.length})</h4>
                <p style={{ fontSize: '14px', color: '#98786a', marginBottom: '8px' }}>
                  These questions will be used in your interview
                </p>
                <div style={styles.questionsList}>
                  {analysisResult.questions.slice(0, 4).map((q, index) => (
                    <div key={index} style={styles.questionItem}>
                      <span style={styles.questionNumber}>Q{index + 1}.</span>
                      <span><strong>{q.category || 'General'}:</strong> {q.question}</span>
                    </div>
                  ))}
                  {analysisResult.questions.length > 4 && (
                    <p style={{ fontSize: '13px', color: '#c46a3f', marginTop: '4px' }}>
                      + {analysisResult.questions.length - 4} more questions
                    </p>
                  )}
                </div>
              </div>
            )}

            <div style={{ 
              ...styles.section, 
              backgroundColor: '#fff0e5', 
              borderColor: '#f4511e',
              marginTop: '16px'
            }}>
              <p style={{ fontSize: '14px', color: '#a94727' }}>
                <FaMicrophone style={{ marginRight: 8, verticalAlign: 'middle' }} /> <strong>Next Step:</strong> You'll now be taken to record your voice introduction.
                This helps us generate personalized questions based on your experience.
              </p>
            </div>
          </div>
        )}
      </div>
      </div>

      <aside className="resume-side-panels">
        <section className="resume-side-card">
          <div className="resume-side-heading"><span className="resume-side-icon"><FaLightbulb /></span><div><h2>Quick Tips</h2><p>Make your resume work harder for you.</p></div></div>
          <ul><li><FaCheckCircle /> Keep your resume updated.</li><li><FaCheckCircle /> Use relevant keywords.</li><li><FaCheckCircle /> Highlight your key skills and projects.</li><li><FaCheckCircle /> Maintain a clean and professional format.</li></ul>
        </section>
        <section className="resume-side-card resume-progress-card">
          <div className="resume-side-heading"><span className="resume-side-icon"><FaChartLine /></span><div><h2>Track Your Progress</h2><p>View your practice history and improvement over time.</p></div></div>
          <button type="button" onClick={() => navigate('/report')}>Go to Reports <FaArrowRight /></button>
          <div className="resume-progress-graph" aria-label="Progress chart">
            <span className="resume-progress-bar" style={{ height: '38%' }} />
            <span className="resume-progress-bar" style={{ height: '52%' }} />
            <span className="resume-progress-bar" style={{ height: '68%' }} />
            <span className="resume-progress-bar" style={{ height: '82%' }} />
            <span className="resume-progress-bar" style={{ height: '96%' }} />
          </div>
          <div className="resume-progress-illustration"><FaChartLine /><span>◎</span></div>
        </section>
      </aside>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
  },
  card: {
    background: '#fffdf9',
    borderRadius: '13px',
    padding: '30px',
    boxShadow: '0 7px 18px rgba(91, 52, 37, 0.055)',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '8px',
    color: '#3b2924',
  },
  subtitle: {
    color: '#98786a',
    marginBottom: '24px',
    fontSize: '16px',
  },
  dropZone: {
    border: '2px dashed #e5cdbb',
    borderRadius: '12px',
    padding: '30px',
    textAlign: 'center',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    '&:hover': {
      borderColor: '#f4511e',
      backgroundColor: '#fff8ef',
    }
  },
  label: {
    cursor: 'pointer',
    display: 'block',
  },
  icon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  fileName: {
    color: '#3b2924',
    fontSize: '16px',
    fontWeight: '500',
  },
  fileHint: {
    color: '#b08a76',
    fontSize: '14px',
    marginTop: '8px',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '16px',
    padding: '12px 16px',
    backgroundColor: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
  },
  progressBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '16px',
    padding: '12px 16px',
    backgroundColor: '#fff0e5',
    border: '1px solid #f5c6a9',
    borderRadius: '8px',
    color: '#a94727',
  },
  inlineIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    marginTop: '16px',
    width: '100%',
    padding: '14px 24px',
    backgroundColor: '#f4511e',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: '#c43d19',
      transform: 'translateY(-1px)',
    }
  },
  buttonDisabled: {
    backgroundColor: '#d8aa8f',
    cursor: 'not-allowed',
    '&:hover': {
      backgroundColor: '#d8aa8f',
      transform: 'none',
    }
  },
  loadingText: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  spinner: {
    display: 'inline-block',
    width: '20px',
    height: '20px',
    border: '2px solid #ffffff',
    borderTop: '2px solid transparent',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  results: {
    marginTop: '24px',
    padding: '20px',
    backgroundColor: '#fff8ef',
    borderRadius: '12px',
    border: '1px solid #f0dfd2',
  },
  resultsTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#3b2924',
    marginBottom: '16px',
  },
  section: {
    marginBottom: '16px',
    padding: '14px',
    backgroundColor: '#fffdf9',
    borderRadius: '8px',
    border: '1px solid #f0dfd2',
  },
  headerIcon: {
    marginRight: '8px',
    verticalAlign: 'middle',
    color: '#f4511e',
    fontSize: '0.9rem',
  },
  skillContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '8px',
  },
  skillTag: {
    padding: '4px 14px',
    backgroundColor: '#fff0e5',
    color: '#a94727',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '500',
  },
  experienceItem: {
    padding: '8px 0',
    borderBottom: '1px solid #f8ebe2',
    '&:last-child': {
      borderBottom: 'none',
    }
  },
  educationItem: {
    padding: '8px 0',
    borderBottom: '1px solid #f8ebe2',
    '&:last-child': {
      borderBottom: 'none',
    }
  },
  projectItem: {
    padding: '8px 0',
    borderBottom: '1px solid #f8ebe2',
    '&:last-child': {
      borderBottom: 'none',
    }
  },
  questionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '8px',
  },
  questionItem: {
    padding: '8px 12px',
    backgroundColor: '#fff8ef',
    borderRadius: '6px',
    display: 'flex',
    gap: '8px',
    fontSize: '14px',
  },
  questionNumber: {
    fontWeight: '600',
    color: '#f4511e',
  },
};

// Add keyframe animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default ResumeUpload;