import React from 'react';
import { FaArrowLeft } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';

const BackButton = ({
  to,
  label = 'Back',
  className = 'dashboard-light-button',
  fallbackTo = '/dashboard',
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = () => {
    if (to) {
      navigate(to);
      return;
    }

    if (location.state?.from) {
      navigate(location.state.from);
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(fallbackTo);
  };

  return (
    <button type="button" onClick={handleClick} className={className} aria-label="Go back">
      <FaArrowLeft style={{ marginRight: 8 }} />
      {label}
    </button>
  );
};

export default BackButton;
