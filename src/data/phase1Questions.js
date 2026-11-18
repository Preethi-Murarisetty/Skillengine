export const phase1Config = {
  PHASE1_DURATION: 30 * 60,
  APTITUDE_QUESTIONS: 10,
  REASONING_QUESTIONS: 10,
  COMMUNICATION_QUESTIONS: 10,
  allowSkip: true,
};

export const aptitudeQuestions = [
  { id: 'apt-1', section: 'aptitude', topic: 'percentages', question: 'What is 20% of 150?', options: ['20', '25', '30', '35'], correctAnswer: '30' },
  { id: 'apt-2', section: 'aptitude', topic: 'profit-and-loss', question: 'An item bought for $80 is sold for $100. What is the profit percentage?', options: ['20%', '25%', '30%', '40%'], correctAnswer: '25%' },
  { id: 'apt-3', section: 'aptitude', topic: 'ratios', question: 'The ratio of boys to girls is 3:2. If there are 30 boys, how many girls are there?', options: ['15', '20', '25', '45'], correctAnswer: '20' },
  { id: 'apt-4', section: 'aptitude', topic: 'averages', question: 'What is the average of 12, 18, 20 and 10?', options: ['14', '15', '16', '18'], correctAnswer: '15' },
  { id: 'apt-5', section: 'aptitude', topic: 'time-and-work', question: 'A can complete a task in 10 days and B in 15 days. How long will they take together?', options: ['5 days', '6 days', '8 days', '12 days'], correctAnswer: '6 days' },
  { id: 'apt-6', section: 'aptitude', topic: 'speed-distance', question: 'A car travels at 60 km/h for 2.5 hours. What distance does it cover?', options: ['120 km', '140 km', '150 km', '180 km'], correctAnswer: '150 km' },
  { id: 'apt-7', section: 'aptitude', topic: 'simple-interest', question: 'What simple interest is earned on $2,000 at 5% per year for 2 years?', options: ['$100', '$150', '$200', '$250'], correctAnswer: '$200' },
  { id: 'apt-8', section: 'aptitude', topic: 'compound-interest', question: 'What is the amount on $1,000 at 10% compound interest for 2 years?', options: ['$1,100', '$1,200', '$1,210', '$1,220'], correctAnswer: '$1,210' },
  { id: 'apt-9', section: 'aptitude', topic: 'number-system', question: 'Which of these numbers is divisible by 9?', options: ['234', '245', '352', '461'], correctAnswer: '234' },
  { id: 'apt-10', section: 'aptitude', topic: 'probability', question: 'What is the probability of getting a head when a fair coin is tossed once?', options: ['0', '1/4', '1/2', '1'], correctAnswer: '1/2' },
  { id: 'apt-11', section: 'aptitude', topic: 'percentages', question: 'A price of $500 is reduced by 15%. What is the new price?', options: ['$415', '$425', '$435', '$450'], correctAnswer: '$425' },
  { id: 'apt-12', section: 'aptitude', topic: 'averages', question: 'The average of five numbers is 24. What is their total?', options: ['96', '100', '120', '144'], correctAnswer: '120' },
];

export const reasoningQuestions = [
  { id: 'rea-1', section: 'reasoning', topic: 'number-series', question: 'Find the next number: 2, 4, 8, 16, ?', options: ['20', '24', '32', '36'], correctAnswer: '32' },
  { id: 'rea-2', section: 'reasoning', topic: 'coding-decoding', question: 'If CAT is coded as DBU, how is DOG coded using the same pattern?', options: ['EPH', 'EOG', 'DPH', 'FPH'], correctAnswer: 'EPH' },
  { id: 'rea-3', section: 'reasoning', topic: 'blood-relations', question: 'Rita is the sister of Sam. Sam is the father of Tina. How is Rita related to Tina?', options: ['Mother', 'Aunt', 'Sister', 'Cousin'], correctAnswer: 'Aunt' },
  { id: 'rea-4', section: 'reasoning', topic: 'direction-sense', question: 'A person walks north, turns right, then turns right again. Which direction are they facing?', options: ['North', 'South', 'East', 'West'], correctAnswer: 'South' },
  { id: 'rea-5', section: 'reasoning', topic: 'analogy', question: 'Book is to reading as fork is to:', options: ['Writing', 'Eating', 'Cooking', 'Cutting'], correctAnswer: 'Eating' },
  { id: 'rea-6', section: 'reasoning', topic: 'odd-one-out', question: 'Which is the odd one out?', options: ['Square', 'Triangle', 'Circle', 'Cube'], correctAnswer: 'Cube' },
  { id: 'rea-7', section: 'reasoning', topic: 'logical-reasoning', question: 'All managers are employees. Priya is a manager. What must be true?', options: ['Priya is an employee', 'Every employee is a manager', 'Priya owns the company', 'No manager is an employee'], correctAnswer: 'Priya is an employee' },
  { id: 'rea-8', section: 'reasoning', topic: 'pattern-recognition', question: 'Which symbol comes next: A, C, F, J, O, ?', options: ['S', 'T', 'U', 'V'], correctAnswer: 'U' },
  { id: 'rea-9', section: 'reasoning', topic: 'number-series', question: 'Find the missing number: 3, 6, 11, 18, ?', options: ['24', '25', '27', '29'], correctAnswer: '27' },
  { id: 'rea-10', section: 'reasoning', topic: 'coding-decoding', question: 'If BLUE is written as EULB, how is GREEN written?', options: ['NEERG', 'NEGRE', 'ERGNE', 'GREEN'], correctAnswer: 'NEERG' },
  { id: 'rea-11', section: 'reasoning', topic: 'direction-sense', question: 'If you face west and turn 90 degrees clockwise, which direction do you face?', options: ['North', 'South', 'East', 'West'], correctAnswer: 'North' },
  { id: 'rea-12', section: 'reasoning', topic: 'analogy', question: 'Puppy is to dog as kitten is to:', options: ['Lion', 'Cat', 'Cow', 'Horse'], correctAnswer: 'Cat' },
];

export const communicationQuestions = [
  { id: 'com-1', section: 'communication', category: 'communication', question: 'A colleague misunderstands your email. What is the most effective response?', options: [{ text: 'Blame them for not reading carefully', score: 1 }, { text: 'Send the same email again', score: 2 }, { text: 'Clarify the point respectfully and invite questions', score: 4 }, { text: 'Ask someone else to explain it', score: 3 }] },
  { id: 'com-2', section: 'communication', category: 'teamwork', question: 'A team member is struggling with a task. What would you do?', options: [{ text: 'Ignore the situation', score: 1 }, { text: 'Complain immediately', score: 2 }, { text: 'Discuss the issue and help find a solution', score: 4 }, { text: 'Complete the task without talking to them', score: 3 }] },
  { id: 'com-3', section: 'communication', category: 'leadership', question: 'Your team misses a target. How should you respond?', options: [{ text: 'Publicly identify who is at fault', score: 1 }, { text: 'Move on without discussion', score: 2 }, { text: 'Review causes with the team and agree on next steps', score: 4 }, { text: 'Take responsibility and privately plan improvements', score: 3 }] },
  { id: 'com-4', section: 'communication', category: 'workplace-behaviour', question: 'You disagree with a decision in a meeting. What is best?', options: [{ text: 'Interrupt and dismiss the idea', score: 1 }, { text: 'Stay silent and complain later', score: 2 }, { text: 'Share your concerns with evidence and listen to the response', score: 4 }, { text: 'Ask to discuss it privately after the meeting', score: 3 }] },
  { id: 'com-5', section: 'communication', category: 'conflict-resolution', question: 'Two colleagues are in conflict and it affects delivery. What should you do?', options: [{ text: 'Choose the colleague you agree with', score: 1 }, { text: 'Avoid both colleagues', score: 2 }, { text: 'Help them discuss facts and agree on a way forward', score: 4 }, { text: 'Ask a manager to solve it without hearing them', score: 3 }] },
  { id: 'com-6', section: 'communication', category: 'adaptability', question: 'A project priority changes suddenly. How do you respond?', options: [{ text: 'Refuse to change your plan', score: 1 }, { text: 'Wait until someone tells you every next step', score: 2 }, { text: 'Clarify the new priority, reprioritize, and communicate impacts', score: 4 }, { text: 'Adapt your work and ask for clarification where needed', score: 3 }] },
  { id: 'com-7', section: 'communication', category: 'problem-solving', question: 'You discover a recurring process error. What is the best action?', options: [{ text: 'Hide it to avoid attention', score: 1 }, { text: 'Fix only the current instance', score: 2 }, { text: 'Find the root cause and propose a lasting improvement', score: 4 }, { text: 'Report it with a possible solution', score: 3 }] },
  { id: 'com-8', section: 'communication', category: 'professional-communication', question: 'You will miss a deadline because of an unexpected blocker. What do you do?', options: [{ text: 'Say nothing until the deadline passes', score: 1 }, { text: 'Send a vague excuse', score: 2 }, { text: 'Notify stakeholders early with impact and a recovery plan', score: 4 }, { text: 'Ask for a short extension with context', score: 3 }] },
  { id: 'com-9', section: 'communication', category: 'teamwork', question: 'A remote teammate is left out of an important discussion. What should you do?', options: [{ text: 'Continue without them', score: 1 }, { text: 'Tell them to catch up later', score: 2 }, { text: 'Share context and include them in the next discussion', score: 4 }, { text: 'Send them the meeting notes and invite input', score: 3 }] },
  { id: 'com-10', section: 'communication', category: 'leadership', question: 'A junior colleague asks for feedback on their work. How do you respond?', options: [{ text: 'Say it is fine without reviewing it', score: 1 }, { text: 'Point out only the mistakes', score: 2 }, { text: 'Give specific, balanced feedback and agree on next steps', score: 4 }, { text: 'Share a few improvements they can make', score: 3 }] },
  { id: 'com-11', section: 'communication', category: 'adaptability', question: 'You are assigned an unfamiliar tool for an urgent task. What do you do?', options: [{ text: 'Refuse the assignment', score: 1 }, { text: 'Wait for formal training', score: 2 }, { text: 'Learn the essentials quickly and ask focused questions', score: 4 }, { text: 'Ask an experienced teammate for initial guidance', score: 3 }] },
  { id: 'com-12', section: 'communication', category: 'problem-solving', question: 'A customer raises a complaint about your team. What is the best first response?', options: [{ text: 'Explain why the customer is wrong', score: 1 }, { text: 'Forward it without acknowledgement', score: 2 }, { text: 'Listen, acknowledge the concern, and clarify the facts', score: 4 }, { text: 'Apologize and investigate the issue', score: 3 }] },
];

export const selectQuestions = (questions, count) => {
  const shuffled = [...questions];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
};