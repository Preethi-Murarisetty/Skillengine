// src/admin/config.js
//
// One place for every backend address used by the admin panel.
//
// SkillEngine Node backend (users, quiz, coding, master data, assessments):
//   http://100.117.158.50:3005      (override: VITE_BACKEND_URL)
//
// The exam-status / results / PDF-upload endpoints used by the "Resume" and
// "Performance" pages are NOT part of the SkillEngine backend. They default to
// the same server; if they run as a separate service, set:
//   VITE_RESULTS_API_URL=http://<host>:<port>
import { NODE_API_URL } from "../services/api";

export const API_BASE_URL = NODE_API_URL;
export const RESULTS_API_BASE_URL = import.meta.env.VITE_RESULTS_API_URL || NODE_API_URL;
export const PDF_API_BASE_URL = import.meta.env.VITE_RESULTS_API_URL || NODE_API_URL;
