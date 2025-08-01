const LlmService = require("./LlmService");
const axios = require("axios");

/**
 * Implementação do LlmService para a API da OpenRouter.
 */
class OpenRouterLlmService extends LlmService {
   constructor() {
      super();
      if (!process.env.LLM_API_KEY_OPEN_ROUTER) {
         throw new Error(
            "A chave de API da OpenRouter (LLM_API_KEY_OPEN_ROUTER) é obrigatória."
         );
      }
      this.apiKey = process.env.LLM_API_KEY_OPEN_ROUTER;
      this.apiUrl = process.env.OPEN_ROUTER_API_URL;
      this.model = process.env.OPEN_ROUTER_MODEL;

      // Headers recomendados pela OpenRouter para identificação
      this.siteUrl =
         process.env.SITE_URL || "https://vedic-web-lemon.vercel.app/";
      this.appName = process.env.APP_NAME || "Vedic App";
   }

   /**
    * @override
    */
   async call(prompt) {
      try {
         console.log(`Consultando OpenRouter API: ${this.apiUrl}`);
         const response = await axios.post(
            this.apiUrl,
            {
               model: this.model,
               messages: [{ role: "user", content: prompt }],
            },
            {
               headers: {
                  Authorization: `Bearer ${this.apiKey}`,
                  "Content-Type": "application/json",
                  "HTTP-Referer": this.siteUrl,
                  "X-Title": this.appName,
               },
            }
         );

         const content = response.data?.choices?.[0]?.message?.content;

         if (!content) {
            throw new Error("Resposta vazia da LLM (OpenRouter)");
         }

         return content.trim();
      } catch (error) {
         if (error.response) {
            console.error(
               `Erro da API OpenRouter: ${error.response.status}`,
               error.response.data
            );
            const newError = new Error(
               `Erro da API OpenRouter: ${
                  error.response.data?.error?.message ||
                  error.response.statusText
               }`
            );
            newError.statusCode = error.response.status;
            throw newError;
         }
         console.error(
            "Erro ao consultar o serviço OpenRouter:",
            error.message
         );
         throw error;
      }
   }
}

module.exports = OpenRouterLlmService;
