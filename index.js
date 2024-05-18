const cors = require("cors");
const express = require("express");
const http = require("http");
const OpenAI = require("openai");
require('dotenv').config();
const path = require('path');
const httpStatus = require('http-status');

const app = express();

PORT = 8080;

app.use(cors());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const server = http.createServer(app);

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'src', 'index.html'));
});

const checklist = [
  "현재 신체적으로 불편한 점이 있으신가요? 예를 들어, 발작, 만성 통증, 임신, 당뇨병, 심장이나 호흡기 질환, 간 질환, 후천성 뇌손상 등이 있으신지 말씀해 주시겠어요?",
  "요즘 정신 건강 문제로 고민하고 계신 부분이 있나요? 예를 들면, 우울증 같은 것들이요. 진단받은 적이 있다면 가장 최근에 입원한 적이 있는지도 말씀해 주시겠어요?",
  "최근에 자해를 하신 적이 있으신가요? 혹은 현재도 자해 행동을 하고 계신가요? 자세한 내용을 말씀해 주실 수 있으실까요?",
  "요즘 들어 자살에 대한 생각을 하시거나 자살을 시도하신 적이 있으신가요? 만약 그렇다면, 현재 안전 대책이 마련되어 있는지 알려주시겠어요?",
  "현재 노숙 상태이신가요? 아니면 노숙할 위험이 있으신가요? 좀 더 자세히 설명해 주실 수 있으신가요?",
  "지금 일자리가 없으신 상황인가요? 아니면 실직할 위험이 있으신가요? 구체적으로 어떤 상황인지 말씀해 주시겠어요?",
  "도박 문제로 인해 걱정되는 부분이 있으신가요? 있다면 어떤 부분인지 설명해 주시겠어요?",
  "과거에 다른 사람을 공격하신 적이 있으시거나, 누군가로부터 공격을 당할 위험이 있으신가요? 자세한 내용을 말씀해 주실 수 있나요?",
  "현재 법적으로 해결해야 할 중요한 문제가 있으신가요? 사법 기관에 연루되어 있는 일이 있으시다면 구체적으로 어떤 상황인지, 다가올 재판일이 있는지 등을 설명해 주시겠어요?",
  "현재 가정 폭력과 관련된 개입 명령이 있으신가요? 피해자로서 혹은 가해자로서 그런 명령을 받은 적이 있으시다면, 자세한 내용과 자녀가 연루되어 있는지 여부를 말씀해 주시겠어요?",
  "가정 폭력을 경험하고 계신가요? 예를 들어, 가해자가 통제하는 행동을 하거나 신체적인 폭행을 하는 등의 일이 있었는지, 본인이나 자녀에게 위협을 가한 적이 있는지, 그리고 현재 안전 대책이 마련되어 있는지 등에 대해 자세히 설명해 주시겠어요? 특히 당신의 안전이 당장 위험에 처해 있다고 생각되시나요?"
];


const checklistToBoolean = (conv) => {
  const list = `checklist: ${checklist.toString()}
    
    conversation: ${conv}
    
    {checklist}를 기준으로 {conversation}이 {checklist}의 내용에 해당하는지 확인하여 체크리스트에 대한 대화가 이루어졌을 경우 true로 표시. 일부만 해당해도 true로 표시합니다. json [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]과 같은 형태로 출력해주세요. `
  return list;
};

const jsonToPrompt = (conv) => {
  const list = `${checklist.toString()}  = ${conv}
  이 내용을 기반으로 의사가 물어볼 다음 질문을 자연스럽게 하나만 뽑아주세요 (질문만 제시), true로 체크된 질문은 제외합니다. checklist 순서대로 출력해주세요.`
  return list;
};

const combineArraysToObject = (keys, values) => {
  const result = {};
  for (let i = 0; i < keys.length; i++) {
    result[keys[i]] = values[i];
  }
  return result;
}

let prevConversation = [];

app.post("/submit", async (req, res) => {
  const { text } = req.body;
  console.log(text);
  const openai = new OpenAI({
    apiKey: process.env.SOLAR_API_KEY,
    baseURL: 'https://api.upstage.ai/v1/solar'
  })
  const chatCompletion = await openai.chat.completions.create({
    model: 'solar-1-mini-chat',
    messages: [
      {
        role: 'user',
        content: 'Say this is a test'
      }
    ],});
  console.log(chatCompletion.choices[0].message.content);
  res.end();
});

app.post("/upload-text", async (req, res) => {
  const { text } = req.body;
  console.log(text)

  prevConversation.push({ role: "user", content: text });
  const promptBool = await checklistToBoolean(JSON.stringify(prevConversation, null, 2));

  const prompt = [
    {role: "user", content: promptBool,}
  ]

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, 
  });

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

  const promptAsk = jsonToPrompt(jsonString);


  const lists = combineArraysToObject(checklist, JSON.parse(jsonString));

  console.log(lists)
  
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


  if (resultText2 && resultText2.choices && resultText2.choices.length > 0) {
    res.json({ response: resultText2.choices[0].message.content, lists });
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
