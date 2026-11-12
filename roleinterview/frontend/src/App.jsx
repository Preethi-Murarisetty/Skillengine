import { useState } from 'react'
import './App.css'
import ResultsPage from './ResultsPage'

const API_BASE = 'http://127.0.0.1:8000'
const QUESTIONS_PER_SKILL = 10
const DIFFICULTY = 'Medium'

async function apiRequest(path, options = {}) {
  let response

  try {
    response = await fetch(`${API_BASE}${path}`, options)
  } catch (err) {
    throw new Error(
      `Backend connect avvatledu. FastAPI server run avutundo check cheyyandi. ${err?.message || ''}`
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const detail = data.detail || data.message || data
    throw new Error(
      typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2)
    )
  }

  return data
}

function jsonPost(body) {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }
}

function findRoleName(role, index) {
  if (typeof role === 'string') return role

  return (
    role?.title ||
    role?.role ||
    role?.job_role ||
    role?.name ||
    `Role ${index + 1}`
  )
}

function getSource(requirements) {
  return requirements?.requirements ?? requirements ?? {}
}

function getSkillName(item) {
  if (typeof item === 'string') return item.trim()

  return String(
    item?.skill ||
      item?.skill_name ||
      item?.skill_area ||
      item?.name ||
      item?.title ||
      ''
  ).trim()
}

function requirementSkills(requirements) {
  const source = getSource(requirements)
  const skills = Array.isArray(source.common_skills)
    ? source.common_skills
    : []

  const seen = new Set()

  return skills
    .map((item) => ({ skill: getSkillName(item) }))
    .filter(({ skill }) => {
      const key = skill.toLowerCase()
      if (!skill || seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function makeQuestionKey(skillIndex, questionIndex) {
  return `${skillIndex}:${questionIndex}`
}

function makeInitialReport(skills) {
  const report = {}

  skills.forEach((item, skillIndex) => {
    for (let questionIndex = 0; questionIndex < QUESTIONS_PER_SKILL; questionIndex += 1) {
      report[makeQuestionKey(skillIndex, questionIndex)] = {
        skill: item.skill,
        questionNumber: questionIndex + 1,
        difficulty: DIFFICULTY,
        question: '',
        answer: '',
        marks: null,
        feedback: null,
        status: 'Not reached',
        error: ''
      }
    }
  })

  return report
}

function RequirementList({ requirements }) {
  const data = getSource(requirements)

  const groups = [
    ['Role-required skills', data.role_required_skills],
    ['Skills supported by your resume', data.common_skills],
    ['Skills not found in your resume', data.missing_role_skills],
    ['Additional resume skills', data.resume_only_skills],
    ['Skill details', data.skill_areas]
  ]

  return (
    <div className="requirements-view">
      <div className="requirements-title">
        <span className="requirements-label">SELECTED ROLE</span>
        <h3>{data.role || 'Selected role'}</h3>
      </div>

      {groups.map(([title, values]) => {
        if (!Array.isArray(values) || !values.length) return null

        return (
          <section className="requirement-group" key={title}>
            <h4>{title}</h4>

            <div className="requirement-skills">
              {values.map((value, index) => {
                const label =
                  typeof value === 'string'
                    ? value
                    : value?.skill ||
                      value?.name ||
                      value?.title ||
                      value?.concept ||
                      JSON.stringify(value)

                return (
                  <span className="requirement-chip" key={`${label}-${index}`}>
                    {label}
                  </span>
                )
              })}
            </div>
          </section>
        )
      })}

      {data.note && <p className="requirements-note">{data.note}</p>}
    </div>
  )
}

export default function App() {
  const [file, setFile] = useState(null)
  const [resumeData, setResumeData] = useState(null)
  const [roles, setRoles] = useState([])
  const [roleCache, setRoleCache] = useState({})
  const [selectedRole, setSelectedRole] = useState('')
  const [requirements, setRequirements] = useState(null)

  const [interviewSkills, setInterviewSkills] = useState([])
  const [questionPlan, setQuestionPlan] = useState([])
  const [report, setReport] = useState({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [interviewFinished, setInterviewFinished] = useState(false)

  const [answer, setAnswer] = useState('')
  const [evaluation, setEvaluation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('Upload your resume to get started.')

  const resumeText =
    resumeData?.extracted_text ||
    resumeData?.resume_text ||
    resumeData?.text ||
    ''

  const currentQuestion = questionPlan[currentIndex]

  async function runAction(task) {
    setLoading(true)
    setError('')

    try {
      await task()
    } catch (err) {
      setError(err?.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  function resetInterview() {
    setInterviewSkills([])
    setQuestionPlan([])
    setReport({})
    setCurrentIndex(0)
    setInterviewFinished(false)
    setAnswer('')
    setEvaluation(null)
  }

  function updateCurrentReport(changes) {
    if (!currentQuestion) return

    const key = makeQuestionKey(
      currentQuestion.skillIndex,
      currentQuestion.questionIndex
    )

    setReport((previous) => ({
      ...previous,
      [key]: {
        ...previous[key],
        ...changes
      }
    }))
  }

  function setQuestionAsShown(question) {
    const key = makeQuestionKey(question.skillIndex, question.questionIndex)

    setReport((previous) => ({
      ...previous,
      [key]: {
        ...previous[key],
        question: question.question,
        status:
          previous[key]?.status === 'Answered' ||
          previous[key]?.status === 'Skipped'
            ? previous[key].status
            : 'Not answered'
      }
    }))
  }

  function goToQuestion(nextIndex, plan = questionPlan) {
    if (nextIndex >= plan.length) {
      setCurrentIndex(plan.length)
      setInterviewFinished(true)
      setAnswer('')
      setEvaluation(null)
      setStatus('Interview completed!')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setCurrentIndex(nextIndex)
    setAnswer('')
    setEvaluation(null)
    setError('')
    setQuestionAsShown(plan[nextIndex])
    setStatus(
      `Question ${nextIndex + 1} of ${plan.length} — ${plan[nextIndex].skill}`
    )
  }

  // Leave the results page and return to the main workspace.
  function backToWorkspace() {
    resetInterview()
    setError('')
    setStatus('Interview closed. You can start a new interview.')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function uploadResume() {
    if (!file) {
      setError('Please select a PDF or DOCX resume first.')
      return
    }

    await runAction(async () => {
      const form = new FormData()
      form.append('file', file)

      const data = await apiRequest('/resume/analyze', {
        method: 'POST',
        body: form
      })

      setResumeData(data)
      setRoles([])
      setRoleCache({})
      setSelectedRole('')
      setRequirements(null)
      resetInterview()
      setStatus('Resume analyzed. Next, discover suitable roles.')
    })
  }

  async function discoverRoles() {
    if (!resumeText || resumeText.trim().length < 20) {
      setError('Please analyze your resume first and check the extracted text.')
      return
    }

    const key = resumeText.replace(/\r\n/g, '\n').trim()

    if (Array.isArray(roleCache[key]) && roleCache[key].length) {
      setRoles(roleCache[key])
      setSelectedRole('')
      setRequirements(null)
      resetInterview()
      setError('')
      setStatus(`${roleCache[key].length} saved role(s) reused. Select a role below.`)
      return
    }

    await runAction(async () => {
      const data = await apiRequest('/roles/discover', {
        method: 'POST',
        ...jsonPost({ resume_text: resumeText })
      })

      const found = Array.isArray(data.roles) ? data.roles : []
      setRoles(found)

      if (found.length) {
        setRoleCache((previous) => ({ ...previous, [key]: found }))
      }

      setSelectedRole('')
      setRequirements(null)
      resetInterview()
      setStatus(found.length ? `${found.length} suitable role(s) discovered.` : 'The API returned no roles.')
    })
  }

  async function loadRequirements() {
    if (!selectedRole) {
      setError('Please select a role first.')
      return
    }

    if (!resumeText || resumeText.length < 20) {
      setError('Resume text is missing. Please upload your resume again.')
      return
    }

    await runAction(async () => {
      const data = await apiRequest('/roles/requirements', {
        method: 'POST',
        ...jsonPost({
          role: selectedRole,
          resume_text: resumeText
        })
      })

      setRequirements(data)
      resetInterview()
      setStatus('Role requirements generated successfully.')
    })
  }

  async function generateQuestions() {
    if (!selectedRole) {
      setError('Please select a role first.')
      return
    }

    if (!requirements) {
      setError('Generate role requirements before starting the interview.')
      return
    }

    const skills = requirementSkills(requirements)

    if (!skills.length) {
      setError('No supported skills found in requirements.common_skills.')
      return
    }

    await runAction(async () => {
      resetInterview()
      setStatus(`Generating 10 Medium questions for each of ${skills.length} supported skill(s)...`)

      const newPlan = []
      const newSkills = skills.map((item) => ({ skill: item.skill }))

      for (let skillIndex = 0; skillIndex < newSkills.length; skillIndex += 1) {
        const skill = newSkills[skillIndex].skill

        const data = await apiRequest('/interview/concept-questions', {
          method: 'POST',
          ...jsonPost({
            role: selectedRole,
            skill,
            concept: skill
          })
        })

        const received = Array.isArray(data.questions) ? data.questions : []

        if (received.length !== QUESTIONS_PER_SKILL) {
          throw new Error(
            `${skill}: expected exactly 10 questions, received ${received.length}.`
          )
        }

        received.forEach((item, questionIndex) => {
          if (!item?.question || !String(item.question).trim()) {
            throw new Error(`${skill}: question ${questionIndex + 1} is empty.`)
          }

          newPlan.push({
            skillIndex,
            questionIndex,
            skill,
            concept: skill,
            difficulty: DIFFICULTY,
            question: String(item.question).trim()
          })
        })
      }

      const initialReport = makeInitialReport(newSkills)

      setInterviewSkills(newSkills)
      setQuestionPlan(newPlan)
      setReport(initialReport)
      setCurrentIndex(0)
      setInterviewFinished(false)
      setAnswer('')
      setEvaluation(null)

      if (newPlan.length) {
        setQuestionAsShown(newPlan[0])
        setStatus(`Interview ready. ${newPlan.length} Medium-level questions generated.`)
      } else {
        setStatus('No questions were generated.')
      }
    })
  }

  async function evaluateAnswer() {
    if (!currentQuestion) {
      setError('Generate interview questions first.')
      return
    }

    if (!answer.trim()) {
      setError('Please enter your answer first.')
      return
    }

    await runAction(async () => {
      const submittedAnswer = answer

      const data = await apiRequest('/interview/evaluate', {
        method: 'POST',
        ...jsonPost({
          role: selectedRole,
          skill: String(currentQuestion.skill).slice(0, 150),
          concept: String(currentQuestion.concept).slice(0, 200),
          difficulty: DIFFICULTY,
          question: currentQuestion.question.slice(0, 2000),
          answer: submittedAnswer.slice(0, 10000)
        })
      })

      const result = data.evaluation ?? data
      const rawMarks = Number(result.marks_awarded)
      const marks = Number.isFinite(rawMarks)
        ? Math.max(0, Math.min(10, rawMarks))
        : null

      setEvaluation(result)

      updateCurrentReport({
        status: 'Answered',
        question: currentQuestion.question,
        answer: submittedAnswer,
        marks,
        feedback: result
      })

      setStatus(
        `Answer evaluated: ${marks ?? 'N/A'}/10. Score will not change the question order.`
      )
    })
  }

  function continueInterview() {
    if (!currentQuestion || !evaluation || loading) {
      setError('Evaluate your answer before continuing, or skip this question.')
      return
    }

    // Fixed progression: score and relevance never change the next question.
    goToQuestion(currentIndex + 1)
  }

  function skipQuestion() {
    if (!currentQuestion || loading) return

    updateCurrentReport({
      status: 'Skipped',
      question: currentQuestion.question,
      answer: '',
      marks: null,
      feedback: null
    })

    goToQuestion(currentIndex + 1)
  }

  // End the interview early. Remaining questions count as 0 marks.
  function endInterview() {
    if (!currentQuestion || loading) return

    const confirmed = window.confirm(
      'End the interview now? Remaining questions will count as 0 marks.'
    )
    if (!confirmed) return

    setInterviewFinished(true)
    setAnswer('')
    setEvaluation(null)
    setError('')
    setStatus('Interview ended.')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const currentSkillQuestionNumber = currentQuestion
    ? currentQuestion.questionIndex + 1
    : 0

  const completedQuestionCount = currentIndex

  // ---- Results page: shown automatically when the interview is finished ----
  if (interviewFinished && questionPlan.length > 0) {
    return (
      <ResultsPage
        role={selectedRole}
        skills={interviewSkills}
        report={report}
        questionsPerSkill={QUESTIONS_PER_SKILL}
        loading={loading}
        onRestart={generateQuestions}
        onBack={backToWorkspace}
      />
    )
  }

  return (
    <main className="app-shell" id="home">
      <header className="topbar">
        <a className="brand" href="#home">
          <span className="brand-mark">RI</span>
          <span>Role<span className="brand-light">Interview</span></span>
        </a>
        <span className="api-status">
          <span className="status-dot" />
          Interview workspace
        </span>
      </header>

      <section className="hero-section">
        <div className="hero-copy">
          <span className="eyebrow">YOUR CAREER, YOUR NEXT STEP</span>
          <h1>Turn your resume into your next <span>opportunity.</span></h1>
          <p>
            Discover roles that match your skills, understand role requirements,
            and practise interview questions with answer feedback.
          </p>
        </div>

        <div className="hero-card">
          <div className="hero-card-icon">✦</div>
          <p className="hero-card-label">YOUR WORKFLOW</p>
          <div className="workflow-item"><span>01</span> Upload resume</div>
          <div className="workflow-item"><span>02</span> Discover roles</div>
          <div className="workflow-item"><span>03</span> Practise interview</div>
        </div>
      </section>

      <section className="progress-strip">
        {['Resume', 'Roles', 'Requirements', 'Interview'].map((step, index) => (
          <div className="progress-step" key={step}>
            <span className="progress-number">0{index + 1}</span>
            <span>{step}</span>
          </div>
        ))}
      </section>

      <section className="workspace">
        <div className="section-heading">
          <div>
            <span className="eyebrow">INTERVIEW WORKSPACE</span>
            <h2>Build your interview plan</h2>
          </div>
          <span className="workspace-tag">PDF · DOCX</span>
        </div>

        <div className="workspace-grid">
          <article className="panel">
            <div className="panel-heading">
              <span className="panel-icon">↑</span>
              <div><h3>01. Upload resume</h3><p>Start with your existing resume.</p></div>
            </div>

            <label className="upload-area">
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={(event) => {
                  setFile(event.target.files?.[0] || null)
                  setError('')
                }}
              />
              <span className="upload-symbol">↥</span>
              <strong>{file ? file.name : 'Choose your resume'}</strong>
              <span>{file ? `${(file.size / 1024).toFixed(0)} KB` : 'PDF or DOCX · Max 5 MB'}</span>
            </label>

            <button className="primary-button" onClick={uploadResume} disabled={loading || !file}>
              {loading ? 'Please wait…' : 'Analyze resume'}
            </button>

            {resumeData && (
              <div className="success-note">
                Resume text extracted. {resumeData.text_length != null && `${resumeData.text_length} characters found.`}
              </div>
            )}
          </article>

          <article className="panel">
            <div className="panel-heading">
              <span className="panel-icon">⌕</span>
              <div><h3>02. Discover roles</h3><p>Find roles based on your resume.</p></div>
            </div>

            <div className="panel-spacer" />

            <button className="secondary-button" onClick={discoverRoles} disabled={loading || !resumeData}>
              Discover suitable roles
            </button>

            {roles.length > 0 && (
              <div className="field-group">
                <label htmlFor="role-select">Select a role</label>
                <select
                  id="role-select"
                  value={selectedRole}
                  onChange={(event) => {
                    setSelectedRole(event.target.value)
                    setRequirements(null)
                    resetInterview()
                  }}
                >
                  <option value="">Choose a role…</option>
                  {roles.map((role, index) => {
                    const name = findRoleName(role, index)
                    return <option key={`${name}-${index}`} value={name}>{name}</option>
                  })}
                </select>

                <button className="secondary-button" onClick={loadRequirements} disabled={loading || !selectedRole}>
                  Generate role requirements
                </button>
              </div>
            )}

            {roles.length > 0 && <p className="helper-text">{roles.length} role(s) returned by the API.</p>}
          </article>

          <article className="panel panel-wide">
            <div className="panel-heading">
              <span className="panel-icon">✓</span>
              <div><h3>03. Role requirements</h3><p>Review the skills and expectations for your selected role.</p></div>
            </div>
            {requirements ? (
              <RequirementList requirements={requirements} />
            ) : (
              <p className="empty-state">Choose a role and generate its requirements to see them here.</p>
            )}
          </article>

          <article className="panel panel-wide">
            <div className="panel-heading">
              <span className="panel-icon">✦</span>
              <div><h3>04. Interview practice</h3><p>Generate questions and evaluate your own answers.</p></div>
            </div>

            <button className="primary-button question-generate" onClick={generateQuestions} disabled={loading || !selectedRole || !requirements}>
              {loading ? 'Generating questions…' : 'Start interview'}
            </button>

            {interviewSkills.length > 0 && (
              <div className="interview-area">
                <div className="interview-role-header">
                  <span className="interview-role-label">YOUR INTERVIEW ROLE</span>
                  <h2>{selectedRole || 'Selected Role'}</h2>
                  <p>Interview Practice Workspace</p>
                </div>

                {currentQuestion ? (
                  <>
                    <div className="interview-summary-strip">
                      <span>Progress: <strong>{completedQuestionCount} / {questionPlan.length}</strong></span>
                      <span>Skills: <strong>{interviewSkills.length}</strong></span>
                      <span>Questions per skill: <strong>{QUESTIONS_PER_SKILL}</strong></span>
                    </div>

                    <div className="interview-layout">
                      <aside className="interview-sidebar">
                        <div className="interview-sidebar-heading">INTERVIEW DETAILS</div>

                        <div className="interview-info-card">
                          <span className="interview-info-label">ROLE</span>
                          <h3>{selectedRole}</h3>
                        </div>

                        <div className="interview-info-card">
                          <span className="interview-info-label">SKILL</span>
                          <h3>{currentQuestion.skill}</h3>
                        </div>

                        <div className="interview-info-card">
                          <span className="interview-info-label">QUESTION</span>
                          <h3>{currentSkillQuestionNumber} of {QUESTIONS_PER_SKILL}</h3>
                        </div>

                        <div className="interview-info-card">
                          <span className="interview-info-label">DIFFICULTY</span>
                          <span className="interview-difficulty difficulty-medium">{DIFFICULTY}</span>
                        </div>

                        <div className="interview-info-card">
                          <span className="interview-info-label">OVERALL PROGRESS</span>
                          <h3>{currentIndex + 1} of {questionPlan.length}</h3>
                          <p>Current skill: {currentQuestion.skillIndex + 1} of {interviewSkills.length}</p>
                        </div>
                      </aside>

                      <section className="interview-question-panel">
                        <div className="question-panel-top">
                          <span className="question-section-label">INTERVIEW QUESTION</span>
                          <span className="question-number-badge">{DIFFICULTY}</span>
                        </div>

                        <h3 className="main-interview-question">{currentQuestion.question}</h3>
                        <div className="question-divider" />

                        <label className="answer-label" htmlFor="candidate-answer">Your answer</label>
                        <textarea
                          id="candidate-answer"
                          className="interview-answer-input"
                          value={answer}
                          onChange={(event) => setAnswer(event.target.value)}
                          placeholder="Write your answer here. Explain your approach and include examples when appropriate..."
                          rows={8}
                          disabled={loading || !!evaluation}
                        />

                        <div className="interview-answer-hint">
                          Tip: Explain the concept clearly and include an example when appropriate.
                        </div>

                        <div className="action-row interview-actions">
                          <button className="primary-button" onClick={evaluateAnswer} disabled={loading || !answer.trim() || !!evaluation}>
                            {loading ? 'Evaluating…' : 'Evaluate answer'}
                          </button>
                          <button className="secondary-button next-button" onClick={continueInterview} disabled={loading || !evaluation}>
                            {currentIndex + 1 >= questionPlan.length ? 'Finish & view results →' : 'Continue →'}
                          </button>
                          <button className="secondary-button" onClick={skipQuestion} disabled={loading}>
                            Skip question
                          </button>
                          <button className="secondary-button end-button" onClick={endInterview} disabled={loading}>
                            End interview
                          </button>
                        </div>

                        {evaluation && (
                          <div className="evaluation-result interview-feedback">
                            <h4>Answer feedback</h4>
                            <div className="feedback-score">
                              <span>Marks awarded</span>
                              <strong>{evaluation.marks_awarded ?? 'N/A'}/10</strong>
                            </div>
                            <pre className="result-block">{JSON.stringify(evaluation, null, 2)}</pre>
                            <p className="feedback-next-hint">Review your feedback, then click Continue to proceed.</p>
                          </div>
                        )}
                      </section>
                    </div>
                  </>
                ) : (
                  <div className="interview-finished-card">
                    <h3>Preparing your questions…</h3>
                    <p>Your first interview question will appear here.</p>
                  </div>
                )}
              </div>
            )}
          </article>
        </div>

        {error && <div className="alert-error" role="alert">{error}</div>}
        <div className="status-message" role="status">{status}</div>
      </section>

      <footer className="footer">
        <span>RoleInterview</span>
        <span>Resume analysis · Role discovery · Interview practice</span>
      </footer>
    </main>
  )
}