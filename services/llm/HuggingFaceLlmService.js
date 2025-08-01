const LlmService = require("./LlmService");
const axios = require("axios");

/**
 * Implementação do LlmService para a API de Inferência da Hugging Face.
 */
class HuggingFaceLlmService extends LlmService {
   constructor() {
      super();
      if (!process.env.LLM_API_KEY_HUGGING_FACE) {
         throw new Error(
            "A chave de API da Hugging Face (LLM_API_KEY_HUGGING_FACE) é obrigatória."
         );
      }
      this.apiKey = process.env.LLM_API_KEY_HUGGING_FACE;
      this.apiUrl = process.env.HUGGING_FACE_API_URL;
      this.model = process.env.HUGGING_FACE_MODEL;
   }

   /**
    * @override
    */
   async call(prompt) {
      const defaultOptions = {
         max_length: 1000,
         temperature: 0.7,
         do_sample: true,
         return_full_text: false,
      };
      try {
         const endpointUrl = `${this.apiUrl}/${this.model}`;
         console.log(`Consultando HuggingFace API: ${endpointUrl}`);
         const response = await axios.post(
            endpointUrl,
            {
               inputs: prompt,
               parameters: defaultOptions,
               options: { wait_for_model: true, use_cache: false },
            },
            {
               headers: {
                  Authorization: `Bearer ${this.apiKey}`,
                  "Content-Type": "application/json",
               },
               timeout: 30000, // 30 segundos
            }
         );

         const content = response.data?.[0]?.generated_text || response.data?.[0]?.text || "";

         if (!content) {
            throw new Error(
               "Resposta vazia ou em formato inesperado da API Hugging Face"
            );
         }
         return content.trim();
      } catch (error) {
         if (error.response) {
            const status = error.response.status;
            const message = error.response.data?.error || error.response.data?.message;
            console.error(
               `Erro na resposta da API Hugging Face: ${status} - ${message}`
            );
            let specificError;
            switch (status) {
               case 400:
                  specificError = new Error(`Erro na requisição: ${message}`);
                  break;
               case 401:
                  specificError = new Error("API Key inválida");
                  break;
               case 404:
                  specificError = new Error(
                     `Modelo não encontrado ou URL da API incorreta: ${message}`
                  );
                  break;
               case 429:
                  specificError = new Error(
                     "Rate limit excedido. Tente novamente em alguns minutos."
                  );
                  break;
               case 503:
                  specificError = new Error(
                     "Modelo está carregando. Tente novamente em 10-20 segundos."
                  );
                  break;
               default:
                  specificError = new Error(`Erro HTTP ${status}: ${message}`);
            }
            specificError.statusCode = status;
            throw specificError;
         }
         console.error("Erro ao consultar o serviço Hugging Face:", error.message);
         throw error;
      }
   }
}
module.exports = HuggingFaceLlmService;