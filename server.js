const express = require('express');
const app = express();
const vedicCalc = require('./vedic/astroService');
const PORT = process.env.PORT || 8080;

app.use(express.json());

app.post('/api/vedic', async (req, res) => {
  try {
    const data = await vedicCalc.getVedicChart(req.body);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Calculation failed' });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));