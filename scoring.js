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
      description: "El producto tiene condiciones suficientes para avanzar con un test real, cuidando el presupuesto.",
      tone: "success",
    },
    watch: {
      label: "AJUSTAR ANTES",
      description: "Hay potencial, pero el test necesita una mejora concreta antes de invertir.",
      tone: "warning",
    },
    reject: {
      label: "DESCARTAR",
      description: "Con los datos actuales, el aprendizaje probable no justifica el costo del test.",
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

    const grossProfit = salePrice - productCost - shippingCost;
    return (grossProfit / salePrice) * 100;
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
      alerts.push({
        severity: "critical",
        label: "Datos incompletos",
        text: "Revisá precio, costo de producto y costo de envío antes de interpretar el score.",
      });

      return alerts;
    }

    if (totalCost >= input.salePrice) {
      alerts.push({
        severity: "critical",
        label: "Margen negativo",
        text: "Los costos igualan o superan el precio de venta. El producto no es viable con estos datos.",
      });
    }

    if (productCostRatio > 0 && productCostRatio < 0.1) {
      alerts.push({
        severity: "warning",
        label: "Costo de producto muy bajo",
        text: "El costo del producto es menor al 10% del precio. Confirmá que no falten comisiones, packaging, impuestos o merma.",
      });
    }

    if (costRatio > 0 && costRatio < 0.18) {
      alerts.push({
        severity: "warning",
        label: "Costos totales inusualmente bajos",
        text: "Producto más envío representan menos del 18% del precio. El score puede estar inflado si falta algún costo.",
      });
    }

    if (marginPercent >= 80) {
      alerts.push({
        severity: "warning",
        label: "Margen extremadamente alto",
        text: "Un margen mayor al 80% es posible, pero poco común. Validá precio de mercado y costos reales antes de decidir.",
      });
    }

    if (input.shippingCost === 0) {
      alerts.push({
        severity: "info",
        label: "Envío en cero",
        text: "Si el envío lo absorbés vos, cargalo como costo. Si lo paga el cliente, este dato está bien.",
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
        text: `El margen bruto es ${marginPercent.toFixed(1)}%. Queda poco o ningún espacio para pauta, comisiones, descuentos o devoluciones.`,
      });
    } else if (marginPercent < 35) {
      risks.push({
        key: "margin",
        severity: "moderate",
        label: "Margen ajustado",
        text: `El margen bruto es ${marginPercent.toFixed(1)}%. Puede alcanzar para aprender, pero obliga a un test chico y muy controlado.`,
      });
    } else if (marginPercent >= 80) {
      risks.push({
        key: "data-quality",
        severity: "moderate",
        label: "Margen difícil de sostener",
        text: "El margen es tan alto que el principal riesgo es que el dato esté incompleto o que el precio no sea aceptado por el mercado.",
      });
    }

    if (input.demand <= 2) {
      risks.push({
        key: "demand",
        severity: "critical",
        label: "Demanda débil",
        text: "La demanda estimada puede hacer lento el aprendizaje y limitar el volumen de ventas del test.",
      });
    } else if (input.demand === 3) {
      risks.push({
        key: "demand",
        severity: "moderate",
        label: "Demanda todavía no probada",
        text: "La demanda es media: el producto puede funcionar, pero conviene testear mensajes y audiencias antes de comprar stock grande.",
      });
    }

    if (input.competition >= 5) {
      risks.push({
        key: "competition",
        severity: "critical",
        label: "Competencia muy alta",
        text: "El mercado parece saturado. Sin una oferta distinta, el costo de adquisición puede comerse el margen.",
      });
    } else if (input.competition === 4) {
      risks.push({
        key: "competition",
        severity: "moderate",
        label: "Competencia alta",
        text: "Hay presión competitiva. Necesitás diferenciar oferta, ángulo creativo o canal de adquisición.",
      });
    } else if (input.competition === 3 && components.margin < 75) {
      risks.push({
        key: "competition",
        severity: "watch",
        label: "Competencia media",
        text: "No bloquea el test, pero reduce margen de error si el producto no tiene una promesa clara.",
      });
    }

    if (input.complexity >= 5) {
      risks.push({
        key: "complexity",
        severity: "critical",
        label: "Operación muy compleja",
        text: "Despacho, soporte, devoluciones o control de calidad pueden convertir un buen margen teórico en bajo margen real.",
      });
    } else if (input.complexity === 4) {
      risks.push({
        key: "complexity",
        severity: "moderate",
        label: "Operación compleja",
        text: "La complejidad no descarta el producto, pero pide un test chico para medir problemas operativos temprano.",
      });
    } else if (input.complexity === 3 && input.demand <= 3) {
      risks.push({
        key: "complexity",
        severity: "watch",
        label: "Fricción operativa media",
        text: "La operación es manejable, aunque no conviene sobredimensionar stock antes de validar demanda.",
      });
    }

    if (risks.length === 0) {
      risks.push({
        key: "execution",
        severity: "watch",
        label: "Riesgo de ejecución",
        text: "No hay bloqueos fuertes. El mayor riesgo pasa por ejecutar mal el test: mala audiencia, creatividad débil o presupuesto sin métrica clara.",
      });
    }

    if (alerts.some((alert) => alert.severity === "warning")) {
      risks.push({
        key: "data-quality",
        severity: "watch",
        label: "Calidad de datos",
        text: "Antes de decidir, confirmá las alertas de carga para no basar el score en costos incompletos.",
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
        explanation = "El score se eleva porque el margen es fuerte y no hay riesgos críticos; el límite pasa por validar demanda/oferta, no por rentabilidad.";
      }
    }

    if (marginPercent >= 80 && alerts.some((alert) => alert.severity === "warning")) {
      adjustedScore = Math.min(adjustedScore, 78);
      explanation = "El margen empuja el score, pero se limita hasta confirmar que los costos cargados son reales.";
    }

    if (hasCriticalAlert) {
      adjustedScore = Math.min(adjustedScore, 35);
      explanation = "El score queda limitado porque hay datos críticos para corregir antes de decidir.";
    } else if (hasCriticalRisk) {
      adjustedScore = Math.min(adjustedScore, 64);
      explanation = "El score queda limitado por un riesgo crítico que puede bloquear el aprendizaje del test.";
    }

    return {
      score: Math.round(clamp(adjustedScore, 0, 100)),
      explanation,
    };
  }

  function getScoreBlockers(components, risks, alerts) {
    const blockers = [];

    if (alerts.length > 0) {
      blockers.push("la confiabilidad de los datos cargados");
    }

    if (components.demand < 50) {
      blockers.push("demanda estimada baja");
    }

    if (components.competition < 50) {
      blockers.push("presión competitiva");
    }

    if (components.complexity < 50) {
      blockers.push("fricción operativa");
    }

    if (components.margin < 70) {
      blockers.push("margen insuficiente para absorber errores");
    }

    if (blockers.length === 0 && risks.length > 0) {
      blockers.push("riesgos moderados de ejecución");
    }

    return blockers;
  }

  function getDiagnosis(input, marginPercent, score, components, risks, alerts, adjustmentExplanation) {
    const marginLabel = getMarginLabel(marginPercent);
    const demandLabel = getDemandLabel(input.demand);
    const competitionLabel = getPressureLabel(input.competition);
    const complexityLabel = getPressureLabel(input.complexity);
    const blockers = getScoreBlockers(components, risks, alerts);
    const base =
      score >= 72
        ? `El producto queda en zona testeable: margen ${marginLabel}, demanda ${demandLabel} y sin bloqueos críticos.`
        : score >= 50
          ? `El producto queda en zona de ajuste: margen ${marginLabel}, demanda ${demandLabel}, competencia ${competitionLabel} y complejidad ${complexityLabel}.`
          : `El producto queda débil para testear: margen ${marginLabel} y variables de mercado/operación con poco margen de error.`;

    const details = [
      `Margen bruto: ${marginPercent.toFixed(1)}%. Demanda: ${input.demand}/5. Competencia: ${input.competition}/5. Complejidad: ${input.complexity}/5.`,
      `Lo que más frena el score: ${blockers.join(", ")}.`,
    ];

    if (adjustmentExplanation) {
      details.push(adjustmentExplanation);
    }

    if (alerts.length > 0) {
      details.push("Primero revisá las alertas de carga: pueden cambiar la decisión final.");
    }

    return {
      summary: base,
      details,
    };
  }

  function getRecommendations(input, marginPercent, score, risks, alerts) {
    const recommendations = [];
    const riskKeys = risks.map((item) => item.key);

    if (alerts.length > 0) {
      recommendations.push({
        title: "Corregir datos",
        text: "Confirmá costos, envío, comisiones y precio real de mercado antes de usar el resultado como decisión.",
        priority: "Alta",
      });
    }

    if (marginPercent < 35 || riskKeys.includes("margin")) {
      recommendations.push({
        title: "Mejorar margen",
        text: "Probá subir precio o bajar costo. Si el score mejora fuerte, la oportunidad depende principalmente de unit economics.",
        priority: "Alta",
      });
    }

    if (riskKeys.includes("competition")) {
      recommendations.push({
        title: "Mejorar oferta",
        text: "Diferenciá con bundle, garantía, envío más rápido o una promesa más específica para no competir solo por precio.",
        priority: "Media",
      });
    }

    if (riskKeys.includes("demand") || score < 50) {
      recommendations.push({
        title: "Validar demanda antes",
        text: "Buscá señales externas: búsquedas, competidores vendiendo, comunidades activas o preventa simple antes de pauta paga.",
        priority: "Alta",
      });
    }

    if (riskKeys.includes("complexity")) {
      recommendations.push({
        title: "Simplificar operación",
        text: "Reducí variantes, empaque, peso o pasos de despacho para que el test mida demanda y no problemas operativos.",
        priority: "Media",
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        title: "Lanzar test controlado",
        text: "Testeá con presupuesto acotado, una oferta clara y una métrica principal de conversión o costo por compra.",
        priority: "Alta",
      });
    }

    return recommendations;
  }

  function getSuggestedPlan(score, classification, risks, alerts) {
    const hasCriticalAlert = alerts.some((alert) => alert.severity === "critical");
    const hasWarningAlert = alerts.some((alert) => alert.severity === "warning");
    const hasCriticalRisk = risks.some((risk) => risk.severity === "critical");
    const hasModerateRisk = risks.some((risk) => risk.severity === "moderate");

    if (hasCriticalAlert) {
      return {
        title: "No decidir todavía",
        stance: "Prudencia máxima",
        text: "Corregí los datos críticos y recalculá. Con inputs incompletos, cualquier test puede dar una señal falsa.",
      };
    }

    if (classification.label === "DESCARTAR" || hasCriticalRisk) {
      return {
        title: "Descartar o validar sin stock",
        stance: "Muy prudente",
        text: "No conviene comprar inventario. Si querés aprender algo, hacé preventa, encuesta o landing sin compromiso de stock.",
      };
    }

    if (classification.label === "AJUSTAR ANTES") {
      return {
        title: "Test corto con compra pequeña",
        stance: hasModerateRisk || hasWarningAlert ? "Prudente" : "Moderada",
        text: "Ajustá la variable principal y testeá 3 a 7 días con pocas unidades, presupuesto bajo y una métrica de corte definida.",
      };
    }

    return {
      title: "Test comercial controlado",
      stance: score >= 82 && !hasWarningAlert ? "Más agresiva" : "Moderada",
      text: "Podés lanzar un test real con stock limitado, 1 a 2 ofertas y presupuesto suficiente para medir conversión sin sobredimensionar compra.",
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
