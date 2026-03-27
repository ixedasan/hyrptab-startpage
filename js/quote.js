/**
 * quote.js — Daily rotating quotes with a hacker/unix aesthetic
 */

const Quote = (() => {

  const QUOTES = [
    { text: "The computer was born to solve problems that did not exist before.", author: "Bill Gates" },
    { text: "Programs must be written for people to read, and only incidentally for machines to execute.", author: "Harold Abelson" },
    { text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", author: "Martin Fowler" },
    { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
    { text: "The best interface is no interface.", author: "Golden Krishna" },
    { text: "Unix is user-friendly. It just isn't promiscuous about which users it's friendly with.", author: "Steven King" },
    { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
    { text: "The art of programming is the art of organizing complexity.", author: "Edsger W. Dijkstra" },
    { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
    { text: "Every line of code is a liability.", author: "Unknown" },
    { text: "It's not a bug, it's an undocumented feature.", author: "Anonymous" },
    { text: "Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.", author: "Antoine de Saint-Exupéry" },
    { text: "Walking on water and developing software from a specification are easy if both are frozen.", author: "Edward V. Berard" },
    { text: "The most powerful tool we have as developers is automation.", author: "Scott Hanselman" },
    { text: "A language that doesn't affect the way you think about programming is not worth knowing.", author: "Alan J. Perlis" },
    { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
    { text: "Measuring programming progress by lines of code is like measuring aircraft building progress by weight.", author: "Bill Gates" },
    { text: "The function of good software is to make the complex appear simple.", author: "Grady Booch" },
    { text: "In open source, we feel strongly that to really do something well, you have to get a lot of people involved.", author: "Linus Torvalds" },
    { text: "The most disastrous thing that you can ever learn is your first programming language.", author: "Alan Kay" },
  ];

  function init() {
    const textEl = document.getElementById('quote-text');
    const authorEl = document.getElementById('quote-author');
    if (!textEl || !authorEl) return;

    // Pick a quote based on day of year (rotates daily)
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const q = QUOTES[dayOfYear % QUOTES.length];

    textEl.textContent = `"${q.text}"`;
    authorEl.textContent = q.author;
  }

  return { init };
})();
