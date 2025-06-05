'use strict';
const fetchJsonFile = await fetch('./api.json');
const DID_API = await fetchJsonFile.json();


function extractJsonFromString(inputString) {
  try {
    const match = inputString.match(/\{[\s\S]*\}/); // tương đương re.DOTALL
    if (match) {
      return JSON.parse(match[0]);
    } else {
      console.log("Không tìm thấy JSON.");
      return null;
    }
  } catch (error) {
    console.error("Lỗi khi parse JSON:", error.message);
    return null;
  }
}
async function callGpt4oMini(inputText) {
  const apiKey = ''; // 👈 Thay bằng API Key của bạn
  const endpoint = 'https://api.openai.com/v1/chat/completions';

  const messages = [
    {
      role: "system",
      content: "Bạn là AI trích xuất các sản phẩm từ đoạn text, từ đó mô tả chi tiết thêm các sản phẩm và trả ra output là một json với số key-value tương ứng với số sản phẩm",
    },
    {
      role: "user",
      content: `Hãy chia nội dung bên dưới thành một Json theo định dạng: {"sp1": "<mô tả chi tiết sản phẩm 1>", "sp2": "<mô tả chi tiết sản phẩm 2>",...}. Lưu ý: cần mô tả chi tiết hơn các sản phẩm trong khoảng ít nhất 40 từ. Dưới đây là đoạn văn cần trích xuất:\n\n${inputText}\nJson output:`,
    }
  ];

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages,
        temperature: 0.7
      })
    });

    const result = await response.json();
    // console.log(result)
    const reply = result.choices?.[0]?.message?.content || '';
    // console.log(reply)
    const parsedJson = extractJsonFromString(reply);
    console.log(parsedJson)
    return parsedJson;

  } catch (error) {
    console.error("Lỗi khi gọi GPT-4o mini:", error);
    return {};
  }
}

if (DID_API.key == '🤫') alert('Please put your api key inside ./api.json and restart..');

const RTCPeerConnection = (
  window.RTCPeerConnection ||
  window.webkitRTCPeerConnection ||
  window.mozRTCPeerConnection
).bind(window);

let peerConnection;
let streamId;
let sessionId;
let sessionClientAnswer;
let statsIntervalId;
let videoIsPlaying;
let lastBytesReceived;
let agentId = "agt_M1rjPI4R";
let chatId;

const videoElement = document.getElementById('video-element');
videoElement.setAttribute('playsinline', '');
const peerStatusLabel = document.getElementById('peer-status-label');
const iceStatusLabel = document.getElementById('ice-status-label');
const iceGatheringStatusLabel = document.getElementById('ice-gathering-status-label');
const signalingStatusLabel = document.getElementById('signaling-status-label');
const streamingStatusLabel = document.getElementById('streaming-status-label');
const agentIdLabel = document.getElementById('agentId-label');
const chatIdLabel = document.getElementById('chatId-label');
const textArea = document.getElementById('textArea');
let checkstatus = "end"

// Play the idle video when the page is loaded
window.onload = (event) => {
  playIdleVideo();

  if (agentId == '' || agentId == undefined) {
    console.log(
      "Empty 'agentID' and 'chatID' variables\n\n1. Click on the 'Create new Agent with Knowledge' button\n2. Open the Console and wait for the process to complete\n3. Press on the 'Connect' button\n4. Type and send a message to the chat\nNOTE: You can store the created 'agentID' and 'chatId' variables at the bottom of the JS file for future chats"
    );
  } else {
    console.log(
      "You are good to go!\nClick on the 'Connect Button', Then send a new message\nAgent ID: ",
      agentId,
      '\nChat ID: ',
      chatId
    );
    agentIdLabel.innerHTML = agentId;
    chatIdLabel.innerHTML = chatId;
  }
};
async function createPeerConnection(offer, iceServers) {
  if (!peerConnection) {
    peerConnection = new RTCPeerConnection({ iceServers });
    peerConnection.addEventListener('icegatheringstatechange', onIceGatheringStateChange, true);
    peerConnection.addEventListener('icecandidate', onIceCandidate, true);
    peerConnection.addEventListener('iceconnectionstatechange', onIceConnectionStateChange, true);
    peerConnection.addEventListener('connectionstatechange', onConnectionStateChange, true);
    peerConnection.addEventListener('signalingstatechange', onSignalingStateChange, true);
    peerConnection.addEventListener('track', onTrack, true);
  }

  await peerConnection.setRemoteDescription(offer);
  console.log('set remote sdp OK');

  const sessionClientAnswer = await peerConnection.createAnswer();
  console.log('create local sdp OK');

  await peerConnection.setLocalDescription(sessionClientAnswer);
  console.log('set local sdp OK');

  // Data Channel creation (for dispalying the Agent's responses as text)
  let dc = await peerConnection.createDataChannel('JanusDataChannel');
  dc.onopen = () => {
    console.log('datachannel open');
  };

  let decodedMsg;
  // Agent Text Responses - Decoding the responses, pasting to the HTML element
  dc.onmessage = (event) => {
    let msg = event.data;
    let msgType = 'chat/answer:';
    if (msg.includes(msgType)) {
      msg = decodeURIComponent(msg.replace(msgType, ''));
      console.log(msg);
      decodedMsg = msg;
      return decodedMsg;
    }
    if (msg.includes('stream/started')) {
      console.log(msg);
      checkstatus = "start"
      // document.getElementById('msgHistory').innerHTML += `<span>${decodedMsg}</span><br><br>`;
      }
    else if (msg.includes('stream/done')) {
      console.log('Stream done:', msg);
      checkstatus = "end" }
    else if (msg.includes('stream/ready')) {
      console.log('Stream ready:', msg);
      checkstatus = "start" }
    else {
      // checkstatus = "start"
      console.log(msg);
    }
  };

  dc.onclose = () => {
    console.log('datachannel close');
  };

  return sessionClientAnswer;
}
function onIceGatheringStateChange() {
  iceGatheringStatusLabel.innerText = peerConnection.iceGatheringState;
  iceGatheringStatusLabel.className = 'iceGatheringState-' + peerConnection.iceGatheringState;
}
function onIceCandidate(event) {
  if (event.candidate) {
    const { candidate, sdpMid, sdpMLineIndex } = event.candidate;

    // WEBRTC API CALL 3 - Submit network information
    fetch(`${DID_API.url}/${DID_API.service}/streams/${streamId}/ice`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${DID_API.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        candidate,
        sdpMid,
        sdpMLineIndex,
        session_id: sessionId,
      }),
    });
  }
}
function onIceConnectionStateChange() {
  iceStatusLabel.innerText = peerConnection.iceConnectionState;
  iceStatusLabel.className = 'iceConnectionState-' + peerConnection.iceConnectionState;
  if (peerConnection.iceConnectionState === 'failed' || peerConnection.iceConnectionState === 'closed') {
    stopAllStreams();
    closePC();
  }
}
function onConnectionStateChange() {
  // not supported in firefox
  peerStatusLabel.innerText = peerConnection.connectionState;
  peerStatusLabel.className = 'peerConnectionState-' + peerConnection.connectionState;
}
function onSignalingStateChange() {
  signalingStatusLabel.innerText = peerConnection.signalingState;
  signalingStatusLabel.className = 'signalingState-' + peerConnection.signalingState;
}
function onVideoStatusChange(videoIsPlaying, stream) {
  let status;
  if (videoIsPlaying) {
    status = 'streaming';

    const remoteStream = stream;
    setVideoElement(remoteStream);
  } else {
    status = 'empty';
    playIdleVideo();
  }
  streamingStatusLabel.innerText = status;
  streamingStatusLabel.className = 'streamingState-' + status;
}
function onTrack(event) {
  /**
   * The following code is designed to provide information about wether currently there is data
   * that's being streamed - It does so by periodically looking for changes in total stream data size
   *
   * This information in our case is used in order to show idle video while no video is streaming.
   * To create this idle video use the POST https://api.d-id.com/talks (or clips) endpoint with a silent audio file or a text script with only ssml breaks
   * https://docs.aws.amazon.com/polly/latest/dg/supportedtags.html#break-tag
   * for seamless results use `config.fluent: true` and provide the same configuration as the streaming video
   */

  if (!event.track) return;

  statsIntervalId = setInterval(async () => {
    const stats = await peerConnection.getStats(event.track);
    stats.forEach((report) => {
      if (report.type === 'inbound-rtp' && report.kind === 'video') {
        const videoStatusChanged = videoIsPlaying !== report.bytesReceived > lastBytesReceived;

        if (videoStatusChanged) {
          videoIsPlaying = report.bytesReceived > lastBytesReceived;
          onVideoStatusChange(videoIsPlaying, event.streams[0]);
        }
        lastBytesReceived = report.bytesReceived;
      }
    });
  }, 500);
}
function setVideoElement(stream) {
  if (!stream) return;
  // Add Animation Class
  videoElement.classList.add('animated');

  // Removing browsers' autoplay's 'Mute' Requirement
  videoElement.muted = false;

  videoElement.srcObject = stream;
  videoElement.loop = false;

  // Remove Animation Class after it's completed
  setTimeout(() => {
    videoElement.classList.remove('animated');
  }, 1000);

  // safari hotfix
  if (videoElement.paused) {
    videoElement
      .play()
      .then((_) => {})
      .catch((e) => {});
  }
}
function playIdleVideo() {
  // Add Animation Class
  videoElement.classList.toggle('animated');

  videoElement.srcObject = undefined;
  videoElement.src = 'alex_v2_idle.mp4';
  videoElement.loop = true;

  // Remove Animation Class after it's completed
  setTimeout(() => {
    videoElement.classList.remove('animated');
  }, 1000);
}
function stopAllStreams() {
  if (videoElement.srcObject) {
    console.log('stopping video streams');
    videoElement.srcObject.getTracks().forEach((track) => track.stop());
    videoElement.srcObject = null;
  }
}
function closePC(pc = peerConnection) {
  if (!pc) return;
  console.log('stopping peer connection');
  pc.close();
  pc.removeEventListener('icegatheringstatechange', onIceGatheringStateChange, true);
  pc.removeEventListener('icecandidate', onIceCandidate, true);
  pc.removeEventListener('iceconnectionstatechange', onIceConnectionStateChange, true);
  pc.removeEventListener('connectionstatechange', onConnectionStateChange, true);
  pc.removeEventListener('signalingstatechange', onSignalingStateChange, true);
  pc.removeEventListener('track', onTrack, true);
  clearInterval(statsIntervalId);
  iceGatheringStatusLabel.innerText = '';
  signalingStatusLabel.innerText = '';
  iceStatusLabel.innerText = '';
  peerStatusLabel.innerText = '';
  console.log('stopped peer connection');
  if (pc === peerConnection) {
    peerConnection = null;
  }
}
const maxRetryCount = 3;
const maxDelaySec = 4;
async function fetchWithRetries(url, options, retries = 1) {
  try {
    return await fetch(url, options);
  } catch (err) {
    if (retries <= maxRetryCount) {
      const delay = Math.min(Math.pow(2, retries) / 4 + Math.random(), maxDelaySec) * 1000;

      await new Promise((resolve) => setTimeout(resolve, delay));

      console.log(`Request failed, retrying ${retries}/${maxRetryCount}. Error ${err}`);
      return fetchWithRetries(url, options, retries + 1);
    } else {
      throw new Error(`Max retries exceeded. error: ${err}`);
    }
  }
}

const connectButton = document.getElementById('connect-button');
connectButton.onclick = async () => {
  if (agentId == '' || agentId === undefined) {
    return alert(
      "1. Click on the 'Create new Agent with Knowledge' button\n2. Open the Console and wait for the process to complete\n3. Press on the 'Connect' button\n4. Type and send a message to the chat\nNOTE: You can store the created 'agentID' and 'chatId' variables at the bottom of the JS file for future chats"
    );
  }

  if (peerConnection && peerConnection.connectionState === 'connected') {
    return;
  }
  stopAllStreams();
  closePC();

  // WEBRTC API CALL 1 - Create a new stream $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
  const url = `https://api.d-id.com/agents/${agentId}/streams`;
  const options = {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Basic ${DID_API.key}`,
    },
    body: JSON.stringify({ stream_warmup: false, fluent: false })
  };

  const sessionResponse = await fetch(url, options);

  const {
    id: newStreamId,
    offer,
    ice_servers: iceServers,
    session_id: newSessionId
  } = await sessionResponse.json();

  streamId = newStreamId;
  sessionId = newSessionId;
  const chatUrl = `https://api.d-id.com/agents/${agentId}/chat`;
  const chatOptions = {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Basic ${DID_API.key}`,
    }
  };

  try {
    const chatResponse = await fetch(chatUrl, chatOptions);
    const chatData = await chatResponse.json();
    chatId = chatData.id; // Gán chat_id từ phản hồi
    console.log('Chat ID:', chatId);
  } catch (err) {
    console.error('Error creating chat:', err);
    return;
  }
  // $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
  try {
    sessionClientAnswer = await createPeerConnection(offer, iceServers);
  } catch (e) {
    console.log('error during streaming setup', e);
    stopAllStreams();
    closePC();
    return;
  }
// 
  // WEBRTC API CALL 2 - Start a stream
  const sdpResponse = await fetch(`${DID_API.url}/${DID_API.service}/streams/${streamId}/sdp`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${DID_API.key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      answer: sessionClientAnswer,
      session_id: sessionId,
    }),
  });

  // // $$$$$
  if (peerConnection?.signalingState === 'stable' || peerConnection?.iceConnectionState === 'connected') {
    // Pasting the user's message to the Chat History element


    // Agents Overview - Step 3: Send a Message to a Chat session - Send a message to a Chat
    const playResponse = await fetchWithRetries(`${DID_API.url}/agents/${agentId}/chat/${chatId}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${DID_API.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        streamId: streamId,
        sessionId: sessionId,
        messages: [
          {
            role: 'user',
            content: "Hãy giới thiệu với khách hàng nguyên văn câu sau: 'Xin chào cả nhà! Chào mừng mọi người đến với buổi livestream hôm nay, cùng mình khám phá những sản phẩm siêu hot và nhận thật nhiều ưu đãi nhé!' ",
            created_at: new Date().toString(),
          },
        ],
      }),
    });
    const playResponseData = await playResponse.json();
    if (playResponse.status === 200 && playResponseData.chatMode === 'TextOnly') {
      console.log('User is out of credit, API only return text messages');
    }
  }
  // $$$$$$
};

const startButton = document.getElementById('start-button');
startButton.onclick = async () => {
  // connectionState not supported in firefox
  if (peerConnection?.signalingState === 'stable' || peerConnection?.iceConnectionState === 'connected') {
    if (checkstatus === "start") {
      console.log("Streaming is already started. Aborting...");
      return; // Dừng hàm tại đây
    }
    // Pasting the user's message to the Chat History element
    // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
    // stopAllStreams();
    // closePC();
    // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
    document.getElementById(
      'msgHistory'
    ).innerHTML += `<span style='opacity:0.5'><u>User:</u> ${textArea.value}</span><br>`;

    // Storing the Text Area value
    let txtAreaValue = document.getElementById('textArea').value;

    // Clearing the text-box element
    document.getElementById('textArea').value = '';

    // Agents Overview - Step 3: Send a Message to a Chat session - Send a message to a Chat
    const playResponse = await fetchWithRetries(`${DID_API.url}/agents/${agentId}/chat/${chatId}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${DID_API.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        streamId: streamId,
        sessionId: sessionId,
        messages: [
          {
            role: 'user',
            content: txtAreaValue,
            created_at: new Date().toString(),
          },
        ],
      }),
    });
    const playResponseData = await playResponse.json();
    if (playResponse.status === 200 && playResponseData.chatMode === 'TextOnly') {
      console.log('User is out of credit, API only return text messages');
      document.getElementById(
        'msgHistory'
      ).innerHTML += `<span style='opacity:0.5'> ${playResponseData.result}</span><br>`;
    }
  }
};

const destroyButton = document.getElementById('destroy-button');
let autoActionInterval = null; // lưu interval để clear sau

let descriptionList;

// ✅ Chỉ số hiện tại (toàn cục)
let currentIndex = 0;

// Hành động A bạn muốn thực hiện mỗi 50s
const performActionA = async () => {
  if (peerConnection?.signalingState === 'stable' || peerConnection?.iceConnectionState === 'connected') {
    const currentText = descriptionList[currentIndex];
    console.log(`🔹 Đang xử lý sản phẩm thứ ${currentIndex + 1}: ${currentText}`);
        // 1. Lấy knowledgeId từ agent
    const getAgentUrl = `https://api.d-id.com/agents/${agentId}`;
    const headers = {
      accept: 'application/json',
      authorization: `Basic ${DID_API.key}`,
      'content-type': 'application/json'
    };

    const agentResponse = await fetch(getAgentUrl, { method: 'GET', headers });
    const agentData = await agentResponse.json();
    const knowledgeId = agentData.knowledge?.id;
    console.log("knowledgeId: ", knowledgeId)
    if (!knowledgeId) {
      console.error("Không tìm thấy knowledgeId trong phản hồi.");
      return;
    }

    // 2. Gửi PATCH để cập nhật base_knowledge
    const updateUrl = `https://api.d-id.com/knowledge/${knowledgeId}`;
    const patchOptions = {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ base_knowledge: currentText})
    };

    const updateResponse = await fetch(updateUrl, patchOptions);
    const updateResult = await updateResponse.json();
    console.log("Đã cập nhật knowledge:", updateResult);
    // alert("Đã cập nhật kiến thức thành công!");
    // Pasting the user's message to the Chat History element
    // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
    // stopAllStreams();
    // closePC();
    // %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
    // Agents Overview - Step 3: Send a Message to a Chat session - Send a message to a Chat
    while (checkstatus === "start") {
      console.log("Waiting for checkstatus to become 'end'...");
      await new Promise(resolve => setTimeout(resolve, 1000)); // kiểm tra mỗi 1 giây
    }
    const playResponse = await fetchWithRetries(`${DID_API.url}/agents/${agentId}/chat/${chatId}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${DID_API.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        streamId: streamId,
        sessionId: sessionId,
        messages: [
          {
            role: 'user',
            content: "Hãy giới thiệu về các sản phẩm trong knowledge",
            created_at: new Date().toString(),
          },
        ],
      }),
    });
    const playResponseData = await playResponse.json();
    if (playResponse.status === 200 && playResponseData.chatMode === 'TextOnly') {
      console.log('User is out of credit, API only return text messages');
    }
    currentIndex = (currentIndex + 1) % descriptionList.length;
  }
};

let autoActionTimeout;
destroyButton.onclick = async () => {
  const currentText = destroyButton.innerText;
  descriptionList = Object.values(parsedJson);
  console.log(parsedJson)
  console.log(descriptionList)
  
  if (currentText === "Auto-Off") {
  
    destroyButton.innerText = "Auto-On";
    // performActionA(); // chạy ngay lần đầu
    // autoActionInterval = setInterval(performActionA, 50000); // chạy mỗi 50s
    
    async function runActionLoop() {
    while (checkstatus === "start") {
      console.log("Waiting for checkstatus to become 'end'...");
      await new Promise(resolve => setTimeout(resolve, 1000)); // kiểm tra mỗi 1 giây
    }
      await performActionA(); // chạy xong hoàn toàn hàm này
      autoActionTimeout = setTimeout(runActionLoop, 50000); // đợi 50s rồi mới gọi tiếp
    }
    runActionLoop();
  } else {
    destroyButton.innerText = "Auto-Off";
    clearTimeout(autoActionTimeout);
    // clearInterval(autoActionInterval); // dừng lặp
    autoActionInterval = null;
  }
};

// Agents API Workflow
async function agentsAPIworkflow() {
  agentIdLabel.innerHTML = `<span style='color:orange'>Processing...<style='color:orange'>`;
  chatIdLabel.innerHTML = `<span style='color:orange'>Processing...<style='color:orange'>`;
  axios.defaults.baseURL = `${DID_API.url}`;
  axios.defaults.headers.common['Authorization'] = `Basic ${DID_API.key}`;
  axios.defaults.headers.common['content-type'] = 'application/json';

  // Retry Mechanism (Polling) for this demo only - Please use Webhooks in real life applications!
  // as described in https://docs.d-id.com/reference/knowledge-overview#%EF%B8%8F-step-2-add-documents-to-the-knowledge-base
  async function retry(url, retries = 1) {
    const maxRetryCount = 5; // Maximum number of retries
    const maxDelaySec = 10; // Maximum delay in seconds
    try {
      let response = await axios.get(`${url}`);
      if (response.data.status == 'done') {
        return console.log(response.data.id + ': ' + response.data.status);
      } else {
        throw new Error("Status is not 'done'");
      }
    } catch (err) {
      if (retries <= maxRetryCount) {
        const delay = Math.min(Math.pow(2, retries) / 4 + Math.random(), maxDelaySec) * 1000;

        await new Promise((resolve) => setTimeout(resolve, delay));

        console.log(`Retrying ${retries}/${maxRetryCount}. ${err}`);
        return retry(url, retries + 1);
      } else {
        agentIdLabel.innerHTML = `<span style='color:red'>Failed</span>`;
        chatIdLabel.innerHTML = `<span style='color:red'>Failed</span>`;
        throw new Error(`Max retries exceeded. error: ${err}`);
      }
    }
  }

  // Knowledge Overview - Step 1: Create a new Knowledge Base
  // https://docs.d-id.com/reference/knowledge-overview#%EF%B8%8F-step-1-create-a-new-knowledge-base
  const createKnowledge = await axios.post('/knowledge', {
    name: 'knowledge',
    description: 'D-ID Agents API',
  });
  console.log('Create Knowledge:', createKnowledge.data);

  let knowledgeId = createKnowledge.data.id;
  console.log('Knowledge ID: ' + knowledgeId);

  // Knowledge Overview - Step 2: Add Documents to the Knowledge Base
  // https://docs.d-id.com/reference/knowledge-overview#%EF%B8%8F-step-2-add-documents-to-the-knowledge-base

  const createDocument = await axios.post(`/knowledge/${knowledgeId}/documents`, {
    documentType: 'pdf',
    source_url: 'https://d-id-public-bucket.s3.us-west-2.amazonaws.com/Prompt_engineering_Wikipedia.pdf',
    title: 'Prompt Engineering Wikipedia Page PDF',
  });
  console.log('Create Document: ', createDocument.data);

  // Split the # to use in documentID
  let documentId = createDocument.data.id;
  let splitArr = documentId.split('#');
  documentId = splitArr[1];
  console.log('Document ID: ' + documentId);

  // Knowledge Overview - Step 3: Retrieving the Document and Knowledge status
  // https://docs.d-id.com/reference/knowledge-overview#%EF%B8%8F-step-3-retrieving-the-document-and-knowledge-status
  await retry(`/knowledge/${knowledgeId}/documents/${documentId}`);
  await retry(`/knowledge/${knowledgeId}`);

  // Agents Overview - Step 1: Create an Agent
  // https://docs.d-id.com/reference/agents-overview#%EF%B8%8F-step-1-create-an-agent
  // const createAgent = await axios.post('/agents', {
  //   knowledge: {
  //     provider: 'pinecone',
  //     embedder: {
  //       provider: 'azure-open-ai',
  //       model: 'text-large-003',
  //     },
  //     id: knowledgeId,
  //   },
  //   presenter: {
  //     type: 'talk',
  //     voice: {
  //       type: 'microsoft',
  //       voice_id: 'en-US-JennyMultilingualV2Neural',
  //     },
  //     thumbnail: 'https://create-images-results.d-id.com/DefaultPresenters/Emma_f/v1_image.jpeg',
  //     source_url: 'https://create-images-results.d-id.com/DefaultPresenters/Emma_f/v1_image.jpeg',
  //   },
  //   llm: {
  //     type: 'openai',
  //     provider: 'openai',
  //     model: 'gpt-3.5-turbo-1106',
  //     instructions: 'Your name is Emma, an AI designed to assist with information about Prompt Engineering and RAG',
  //     template: 'rag-grounded',
  //   },
  //   preview_name: 'Emma',
  // });
  // console.log('Create Agent: ', createAgent.data);
  let agentId = agentId;
  console.log('Agent ID: ' + agentId);

  // Agents Overview - Step 2: Create a new Chat session with the Agent
  // https://docs.d-id.com/reference/agents-overview#%EF%B8%8F-step-2-create-a-new-chat-session-with-the-agent
  // const createChat = await axios.post(`/agents/${agentId}/chat`);
  // console.log('Create Chat: ', createChat.data);
  let chatId = '';
  console.log('Chat ID: ' + chatId);

  // Agents Overview - Step 3: Send a Message to a Chat session
  // https://docs.d-id.com/reference/agents-overview#%EF%B8%8F-step-3--send-a-message-to-a-chat-session
  // The WebRTC steps are called in the functions: 'connectButton.onclick', onIceCandidate(event), 'startButton.onclick'

  console.log(
    "Create new Agent with Knowledge - DONE!\n Press on the 'Connect' button to proceed.\n Store the created 'agentID' and 'chatId' variables at the bottom of the JS file for future chats"
  );
  agentIdLabel.innerHTML = agentId;
  chatIdLabel.innerHTML = chatId;
  return { agentId: agentId, chatId: chatId };
}

const agentsButton = document.getElementById('agents-button');
const inputText = document.getElementById('input-text');
inputText.style.width = '400px';
inputText.style.height = '250px';
inputText.style.transform = 'translateX(-10px)';
let parsedJson;
agentsButton.onclick = async () => {
  try {
    const userInput = inputText.value;
    if (!userInput) {
      alert("Vui lòng nhập nội dung kiến thức.");
      return;
    }
    let savedInputText = inputText.value;
    console.log("Đã lưu nội dung:", savedInputText);
    parsedJson = await callGpt4oMini(savedInputText)
    console.log(parsedJson)
    alert("Cập nhật thành công");

  //   // 1. Lấy knowledgeId từ agent
  //   const getAgentUrl = `https://api.d-id.com/agents/${agentId}`;
  //   const headers = {
  //     accept: 'application/json',
  //     authorization: `Basic ${DID_API.key}`,
  //     'content-type': 'application/json'
  //   };

  //   const agentResponse = await fetch(getAgentUrl, { method: 'GET', headers });
  //   const agentData = await agentResponse.json();
  //   const knowledgeId = agentData.knowledge?.id;
  //   console.log("knowledgeId: ", knowledgeId)
  //   if (!knowledgeId) {
  //     console.error("Không tìm thấy knowledgeId trong phản hồi.");
  //     return;
  //   }

  //   // 2. Gửi PATCH để cập nhật base_knowledge
  //   const updateUrl = `https://api.d-id.com/knowledge/${knowledgeId}`;
  //   const patchOptions = {
  //     method: 'PATCH',
  //     headers,
  //     body: JSON.stringify({ base_knowledge: userInput })
  //   };

  //   const updateResponse = await fetch(updateUrl, patchOptions);
  //   const updateResult = await updateResponse.json();
  //   console.log("Đã cập nhật knowledge:", updateResult);
  //   alert("Đã cập nhật kiến thức thành công!");

  } catch (err) {
    console.error("Lỗi khi cập nhật kiến thức:", err);
    alert("Đã xảy ra lỗi khi cập nhật.");
  }
};

// Paste Your Created Agent and Chat IDs Here:
// agentId = 'agt_QBKHQVCm';
// chatId = 'cht__fvKMwhUrEDq-sv6YdW6o';
