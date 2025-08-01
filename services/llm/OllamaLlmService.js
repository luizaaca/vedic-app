//criar constructor para o serviço Ollama
const axios = require("axios");
const LlmService = require("./LlmService");

class OllamaLlmService extends LlmService {
   constructor() {
      super();
      this.apiUrl = process.env.OLLAMA_API_URL;
      this.model = process.env.OLLAMA_MODEL;
   }

   /**
    * @override
    */
   async call(prompt) {
      try {

         const response = await axios.post(this.apiUrl + '/api/generate', {
            model: this.model,
            prompt: prompt,
            stream: false,
         });

         // Para depuração, você pode descomentar a linha abaixo para ver a resposta completa.
         // console.log("Full Ollama API response:", JSON.stringify(response.data, null, 2));

         if (!response.data || !response.data.response) {
            throw new Error("Resposta inválida da API Ollama");
         }

         // Limpa espaços em branco no início/fim e retorna o conteúdo.
         return response.data.response.trim();
      } catch (error) {
         if (axios.isCancel(error)) {
            console.log("A requisição para o Ollama foi cancelada.");
         }
         console.error("Erro ao consultar o serviço Ollama:", error.message);
         throw error;
      }
   }
}

module.exports = OllamaLlmService;