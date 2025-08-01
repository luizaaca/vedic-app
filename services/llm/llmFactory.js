const GroqLlmService = require("./GroqLlmService");
const OllamaLlmService = require("./OllamaLlmService");
const OpenAILlmService = require("./OpenAILlmService");
const HuggingFaceLlmService = require("./HuggingFaceLlmService");
const OpenRouterLlmService = require("./OpenRouterLlmService");

/**
 * Cria uma instância de um serviço de LLM com base nas variáveis de ambiente.
 * @returns {import('./LlmService')} Uma instância de um serviço que segue a interface LlmService.
 */
const createLlmService = () => {
   const llmProvider = (process.env.LLM_PROVIDER || "groq").toLowerCase();   

   switch (llmProvider) {
      case "groq":
         return new GroqLlmService();
      case "openai":
         return new OpenAILlmService();
      case "ollama":
         return new OllamaLlmService();
      case "huggingface":         
         return new HuggingFaceLlmService();
      case "openrouter":
         return new OpenRouterLlmService();
      default:
         throw new Error(`Provedor de LLM desconhecido: ${llmProvider}`);
   }
};

module.exports = { createLlmService };
