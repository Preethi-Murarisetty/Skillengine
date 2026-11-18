export const getApiErrorMessage: (error: any) => string;
export const startAIInterview: (payload: any) => Promise<any>;
export const configureAIInterview: (payload: any) => Promise<any>;
export const getAIInterviewQuestion: (payload: any) => Promise<any>;
export const evaluateAIInterviewAnswer: (payload: any) => Promise<any>;
export const getAIInterviewStatus: (sessionId: string) => Promise<any>;
export const interviewAPI: {
  analyzeResume: (file: File, userEmail?: string) => Promise<any>;
  [key: string]: any;
};
