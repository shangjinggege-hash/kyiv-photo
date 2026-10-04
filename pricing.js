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
    gownInventory: Object.freeze({ master: 6, doctor: 2, yellow: 2, silver: 2, pink: 4 }),
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
    const scene = ["indoor", "outdoor", "mixed"].includes(input.scene) ? input.scene : "outdoor";
    const people = Math.max(1, Math.floor(normalizePositiveNumber(input.people, 1)));
    const indoorDuration = scene === "mixed" ? normalizePositiveNumber(input.indoorDuration, 1) : 0;
    const outdoorDuration = scene === "mixed" ? normalizePositiveNumber(input.outdoorDuration, 1) : 0;
    const duration = scene === "mixed" ? indoorDuration + outdoorDuration : normalizePositiveNumber(input.duration, 1);
    const indoorBillableHours = scene === "mixed" ? getBillableHours(indoorDuration) : 0;
    const outdoorBillableHours = scene === "mixed" ? getBillableHours(outdoorDuration) : 0;
    const billableHours = scene === "mixed" ? indoorBillableHours + outdoorBillableHours : getBillableHours(duration);
    const baseRate = scene === "indoor" ? PRICING.indoorBase : PRICING.outdoorBase;
    const extraPersonRate =
      scene === "indoor" ? PRICING.indoorExtraPerson : PRICING.outdoorExtraPerson;
    const hourlyRate = baseRate + extraPersonRate * (people - 1);
    const indoorHourlyRate = PRICING.indoorBase + PRICING.indoorExtraPerson * (people - 1);
    const outdoorHourlyRate = PRICING.outdoorBase + PRICING.outdoorExtraPerson * (people - 1);
    const oneHourFee = scene !== "mixed" && duration === 1 ? PRICING.oneHourSurcharge : 0;
    const graduation = Boolean(input.graduation);
    const gowns = graduation && input.gownSelections ? input.gownSelections : null;
    const newGownCount = gowns
      ? Math.min(
        people,
        Math.min(PRICING.gownInventory.master, Math.max(0, Math.floor(Number(gowns.master) || 0)))
          + Math.min(PRICING.gownInventory.doctor, Math.max(0, Math.floor(Number(gowns.doctor) || 0))),
      )
      : 0;
    const hasLegacyGown = graduation && input.gownType && input.gownType !== "none";
    const legacyGownCount = hasLegacyGown
      ? Math.min(people, Math.max(1, Math.floor(normalizePositiveNumber(input.gownCount, 1))))
      : 0;
    const gownCount = gowns ? newGownCount : legacyGownCount;
    const gownFee = gownCount * PRICING.gownCleaning;
    const shootingFee = scene === "mixed"
      ? indoorHourlyRate * indoorBillableHours + outdoorHourlyRate * outdoorBillableHours
      : hourlyRate * billableHours + oneHourFee;

    return {
      scene,
      people,
      duration,
      billableHours,
      indoorDuration,
      outdoorDuration,
      indoorBillableHours,
      outdoorBillableHours,
      hourlyRate,
      indoorHourlyRate,
      outdoorHourlyRate,
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
    const sceneLabels = { indoor: "室内", outdoor: "室外", mixed: "室内＋室外" };
    const lines = [
      "【基辅约拍咨询】",
      "",
      `拍摄类型：${selection.typeLabel}`,
      `场景：${sceneLabels[selection.scene] || "室外"}`,
      `人数：${quote.people}人`,
      selection.scene === "mixed"
        ? `时长：室内 ${formatHours(quote.indoorDuration)} 小时＋室外 ${formatHours(quote.outdoorDuration)} 小时`
        : `时长：${formatHours(quote.duration)}小时`,
    ];

    if (selection.type === "graduation") {
      if (selection.gownSelections) {
        const gowns = selection.gownSelections;
        const details = [["蓝色硕士服", gowns.master], ["红色博士服", gowns.doctor]]
          .filter(([, count]) => Number(count) > 0)
          .map(([label, count]) => `${label} × ${count}套`);
        lines.push(`毕业服：${details.length ? details.join("、") : "不需要"}`);
        const collars = [["黄色领", gowns.yellow], ["银色领", gowns.silver], ["粉色领", gowns.pink]]
          .filter(([, count]) => Number(count) > 0)
          .map(([label, count]) => `${label} × ${count}条`);
        if (collars.length) lines.push(`领子：${collars.join("、")}`);
      } else {
        const gownLabels = { none: "不需要", master: "硕士服", doctor: "博士服" };
        const gownLabel = gownLabels[selection.gownType] || "不需要";
        lines.push(`毕业服：${gownLabel}${quote.gownCount ? ` × ${quote.gownCount}套` : ""}${selection.gownType === "master" && selection.collar ? `（${selection.collar}领）` : ""}`);
      }
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
