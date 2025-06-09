const express = require("express");
const router = express.Router();
const { CohereEmbeddings } = require("@langchain/cohere"); // Alterado para Cohere
const { Pinecone } = require("@pinecone-database/pinecone");
// Note: 'fetch' is globally available in Node.js v18+
// Se estiver usando uma versão anterior do Node.js e 'fetch' não estiver disponível,
// você pode precisar instalar um pacote como 'node-fetch': npm install node-fetch
// e importá-lo: const fetch = require('node-fetch');
const fs = require("fs");
const path = require("path");

router.post("/", async (req, res) => {
   const chart = req.body.chartData;
   const question = req.body.question;
   const chartDataString = JSON.stringify(chart, null, 2);

   let context =
      "Nenhum contexto adicional relevante encontrado na base de conhecimento.";
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
      } = process.env; // Alterado para COHERE_API_KEY

      if (!COHERE_API_KEY || !PINECONE_API_KEY || !PINECONE_INDEX_NAME) {
         console.warn(
            "Variáveis de ambiente para Cohere ou Pinecone não totalmente configuradas. A recuperação de contexto pode falhar."
         );
      } else {
         // 1️⃣ Recuperação com Pinecone
         const pinecone = new Pinecone({
            apiKey: PINECONE_API_KEY,
         });

         const index = pinecone.index(PINECONE_INDEX_NAME);

         const embedder = new CohereEmbeddings({
            apiKey: COHERE_API_KEY, // Cohere usa 'apiKey'
            model: "embed-multilingual-v3.0", // Exemplo: use o mesmo modelo do script de ingestão
            // Para modelos v2, seria modelName: "multilingual-22-12" por exemplo
         });

         const queryTextForEmbedding = question || chartDataString;
         const queryEmbedding = await embedder.embedQuery(
            queryTextForEmbedding
         );

         const queryResponse = await index.query({
            vector: queryEmbedding,
            topK: 5,
            // includeValues: false, // Geralmente não precisamos dos vetores de volta
            // includeMetadata: true, // Se você armazenar o texto como metadados no Pinecone
         });

         if (queryResponse.matches && queryResponse.matches.length > 0) {
            const neighborIds = queryResponse.matches.map((match) => match.id);

            // Se você armazenou o texto diretamente como metadados no Pinecone:
            // const retrievedDocs = queryResponse.matches
            //    .map((match) => match.metadata?.text) // Supondo que o texto está em metadata.text
            //    .filter(Boolean);
            // if (retrievedDocs.length > 0) {
            //    context = retrievedDocs.join("\n---\n");
            // }

            // Usando kb_mapping.json (como estava antes para Vertex AI)
            const retrievedDocs = neighborIds
               .map((id) => kbMapping[id])
               .filter(Boolean); // Filtra IDs não encontrados no mapeamento
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
      // Prosseguir com o contexto padrão
   }

   let prompt;
   if (question && question.trim() !== "") {
      prompt = `
Você é um astrólogo védico experiente.
Com base nos seguintes dados de um mapa astral em formato JSON, responda à pergunta do usuário.
Use a linguagem pt-br.

Contexto:
${context}

Dados do Mapa Astral:
${chartDataString}

Pergunta do Usuário:
${question}

Sua resposta deve ser focada em responder à pergunta, utilizando as informações do mapa astral fornecido.`;
   } else {
      prompt = `
Você é um astrólogo védico experiente. Recebeu os seguintes dados de um mapa astral em formato JSON.
Faça um resumo em tópicos focando nos principais resultados, explicando o motivo e o que diz sobre a pessoa. 
O resultado deve ser um material de apoio (cola) para que um astrólogo védico forneça uma analise para o cliente. 
Use pt-br e reponda com texto formatado, quebra de linha etc. Aqui estão os dados:

Contexto:
${context}

Dados do Mapa Astral:
${chartDataString}`;
   }

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
