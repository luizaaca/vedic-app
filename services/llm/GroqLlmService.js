const LlmService = require("./LlmService");

/**
 * Implementação do LlmService para a API da Groq.
 */
class GroqLlmService extends LlmService {
   constructor(apiKey) {
      super();
      if (!apiKey) {
         throw new Error("A chave de API da Groq é obrigatória.");
      }
      this.apiKey = apiKey;
      this.apiUrl = "https://api.groq.com/openai/v1/chat/completions";
   }

   /**
    * @override
    */
   async call(prompt) {
      const llmResponse = await fetch(this.apiUrl, {
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
