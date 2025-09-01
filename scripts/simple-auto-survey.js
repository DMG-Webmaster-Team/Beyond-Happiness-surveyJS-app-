// SIMPLE AUTO SURVEY SCRIPT
// Copy and paste this into browser console on survey page

(function () {
  console.log("🤖 Starting Auto Survey...");

  let questionCount = 0;

  function randomAnswer() {
    return Math.floor(Math.random() * 5) + 1;
  }

  function answerAndNext() {
    // Find all radio buttons that aren't checked
    const radios = document.querySelectorAll(
      'input[type="radio"]:not(:checked)'
    );
    const groups = {};

    // Group by question name
    radios.forEach((radio) => {
      const name = radio.name || "q";
      if (!groups[name]) groups[name] = [];
      groups[name].push(radio);
    });

    // Answer each question randomly
    let answered = 0;
    Object.keys(groups).forEach((name) => {
      const options = groups[name];
      if (options.length >= 5) {
        const choice = randomAnswer();
        const radio = options[choice - 1];
        if (radio) {
          radio.click();
          console.log(`Question ${++questionCount}: Selected ${choice}`);
          answered++;
        }
      }
    });

    // Click next/submit button
    setTimeout(() => {
      const buttons = [...document.querySelectorAll("button")];
      const nextBtn = buttons.find((btn) => {
        const text = btn.textContent.toLowerCase();
        return (
          text.includes("next") ||
          text.includes("submit") ||
          text.includes("complete")
        );
      });

      if (nextBtn) {
        nextBtn.click();
        console.log("✅ Clicked next");

        // Continue if not on results page
        setTimeout(() => {
          const bodyText = document.body.textContent.toLowerCase();
          if (
            !bodyText.includes("character") &&
            !bodyText.includes("complete")
          ) {
            answerAndNext();
          } else {
            console.log("🎉 Survey completed!");
          }
        }, 1000);
      } else {
        console.log("✨ No more questions - done!");
      }
    }, 500);
  }

  // Start the process
  answerAndNext();
})();

// Manual controls (optional)
window.autoSurvey = {
  random: () => Math.floor(Math.random() * 5) + 1,
  answer: () => {
    const radios = document.querySelectorAll(
      'input[type="radio"]:not(:checked)'
    );
    const groups = {};
    radios.forEach((r) => {
      const name = r.name || "q";
      if (!groups[name]) groups[name] = [];
      groups[name].push(r);
    });
    Object.keys(groups).forEach((name) => {
      const choice = Math.floor(Math.random() * groups[name].length);
      groups[name][choice].click();
    });
  },
  next: () => {
    const btn = [...document.querySelectorAll("button")].find(
      (b) =>
        b.textContent.toLowerCase().includes("next") ||
        b.textContent.toLowerCase().includes("submit")
    );
    if (btn) btn.click();
  },
};
