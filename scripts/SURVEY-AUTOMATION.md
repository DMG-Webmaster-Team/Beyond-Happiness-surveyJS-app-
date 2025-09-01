# Browser Console Survey Automation Scripts

These scripts automatically fill out happiness surveys with random answers (1-5) and click "Next" until completion.

## 🚀 Quick Start

### Option 1: One-Liner (Easiest)

1. Go to any happiness survey page (e.g., `/happiness/SURVEY_ID`)
2. Open browser console (`F12` → `Console`)
3. Copy and paste this line:

```javascript
(function f() {
  const r = document.querySelectorAll('input[type="radio"]:not(:checked)'),
    g = {};
  r.forEach((i) => {
    const n = i.name || "q";
    if (!g[n]) g[n] = [];
    g[n].push(i);
  });
  let a = 0;
  Object.keys(g).forEach((n) => {
    if (g[n].length >= 5) {
      const c = Math.floor(Math.random() * 5);
      g[n][c] && (g[n][c].click(), console.log(`Q${++a}: ${c + 1}`), 1);
    }
  });
  setTimeout(() => {
    const b = [...document.querySelectorAll("button")].find(
      (x) =>
        x.textContent.toLowerCase().includes("next") ||
        x.textContent.toLowerCase().includes("submit")
    );
    b
      ? (b.click(),
        setTimeout(
          () =>
            !document.body.textContent.toLowerCase().includes("character") &&
            f(),
          1e3
        ))
      : console.log("Done!");
  }, 500);
})();
```

4. Press `Enter` and watch it complete the survey automatically!

### Option 2: Simple Script

Copy the entire content from `simple-auto-survey.js` into the console.

### Option 3: Full Featured Script

Copy the entire content from `auto-survey-console.js` into the console for advanced features.

## 📱 How It Works

1. **Finds Questions**: Locates all radio button groups on the page
2. **Random Selection**: Generates random numbers 1-5 for each question
3. **Auto-Click**: Clicks the corresponding radio button
4. **Next Button**: Automatically finds and clicks "Next"/"Submit" buttons
5. **Continues**: Repeats until reaching the results page

## 🔧 Manual Controls

After running the script, you get manual controls:

```javascript
// Generate random number 1-5
autoSurvey.random();

// Answer current question randomly
autoSurvey.answer();

// Click next button
autoSurvey.next();
```

## 📊 Console Output Example

```
🤖 Starting Auto Survey...
Question 1: Selected 3
Question 2: Selected 5
Question 3: Selected 1
✅ Clicked next
Question 4: Selected 4
Question 5: Selected 2
...
🎉 Survey completed!
🎭 Result: Your Character: Complete Human
```

## 🎯 Use Cases

- **Testing**: Quickly test different character outcomes
- **Demo**: Show the survey system in action
- **Development**: Generate test data for happiness surveys
- **QA**: Verify survey flow and scoring works correctly

## ⚠️ Notes

- Works on any happiness survey page in your app
- Generates completely random responses (1-5 scale)
- Automatically stops when reaching results page
- Safe to run multiple times
- Includes error handling for edge cases

## 🔍 Troubleshooting

**Script doesn't start:**

- Make sure you're on a survey page with radio buttons
- Check console for error messages
- Try refreshing the page and running again

**Gets stuck on a question:**

- The script looks for 5 radio button options per question
- Manually click next with: `autoSurvey.next()`

**Doesn't detect completion:**

- Script looks for words like "character", "complete", "results"
- Manually stop with: `Ctrl+C` in console

## 🛠️ Customization

Edit the script variables to customize behavior:

```javascript
const config = {
  minAnswer: 1, // Minimum answer (1-5)
  maxAnswer: 5, // Maximum answer (1-5)
  delayBetweenAnswers: 500, // Delay in milliseconds
  submitDelay: 1000, // Delay before clicking next
};
```

## 📋 Files Included

- `one-liner-survey.js` - Single line script (easiest)
- `simple-auto-survey.js` - Simple readable version
- `auto-survey-console.js` - Full featured with error handling
- `SURVEY-AUTOMATION.md` - This usage guide

Happy testing! 🎉
