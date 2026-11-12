import './ResultsPage.css'

function makeQuestionKey(skillIndex, questionIndex) {
  return `${skillIndex}:${questionIndex}`
}

function getLevel(percent) {
  if (percent >= 80) return { label: 'Excellent', tone: 'excellent' }
  if (percent >= 60) return { label: 'Good', tone: 'good' }
  if (percent >= 40) return { label: 'Average', tone: 'average' }
  return { label: 'Needs improvement', tone: 'low' }
}

function round1(value) {
  return Number(value.toFixed(1))
}

export default function ResultsPage({
  role,
  skills,
  report,
  questionsPerSkill,
  loading,
  onRestart,
  onBack
}) {
  // Skipped / not answered questions count as 0 marks.
  const skillScores = skills.map((item, skillIndex) => {
    let score = 0
    let answered = 0

    for (let q = 0; q < questionsPerSkill; q += 1) {
      const entry = report[makeQuestionKey(skillIndex, q)]

      if (entry?.status === 'Answered') {
        answered += 1
        if (typeof entry.marks === 'number' && Number.isFinite(entry.marks)) {
          score += entry.marks
        }
      }
    }

    const maxScore = questionsPerSkill * 10
    const percent = maxScore ? (score / maxScore) * 100 : 0

    return {
      skill: item.skill,
      score,
      maxScore,
      percent,
      answered,
      skipped: questionsPerSkill - answered
    }
  })

  const totalScore = skillScores.reduce((sum, s) => sum + s.score, 0)
  const totalMax = skillScores.reduce((sum, s) => sum + s.maxScore, 0)
  const totalAnswered = skillScores.reduce((sum, s) => sum + s.answered, 0)
  const totalSkipped = skillScores.reduce((sum, s) => sum + s.skipped, 0)
  const overallPercent = totalMax ? (totalScore / totalMax) * 100 : 0
  const overallLevel = getLevel(overallPercent)

  return (
    <main className="results-page">
      <header className="results-header">
        <span className="results-eyebrow">INTERVIEW RESULTS</span>
        <h1>{role || 'Interview'} — Final Result</h1>
        <p>Interview completed. Here is how you performed.</p>
      </header>

      <section className="results-overall">
        <div className={`results-score-circle tone-${overallLevel.tone}`}>
          <strong>{round1(overallPercent)}%</strong>
          <span>Overall</span>
        </div>

        <div className="results-overall-details">
          <h2>
            {round1(totalScore)} <small>/ {totalMax} marks</small>
          </h2>
          <span className={`results-badge tone-${overallLevel.tone}`}>
            {overallLevel.label}
          </span>
          <p>
            Answered: <strong>{totalAnswered}</strong> · Skipped:{' '}
            <strong>{totalSkipped}</strong> · Total questions:{' '}
            <strong>{totalAnswered + totalSkipped}</strong>
          </p>
        </div>
      </section>

      <section className="results-skills">
        <h2>Skill-wise score</h2>

        {skillScores.map((item) => {
          const level = getLevel(item.percent)

          return (
            <div className="results-skill-card" key={item.skill}>
              <div className="results-skill-top">
                <h3>{item.skill}</h3>
                <span className="results-skill-marks">
                  {round1(item.score)} / {item.maxScore}
                </span>
              </div>

              <div className="results-bar">
                <div
                  className={`results-bar-fill tone-${level.tone}`}
                  style={{ width: `${Math.min(100, item.percent)}%` }}
                />
              </div>

              <div className="results-skill-bottom">
                <span>{round1(item.percent)}% · {level.label}</span>
                <span>
                  Answered {item.answered} · Skipped {item.skipped}
                </span>
              </div>
            </div>
          )
        })}
      </section>

      <div className="results-actions">
        <button className="primary-button" onClick={onRestart} disabled={loading}>
          {loading ? 'Generating questions…' : 'Restart interview'}
        </button>
        <button className="secondary-button" onClick={onBack} disabled={loading}>
          Back to workspace
        </button>
      </div>
    </main>
  )
}