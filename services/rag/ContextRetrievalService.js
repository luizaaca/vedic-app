const { CohereEmbeddings } = require("@langchain/cohere");
const { Pinecone } = require("@pinecone-database/pinecone");
const fs = require("fs");
const path = require("path");

class ContextRetrievalService {
   constructor() {
      this.kbMapping = {};
      this.isConfigured = false;

      const { COHERE_API_KEY, PINECONE_API_KEY, PINECONE_INDEX_NAME } =
         process.env;

      if (!COHERE_API_KEY || !PINECONE_API_KEY || !PINECONE_INDEX_NAME) {
         console.warn(
            "Variáveis de ambiente para Cohere ou Pinecone não totalmente configuradas. A recuperação de contexto será desativada."
         );
         throw new Error("Variáveis de ambiente não configuradas");
      }

      try {
         const mappingPath = path.resolve(
            __dirname,
            "..",
            "..",
            "kb_mapping.json"
         );
         if (fs.existsSync(mappingPath)) {
            this.kbMapping = JSON.parse(fs.readFileSync(mappingPath, "utf8"));
         } else {
            console.warn(
               "kb_mapping.json não encontrado. O contexto não será recuperado."
            );
            throw new Error("kb_mapping.json não encontrado");
         }
      } catch (e) {
         console.error("Erro ao carregar kb_mapping.json:", e);
         throw e;
      }

      this.pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
      this.index = this.pinecone.index(PINECONE_INDEX_NAME);
      this.embedder = new CohereEmbeddings({
         apiKey: COHERE_API_KEY,
         model: "embed-multilingual-v3.0",
      });
   }

   async retrieve(queryText) {
      try {
         const queryEmbedding = await this.embedder.embedQuery(queryText);
         const queryResponse = await this.index.query({
            vector: queryEmbedding,
            topK: 7,
         });

         if (queryResponse.matches?.length > 0) {
            const neighborIds = queryResponse.matches.map((match) => match.id);
            const retrievedDocs = neighborIds
               .map((id) => this.kbMapping[id])
               .filter(Boolean);
            return retrievedDocs.length > 0
               ? retrievedDocs.join("\n---\n")
               : "";
         }
         return "";
      } catch (error) {
         console.error(
            "Erro durante a recuperação de contexto:",
            error.message
         );
         throw error;
      }
   }
}

module.exports = ContextRetrievalService;
