const cors = require("cors");
const express = require("express");
const http = require("http");
const OpenAI = require("openai");
require('dotenv').config();


const app = express();

PORT = 8080;

app.use(cors());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const server = http.createServer(app);

app.get("/", (req, res) => {
  res.json("API for upstage");
});

const checklist = [

  "콧물이 시작된 시점을 확인하였다.",
  
  "콧물의 빈도에 대해서 물어보았다.",
  
  "콧물의 지속 시간에 대해서 물어보았다.",
  
  "콧물의 성상에 대해 질문하였다.",
  
  "콧물의 수양성에 대해 질문하였다.",
  
  "콧물의 점액성에 대해 질문하였다.",
  
  "콧물의 농성에 대해 질문하였다.",
  
  "콧물의 혈성에 대해 질문하였다.",
  
  "콧물의 색깔에 대해 질문하였다.",
  
  "콧물의 냄새에 대해 질문하였다.",
  
  "콧물이 한쪽에서 나오는지 확인하였다.",
  
  "콧물이 양쪽에서 나오는지 확인하였다.",
  
  "전신 증상에 대해 질문하였다.",
  
  "체중 감소에 대해 질문하였다.",
  
  "발열에 대해 질문하였다.",
  
  "피로에 대해 질문하였다.",
  
  "몸살에 대해 질문하였다.",
  
  "호흡기 증상에 대해 질문하였다.",
  
  "코막힘에 대해 질문하였다.",
  
  "가려움증에 대해 질문하였다.",
  
  "재채기에 대해 질문하였다.",
  
  "후비루에 대해 질문하였다.",
  
  "기침에 대해 질문하였다.",
  
  "가래에 대해 질문하였다.",
  
  "콧물이 특정 계절이나 장소에서 악화되는지 확인하였다."
  
  ];

const checklistToBoolean = (conv) => {
  const list = `checklist: ${checklist.toString()}
    
    conversation: ${conv}
    
    {checklist}를 기준으로 {conversation}이 {checklist}의 내용에 해당하는지 확인하여 json [boolean,boolean,...]과 같은 형태로 출력해주세요. `
  return list;
};

const jsonToPrompt = (conv) => {
  const list = `${checklist.toString()}  = ${conv}
  이 내용을 기반으로 다음 질문을 자연스럽게 하나만 뽑아주세요 (질문만 제시), true로 체크된 질문은 제외합니다.`
  return list;
};

let prevConversation = [];

app.post("/upload-text", async (req, res) => {
  const { text } = req.body;
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, 
  });

  prevConversation.push({ role: "user", content: text });
  const promptBool = await checklistToBoolean(JSON.stringify(prevConversation, null, 2));

  const prompt = [
    {role: "user", content: promptBool,}
  ]

  const resultText = await openai.chat.completions.create({
    messages: prompt,
    model: "gpt-4o",
    temperature: 1,
    max_tokens: 256,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });

  const jsonString = resultText.choices[0].message.content.replace(/```json\n|```/g, '');

  console.log(jsonString)

  const promptAsk = jsonToPrompt(jsonString);
  
  const prompt2 = [
    {role: "user", content: promptAsk,}
  ]

  const resultText2 = await openai.chat.completions.create({
    messages: prompt2,
    model: "gpt-4o",
    temperature: 1,
    max_tokens: 256,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });

  prevConversation.push({ role: "assistant", content: resultText2.choices[0].message.content });

  console.log(prevConversation)

  if (resultText2 && resultText2.choices && resultText2.choices.length > 0) {
    res.json({ response: resultText2.choices[0].message.content });
  } else {
    res.status(500).json({ error: "Invalid response format from OpenAI API" });
  }
});


app.all("*", (req, res) => {
  res.status(httpStatus.NOT_FOUND).json("Not Found");
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
