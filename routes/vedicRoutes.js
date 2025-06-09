const express = require("express");
const router = express.Router();
const vedicCalc = require("../vedic/astroService");

router.post("/", async (req, res) => {
   try {
      const data = await vedicCalc.getVedicChart(req.body);
      res.json(data);
   } catch (err) {
      console.error("Erro no endpoint /api/vedic:", err.message, err.stack);
      res.status(500).json({
         error: "Calculation failed",
         details: err.message,
      });
   }
});

module.exports = router;
