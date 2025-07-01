
// Simple keep-alive script to prevent Repl timeout
const keepAlive = () => {
  setInterval(() => {
    fetch('/')
      .then(() => console.log('Keep-alive ping sent'))
      .catch(err => console.log('Keep-alive failed:', err));
  }, 5 * 60 * 1000); // Ping every 5 minutes
};

// Start keep-alive when the page loads
if (typeof window !== 'undefined') {
  keepAlive();
}

module.exports = keepAlive;
