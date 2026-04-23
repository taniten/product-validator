(function () {
  const SCORE_WEIGHTS = {
    margin: 0.35,
    demand: 0.3,
    competition: 0.2,
    complexity: 0.15,
  };

  const CLASSIFICATIONS = {
    test: {
      label: "TESTEAR YA",
      description: "Buen punto de partida para un test real y controlado.",
      tone: "success",
    },
    watch: {
      label: "AJUSTAR ANTES",
      description: "Hay potencial, pero falta corregir una variable clave.",
      tone: "warning",
    },
    reject: {
      label: "DESCARTAR",
      description: "No conviene invertir en este test con los datos actuales.",
      tone: "danger",
    },
  };

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function scoreFromOneToFive(value, inverse = false) {
    const normalized = ((clamp(value, 1, 5) - 1) / 4) * 100;
    return inverse ? 100 - normalized : normalized;
  }

  function calculateGrossMargin(salePrice, productCost, shippingCost) {
    if (salePrice <= 0) {
      return 0;
    }

    return ((salePrice - productCost - shippingCost) / salePrice) * 100;
  }

  function scoreMargin(marginPercent) {
    if (marginPercent >= 55) {
      return 100;
    }

    if (marginPercent >= 45) {
      return 85;
    }

    if (marginPercent >= 35) {
      return 70;
    }

    if (marginPercent >= 20) {
      return 40 + ((marginPercent - 20) / 15) * 25;
    }

    return clamp(marginPercent * 2, 0, 40);
  }

  function classifyScore(score, risks, alerts) {
    const hasCriticalRisk = risks.some((risk) => risk.severity === "critical");
    const hasCriticalAlert = alerts.some((alert) => alert.severity === "critical");
    const hasWarningAlert = alerts.some((alert) => alert.severity === "warning");

    if (hasCriticalAlert || score < 50 || (score < 65 && hasCriticalRisk)) {
      return CLASSIFICATIONS.reject;
    }

    if (score >= 72 && !hasCriticalRisk && !hasWarningAlert) {
      return CLASSIFICATIONS.test;
    }

    return CLASSIFICATIONS.watch;
  }

  function getMarginLabel(marginPercent) {
    if (marginPercent >= 80) {
      return "inusualmente alto";
    }

    if (marginPercent >= 55) {
      return "muy saludable";
    }

    if (marginPercent >= 35) {
      return "aceptable";
    }

    if (marginPercent >= 20) {
      return "ajustado";
    }

    return "crítico";
  }

  function getDemandLabel(value) {
    if (value >= 4) {
      return "alta";
    }

    if (value === 3) {
      return "media";
    }

    return "baja";
  }

  function getPressureLabel(value) {
    if (value >= 4) {
      return "alta";
    }

    if (value === 3) {
      return "media";
    }

    return "baja";
  }

  function getValidationAlerts(input, marginPercent) {
    const alerts = [];
    const totalCost = input.productCost + input.shippingCost;
    const costRatio = input.salePrice > 0 ? totalCost / input.salePrice : 0;
    const productCostRatio = input.salePrice > 0 ? input.productCost / input.salePrice : 0;

    if (
      !Number.isFinite(input.salePrice) ||
      !Number.isFinite(input.productCost) ||
      !Number.isFinite(input.shippingCost) ||
      input.salePrice <= 0
    ) {
      return [
        {
          key: "incomplete",
          severity: "critical",
          label: "Confirmar costos",
          text: "Falta precio o costos básicos.",
        },
      ];
    }

    if (totalCost >= input.salePrice) {
      alerts.push({
        key: "incoherent",
        severity: "critical",
        label: "Corregir datos",
        text: "Los costos igualan o superan el precio.",
      });
    }

    if (productCostRatio > 0 && productCostRatio < 0.1) {
      alerts.push({
        key: "costs",
        severity: "warning",
        label: "Confirmar costos",
        text: "Puede faltar comisión, packaging o impuesto.",
      });
    }

    if (costRatio > 0 && costRatio < 0.18) {
      alerts.push({
        key: "costs",
        severity: "warning",
        label: "Confirmar costos",
        text: "Producto + envío parecen incompletos.",
      });
    }

    if (marginPercent >= 80) {
      alerts.push({
        key: "price",
        severity: "warning",
        label: "Revisar precio final",
        text: "Margen muy alto: validá precio real de mercado.",
      });
    }

    if (input.shippingCost === 0) {
      alerts.push({
        key: "costs",
        severity: "info",
        label: "Confirmar costos",
        text: "Si absorbés envío, cargalo como costo.",
      });
    }

    if (input.demand <= 2) {
      alerts.push({
        key: "demand",
        severity: "info",
        label: "Validar demanda",
        text: "Buscá señal externa antes de comprar stock.",
      });
    }

    return alerts;
  }

  function getRisks(input, marginPercent, components, alerts) {
    const risks = [];

    if (marginPercent < 20) {
      risks.push({
        key: "margin",
        severity: "critical",
        label: "Margen crítico",
        text: `${marginPercent.toFixed(1)}% bruto. No absorbe pauta.`,
      });
    } else if (marginPercent < 35) {
      risks.push({
        key: "margin",
        severity: "moderate",
        label: "Margen ajustado",
        text: `${marginPercent.toFixed(1)}% bruto. Test chico.`,
      });
    } else if (marginPercent >= 80) {
      risks.push({
        key: "data-quality",
        severity: "moderate",
        label: "Margen difícil de sostener",
        text: "Puede haber costos faltantes.",
      });
    }

    if (input.demand <= 2) {
      risks.push({
        key: "demand",
        severity: "critical",
        label: "Demanda débil",
        text: "Puede no generar volumen.",
      });
    } else if (input.demand === 3) {
      risks.push({
        key: "demand",
        severity: "moderate",
        label: "Demanda media",
        text: "Validá audiencia antes de stock.",
      });
    }

    if (input.competition >= 5) {
      risks.push({
        key: "competition",
        severity: "critical",
        label: "Competencia muy alta",
        text: "Necesita oferta muy distinta.",
      });
    } else if (input.competition === 4) {
      risks.push({
        key: "competition",
        severity: "moderate",
        label: "Competencia alta",
        text: "Diferenciá oferta o canal.",
      });
    } else if (input.competition === 3 && components.margin < 75) {
      risks.push({
        key: "competition",
        severity: "watch",
        label: "Competencia media",
        text: "La promesa debe ser clara.",
      });
    }

    if (input.complexity >= 5) {
      risks.push({
        key: "complexity",
        severity: "critical",
        label: "Operación muy compleja",
        text: "Puede destruir margen real.",
      });
    } else if (input.complexity === 4) {
      risks.push({
        key: "complexity",
        severity: "moderate",
        label: "Operación compleja",
        text: "Medí fricción temprano.",
      });
    } else if (input.complexity === 3 && input.demand <= 3) {
      risks.push({
        key: "complexity",
        severity: "watch",
        label: "Operación media",
        text: "No compres stock grande.",
      });
    }

    if (risks.length === 0) {
      risks.push({
        key: "execution",
        severity: "watch",
        label: "Ejecución",
        text: "Definí oferta, audiencia y métrica.",
      });
    }

    if (alerts.some((alert) => alert.severity === "warning")) {
      risks.push({
        key: "data-quality",
        severity: "watch",
        label: "Datos a confirmar",
        text: "El score puede cambiar.",
      });
    }

    return risks;
  }

  function getScoreAdjustment(rawScore, input, marginPercent, risks, alerts) {
    const hasCriticalRisk = risks.some((risk) => risk.severity === "critical");
    const hasCriticalAlert = alerts.some((alert) => alert.severity === "critical");
    const hasOnlyManageableRisks = !hasCriticalRisk && !hasCriticalAlert;
    let adjustedScore = rawScore;
    let explanation = "";

    if (marginPercent >= 55 && hasOnlyManageableRisks && input.demand >= 3) {
      const floor = input.competition <= 3 && input.complexity <= 3 ? 74 : 68;
      if (adjustedScore < floor) {
        adjustedScore = floor;
        explanation = "Margen fuerte: el límite es demanda/oferta.";
      }
    }

    if (marginPercent >= 80 && alerts.some((alert) => alert.severity === "warning")) {
      adjustedScore = Math.min(adjustedScore, 78);
      explanation = "Score limitado hasta confirmar costos.";
    }

    if (hasCriticalAlert) {
      adjustedScore = Math.min(adjustedScore, 35);
      explanation = "Score limitado por datos incoherentes.";
    } else if (hasCriticalRisk) {
      adjustedScore = Math.min(adjustedScore, 64);
      explanation = "Score limitado por riesgo crítico.";
    }

    return {
      score: Math.round(clamp(adjustedScore, 0, 100)),
      explanation,
    };
  }

  function getScoreBlockers(components, risks, alerts) {
    const blockers = [];

    if (alerts.some((alert) => alert.severity !== "info")) {
      blockers.push("datos a confirmar");
    }

    if (components.demand < 50) {
      blockers.push("demanda");
    }

    if (components.competition < 50) {
      blockers.push("competencia");
    }

    if (components.complexity < 50) {
      blockers.push("operación");
    }

    if (components.margin < 70) {
      blockers.push("margen");
    }

    if (blockers.length === 0 && risks.length > 0) {
      blockers.push("ejecución");
    }

    return blockers;
  }

  function getDiagnosis(input, marginPercent, score, components, risks, alerts, adjustmentExplanation) {
    const marginLabel = getMarginLabel(marginPercent);
    const demandLabel = getDemandLabel(input.demand);
    const competitionLabel = getPressureLabel(input.competition);
    const blockers = getScoreBlockers(components, risks, alerts);
    const base =
      score >= 72
        ? `Testeable: margen ${marginLabel}, demanda ${demandLabel}.`
        : score >= 50
          ? `Ajustar: margen ${marginLabel}, demanda ${demandLabel}, competencia ${competitionLabel}.`
          : "Débil: bajo potencial para test pago.";

    const details = [
      `Variables: margen ${marginPercent.toFixed(1)}%, demanda ${input.demand}/5, competencia ${input.competition}/5, complejidad ${input.complexity}/5.`,
      `Frena: ${blockers.join(", ")}.`,
    ];

    if (adjustmentExplanation) {
      details.push(adjustmentExplanation);
    }

    return {
      summary: base,
      details,
    };
  }

  function addRecommendation(recommendations, title, text, priority) {
    if (recommendations.some((item) => item.title === title)) {
      return;
    }

    recommendations.push({ title, text, priority });
  }

  function getRecommendations(input, marginPercent, score, risks, alerts) {
    const recommendations = [];
    const riskKeys = risks.map((item) => item.key);
    const alertKeys = alerts.map((item) => item.key);
    const hasCriticalAlert = alerts.some((alert) => alert.severity === "critical");
    const hasIncoherentData = alerts.some((alert) => alert.key === "incoherent");

    if (score >= 72 && alerts.length === 0) {
      addRecommendation(recommendations, "Lanzar test controlado", "Medí conversión con presupuesto acotado.", "Alta");
    }

    if (hasIncoherentData) {
      addRecommendation(recommendations, "Corregir datos", "Revisá precio y costos base.", "Alta");
    }

    if (alertKeys.includes("costs") || alertKeys.includes("incomplete")) {
      addRecommendation(recommendations, "Confirmar costos", "Incluí envío, comisiones e impuestos.", "Alta");
    }

    if (hasCriticalAlert) {
      return recommendations;
    }

    if (alertKeys.includes("price")) {
      addRecommendation(recommendations, "Revisar precio final", "Compará contra alternativas reales.", "Alta");
    }

    if (alertKeys.includes("demand") || riskKeys.includes("demand") || score < 50) {
      addRecommendation(recommendations, "Validar demanda", "Probá anuncio, preventa o landing.", "Alta");
    }

    if (marginPercent < 35 || riskKeys.includes("margin")) {
      addRecommendation(recommendations, "Mejorar margen", "Subí precio o bajá costo.", "Alta");
    }

    if (riskKeys.includes("competition")) {
      addRecommendation(recommendations, "Diferenciar oferta", "Bundle, garantía o mejor ángulo.", "Media");
    }

    if (riskKeys.includes("complexity")) {
      addRecommendation(recommendations, "Simplificar operación", "Reducí variantes y fricción.", "Media");
    }

    if (recommendations.length === 0) {
      addRecommendation(recommendations, "Lanzar test controlado", "Medí conversión con presupuesto acotado.", "Alta");
    }

    return recommendations.slice(0, 4);
  }

  function getSuggestedPlan(score, classification, risks, alerts) {
    const hasCriticalAlert = alerts.some((alert) => alert.severity === "critical");
    const hasIncoherentData = alerts.some((alert) => alert.key === "incoherent");
    const hasWarningAlert = alerts.some((alert) => alert.severity === "warning");
    const hasCriticalRisk = risks.some((risk) => risk.severity === "critical");

    if (hasCriticalAlert) {
      return {
        title: "No testear todavía",
        stance: "Pausar",
        budget: "$0",
        scope: hasIncoherentData ? "Corregir datos" : "Confirmar costos",
        metric: "Margen real",
        condition: "Recalcular con costos válidos",
      };
    }

    if (classification.label === "DESCARTAR" || hasCriticalRisk) {
      return {
        title: "Validación sin stock",
        stance: "Muy prudente",
        budget: "$10-$30",
        scope: "Landing, encuesta o preventa",
        metric: "Interés / leads",
        condition: "Escalar solo con demanda clara",
      };
    }

    if (classification.label === "AJUSTAR ANTES") {
      return {
        title: "Test corto",
        stance: hasWarningAlert ? "Prudente" : "Moderada",
        budget: "$30-$80",
        scope: "5-15 unidades o 3-7 días",
        metric: "Costo por compra",
        condition: "Escalar si hay ventas; frenar si no hay intención",
      };
    }

    return {
      title: "Test comercial",
      stance: score >= 82 ? "Más agresiva" : "Controlada",
      budget: "$80-$200",
      scope: "15-30 unidades o 7 días",
      metric: "Conversión / ROAS",
      condition: "Escalar si margen neto sostiene pauta",
    };
  }

  function evaluateProduct(input) {
    const marginPercent = calculateGrossMargin(
      input.salePrice,
      input.productCost,
      input.shippingCost
    );

    const components = {
      margin: scoreMargin(marginPercent),
      demand: scoreFromOneToFive(input.demand),
      competition: scoreFromOneToFive(input.competition, true),
      complexity: scoreFromOneToFive(input.complexity, true),
    };

    const rawScore =
      components.margin * SCORE_WEIGHTS.margin +
      components.demand * SCORE_WEIGHTS.demand +
      components.competition * SCORE_WEIGHTS.competition +
      components.complexity * SCORE_WEIGHTS.complexity;

    const alerts = getValidationAlerts(input, marginPercent);
    const risks = getRisks(input, marginPercent, components, alerts);
    const scoreAdjustment = getScoreAdjustment(rawScore, input, marginPercent, risks, alerts);
    const classification = classifyScore(scoreAdjustment.score, risks, alerts);

    return {
      score: scoreAdjustment.score,
      rawScore: Math.round(clamp(rawScore, 0, 100)),
      marginPercent,
      classification,
      components,
      alerts,
      risks,
      diagnosis: getDiagnosis(
        input,
        marginPercent,
        scoreAdjustment.score,
        components,
        risks,
        alerts,
        scoreAdjustment.explanation
      ),
      recommendations: getRecommendations(input, marginPercent, scoreAdjustment.score, risks, alerts),
      plan: getSuggestedPlan(scoreAdjustment.score, classification, risks, alerts),
    };
  }

  function simulatePrice(input, priceMultiplier) {
    return evaluateProduct({
      ...input,
      salePrice: input.salePrice * priceMultiplier,
    });
  }

  function simulateProductCost(input, costMultiplier) {
    return evaluateProduct({
      ...input,
      productCost: input.productCost * costMultiplier,
    });
  }

  window.productScoring = {
    calculateGrossMargin,
    classifyScore,
    evaluateProduct,
    simulatePrice,
    simulateProductCost,
  };
})();
