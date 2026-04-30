const express = require('express');

function startKeepAlive() {
  const app = express();
  const port = process.env.KEEPALIVE_PORT || 3000;

  app.get('/', (req, res) => {
    res.send('Bot is alive!');
  });

  app.listen(port, () => {
    console.log(`Keep-alive server running on port ${port}`);
  });
}

module.exports = { startKeepAlive };
