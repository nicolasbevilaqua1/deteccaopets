const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const statusDiv = document.getElementById("status");
const historyList = document.getElementById("history");
const statsBody = document.getElementById("statsBody");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");

// Listas de áudios para cada pet (certifique-se de que os arquivos existam)
const dogAudios = ["dog1.mp3", "dog2.mp3", "dog3.mp3"];
const catAudios = ["cat1.mp3", "cat2.mp3", "cat3.mp3"];

// Função que retorna um áudio aleatório de uma lista
function getRandomAudio(audioList) {
  const randomIndex = Math.floor(Math.random() * audioList.length);
  return new Audio(audioList[randomIndex]);
}

let model;
let detectedObjects = new Set(); // Guarda objetos únicos detectados
let objectStats = {}; // Guarda a contagem de objetos detectados

// Variável para controle do cooldown (tempo entre execuções de áudio)
let lastAudioTimestamp = 0;
const audioCooldown = 10000; // 2000ms = 2 segundos

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

// Atualiza o histórico de detecções (somente se for um objeto novo)
function updateHistory(objectName) {
  if (!detectedObjects.has(objectName)) {
    detectedObjects.add(objectName);

    const timestamp = new Date().toLocaleTimeString();
    const entry = `${timestamp} - ${objectName}`;

    const li = document.createElement("li");
    li.textContent = entry;
    historyList.appendChild(li);
  }
}

// Atualiza a tabela de estatísticas (se um novo objeto for detectado)
function updateStats(objectName) {
  if (!objectStats[objectName]) {
    objectStats[objectName] = 1;
  } else {
    objectStats[objectName] += 1;
  }

  statsBody.innerHTML = "";
  Object.entries(objectStats).forEach(([obj, count]) => {
    const row = `<tr><td>${obj}</td><td>${count}</td></tr>`;
    statsBody.innerHTML += row;
  });
}

// Função para detectar objetos (apenas cachorros e gatos)
async function detectObjects() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const predictions = await model.detect(video);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Define a fonte e configurações para as legendas
  ctx.font = "24px Open Sans";
  ctx.fillStyle = "white";
  ctx.strokeStyle = "#2980b9";
  ctx.lineWidth = 2;

  // Filtra as predições para manter apenas "dog" e "cat"
  const petPredictions = predictions.filter(prediction =>
    prediction.class === "dog" || prediction.class === "cat"
  );

  petPredictions.forEach(prediction => {
    const [x, y, width, height] = prediction.bbox;
    ctx.strokeRect(x, y, width, height);
    ctx.fillText(`${prediction.class} (${Math.round(prediction.score * 100)}%)`, x, y > 24 ? y - 5 : 24);

    // Atualiza histórico e estatísticas somente para pets
    updateHistory(prediction.class);
    updateStats(prediction.class);
  });

  // Se houver detecção e o cooldown tiver expirado, toca um único áudio aleatório
  if (petPredictions.length > 0 && Date.now() - lastAudioTimestamp > audioCooldown) {
    // Combina as listas de áudios de cachorro e gato
    const combinedAudios = dogAudios.concat(catAudios);
    getRandomAudio(combinedAudios).play().catch(err => console.error("Erro ao tocar o áudio:", err));
    lastAudioTimestamp = Date.now();
  }

  statusDiv.innerText = `Pets detectados: ${petPredictions.length}`;

  requestAnimationFrame(detectObjects);
}

// Evento para o botão de iniciar
startBtn.addEventListener("click", async () => {
  startBtn.disabled = true;
  statusDiv.innerText = "Status: Carregando modelo...";

  await setupCamera();
  await loadModel();

  detectObjects();
});

// Evento para o botão de resetar
resetBtn.addEventListener("click", () => {
  detectedObjects.clear();
  objectStats = {};
  historyList.innerHTML = "";
  statsBody.innerHTML = "";
  statusDiv.innerText = "Histórico e estatísticas resetados.";
});
