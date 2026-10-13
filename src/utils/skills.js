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
