const express = require('express');
const app = express();
const vedicCalc = require('./vedic/astroService');

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

app.listen(3000, () => console.log('Server running on http://localhost:3000'));