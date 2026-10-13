import axios from 'axios';
import { JUDGE0_URL } from '../config';

const judge0 = axios.create({ baseURL: JUDGE0_URL, timeout: 30000 });

export interface J0Submission {
  token?: string;
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  time?: string | null;
  memory?: number | null;
  status?: { id: number; description: string };
}

export interface J0Payload { source_code: string; language_id: number; stdin?: string; expected_output?: string }

export const createSubmission = async (p: J0Payload): Promise<string> => {
  const { data } = await judge0.post<{ token: string }>('/submissions?base64_encoded=false&wait=false', p);
  return data.token;
};

export const fetchSubmission = async (token: string): Promise<J0Submission> => {
  const { data } = await judge0.get<J0Submission>(`/submissions/${token}?base64_encoded=false&fields=*`);
  return data;
};
