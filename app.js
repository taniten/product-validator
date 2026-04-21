const form = document.querySelector("#validator-form");
const resultPanel = document.querySelector("#result-panel");
const scoreValue = document.querySelector("#score-value");
const classificationValue = document.querySelector("#classification-value");
const marginValue = document.querySelector("#margin-value");
const resultDescription = document.querySelector("#result-description");
const diagnosisSummary = document.querySelector("#diagnosis-summary");
const diagnosisDetails = document.querySelector("#diagnosis-details");
const weakPointsList = document.querySelector("#weak-points-list");
const recommendationsList = document.querySelector("#recommendations-list");
const simulationCards = document.querySelector("#simulation-cards");
const componentBars = {
  margin: document.querySelector("#component-margin"),
  demand: document.querySelector("#component-demand"),
  competition: document.querySelector("#component-competition"),
  complexity: document.querySelector("#component-complexity"),
};
const salePriceInput = form.elements.salePrice;
let lastInput = null;

function getNumber(formData, fieldName) {
  return Number(formData.get(fieldName));
}

function formatPercent(value) {
  return `${value.toFixed(1)}%`;
}

function updateComponentBar(name, value) {
  const bar = componentBars[name];
  bar.style.width = `${Math.round(value)}%`;
  bar.setAttribute("aria-valuenow", String(Math.round(value)));
}

function renderList(container, items, renderItem) {
  container.innerHTML = "";
  items.forEach((item) => {
    container.appendChild(renderItem(item));
  });
}

function createTextListItem(text) {
  const item = document.createElement("li");
  item.textContent = text;
  return item;
}

function renderWeakPoints(items) {
  const weakPoints =
    items.length > 0
      ? items
      : [{ label: "Sin alertas criticas", text: "Las variables principales estan dentro de rangos razonables." }];

  renderList(weakPointsList, weakPoints, (weakPoint) => {
    const item = document.createElement("li");
    const title = document.createElement("strong");
    const text = document.createElement("span");

    title.textContent = weakPoint.label;
    text.textContent = weakPoint.text;
    item.append(title, text);

    return item;
  });
}

function renderRecommendations(items) {
  renderList(recommendationsList, items, (recommendation) => {
    const item = document.createElement("li");
    const badge = document.createElement("span");
    const title = document.createElement("strong");
    const text = document.createElement("p");

    badge.className = "priority-badge";
    badge.textContent = recommendation.priority;
    title.textContent = recommendation.title;
    text.textContent = recommendation.text;

    item.append(badge, title, text);
    return item;
  });
}

function renderSimulation(baseInput, baseScore) {
  const options = [
    { label: "-10%", multiplier: 0.9 },
    { label: "+10%", multiplier: 1.1 },
  ];

  renderList(simulationCards, options, (option) => {
    const simulated = window.productScoring.simulatePrice(baseInput, option.multiplier);
    const item = document.createElement("li");
    const label = document.createElement("span");
    const score = document.createElement("strong");
    const detail = document.createElement("p");
    const delta = document.createElement("em");
    const applyButton = document.createElement("button");
    const simulatedPrice = baseInput.salePrice * option.multiplier;
    const scoreDelta = simulated.score - baseScore;
    const deltaPrefix = scoreDelta > 0 ? "+" : "";

    item.className = "simulation-card";
    item.dataset.tone = simulated.classification.tone;
    label.textContent = `Precio ${option.label}: ${simulatedPrice.toFixed(2)}`;
    score.textContent = `${simulated.score}/100`;
    delta.textContent = `${deltaPrefix}${scoreDelta} pts vs actual`;
    detail.textContent = `${simulated.classification.label} con margen ${formatPercent(simulated.marginPercent)}`;
    applyButton.type = "button";
    applyButton.textContent = "Aplicar precio";
    applyButton.addEventListener("click", () => {
      salePriceInput.value = simulatedPrice.toFixed(2);
      form.requestSubmit();
    });

    item.append(label, score, delta, detail, applyButton);
    return item;
  });
}

function renderResult(result) {
  resultPanel.hidden = false;
  resultPanel.dataset.tone = result.classification.tone;

  scoreValue.textContent = result.score;
  classificationValue.textContent = result.classification.label;
  marginValue.textContent = formatPercent(result.marginPercent);
  resultDescription.textContent = result.classification.description;
  diagnosisSummary.textContent = result.diagnosis.summary;

  renderList(diagnosisDetails, result.diagnosis.details, createTextListItem);
  renderWeakPoints(result.weakPoints);
  renderRecommendations(result.recommendations);
  renderSimulation(lastInput, result.score);

  Object.entries(result.components).forEach(([name, value]) => {
    updateComponentBar(name, value);
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  lastInput = {
    salePrice: getNumber(formData, "salePrice"),
    productCost: getNumber(formData, "productCost"),
    shippingCost: getNumber(formData, "shippingCost"),
    competition: getNumber(formData, "competition"),
    demand: getNumber(formData, "demand"),
    complexity: getNumber(formData, "complexity"),
  };

  const result = window.productScoring.evaluateProduct(lastInput);

  renderResult(result);
});
