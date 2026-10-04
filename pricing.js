(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.KyivPhotoPricing = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PRICING = Object.freeze({
    indoorBase: 98,
    indoorExtraPerson: 40,
    outdoorBase: 118,
    outdoorExtraPerson: 45,
    oneHourSurcharge: 15,
    gownCleaning: 15,
    deposit: 50,
  });

  function normalizePositiveNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  function getBillableHours(duration) {
    const hours = normalizePositiveNumber(duration, 1);
    if (hours > 1 && hours < 2) return 2;
    return hours;
  }

  function calculatePersonalQuote(input) {
    const scene = input.scene === "indoor" ? "indoor" : "outdoor";
    const people = Math.max(1, Math.floor(normalizePositiveNumber(input.people, 1)));
    const duration = normalizePositiveNumber(input.duration, 1);
    const billableHours = getBillableHours(duration);
    const baseRate = scene === "indoor" ? PRICING.indoorBase : PRICING.outdoorBase;
    const extraPersonRate =
      scene === "indoor" ? PRICING.indoorExtraPerson : PRICING.outdoorExtraPerson;
    const hourlyRate = baseRate + extraPersonRate * (people - 1);
    const oneHourFee = duration === 1 ? PRICING.oneHourSurcharge : 0;
    const graduation = Boolean(input.graduation);
    const hasGown = graduation && input.gownType && input.gownType !== "none";
    const gownCount = hasGown
      ? Math.min(people, Math.max(1, Math.floor(normalizePositiveNumber(input.gownCount, 1))))
      : 0;
    const gownFee = gownCount * PRICING.gownCleaning;
    const shootingFee = hourlyRate * billableHours + oneHourFee;

    return {
      scene,
      people,
      duration,
      billableHours,
      hourlyRate,
      oneHourFee,
      gownCount,
      gownFee,
      shootingFee,
      total: shootingFee + gownFee,
    };
  }

  function formatHours(hours) {
    return Number.isInteger(hours) ? String(hours) : String(Number(hours.toFixed(1)));
  }

  function createPersonalConsultation(selection, quote) {
    const lines = [
      "【基辅约拍咨询】",
      "",
      `拍摄类型：${selection.typeLabel}`,
      `场景：${selection.scene === "indoor" ? "室内" : "室外"}`,
      `人数：${quote.people}人`,
      `时长：${formatHours(quote.duration)}小时`,
    ];

    if (selection.type === "graduation") {
      const gownLabels = { none: "不需要", master: "硕士服", doctor: "博士服" };
      const gownLabel = gownLabels[selection.gownType] || "不需要";
      lines.push(
        `毕业服：${gownLabel}${quote.gownCount ? ` × ${quote.gownCount}套` : ""}${
          selection.gownType === "master" && selection.collar ? `（${selection.collar}领）` : ""
        }`,
      );
    }

    lines.push(`参考价格：${quote.total} RMB`, "", "我想咨询一下这个拍摄方案和档期～");
    return lines.join("\n");
  }

  function createCommercialConsultation(selection) {
    return [
      "【基辅商业摄影咨询】",
      "",
      `类型：${selection.commercialTypeLabel}`,
      "日期：待填写",
      "地点：待填写",
      "预计时长：待填写",
      "交付需求：待沟通",
      "",
      "我想咨询一下这个拍摄项目的报价和档期。",
    ].join("\n");
  }

  return {
    PRICING,
    getBillableHours,
    calculatePersonalQuote,
    createPersonalConsultation,
    createCommercialConsultation,
    formatHours,
  };
});
