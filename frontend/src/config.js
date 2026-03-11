export const API_CONFIG = {
  USE_SAMPLE_DATA: false,
  CONCERT_RESEARCH_ENDPOINT: process.env.NODE_ENV === 'production'
    ? 'https://llm-backend.dissonant.info/tasks/concert-research'
    : 'http://localhost:8000/tasks/concert-research',
  QUICK_TIMEOUT_MS: 10000,
  DETAILED_TIMEOUT_MS: 600000, // 10 minutes (increased from 5 minutes)
  ARTIST_PROGRESS_DURATION_MS: 20000,
};

export const FEATURE_FLAGS = {
  SHOW_AI_RESEARCH_UI: false,
};
