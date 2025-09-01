/**
 * Auto Survey Console Script
 *
 * Paste this script into the browser console on a happiness survey page
 * to automatically fill out the survey with random answers (1-5)
 *
 * Usage:
 * 1. Go to a happiness survey page (e.g., /happiness/SURVEY_ID)
 * 2. Open browser console (F12 -> Console)
 * 3. Paste this entire script and press Enter
 * 4. Watch it automatically answer all questions and submit
 */

(function () {
  "use strict";

  console.log("🤖 Auto Survey Bot Starting...");

  // Configuration
  const config = {
    minAnswer: 1, // Minimum answer value
    maxAnswer: 5, // Maximum answer value
    delayBetweenAnswers: 500, // Delay in ms between answering questions
    submitDelay: 1000, // Delay before submitting
  };

  // Generate random number between min and max (inclusive)
  function getRandomAnswer() {
    return (
      Math.floor(Math.random() * (config.maxAnswer - config.minAnswer + 1)) +
      config.minAnswer
    );
  }

  // Find and click a radio button or button element
  function clickElement(element) {
    if (!element) return false;

    try {
      // Trigger both mouse and change events
      element.click();
      element.dispatchEvent(new Event("change", { bubbles: true }));
      element.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    } catch (error) {
      console.error("Error clicking element:", error);
      return false;
    }
  }

  // Find all radio buttons for current question
  function getCurrentQuestionInputs() {
    // Look for various radio button patterns
    const selectors = [
      'input[type="radio"]:not(:checked)',
      'input[name*="question"]',
      'input[name*="answer"]',
      ".sv-radio input",
      '.question input[type="radio"]',
      '[data-name*="question"] input[type="radio"]',
    ];

    for (const selector of selectors) {
      const inputs = document.querySelectorAll(selector);
      if (inputs.length > 0) {
        console.log(
          `Found ${inputs.length} radio inputs using selector: ${selector}`
        );
        return Array.from(inputs);
      }
    }

    return [];
  }

  // Find the next/submit button
  function findNextButton() {
    const buttonSelectors = [
      'button:contains("Next")',
      'button:contains("Submit")',
      'button:contains("Complete")',
      'input[type="submit"]',
      'button[type="submit"]',
      ".sv-btn",
      ".next-button",
      ".submit-button",
      "button.bg-blue-400",
      "button.bg-blue-600",
    ];

    // Custom contains selector since CSS doesn't have :contains
    const buttons = document.querySelectorAll('button, input[type="submit"]');

    for (const button of buttons) {
      const text = button.textContent || button.value || "";
      if (
        text.toLowerCase().includes("next") ||
        text.toLowerCase().includes("submit") ||
        text.toLowerCase().includes("complete") ||
        text.toLowerCase().includes("finish")
      ) {
        return button;
      }
    }

    // Fallback to common button classes
    for (const selector of buttonSelectors) {
      if (selector.includes(":contains")) continue; // Skip contains selectors
      const button = document.querySelector(selector);
      if (button && !button.disabled) return button;
    }

    return null;
  }

  // Answer current question with random choice
  function answerCurrentQuestion() {
    const inputs = getCurrentQuestionInputs();

    if (inputs.length === 0) {
      console.log("No radio inputs found for current question");
      return false;
    }

    // Group inputs by question (assuming name attribute groups them)
    const questionGroups = {};
    inputs.forEach((input) => {
      const name = input.name || "default";
      if (!questionGroups[name]) questionGroups[name] = [];
      questionGroups[name].push(input);
    });

    let answered = 0;

    // Answer each question group
    Object.keys(questionGroups).forEach((questionName) => {
      const questionInputs = questionGroups[questionName];

      // Skip if already answered
      const hasChecked = questionInputs.some((input) => input.checked);
      if (hasChecked) {
        console.log(`Question ${questionName} already answered, skipping...`);
        return;
      }

      if (questionInputs.length >= config.maxAnswer) {
        const randomAnswer = getRandomAnswer();
        const targetInput = questionInputs[randomAnswer - 1]; // Convert to 0-based index

        if (targetInput && clickElement(targetInput)) {
          console.log(
            `✅ Question ${questionName}: Selected answer ${randomAnswer}`
          );
          answered++;
        } else {
          console.log(
            `❌ Failed to select answer ${randomAnswer} for question ${questionName}`
          );
        }
      } else {
        console.log(
          `⚠️ Question ${questionName} has ${questionInputs.length} options, expected ${config.maxAnswer}`
        );
      }
    });

    return answered > 0;
  }

  // Check if we're on the results page
  function isOnResultsPage() {
    const indicators = [
      "congratulations",
      "your character",
      "survey complete",
      "results",
      "thank you",
    ];

    const pageText = document.body.textContent.toLowerCase();
    return indicators.some((indicator) => pageText.includes(indicator));
  }

  // Main automation function
  async function runSurveyBot() {
    let questionCount = 0;
    let maxQuestions = 50; // Safety limit

    console.log("🚀 Starting automatic survey completion...");

    while (questionCount < maxQuestions) {
      // Check if we've reached the end
      if (isOnResultsPage()) {
        console.log("🎉 Survey completed! Reached results page.");
        break;
      }

      // Try to answer current question
      const answered = answerCurrentQuestion();

      if (!answered) {
        console.log("No questions to answer, looking for next button...");
      } else {
        questionCount++;
        console.log(`📝 Answered question ${questionCount}`);
      }

      // Wait a bit before proceeding
      await new Promise((resolve) =>
        setTimeout(resolve, config.delayBetweenAnswers)
      );

      // Look for and click next/submit button
      const nextButton = findNextButton();
      if (nextButton) {
        console.log(
          `🔄 Clicking: ${
            nextButton.textContent || nextButton.value || "Next Button"
          }`
        );

        // Wait a bit before clicking
        await new Promise((resolve) => setTimeout(resolve, config.submitDelay));

        if (clickElement(nextButton)) {
          console.log("✅ Button clicked successfully");

          // Wait for page transition
          await new Promise((resolve) => setTimeout(resolve, 1500));
        } else {
          console.log("❌ Failed to click button");
          break;
        }
      } else {
        console.log("❌ No next/submit button found");
        break;
      }
    }

    if (questionCount >= maxQuestions) {
      console.log("⚠️ Reached maximum question limit, stopping...");
    }

    console.log(`✨ Survey bot finished. Answered ${questionCount} questions.`);

    // Final check for results
    setTimeout(() => {
      if (isOnResultsPage()) {
        console.log("🎯 Successfully completed survey and reached results!");

        // Try to log the character result
        const characterElements = document.querySelectorAll(
          "h1, h2, h3, .character-name, .result-title"
        );
        characterElements.forEach((el) => {
          if (
            el.textContent.includes("Character") ||
            el.textContent.includes("Your")
          ) {
            console.log(`🎭 Result: ${el.textContent}`);
          }
        });
      }
    }, 2000);
  }

  // Start the bot
  runSurveyBot().catch((error) => {
    console.error("❌ Survey bot failed:", error);
  });
})();

// Quick manual functions for testing
window.surveyBot = {
  // Generate a single random answer
  randomAnswer: () => Math.floor(Math.random() * 5) + 1,

  // Answer current question manually
  answerCurrent: function () {
    const inputs = document.querySelectorAll(
      'input[type="radio"]:not(:checked)'
    );
    const groups = {};

    inputs.forEach((input) => {
      const name = input.name || "default";
      if (!groups[name]) groups[name] = [];
      groups[name].push(input);
    });

    Object.keys(groups).forEach((name) => {
      const randomIndex = Math.floor(Math.random() * groups[name].length);
      groups[name][randomIndex].click();
      console.log(`Answered ${name} with option ${randomIndex + 1}`);
    });
  },

  // Click next button manually
  clickNext: function () {
    const buttons = document.querySelectorAll("button");
    for (const button of buttons) {
      const text = button.textContent.toLowerCase();
      if (text.includes("next") || text.includes("submit")) {
        button.click();
        console.log(`Clicked: ${button.textContent}`);
        return;
      }
    }
    console.log("No next button found");
  },
};

console.log("\n💡 Manual controls available:");
console.log("  surveyBot.randomAnswer() - Get random number 1-5");
console.log("  surveyBot.answerCurrent() - Answer current question randomly");
console.log("  surveyBot.clickNext() - Click next/submit button");
