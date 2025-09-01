// ONE-LINER AUTO SURVEY
// Copy this single line into browser console:

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

// READABLE VERSION (same functionality):
/*
(function autoSurvey() {
  // Find all unchecked radio buttons
  const radios = document.querySelectorAll('input[type="radio"]:not(:checked)');
  const groups = {};
  
  // Group by question name  
  radios.forEach(radio => {
    const name = radio.name || 'q';
    if (!groups[name]) groups[name] = [];
    groups[name].push(radio);
  });
  
  // Answer each question randomly (1-5)
  let count = 0;
  Object.keys(groups).forEach(name => {
    if (groups[name].length >= 5) {
      const choice = Math.floor(Math.random() * 5);
      if (groups[name][choice]) {
        groups[name][choice].click();
        console.log(`Question ${++count}: Selected ${choice + 1}`);
      }
    }
  });
  
  // Click next button and continue
  setTimeout(() => {
    const nextButton = [...document.querySelectorAll('button')].find(btn => 
      btn.textContent.toLowerCase().includes('next') || 
      btn.textContent.toLowerCase().includes('submit')
    );
    
    if (nextButton) {
      nextButton.click();
      // Continue if not on results page
      setTimeout(() => {
        if (!document.body.textContent.toLowerCase().includes('character')) {
          autoSurvey(); // Recursively continue
        }
      }, 1000);
    } else {
      console.log('Survey completed!');
    }
  }, 500);
})();
*/
