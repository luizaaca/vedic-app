const LlmService = require("./LlmService");
const axios = require("axios");

/**
 * Implementação do LlmService para a API da OpenAI.
 */
class OpenAILlmService extends LlmService {
   /**
    */
   constructor() {
      super();
      if (!process.env.LLM_API_KEY_OPENAI) {
         throw new Error("A chave de API da OpenAI é obrigatória.");
      }
      this.apiKey = process.env.LLM_API_KEY_OPENAI;
      this.apiUrl = process.env.OPENAI_API_URL || "https://api.openai.com/v1";
      this.model = process.env.OPENAI_MODEL || "gpt-4o-mini";
   }

   /**
    * @override
    */
   async call(prompt) {
      try {
         const response = await axios.post(
            this.apiUrl + '/chat/completions',
            {
               model: this.model,
               messages: [{ role: "user", content: prompt }],
            },
            {
               headers: {
                  Authorization: `Bearer ${this.apiKey}`,
                  "Content-Type": "application/json",
               },
            }
         );

         const content = response.data?.choices?.[0]?.message?.content;

         if (!content) {
            throw new Error("Resposta vazia da LLM (OpenAI)");
         }

         return content.trim();
      } catch (error) {
         if (error.response) {
            console.error(`Erro da API OpenAI: ${error.response.status}`, error.response.data);
            const newError = new Error(`Erro da API OpenAI: ${error.response.data?.error?.message || error.response.statusText}`);
            newError.statusCode = error.response.status;
            throw newError;
         }
         console.error("Erro ao consultar o serviço OpenAI:", error.message);
         throw error;
      }
   }
}

module.exports = OpenAILlmService;