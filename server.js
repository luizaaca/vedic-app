require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const PORT = process.env.PORT || 8080;

// Importar os módulos de rota
const vedicRoutes = require("./routes/vedicRoutes");
const explainRoutes = require("./routes/explainRoutes");

app.use(cors());
app.use(express.json());

// Usar os módulos de rota
app.use("/api/vedic", vedicRoutes);
app.use("/api/explain", explainRoutes);

app.listen(PORT, () =>
   console.log(`Server running on http://localhost:${PORT}`)
);
