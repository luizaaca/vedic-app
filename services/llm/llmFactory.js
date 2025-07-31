const GroqLlmService = require("./GroqLlmService");
const OllamaLlmService = require("./OllamaLlmService");
// No futuro, você pode adicionar outras implementações aqui.

/**
 * Cria uma instância de um serviço de LLM com base nas variáveis de ambiente.
 * @returns {import('./LlmService')} Uma instância de um serviço que segue a interface LlmService.
 */
const createLlmService = () => {
   const llmProvider = process.env.LLM_PROVIDER || 'groq'; // 'groq' como padrão
   const apiKey = process.env.LLM_API_KEY;

   if (!apiKey) {
      console.warn("LLM_API_KEY não configurada. O serviço de LLM não funcionará.");
      // Retorna um serviço "dummy" que falhará de forma controlada
      return {
         call: () => Promise.reject(new Error("Serviço de LLM não configurado. Falta a LLM_API_KEY."))
      };
   }

   switch (llmProvider.toLowerCase()) {
      case 'groq':
         return new GroqLlmService(apiKey);
      case 'ollama':
         return new OllamaLlmService();
      default:
         throw new Error(`Provedor de LLM desconhecido: ${llmProvider}`);
   }
};

module.exports = { createLlmService };
