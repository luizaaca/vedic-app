const express = require("express");
const router = express.Router();
const { createLlmService } = require("../services/llm/llmFactory");
const { prompt_initial, prompt_question } = require("../prompts/explain-astral-chart.prompt");
const ContextRetrievalService = require("../services/rag/ContextRetrievalService");

router.post("/", async (req, res) => {
   const chart = req.body.chartData;
   const question = req.body.question;
   const chatMessages = req.body.chatMessages;
   const initialQuestion = req.body.initial;
   const chartDataString = JSON.stringify(chart, null, 2);

   const initialContext =
      "Data e hora atual: " +
      new Date().toLocaleString("pt-BR", {
         timeZone: "America/Sao_Paulo",
      }) +
      " GMT-3\n\n";

   let retrievedContext = "";

   try {
      const contextService = new ContextRetrievalService();
      const queryTextForEmbedding = question || chartDataString;
      retrievedContext = await contextService.retrieve(queryTextForEmbedding);
   } catch (error) {
      console.error(
         "Erro ao instanciar ou usar o ContextRetrievalService:",
         error.message
      );
      //throw error; // Descomente se quiser interromper a execução
   }   
   
   let promptWithContext = "";
   if(initialQuestion === true) {
      promptWithContext = prompt_initial;
   }else {
      const history = chatMessages ? JSON.stringify(chatMessages, null, 2) : "O histórico de perguntas não foi disponibilizado.";
      promptWithContext = prompt_question.replace("{{history}}", history);
   }
   promptWithContext = promptWithContext
      .replace("{{initialContext}}", initialContext + retrievedContext)
      .replace("{{chartDataString}}", chartDataString)
      .replace("{{question}}", question);

      try {      
      const llmService = createLlmService();
      const interpretation = await llmService.call(promptWithContext);
      res.json({ interpretation });
   } catch (error) {
      console.error(
         "Erro ao gerar interpretação via LLM Service:",
         error.message,
         error.stack
      );
      res.status(error.statusCode || 500).json({
         error: "Erro ao gerar interpretação",
         details: error.message,
      });
   }
});

module.exports = router;
