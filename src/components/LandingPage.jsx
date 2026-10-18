import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileSearch,
  Menu,
  Mic2,
  Sparkles,
  Target,
  UserRoundPlus,
  X,
} from 'lucide-react';
import './LandingPage.css';

const journey = [
  {
    number: '01',
    icon: UserRoundPlus,
    title: 'Create your account',
    description: 'Register once, verify your email, and set up your SkillEngine profile.',
  },
  {
    number: '02',
    icon: FileSearch,
    title: 'Upload your resume',
    description: 'Review your experience and check resume compatibility where available.',
  },
  {
    number: '03',
    icon: ClipboardCheck,
    title: 'Assess your skills',
    description: 'Use technical assessments and quizzes to find what you know and what to practise.',
  },
  {
    number: '04',
    icon: Mic2,
    title: 'Practise interviews',
    description: 'Work through AI-powered technical questions in a voice-based interview flow.',
  },
  {
    number: '05',
    icon: BarChart3,
    title: 'Review your progress',
    description: 'Explore available scores, interview reports, and areas to strengthen next.',
  },
];

const features = [
  {
    icon: BrainCircuit,
    tone: 'coral',
    title: 'AI-powered mock interviews',
    description: 'Practise technical questions in a guided interview session built around your chosen topic.',
  },
  {
    icon: FileSearch,
    tone: 'gold',
    title: 'Resume analysis and ATS score',
    description: 'Review resume content and compatibility using the analysis tools available in SkillEngine.',
  },
  {
    icon: BookOpenCheck,
    tone: 'green',
    title: 'Technical assessments and quizzes',
    description: 'Check your knowledge with topic-focused quizzes and assessment experiences.',
  },
  {
    icon: BarChart3,
    tone: 'blue',
    title: 'Performance reports',
    description: 'Review interview feedback, scores, and assessment results provided by the platform.',
  },
  {
    icon: Target,
    tone: 'plum',
    title: 'Skill evaluation and practice',
    description: 'Move between structured evaluations and focused practice for the skills you are developing.',
  },
  {
    icon: Sparkles,
    tone: 'orange',
    title: 'Personal learning direction',
    description: 'Use your goals and review results to choose a practical next step in your preparation.',
  },
];

const LandingPage = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const targets = document.querySelectorAll('[data-reveal]');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach((target) => target.classList.add('is-visible'));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="skill-landing">
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <a className="landing-brand" href="#top" aria-label="SkillEngine home" onClick={closeMenu}>
            <span className="landing-brand-mark">S</span>
            <span>Skill<span>Engine</span></span>
          </a>

          <button
            className="landing-menu-toggle"
            type="button"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>

          <nav className={`landing-nav-links${menuOpen ? ' is-open' : ''}`} aria-label="Main navigation">
            <a href="#how-it-works" onClick={closeMenu}>How it works</a>
            <a href="#features" onClick={closeMenu}>Features</a>
            <Link id="landing-login" className="landing-login-link" to="/login" onClick={closeMenu}>Login</Link>
            <Link className="landing-register-button" to="/register" onClick={closeMenu}>
              <span>Register</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="landing-hero" id="top">
          <div className="landing-hero-grid">
            <div className="landing-hero-copy" data-reveal>
              <p className="landing-eyebrow"><span /> Career preparation, made practical</p>
              <h1>Prepare Smarter.<br /><em>Perform Better.</em><br />Get Interview Ready.</h1>
              <p className="landing-hero-description">
                SkillEngine helps you assess your skills, practise technical interviews,
                analyse your resume, and track your performance in one place.
              </p>
              <div className="landing-hero-actions">
                <Link className="landing-primary-cta" to="/register">
                  Get Started <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <a className="landing-secondary-cta" href="#features">
                  Explore Features <ArrowDown size={16} aria-hidden="true" />
                </a>
              </div>
              <div className="landing-hero-footnote">
                <span className="landing-check-icon"><Check size={13} /></span>
                Create an account to start building your practice routine
              </div>
            </div>

            
<div
  className="landing-visual landing-features-visual"
  aria-label="SkillEngine features: AI interviews, coding assessments, resume review, structured learning, performance analytics, and job readiness"
  data-reveal
>
  {/* Decorative background */}
  <div className="landing-features-glow" />

  {/* SkillEngine branding */}
  <div className="landing-features-brand">
    <span className="landing-features-brand-mark">S</span>
    <div>
      <strong>
        Skill<span>Engine</span>
      </strong>
      <small>Learn · Practice · Grow</small>
    </div>
  </div>

  {/* Feature-focused illustration */}
  <div className="landing-features-image">
    <img
      src="/images/skillengine-features.png"
      alt="Explore SkillEngine features including AI-powered interviews, coding assessments, resume review, structured learning paths, performance analytics, and job readiness"
      loading="eager"
    />
  </div>

  {/* Supporting message */}
  <div className="landing-features-caption">
    <span className="landing-features-caption-icon">
      <Sparkles size={18} />
    </span>
    <div>
      <strong>One platform. Endless possibilities.</strong>
      <p>
        Learn new skills, practice with AI, track your progress,
        and prepare for your dream career.
      </p>
    </div>
  </div>
</div>
          </div>
          <a className="landing-scroll-cue" href="#how-it-works" aria-label="Scroll to how it works"><span /> Scroll to explore</a>
        </section>

        <section className="landing-process section-wrap" id="how-it-works">
          <div className="landing-section-heading" data-reveal>
            <p className="landing-eyebrow"><span /> Your preparation, in five steps</p>
            <h2>A clear path from <em>ready</em> to confident.</h2>
            <p>Bring your goals. SkillEngine gives you practical ways to assess, practise, and review.</p>
          </div>
          <div className="landing-journey">
            {journey.map(({ number, icon: Icon, title, description }, index) => (
              <article className="landing-journey-step" data-reveal key={number} style={{ '--reveal-delay': `${index * 90}ms` }}>
                <div className="landing-journey-marker"><span>{number}</span><i><Icon size={19} /></i></div>
                <div className="landing-journey-copy">
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-features" id="features">
          <div className="section-wrap">
            <div className="landing-section-heading landing-features-heading" data-reveal>
              <p className="landing-eyebrow"><span /> Tools for the next step</p>
              <h2>Everything you need to <em>move forward.</em></h2>
              <p>One place to explore your skills, practise the conversation, and learn from the result.</p>
            </div>
            <div className="landing-feature-grid">
              {features.map(({ icon: Icon, tone, title, description }, index) => (
                <article className="landing-feature-card" data-reveal key={title} style={{ '--reveal-delay': `${(index % 3) * 75}ms` }}>
                  <span className={`landing-feature-icon tone-${tone}`}><Icon size={21} strokeWidth={1.8} /></span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <span className="landing-feature-arrow" aria-hidden="true"><ArrowRight size={17} /></span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-get-started" id="get-started">
          <div className="landing-cta-inner" data-reveal>
            <div className="landing-cta-spark landing-cta-spark-one"><Sparkles size={21} /></div>
            <div className="landing-cta-spark landing-cta-spark-two"><Check size={17} /></div>
            <div className="landing-cta-copy">
              <p className="landing-eyebrow"><span /> Your next step starts here</p>
              <h2>Make preparation<br />part of your <em>progress.</em></h2>
              <p>New to SkillEngine? Register to create your account. Already have one? Log in and continue.</p>
            </div>
            <div className="landing-cta-actions">
              <Link className="landing-primary-cta landing-cta-register" to="/register">
                <UserRoundPlus size={18} /> Register Now <ArrowRight size={17} />
              </Link>
              <Link className="landing-cta-login" to="/login">I already have an account <ArrowRight size={15} /></Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-main">
          <div className="landing-footer-brand">
            <a className="landing-brand" href="#top" aria-label="SkillEngine home">
              <span className="landing-brand-mark">S</span>
              <span>Skill<span>Engine</span></span>
            </a>
            <p>Practical tools to assess, practise, and prepare for your next interview.</p>
          </div>
          <nav className="landing-footer-links" aria-label="Footer navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#features">Features</a>
            <Link to="/register">Create account</Link>
            <Link to="/login">Login</Link>
          </nav>
          <a className="landing-footer-top" href="#top" aria-label="Back to top"><ArrowDown size={17} /></a>
        </div>
        <div className="landing-footer-bottom"><span>SkillEngine</span><span>Build skills. Practise with purpose.</span></div>
      </footer>
    </div>
  );
};

export default LandingPage;