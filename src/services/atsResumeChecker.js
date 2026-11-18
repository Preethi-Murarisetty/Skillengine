import { OfficeParser } from 'officeparser';

const TECHNICAL_KEYWORDS = [
  'Python', 'Java', 'JavaScript', 'TypeScript', 'React', 'HTML', 'CSS', 'SQL',
  'Git', 'GitHub', 'Machine Learning', 'Artificial Intelligence', 'Generative AI',
  'APIs', 'REST API', 'LLM', 'RAG', 'Vector Database', 'Node.js', 'AWS', 'Azure',
  'Docker', 'Kubernetes', 'PostgreSQL', 'MongoDB', 'C++', 'C#',
];

const JOB_KEYWORDS = [
  'software', 'developer', 'engineer', 'frontend', 'front-end', 'backend',
  'back-end', 'full-stack', 'cloud', 'database', 'automation', 'deployment',
  'testing', 'security', 'architecture', 'performance', 'agile', 'leadership',
];

const ACTION_VERBS = [
  'achieved', 'analyzed', 'automated', 'built', 'created', 'delivered',
  'designed', 'developed', 'directed', 'improved', 'implemented', 'launched',
  'led', 'optimized', 'reduced', 'resolved', 'streamlined', 'tested',
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const countKeywords = (text, keywords) => keywords.filter((keyword) => {
  const expression = escapeRegExp(keyword).replace(/\\ /g, '\\s+');
  return new RegExp(`\\b${expression}\\b`, 'i').test(text);
}).length;

const hasSection = (text, expression) => expression.test(text);

const makeSuggestions = (signals) => {
  const suggestions = [];
  if (!signals.email) suggestions.push('Add a professional email address.');
  if (!signals.phone) suggestions.push('Add a phone number so employers can reach you.');
  if (!signals.summary) suggestions.push('Add a professional summary or objective.');
  if (!signals.technicalSkills) suggestions.push('Add relevant technical skills for the roles you want.');
  if (!signals.experience) suggestions.push('Include relevant work experience or internships.');
  if (!signals.projects) suggestions.push('Showcase relevant projects and the technologies you used.');
  if (!signals.linkedin) suggestions.push('Add your LinkedIn profile.');
  if (!signals.github) suggestions.push('Add your GitHub profile.');
  if (!signals.certifications) suggestions.push('Add relevant certifications.');
  if (!signals.actionVerbs) suggestions.push('Start bullet points with stronger action verbs.');
  if (!signals.quantifiableAchievements) suggestions.push('Add measurable achievements, such as time saved or users reached.');
  if (!signals.jobKeywords) suggestions.push('Include more keywords that match the roles you are applying for.');
  if (!signals.education) suggestions.push('Add an education section with your degree or relevant training.');
  if (!signals.readability) suggestions.push('Use concise bullet points and clear section headings to improve readability.');

  if (suggestions.length < 3) {
    suggestions.push('Review each bullet point for a clear result and relevant context.');
  }
  if (suggestions.length < 3) {
    suggestions.push('Keep your most relevant experience and projects easy to scan.');
  }

  return suggestions.slice(0, 5);
};

export const scoreResumeText = (resumeText) => {
  const text = String(resumeText || '').replace(/\s+/g, ' ').trim();
  const lowerText = text.toLowerCase();
  const words = text.match(/[\p{L}\p{N}+#.-]+/gu) || [];
  const wordCount = words.length;
  const technicalKeywordCount = countKeywords(lowerText, TECHNICAL_KEYWORDS);
  const jobKeywordCount = countKeywords(lowerText, JOB_KEYWORDS);
  const actionVerbCount = countKeywords(lowerText, ACTION_VERBS);
  const hasQuantifiableAchievements = /(?:\b\d+(?:\.\d+)?\s?%|\b\d+(?:\.\d+)?\s?(?:k|m|million|thousand|users|customers|projects|hours|days|weeks|months|years|x)\b|\$\s?\d)/i.test(text);
  const readable = wordCount >= 100
    && words.every((word) => word.length <= 35)
    && (text.split(/[.!?\n]/).filter((part) => part.trim().length > 0).length >= 4);

  const signals = {
    email: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text),
    phone: (text.match(/\+?\d[\d\s().-]{7,}\d/g) || []).some((number) => number.replace(/\D/g, '').length >= 10),
    linkedin: /linkedin\.com\/(?:in|pub)\//i.test(text),
    github: /github\.com\/[\w-]+/i.test(text),
    summary: hasSection(text, /\b(summary|professional profile|career objective|objective)\b/i),
    education: hasSection(text, /\b(education|academic background|academic qualifications)\b/i),
    skills: hasSection(text, /\b(skills|technical skills|core competencies|technologies)\b/i),
    experience: hasSection(text, /\b(experience|employment history|work history|professional experience)\b/i),
    projects: hasSection(text, /\b(projects|selected projects|personal projects)\b/i),
    certifications: hasSection(text, /\b(certifications|certificates|licenses)\b/i),
    technicalSkills: technicalKeywordCount >= 3,
    jobKeywords: jobKeywordCount >= 2,
    actionVerbs: actionVerbCount >= 3,
    quantifiableAchievements: hasQuantifiableAchievements,
    contentQuality: wordCount >= 150,
    readability: readable,
  };

  const score = Math.min(100, Math.max(0,
    (signals.email ? 6 : 0)
    + (signals.phone ? 5 : 0)
    + (signals.linkedin ? 4 : 0)
    + (signals.github ? 3 : 0)
    + (signals.summary ? 6 : 0)
    + (signals.education ? 6 : 0)
    + (signals.skills ? 7 : 0)
    + (signals.experience ? 7 : 0)
    + (signals.projects ? 6 : 0)
    + (signals.certifications ? 4 : 0)
    + (technicalKeywordCount >= 5 ? 10 : technicalKeywordCount >= 2 ? 5 : 0)
    + (jobKeywordCount >= 4 ? 8 : jobKeywordCount >= 2 ? 4 : 0)
    + (actionVerbCount >= 5 ? 7 : actionVerbCount >= 2 ? 4 : 0)
    + (hasQuantifiableAchievements ? 8 : 0)
    + (wordCount >= 250 ? 8 : wordCount >= 150 ? 6 : wordCount >= 100 ? 4 : wordCount >= 60 ? 2 : 0)
    + (readable ? 5 : wordCount >= 60 ? 2 : 0)
  ));

  return {
    score,
    interpretation: score >= 80 ? 'Excellent' : score >= 70 ? 'Good' : 'Needs Improvement',
    suggestions: makeSuggestions(signals),
  };
};

export const analyzeResumeFile = async (file) => {
  const extension = file?.name?.split('.').pop()?.toLowerCase();
  if (extension === 'doc') {
    throw new Error('Legacy .doc files cannot be read locally yet. Please save the resume as PDF or DOCX and try again.');
  }
  if (!file || !['pdf', 'docx'].includes(extension)) {
    throw new Error('Choose a PDF or DOCX file to analyze.');
  }

  try {
    const content = new Uint8Array(await file.arrayBuffer());
    const document = await OfficeParser.parseOffice(content);
    const { value } = await document.to('text', {
      includeImages: false,
      textConfig: { preserveLayout: false, renderNotes: false },
    });
    const text = typeof value === 'string' ? value.trim() : '';
    if (text.length < 20) {
      throw new Error('This document does not contain enough readable text.');
    }
    return scoreResumeText(text);
  } catch (error) {
    if (error instanceof Error && error.message === 'This document does not contain enough readable text.') {
      throw error;
    }
    throw new Error('We could not read this resume. Check that the file is not corrupted or password-protected, then try again.');
  }
};