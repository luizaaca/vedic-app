const LlmService = require("./LlmService");

/**
 * Implementação do LlmService para a API da Groq.
 */
class GroqLlmService extends LlmService {
   constructor() {
      super();
      if (!process.env.LLM_API_KEY_GROQ) {
         throw new Error("A chave de API da Groq é obrigatória.");
      }
      this.apiKey = process.env.LLM_API_KEY_GROQ;
      if (!process.env.GROQ_API_URL) {
         throw new Error("A URL da API Groq é obrigatória.");
      }
      this.apiUrl = process.env.GROQ_API_URL;
   }

   /**
    * @override
    */
   async call(prompt) {
      const llmResponse = await fetch(this.apiUrl + '/chat/completions', {
         method: "POST",
         headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
         },
         body: JSON.stringify({
            model: "meta-llama/llama-4-maverick-17b-128e-instruct",
            messages: [{ role: "user", content: prompt }],
         })
      });

      if (!llmResponse.ok) {
         const errorBody = await llmResponse.text();
         const error = new Error(`Groq API Error: ${llmResponse.status} ${llmResponse.statusText} - ${errorBody}`);
         error.statusCode = llmResponse.status;
         throw error;
      }

      const data = await llmResponse.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) throw new Error("Resposta vazia da LLM (Groq)");
      return content;
   }
}

module.exports = GroqLlmService;
