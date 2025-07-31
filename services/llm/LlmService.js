/**
 * Classe base (abstrata) que define a interface para um serviço de LLM.
 */
class LlmService {
   /**
    * Gera uma interpretação com base em um prompt.
    * @param {string} prompt - O prompt a ser enviado para a LLM.
    * @returns {Promise<string>} O conteúdo da resposta da LLM.
    */
   async call(prompt) {
      throw new Error("O método 'call' deve ser implementado pela subclasse.");
   }
}

module.exports = LlmService;
