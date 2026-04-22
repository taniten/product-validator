const form = document.querySelector("#validator-form");
const resultPanel = document.querySelector("#result-panel");
const scoreValue = document.querySelector("#score-value");
const classificationValue = document.querySelector("#classification-value");
const marginValue = document.querySelector("#margin-value");
const resultDescription = document.querySelector("#result-description");
const diagnosisSummary = document.querySelector("#diagnosis-summary");
const diagnosisDetails = document.querySelector("#diagnosis-details");
const alertList = document.querySelector("#alert-list");
const riskList = document.querySelector("#risk-list");
const recommendationsList = document.querySelector("#recommendations-list");
const planStance = document.querySelector("#plan-stance");
const planName = document.querySelector("#plan-name");
const planDescription = document.querySelector("#plan-description");
const simulatePriceButton = document.querySelector("#simulate-price-button");
const simulateCostButton = document.querySelector("#simulate-cost-button");
const componentBars = {
  margin: document.querySelector("#component-margin"),
  demand: document.querySelector("#component-demand"),
  competition: document.querySelector("#component-competition"),
  complexity: document.querySelector("#component-complexity"),
};
const componentValues = {
  margin: document.querySelector("#component-margin-value"),
  demand: document.querySelector("#component-demand-value"),
  competition: document.querySelector("#component-competition-value"),
  complexity: document.querySelector("#component-complexity-value"),
};
const salePriceInput = form.elements.salePrice;
const productCostInput = form.elements.productCost;
let hasEvaluated = false;

function getNumber(formData, fieldName) {
  return Number(formData.get(fieldName));
}

function formatMoney(value) {
  return value.toFixed(2);
}

function formatPercent(value) {
  return `${value.toFixed(1)}%`;
}

function getCurrentInput() {
  const formData = new FormData(form);

  return {
    salePrice: getNumber(formData, "salePrice"),
    productCost: getNumber(formData, "productCost"),
    shippingCost: getNumber(formData, "shippingCost"),
    competition: getNumber(formData, "competition"),
    demand: getNumber(formData, "demand"),
    complexity: getNumber(formData, "complexity"),
  };
}

function updateComponentBar(name, value) {
  const roundedValue = Math.round(value);
  const bar = componentBars[name];

  bar.style.width = `${roundedValue}%`;
  bar.setAttribute("aria-valuenow", String(roundedValue));
  componentValues[name].textContent = `${roundedValue}/100`;
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

function renderRisks(items) {
  renderList(riskList, items, (risk) => {
    const item = document.createElement("li");
    const title = document.createElement("strong");
    const text = document.createElement("span");

    item.dataset.severity = risk.severity;
    title.textContent = risk.label;
    text.textContent = risk.text;
    item.append(title, text);

    return item;
  });
}

function renderAlerts(items) {
  alertList.hidden = items.length === 0;

  renderList(alertList, items, (alert) => {
    const item = document.createElement("li");
    const title = document.createElement("strong");
    const text = document.createElement("span");

    item.dataset.severity = alert.severity;
    title.textContent = alert.label;
    text.textContent = alert.text;
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

function renderPlan(plan) {
  planStance.textContent = plan.stance;
  planName.textContent = plan.title;
  planDescription.textContent = plan.text;
}

function renderResult(result) {
  resultPanel.hidden = false;
  resultPanel.dataset.tone = result.classification.tone;

  scoreValue.textContent = result.score;
  classificationValue.textContent = result.classification.label;
  marginValue.textContent = formatPercent(result.marginPercent);
  resultDescription.textContent = result.classification.description;
  diagnosisSummary.textContent = result.diagnosis.summary;

  renderAlerts(result.alerts);
  renderList(diagnosisDetails, result.diagnosis.details, createTextListItem);
  renderRisks(result.risks);
  renderRecommendations(result.recommendations);
  renderPlan(result.plan);

  Object.entries(result.components).forEach(([name, value]) => {
    updateComponentBar(name, value);
  });
}

function evaluateCurrentForm() {
  const result = window.productScoring.evaluateProduct(getCurrentInput());
  hasEvaluated = true;
  renderResult(result);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  evaluateCurrentForm();
});

form.addEventListener("input", () => {
  if (hasEvaluated && form.checkValidity()) {
    evaluateCurrentForm();
  }
});

simulatePriceButton.addEventListener("click", () => {
  if (!form.reportValidity()) {
    return;
  }

  const simulatedPrice = getCurrentInput().salePrice * 1.1;
  salePriceInput.value = formatMoney(simulatedPrice);
  evaluateCurrentForm();
});

simulateCostButton.addEventListener("click", () => {
  if (!form.reportValidity()) {
    return;
  }

  const simulatedCost = getCurrentInput().productCost * 0.9;
  productCostInput.value = formatMoney(simulatedCost);
  evaluateCurrentForm();
});
