const SKILL_KEYS = [
  'skills',
  'resume_skills',
  'technical_skills',
  'technicalSkills',
  'soft_skills',
  'softSkills',
  'detected_skills',
  'detectedSkills',
  'extracted_skills',
  'extractedSkills',
  'tech_terms_found',
  'techTerms',
];

const SKILL_VALUE_KEYS = ['name', 'skill', 'label', 'title', 'value'];

const RESUME_SKILL_CATALOG = [
  'Python', 'Java', 'JavaScript', 'TypeScript', 'C++', 'C#', 'Go', 'Ruby', 'PHP',
  'React', 'Angular', 'Vue', 'Node.js', 'Express', 'HTML', 'CSS', 'Tailwind CSS',
  'REST API', 'GraphQL', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
  'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Linux', 'Git', 'GitHub',
  'Machine Learning', 'Deep Learning', 'Natural Language Processing', 'Generative AI',
  'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Power BI', 'Tableau', 'Excel',
  'Data Analysis', 'Data Visualization', 'Data Structures', 'Algorithms',
  'Agile', 'Scrum', 'Jest', 'Cypress', 'Selenium', 'CI/CD',
];

export const extractSkillsFromText = (text = '') => {
  const resumeText = String(text);
  const sectionSkills = [];
  const lines = resumeText.split(/\r?\n/);
  let readingSkills = false;

  lines.forEach((line) => {
    const trimmedLine = line.trim();
    const isSkillsHeading = /^(technical\s+skills|skills|core\s+competencies|technologies|technical\s+expertise)\s*:?$/i.test(trimmedLine);
    if (isSkillsHeading) {
      readingSkills = true;
      return;
    }

    if (/^(experience|work experience|employment|education|projects|certifications|summary|professional summary)\s*:?$/i.test(trimmedLine)) {
      readingSkills = false;
      return;
    }

    if (readingSkills && trimmedLine) {
      sectionSkills.push(...trimmedLine.split(/[,;|•·]/).map((skill) => skill.replace(/^[-*\s]+/, '').trim()).filter(Boolean));
    }
  });

  const catalogSkills = RESUME_SKILL_CATALOG.filter((skill) => {
    const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9])${escapedSkill}(?=$|[^a-z0-9])`, 'i').test(resumeText);
  });

  return normalizeSkillList(sectionSkills, catalogSkills);
};

const flattenSkillSource = (source) => {
  if (!source) return [];

  if (typeof source === 'string') {
    return source
      .split(/[,\n|]/)
      .map((skill) => skill.trim())
      .filter(Boolean);
  }

  if (Array.isArray(source)) {
    return source.flatMap(flattenSkillSource);
  }

  if (typeof source === 'object') {
    const namedSkill = SKILL_VALUE_KEYS.find((key) => typeof source[key] === 'string');
    if (namedSkill) {
      return flattenSkillSource(source[namedSkill]);
    }

    return Object.values(source).flatMap(flattenSkillSource);
  }

  return [];
};

export const normalizeSkillList = (...sources) => {
  const seen = new Set();
  const normalized = [];

  sources.flatMap(flattenSkillSource).forEach((skill) => {
    const trimmedSkill = String(skill).trim();
    const key = trimmedSkill.toLowerCase();

    if (trimmedSkill && !seen.has(key)) {
      seen.add(key);
      normalized.push(trimmedSkill);
    }
  });

  return normalized;
};

export const getResumeSkills = (resumeData = {}) => {
  const sources = [resumeData, resumeData?.resume_data, resumeData?.resumeData].filter(Boolean);
  return normalizeSkillList(
    ...sources.flatMap((source) => SKILL_KEYS.map((key) => source?.[key])),
  );
};
