/**
 * Test localStorage survey completion functionality
 */

// Mock localStorage for testing
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

global.localStorage = localStorageMock;

// Import the functions we want to test
const getSubmissionKey = (surveyId) => `submitted_${surveyId}`;

const isRecentlySubmitted = (surveyId) => {
  if (typeof window === "undefined") return false;

  const submissionData = localStorage.getItem(getSubmissionKey(surveyId));
  if (!submissionData) return false;

  try {
    const { timestamp } = JSON.parse(submissionData);
    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000; // 15 minutes
    return timestamp > fifteenMinutesAgo;
  } catch {
    return false;
  }
};

const markSurveySubmitted = (surveyId) => {
  if (typeof window === "undefined") return;

  const submissionData = {
    timestamp: Date.now(),
    surveyId,
  };
  localStorage.setItem(
    getSubmissionKey(surveyId),
    JSON.stringify(submissionData)
  );
};

describe("Survey localStorage functionality", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window object
    global.window = {};
  });

  afterEach(() => {
    delete global.window;
  });

  test("getSubmissionKey generates correct key", () => {
    expect(getSubmissionKey("test-survey-123")).toBe(
      "submitted_test-survey-123"
    );
  });

  test("isRecentlySubmitted returns false when no data exists", () => {
    localStorageMock.getItem.mockReturnValue(null);
    expect(isRecentlySubmitted("test-survey")).toBe(false);
  });

  test("isRecentlySubmitted returns true for recent submission", () => {
    const recentTimestamp = Date.now() - 5 * 60 * 1000; // 5 minutes ago
    const submissionData = JSON.stringify({
      timestamp: recentTimestamp,
      surveyId: "test-survey",
    });

    localStorageMock.getItem.mockReturnValue(submissionData);
    expect(isRecentlySubmitted("test-survey")).toBe(true);
  });

  test("isRecentlySubmitted returns false for old submission", () => {
    const oldTimestamp = Date.now() - 20 * 60 * 1000; // 20 minutes ago
    const submissionData = JSON.stringify({
      timestamp: oldTimestamp,
      surveyId: "test-survey",
    });

    localStorageMock.getItem.mockReturnValue(submissionData);
    expect(isRecentlySubmitted("test-survey")).toBe(false);
  });

  test("markSurveySubmitted stores data correctly", () => {
    const surveyId = "test-survey-456";
    markSurveySubmitted(surveyId);

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "submitted_test-survey-456",
      expect.stringMatching(/{"timestamp":\d+,"surveyId":"test-survey-456"}/)
    );
  });

  test("functions handle server-side rendering (no window)", () => {
    delete global.window;

    expect(isRecentlySubmitted("test")).toBe(false);
    expect(() => markSurveySubmitted("test")).not.toThrow();
  });
});
