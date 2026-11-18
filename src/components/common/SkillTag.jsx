import React from 'react';

const SkillTag = ({ skill, className = '', dark = false, onClick = null }) => {
  return (
    <span 
      className={`${dark ? 'skill-tag-dark' : 'skill-tag'} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      {skill}
    </span>
  );
};

export default SkillTag;