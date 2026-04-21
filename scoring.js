(function () {
  const SCORE_WEIGHTS = {
    margin: 0.3,
    demand: 0.25,
    competition: 0.25,
    complexity: 0.2,
  };

  const CLASSIFICATIONS = {
    test: {
      label: "OPORTUNIDAD CLARA",
      description: "El producto tiene buena combinacion de margen, demanda y baja friccion para avanzar con un test.",
      tone: "success",
    },
    watch: {
      label: "AJUSTAR",
      description: "Hay potencial, pero conviene mejorar variables clave antes de invertir fuerte.",
      tone: "warning",
    },
    reject: {
      label: "DESCARTAR",
      description: "La oportunidad no parece viable con esta estructura de costos y mercado.",
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
    return clamp(marginPercent, 0, 100);
  }

  function classifyScore(score) {
    if (score >= 80) {
      return CLASSIFICATIONS.test;
    }

    if (score >= 60) {
      return CLASSIFICATIONS.watch;
    }

    return CLASSIFICATIONS.reject;
  }

  function getWeakPoints(input, marginPercent, components) {
    const weakPoints = [];

    if (marginPercent < 30) {
      weakPoints.push({
        key: "margin",
        label: "Margen bajo",
        text: `El margen bruto es ${marginPercent.toFixed(1)}%, por debajo de un umbral saludable para ecommerce.`,
      });
    }

    if (input.competition >= 4) {
      weakPoints.push({
        key: "competition",
        label: "Competencia alta",
        text: "La competencia reduce el score porque exige una oferta mas diferenciada o una estrategia de adquisicion mas eficiente.",
      });
    }

    if (input.demand <= 2) {
      weakPoints.push({
        key: "demand",
        label: "Demanda baja",
        text: "La demanda estimada limita el potencial del producto y puede hacer mas lento el aprendizaje del test.",
      });
    }

    if (input.complexity >= 4) {
      weakPoints.push({
        key: "complexity",
        label: "Operacion compleja",
        text: "La complejidad operativa presiona tiempos, costos y riesgo de errores al escalar.",
      });
    }

    if (weakPoints.length === 0 && components.margin < 50) {
      weakPoints.push({
        key: "margin",
        label: "Margen mejorable",
        text: "El producto no tiene un punto critico evidente, pero el margen aun puede fortalecerse.",
      });
    }

    return weakPoints;
  }

  function getDiagnosis(input, marginPercent, score, weakPoints) {
    const hasWeakPoints = weakPoints.length > 0;
    const base =
      score >= 80
        ? "El score es alto porque las variables principales estan balanceadas y el producto absorbe bien sus costos."
        : score >= 60
          ? "El score queda en zona intermedia porque existen senales positivas, pero una o mas variables todavia frenan la oportunidad."
          : "El score es bajo porque la combinacion actual de margen, demanda, competencia y operacion deja poco espacio para un test rentable.";

    return {
      summary: base,
      details: [
        `Margen bruto calculado: ${marginPercent.toFixed(1)}%.`,
        `Demanda: ${input.demand}/5. Competencia: ${input.competition}/5. Complejidad: ${input.complexity}/5.`,
        hasWeakPoints
          ? `Puntos debiles detectados: ${weakPoints.map((item) => item.label.toLowerCase()).join(", ")}.`
          : "No se detectan puntos debiles criticos con los datos ingresados.",
      ],
    };
  }

  function getRecommendations(input, marginPercent, score, weakPoints) {
    const recommendations = [];
    const weakKeys = weakPoints.map((item) => item.key);

    if (marginPercent < 35 || weakKeys.includes("margin")) {
      recommendations.push({
        title: "Subir precio",
        text: "Proba un precio 10% mayor y reforza la percepcion de valor con packs, garantia o beneficio claro.",
        priority: "Alta",
      });
      recommendations.push({
        title: "Bajar costo",
        text: "Negocia proveedor, compra minima o empaque para recuperar margen sin depender solo del precio.",
        priority: "Alta",
      });
    }

    if (weakKeys.includes("competition")) {
      recommendations.push({
        title: "Mejorar oferta",
        text: "Diferencia el producto con bundle, bonus, envio mas rapido, garantia o una promesa mas especifica.",
        priority: "Media",
      });
    }

    if (weakKeys.includes("demand") || score < 60) {
      recommendations.push({
        title: "Cambiar producto",
        text: "Busca una variante con senales de demanda mas fuertes antes de invertir en trafico pago.",
        priority: "Alta",
      });
    }

    if (weakKeys.includes("complexity")) {
      recommendations.push({
        title: "Simplificar operacion",
        text: "Prioriza productos livianos, faciles de despachar y con baja tasa esperada de devoluciones.",
        priority: "Media",
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        title: "Lanzar test controlado",
        text: "Valida con presupuesto acotado, una landing simple y una metrica clara de conversion.",
        priority: "Media",
      });
    }

    return recommendations;
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

    const totalScore =
      components.margin * SCORE_WEIGHTS.margin +
      components.demand * SCORE_WEIGHTS.demand +
      components.competition * SCORE_WEIGHTS.competition +
      components.complexity * SCORE_WEIGHTS.complexity;

    const roundedScore = Math.round(clamp(totalScore, 0, 100));
    const weakPoints = getWeakPoints(input, marginPercent, components);

    return {
      score: roundedScore,
      marginPercent,
      classification: classifyScore(roundedScore),
      components,
      diagnosis: getDiagnosis(input, marginPercent, roundedScore, weakPoints),
      weakPoints,
      recommendations: getRecommendations(input, marginPercent, roundedScore, weakPoints),
    };
  }

  function simulatePrice(input, priceMultiplier) {
    return evaluateProduct({
      ...input,
      salePrice: input.salePrice * priceMultiplier,
    });
  }

  window.productScoring = {
    calculateGrossMargin,
    classifyScore,
    evaluateProduct,
    simulatePrice,
  };
})();
