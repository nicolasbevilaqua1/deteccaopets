const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const statusDiv = document.getElementById("status");
const historyList = document.getElementById("history");
const statsBody = document.getElementById("statsBody");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");

// Lista de áudios para cachorros
const dogAudios = ["dog1.mp3", "dog2.mp3", "dog3.mp3", "dog4.mp3", "dog5.mp3", "dog6.mp3", "dog7.mp3", "dog8.mp3", "dog9.mp3", "dog10.mp3", "dog11.mp3", "dog12.mp3"];

// Carrega os áudios previamente para evitar bloqueios no Safari
let preloadedAudios = dogAudios.map(src => new Audio(src));

// Função para tocar um áudio aleatório
function playRandomAudio() {
  const randomIndex = Math.floor(Math.random() * dogAudios.length);
  const audio = preloadedAudios[randomIndex];

  audio.play().catch(error => {
    console.warn("Reprodução de áudio bloqueada. Esperando interação do usuário.");
  });
}

let model;
let detectedObjects = new Set();
let objectStats = {};

// Controle de cooldown para áudios
let lastAudioTimestamp = 0;
const audioCooldown = 10000;

// Função para ativar a câmera
async function setupCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    await video.play();
    return video;
  } catch (error) {
    statusDiv.innerText = "Erro ao acessar a câmera!";
    console.error("Erro ao iniciar a câmera:", error);
  }
}

// Função para carregar o modelo COCO-SSD
async function loadModel() {
  try {
    model = await cocoSsd.load();
    statusDiv.innerText = "Status: Modelo carregado!";
  } catch (error) {
    statusDiv.innerText = "Erro ao carregar o modelo!";
    console.error("Erro ao carregar o modelo:", error);
  }
}

// Atualiza o histórico de detecções
function updateHistory(objectName) {
  if (!detectedObjects.has(objectName)) {
    detectedObjects.add(objectName);
    const timestamp = new Date().toLocaleTimeString();
    const li = document.createElement("li");
    li.textContent = `${timestamp} - ${objectName}`;
    historyList.appendChild(li);
  }
}

// Atualiza as estatísticas
function updateStats(objectName) {
  objectStats[objectName] = (objectStats[objectName] || 0) + 1;

  statsBody.innerHTML = "";
  Object.entries(objectStats).forEach(([obj, count]) => {
    statsBody.innerHTML += `<tr><td>${obj}</td><td>${count}</td></tr>`;
  });
}

// Função para detectar apenas cachorros
async function detectObjects() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const predictions = await model.detect(video);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  ctx.font = "24px Open Sans";
  ctx.fillStyle = "white";
  ctx.strokeStyle = "#2980b9";
  ctx.lineWidth = 2;

  const dogPredictions = predictions.filter(prediction => prediction.class === "dog");

  dogPredictions.forEach(prediction => {
    const [x, y, width, height] = prediction.bbox;
    ctx.strokeRect(x, y, width, height);
    ctx.fillText(`${prediction.class} (${Math.round(prediction.score * 100)}%)`, x, y > 24 ? y - 5 : 24);

    updateHistory(prediction.class);
    updateStats(prediction.class);
  });

  if (dogPredictions.length > 0 && Date.now() - lastAudioTimestamp > audioCooldown) {
    playRandomAudio();
    lastAudioTimestamp = Date.now();
  }

  statusDiv.innerText = `Dogs detectados: ${dogPredictions.length}`;
  requestAnimationFrame(detectObjects);
}

// Evento para iniciar a detecção
startBtn.addEventListener("click", async () => {
  startBtn.disabled = true;
  statusDiv.innerText = "Status: Carregando modelo...";

  await setupCamera();
  await loadModel();

  // Pré-carregar áudio para evitar bloqueios
  preloadedAudios[0].play().then(() => {
    console.log("Áudio pré-carregado com sucesso.");
  }).catch(error => {
    console.warn("Áudio bloqueado. Será necessário um clique manual.");
  });

  detectObjects();
});

// Evento para resetar histórico e estatísticas
resetBtn.addEventListener("click", () => {
  detectedObjects.clear();
  objectStats = {};
  historyList.innerHTML = "";
  statsBody.innerHTML = "";
  statusDiv.innerText = "Histórico e estatísticas resetados.";
});
