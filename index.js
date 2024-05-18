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
  res.sendFile(path.resolve(__dirname, 'src', 'index-stt.html'));
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

const promptForComplication = `
위에서 물어본 질문들을 카테고리화 하면 아래와 같아. 환자의 답변을 기반으로 
정신건강 문제 (우울, 불안, 정신병적 증상 등)
의학적 문제 (만성 질환, 통증 등)
사회적 문제 (실업, 주거 불안정, 가정 폭력 등)
법적 문제 (보호관찰, 미결 사건 등)
기타 중독 치료를 어렵게 하는 요인들
이 5가지 카테고리 중 총 몇 가지가 해당하는 환자인지 답을 내줘.
font decoration 없이 출력
`

const finalPrompt = `
중독과 복잡성 요인 개수에 따라 Tier를 분류할 수 있고 그 기준은 다음과 같아. 해당 환자가 해당하는 tier와 그 근거를 알려줘.
중독 있음은 AUDIT score > 20 이거나, DUDIT score >24를 뜻 해.
복잡성 요인이란 위에서 5가지 카테고리 중 몇 개의 카테고리에 속하는지를 뜻 해.
중독 없음 + 복잡성 요인 없음 = Tier 1
중독 없음 + 복잡성 요인 있음 = Tier 2
중독 있음 + 복잡성 요인 0-1개 = Tier 3
중독 있음 + 복잡성 요인 2-3개 = Tier 4
중독 있음 + 복잡성 요인 4개 이상 = Tier 5

font decoration 없이 출력
`

const checklistToBoolean = (conv) => {
  const list = `checklist: [${checklist.toString()}]
    
    conversation: ${conv}
    
    {checklist}를 기준으로 {conversation}이 {checklist}의 내용에 해당하는지 확인하여 체크리스트에 대한 대화가 이루어졌을 경우 true로 표시. 일부만 해당해도 true로 표시합니다. json [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]과 같은 형태로 출력해주세요. `
  return list;
};

const jsonToPrompt = (conv) => {
  const list = `${conv}
  이 내용을 기반으로 의사가 물어볼 다음 질문을 자연스럽게 하나만 뽑아주세요 (질문만 제시), false로 체크된 내용만 질문해주세요. checklist 순서대로 출력해주세요.
  `
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

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'ejs'));

app.post("/submit", async (req, res) => {
  const { text } = req.body;
  console.log(text);
  const solar = new OpenAI({
    apiKey: process.env.SOLAR_API_KEY,
    baseURL: 'https://api.upstage.ai/v1/solar'
  })
  const chatCompletion = await solar.chat.completions.create({
    model: 'solar-1-mini-chat',
    messages: [
      {
        role: 'user',
        content: 'contents: ' + text + '\n contents 내용을 요약해주세요.'
      }
    ],});
  const abbrev = chatCompletion.choices[0].message.content

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, 
  });

  const resultText = await openai.chat.completions.create({
    messages: [
      {
        role: "user",
        content: text + promptForComplication,
      },
    ],
    model: "gpt-4o",
    temperature: 1,
    max_tokens: 256,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });

  const complication = resultText.choices[0].message.content;

  const finalResult = await openai.chat.completions.create({
    messages: [
      {
        role: "user",
        content: `전체 대화 내용: ${text} \n\n complication 점수: ${complication} \n\n ${finalPrompt}`,
      },
    ],
    model: "gpt-4o",
    temperature: 1,
    max_tokens: 256,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });

  const final = finalResult.choices[0].message.content;

  if (abbrev) {
    res.render('index', { response: abbrev, complication, final });
  } else {
    res.status(500).render('response', { response: "Invalid response format from OpenAI API" });
  }
});

app.post("/upload-text", async (req, res) => {
  const { text } = req.body;
  console.log(text)

  prevConversation.push({ role: "user", content: text });
  console.log(prevConversation);
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

  const lists = combineArraysToObject(checklist, JSON.parse(jsonString));

  console.log(lists)

  const promptAsk = jsonToPrompt(JSON.stringify(lists));
  
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
