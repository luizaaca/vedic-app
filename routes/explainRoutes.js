const express = require("express");
const router = express.Router();
const { CohereEmbeddings } = require("@langchain/cohere");
const { Pinecone } = require("@pinecone-database/pinecone");
const fs = require("fs");
const path = require("path");

router.post("/", async (req, res) => {
   const chart = req.body.chartData;
   const question = req.body.question;
   const chartDataString = JSON.stringify(chart, null, 2);

   const currentDate = new Date();
   let context = "Data e hora atual: " + currentDate.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
   }) + " GMT-3\n\n";
   let kbMapping = {};

   try {
      const mappingPath = path.resolve(__dirname, "..", "kb_mapping.json"); // Resolve path relative to project root
      if (fs.existsSync(mappingPath)) {
         kbMapping = JSON.parse(fs.readFileSync(mappingPath, "utf8"));
      } else {
         console.warn(
            "kb_mapping.json não encontrado. O contexto pode não ser recuperado."
         );
      }
   } catch (e) {
      console.error("Erro ao carregar kb_mapping.json:", e);
   }

   try {
      const {
         COHERE_API_KEY,
         PINECONE_API_KEY,
         PINECONE_INDEX_NAME,
      } = process.env; 

      if (!COHERE_API_KEY || !PINECONE_API_KEY || !PINECONE_INDEX_NAME) {
         console.warn(
            "Variáveis de ambiente para Cohere ou Pinecone não totalmente configuradas. A recuperação de contexto pode falhar."
         );
      } else {
         const pinecone = new Pinecone({
            apiKey: PINECONE_API_KEY,
         });

         const index = pinecone.index(PINECONE_INDEX_NAME);

         const embedder = new CohereEmbeddings({
            apiKey: COHERE_API_KEY,
            model: "embed-multilingual-v3.0", 
         });

         const queryTextForEmbedding = (question || chartDataString);
         const queryEmbedding = await embedder.embedQuery(
            queryTextForEmbedding
         );

         const queryResponse = await index.query({
            vector: queryEmbedding,
            topK: 7,
         });

         if (queryResponse.matches && queryResponse.matches.length > 0) {
            const neighborIds = queryResponse.matches.map((match) => match.id);
            
            const retrievedDocs = neighborIds
               .map((id) => kbMapping[id])
               .filter(Boolean); 
            if (retrievedDocs.length > 0) {
               context = retrievedDocs.join("\n---\n");
            }
         }
      }
   } catch (retrievalError) {
      console.error(
         "Erro durante a recuperação de contexto do Pinecone:",
         retrievalError.message,
         retrievalError.stack
      );
   }

   let prompt = `
Você é um astrólogo védico experiente.
Com base nos seguintes dados de um mapa astral em formato JSON, responda à pergunta do usuário.
Se o usuario pedir um resumo do mapa, fale de cada casa (da 1 à 12) e a quais astros estão nelas e o significado disso.
Para calcular as casas, inicie a contagem a partir do signo ascendente. O campo "signs" contem a sequencia dos signos zodiacais.
Então se o ascendente for Áries, a casa 1 é Áries, a casa 2 é Touro, e assim por diante.
Para saber em que casa um planeta está, use o campo signName do planeta e veja qual é a casa seguindo na sequência de signos.
Agrupe os planetas por casa.
Fale assim, por exemplo: "### Casa 2 (Escorpião) **Marte**: Marte na casa 2, indica... ** **Saturno**: Saturno na casa 2, indica...".
Nunca fale em "signIndex", fale em termos de casas: p.ex. 'casa 1, libra' ou 'libra, casas 1', prefira usar a casa junto ao nome do signo.
Sempre sugira perguntas para o usuário continuar a conversa. Seja enxuto.
O resultado deve ser um material de apoio (cola) para que um astrólogo védico forneça uma análise para o cliente. 
Aqui estão os dados:

Contexto:
${context}

Dados do Mapa Astral:
${chartDataString}

Pergunta do Usuário:
${question}

Sua resposta deve ser focada em responder à pergunta, utilizando as informações do mapa astral fornecido.
Use a linguagem pt-br. Retorne formatado com markup, evite espaço entrelinhas em excesso. `;   
   

   try {
      const llmResponse = await fetch(
         "https://api.groq.com/openai/v1/chat/completions",
         {
            method: "POST",
            headers: {
               Authorization: `Bearer ${process.env.LLM_API_KEY}`,
               "Content-Type": "application/json",
            },
            body: JSON.stringify({
               model: "meta-llama/llama-4-maverick-17b-128e-instruct",
               messages: [{ role: "user", content: prompt }],
            }),
         }
      );

      if (!llmResponse.ok) {
         const errorBody = await llmResponse.text();
         throw new Error(
            `Groq API Error: ${llmResponse.status} ${llmResponse.statusText} - ${errorBody}`
         );
      }

      const data = await llmResponse.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) throw new Error("Resposta vazia da LLM");
      res.json({ interpretation: content });
   } catch (error) {
      console.error(
         "Erro ao chamar Groq API ou processar resposta:",
         error.message,
         error.stack
      );
      res.status(500).json({
         error: "Erro ao gerar interpretação",
         details: error.message,
      });
   }
});

module.exports = router;
