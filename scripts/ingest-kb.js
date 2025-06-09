// scripts/ingest_kb.js
// Importar classes corretas dos pacotes atualizados
import "dotenv/config";
import { CohereEmbeddings } from "@langchain/cohere"; // Alterado para Cohere
import { Pinecone } from "@pinecone-database/pinecone";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Corrige __dirname para módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Carrega sua KB como um texto
const kbFilePath = path.resolve(__dirname, "kb", "vedic_kb.txt");
const kbText = fs.readFileSync(kbFilePath, "utf8");

// 2. Chunking simples
const chunkSize = 1000;
const chunks = [];
for (let i = 0; i < kbText.length; i += chunkSize) {
   chunks.push(kbText.slice(i, i + chunkSize));
}

// 3. Cria embeddings e insere no Pinecone
async function ingest() {
   const {
      COHERE_API_KEY,
      PINECONE_API_KEY,
      PINECONE_INDEX_NAME,
   } = process.env; // Alterado para COHERE_API_KEY

   if (!COHERE_API_KEY || !PINECONE_API_KEY || !PINECONE_INDEX_NAME) {
      console.error(
         "Variáveis de ambiente necessárias não definidas: COHERE_API_KEY, PINECONE_API_KEY, PINECONE_INDEX_NAME"
      );
      process.exit(1);
   }

   // Inicializa o cliente Pinecone
   const pinecone = new Pinecone({
      apiKey: PINECONE_API_KEY,
   });

   const index = pinecone.index(PINECONE_INDEX_NAME);
   console.log(`Alvo do índice Pinecone: ${PINECONE_INDEX_NAME}`);

   const embedder = new CohereEmbeddings({
      apiKey: COHERE_API_KEY, // Cohere usa 'apiKey'
      model: "embed-multilingual-v3.0", // Exemplo: escolha o modelo Cohere desejado. Verifique a dimensão!
      // Para modelos v2, seria modelName: "multilingual-22-12" por exemplo
   });

   const ids = chunks.map((_, i) => `chunk-${i}`);
   console.log(`Gerando embeddings para ${chunks.length} chunks...`);
   // Usa embedDocuments para processar todos os chunks de uma vez (mais eficiente)
   const embeddings = await embedder.embedDocuments(chunks);
   console.log("Embeddings gerados.");

   const vectorsToUpsert = embeddings.map((embedding, i) => ({
      id: ids[i],
      values: embedding,
      // Opcional: Adicionar metadados, como o próprio texto do chunk
      // metadata: {
      //    text: chunks[i],
      // },
   }));

   try {
      console.log(
         `Fazendo upsert de ${vectorsToUpsert.length} vetores para o índice Pinecone...`
      );
      // O Pinecone faz upsert em lotes, se necessário, mas para um número menor de vetores,
      // podemos enviar todos de uma vez. Para grandes datasets, considere dividir em lotes.
      // O limite de tamanho por requisição de upsert é de 2MB.
      // O método `upsert` do cliente Pinecone lida com o envio em lotes automaticamente se a lista for muito grande.
      await index.upsert(vectorsToUpsert);

      console.log(
         `${vectorsToUpsert.length} vetores enviados para upsert no Pinecone.`
      );

      // Salvar o mapeamento de ID para chunk de texto
      const kbMapping = {};
      chunks.forEach((chunk, i) => {
         kbMapping[ids[i]] = chunk;
      });
      fs.writeFileSync(
         path.resolve(__dirname, "..", "kb_mapping.json"), // Salva na raiz do projeto
         JSON.stringify(kbMapping, null, 2),
         "utf8"
      );
      console.log("Mapeamento de KB salvo em kb_mapping.json");
   } catch (err) {
      console.error("Erro ao fazer upsert de vetores para Pinecone:", err);
   }
}

ingest();
