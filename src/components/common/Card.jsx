import React from 'react';

const Card = ({ children, className = '', hover = true, gradient = false }) => {
  return (
    <div className={`${gradient ? 'gradient-card' : 'bg-white'} rounded-2xl shadow-lg p-6 transition-all duration-300 ${hover ? 'hover:shadow-xl hover:-translate-y-1' : ''} ${className}`}>
      {children}
    </div>
  );
};

export default Card;