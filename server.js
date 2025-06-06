const express = require("express");
const app = express();
const cors = require("cors");
const vedicCalc = require("./vedic/astroService");
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.post("/api/vedic", async (req, res) => {
   try {
      const data = await vedicCalc.getVedicChart(req.body);
      res.json(data);
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Calculation failed" });
   }
});

app.post("/api/explain", async (req, res) => {
   const chart = req.body;

   const prompt = `
Você é um astrólogo védico experiente. Recebeu os seguintes dados de um mapa astral em formato JSON.
Faça um resumo focando nos principais resultados, explicando o motivo e o que diz sobre a pessoa. 
Não seja muito extensivo, quem está falando é um profissional de astrologia védica que quer material 
de suporte (cola) para fornecer sua analise para seu cliente.  Aqui estão os dados:

${JSON.stringify(chart, null, 2)}`;

   try {
      const response = await fetch(
         "https://api.groq.com/openai/v1/chat/completions",
         {
            method: "POST",
            headers: {
               Authorization: `Bearer ${process.env.LLM_API_KEY}`, // Certifique-se de configurar esta variável de ambiente
               "Content-Type": "application/json",
            },
            body: JSON.stringify({
               model: "llama3-8b-8192",
               messages: [{ role: "user", content: prompt }],
            }),
         }
      );

      const data = await response.json();
      // A estrutura da resposta do Groq (compatível com OpenAI) deve funcionar com esta linha
      const content = data.choices?.[0]?.message?.content;

      if (!content) throw new Error("Resposta vazia da LLM");
      res.json({ interpretation: content });
   } catch (error) {
      console.error("Erro ao chamar Groq API:", error);
      res.status(500).json({ error: "Erro ao gerar interpretação" });
   }
});

app.listen(PORT, () =>
   console.log(`Server running on http://localhost:${PORT}`)
);
