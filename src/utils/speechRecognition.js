export const createSpeechRecognition = ({ lang = 'en-US' } = {}) => {
  if (typeof window === 'undefined') {
    return null;
  }

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    return null;
  }

  const recognition = new Recognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.lang = lang;

  return recognition;
};
