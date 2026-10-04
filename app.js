(function () {
  "use strict";

  const {
    PRICING,
    calculatePersonalQuote,
    createPersonalConsultation,
    createCommercialConsultation,
    formatHours,
  } = window.KyivPhotoPricing;

  const TYPE_OPTIONS = [
    { value: "portrait", label: "个人写真 / 街拍", meta: "一个人，也可以很有故事" },
    { value: "couple", label: "情侣 / 好友", meta: "把相处的感觉留住" },
    { value: "graduation", label: "毕业照", meta: "学位服与校园纪念" },
    { value: "daily", label: "探店 / 日常", meta: "咖啡馆、散步、看展" },
    { value: "campus", label: "校园 / 看展", meta: "轻松自然的生活记录" },
    { value: "commercial", label: "商业拍摄", meta: "展会、活动、产品与品牌" },
  ];

  const COMMERCIAL_OPTIONS = [
    { value: "exhibition", label: "展会摄影", meta: "展位、来宾与现场氛围" },
    { value: "event", label: "会议 / 活动跟拍", meta: "流程、发言与互动记录" },
    { value: "product", label: "商品 / 产品摄影", meta: "按交付与拍摄量报价" },
    { value: "brand", label: "品牌 / 企业素材", meta: "官网、社媒与宣传内容" },
  ];

  const state = {
    selections: {},
    steps: [],
    stepIndex: 0,
    resultMode: null,
  };

  const elements = {
    calculator: document.getElementById("calculator"),
    welcome: document.getElementById("quizWelcome"),
    flow: document.getElementById("quizFlow"),
    result: document.getElementById("resultCard"),
    resultContent: document.getElementById("resultContent"),
    options: document.getElementById("options"),
    custom: document.getElementById("customControl"),
    questionKicker: document.getElementById("questionKicker"),
    questionHeading: document.getElementById("questionHeading"),
    questionHint: document.getElementById("questionHint"),
    stepLabel: document.getElementById("stepLabel"),
    stepSummary: document.getElementById("stepSummary"),
    progress: document.querySelector("[role='progressbar']"),
    progressFill: document.getElementById("progressFill"),
    back: document.getElementById("backButton"),
    continue: document.getElementById("continueButton"),
    copy: document.getElementById("copyButton"),
    edit: document.getElementById("editButton"),
    reset: document.getElementById("resetButton"),
    consultation: document.getElementById("consultationText"),
    copyStatus: document.getElementById("copyStatus"),
  };

  function buildSteps() {
    const steps = ["type"];
    if (state.selections.type === "commercial") {
      steps.push("commercialType");
      return steps;
    }
    steps.push("scene", "people", "duration");
    if (state.selections.type === "graduation") steps.push("gown");
    return steps;
  }

  const stepConfig = {
    type: {
      kicker: "先从最重要的开始",
      heading: "你想拍什么？",
      hint: "选择最接近的一项就好。",
      summary: "选择拍摄类型",
      options: TYPE_OPTIONS,
    },
    commercialType: {
      kicker: "商业项目 · 定制报价",
      heading: "具体是哪类拍摄？",
      hint: "我们会根据日期、时长、内容与交付需求单独报价。",
      summary: "选择商业类型",
      options: COMMERCIAL_OPTIONS,
    },
    scene: {
      kicker: "环境会影响用光与价格",
      heading: "室内还是室外？",
      hint: "咖啡馆、室内场馆算作室内；街道、公园、校园户外算作室外。",
      summary: "选择拍摄场景",
      options: [
        { value: "indoor", label: "室内", meta: `单人 ${PRICING.indoorBase} RMB / 小时` },
        { value: "outdoor", label: "室外", meta: `单人 ${PRICING.outdoorBase} RMB / 小时` },
      ],
    },
    people: {
      kicker: "每增加 1 人按小时计费",
      heading: "一共几个人？",
      hint: "人数包含所有需要出镜的人。",
      summary: "选择拍摄人数",
      options: [1, 2, 3, 4].map((number) => ({
        value: String(number),
        label: `${number} 人`,
        meta: number === 1 ? "单人约拍" : "一起出镜",
      })).concat([{ value: "more", label: "更多", meta: "输入具体人数" }]),
    },
    duration: {
      kicker: "1 小时加收 15 RMB",
      heading: "计划拍多久？",
      hint: "超过 1 小时但不足 2 小时，按 2 小时计算。",
      summary: "选择拍摄时长",
      options: [
        { value: "1", label: "1 小时", meta: "+15 RMB" },
        { value: "1.5", label: "1.5 小时", meta: "按 2 小时计费" },
        { value: "2", label: "2 小时", meta: "从容完成一组拍摄" },
        { value: "3", label: "3 小时", meta: "适合多个地点" },
        { value: "4", label: "4 小时", meta: "更完整的记录" },
        { value: "custom", label: "自定义", meta: "1–12 小时" },
      ],
    },
    gown: {
      kicker: "仅毕业照显示此项",
      heading: "需要毕业服吗？",
      hint: `服装本身免费，仅收 ${PRICING.gownCleaning} RMB / 套清洗费。`,
      summary: "选择毕业服",
      options: [
        { value: "none", label: "不需要", meta: "自备服装或便服拍摄" },
        { value: "master", label: "硕士服", meta: "黄色 / 粉色 / 银色领" },
        { value: "doctor", label: "博士服", meta: "包含博士帽" },
      ],
    },
  };

  function startQuiz() {
    state.selections = {};
    state.steps = ["type"];
    state.stepIndex = 0;
    state.resultMode = null;
    elements.welcome.hidden = true;
    elements.result.hidden = true;
    elements.flow.hidden = false;
    renderStep();
    elements.calculator.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function getSelectedValue(step) {
    if (step === "people") {
      return state.selections.peopleMode === "more" ? "more" : String(state.selections.people || "");
    }
    if (step === "duration") {
      return state.selections.durationMode === "custom"
        ? "custom"
        : String(state.selections.duration || "");
    }
    return String(state.selections[step] || "");
  }

  function renderStep() {
    state.steps = buildSteps();
    const step = state.steps[state.stepIndex];
    const config = stepConfig[step];
    const total = state.steps.length;
    const current = state.stepIndex + 1;

    elements.stepLabel.textContent = `Step ${current} / ${total}`;
    elements.stepSummary.textContent = config.summary;
    elements.progress.setAttribute("aria-valuemax", String(total));
    elements.progress.setAttribute("aria-valuenow", String(current));
    elements.progressFill.style.width = `${(current / total) * 100}%`;
    elements.questionKicker.textContent = config.kicker;
    elements.questionHeading.textContent = config.heading;
    elements.questionHint.textContent = config.hint;
    elements.options.innerHTML = "";
    elements.custom.hidden = true;
    elements.custom.innerHTML = "";
    elements.continue.hidden = true;
    elements.back.style.visibility = state.stepIndex === 0 ? "hidden" : "visible";

    const selectedValue = getSelectedValue(step);
    config.options.forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option-card";
      button.dataset.value = option.value;
      button.setAttribute("aria-pressed", String(selectedValue === option.value));
      button.innerHTML = `<strong>${option.label}</strong><span>${option.meta}</span>`;
      if (selectedValue === option.value) button.classList.add("is-selected");
      button.addEventListener("click", () => handleOption(step, option));
      elements.options.appendChild(button);
    });

    if (step === "people" && state.selections.peopleMode === "more") renderPeopleControl();
    if (step === "duration" && state.selections.durationMode === "custom") renderDurationControl();
    if (step === "gown" && state.selections.gownType && state.selections.gownType !== "none") {
      renderGownControl();
    }
  }

  function selectVisualOption(value) {
    elements.options.querySelectorAll(".option-card").forEach((button) => {
      const selected = button.dataset.value === value;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function handleOption(step, option) {
    selectVisualOption(option.value);

    if (step === "type") {
      state.selections.type = option.value;
      state.selections.typeLabel = option.label;
      delete state.selections.commercialType;
      delete state.selections.gownType;
      advanceSoon();
      return;
    }
    if (step === "commercialType") {
      state.selections.commercialType = option.value;
      state.selections.commercialTypeLabel = option.label;
      advanceSoon();
      return;
    }
    if (step === "scene") {
      state.selections.scene = option.value;
      advanceSoon();
      return;
    }
    if (step === "people") {
      state.selections.peopleMode = option.value;
      if (option.value === "more") {
        state.selections.people = Math.max(5, Number(state.selections.people) || 5);
        renderPeopleControl();
      } else {
        state.selections.people = Number(option.value);
        advanceSoon();
      }
      return;
    }
    if (step === "duration") {
      state.selections.durationMode = option.value;
      if (option.value === "custom") {
        state.selections.duration = Number(state.selections.duration) || 2.5;
        renderDurationControl();
      } else {
        state.selections.duration = Number(option.value);
        advanceSoon();
      }
      return;
    }
    if (step === "gown") {
      state.selections.gownType = option.value;
      if (option.value === "none") {
        state.selections.gownCount = 0;
        delete state.selections.collar;
        advanceSoon();
      } else {
        state.selections.gownCount = Math.min(
          Number(state.selections.people) || 1,
          Math.max(1, Number(state.selections.gownCount) || 1),
        );
        if (option.value !== "master") delete state.selections.collar;
        renderGownControl();
      }
    }
  }

  function advanceSoon() {
    window.setTimeout(() => {
      state.steps = buildSteps();
      if (state.stepIndex >= state.steps.length - 1) {
        showResult();
      } else {
        state.stepIndex += 1;
        renderStep();
      }
    }, 120);
  }

  function renderPeopleControl() {
    elements.custom.hidden = false;
    elements.custom.innerHTML = `
      <label for="peopleInput">具体人数</label>
      <div class="stepper">
        <button type="button" aria-label="减少人数" data-stepper="minus">−</button>
        <input id="peopleInput" type="number" min="5" max="30" inputmode="numeric" value="${state.selections.people}" />
        <button type="button" aria-label="增加人数" data-stepper="plus">＋</button>
      </div>
      <p>5 人以上建议先复制方案咨询，最终以场地与拍摄安排为准。</p>
    `;
    const input = elements.custom.querySelector("input");
    bindStepper(input, 5, 30, 1, (value) => {
      state.selections.people = value;
    });
    elements.continue.hidden = false;
    elements.continue.textContent = "继续";
    elements.continue.onclick = () => advanceSoon();
  }

  function renderDurationControl() {
    elements.custom.hidden = false;
    elements.custom.innerHTML = `
      <label for="durationInput">自定义时长（小时）</label>
      <input class="duration-input" id="durationInput" type="number" min="1" max="12" step="0.5" inputmode="decimal" value="${state.selections.duration}" />
      <p id="durationRule">不足 2 小时的部分会按规则自动调整。</p>
    `;
    const input = elements.custom.querySelector("input");
    input.addEventListener("input", () => {
      const value = Math.min(12, Math.max(1, Number(input.value) || 1));
      state.selections.duration = value;
      updateDurationRule(value);
    });
    updateDurationRule(Number(state.selections.duration));
    elements.continue.hidden = false;
    elements.continue.textContent = "生成报价";
    elements.continue.onclick = () => advanceSoon();
  }

  function updateDurationRule(value) {
    const rule = document.getElementById("durationRule");
    if (!rule) return;
    if (value > 1 && value < 2) {
      rule.textContent = `${formatHours(value)} 小时将按 2 小时计费。`;
    } else if (value === 1) {
      rule.textContent = "1 小时拍摄会加收 15 RMB。";
    } else {
      rule.textContent = `将按 ${formatHours(value)} 小时计费。`;
    }
  }

  function renderGownControl() {
    const people = Number(state.selections.people) || 1;
    const collarMarkup = state.selections.gownType === "master"
      ? `<fieldset class="collar-fieldset">
          <legend>选择硕士服领色</legend>
          <div class="collar-options">
            ${["黄色", "粉色", "银色"].map((color) => `
              <button type="button" class="chip ${state.selections.collar === color ? "is-selected" : ""}" data-collar="${color}" aria-pressed="${state.selections.collar === color}">${color}</button>
            `).join("")}
          </div>
        </fieldset>`
      : "";

    elements.custom.hidden = false;
    elements.custom.innerHTML = `
      ${collarMarkup}
      <label for="gownCountInput">需要几套毕业服？</label>
      <div class="stepper">
        <button type="button" aria-label="减少毕业服数量" data-stepper="minus">−</button>
        <input id="gownCountInput" type="number" min="1" max="${people}" inputmode="numeric" value="${state.selections.gownCount}" />
        <button type="button" aria-label="增加毕业服数量" data-stepper="plus">＋</button>
      </div>
      <p>${PRICING.gownCleaning} RMB / 套清洗费，最多不超过拍摄人数。</p>
    `;

    const input = elements.custom.querySelector("input");
    bindStepper(input, 1, people, 1, (value) => {
      state.selections.gownCount = value;
    });

    elements.custom.querySelectorAll("[data-collar]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selections.collar = button.dataset.collar;
        elements.custom.querySelectorAll("[data-collar]").forEach((chip) => {
          const selected = chip === button;
          chip.classList.toggle("is-selected", selected);
          chip.setAttribute("aria-pressed", String(selected));
        });
      });
    });

    elements.continue.hidden = false;
    elements.continue.textContent = "生成报价";
    elements.continue.onclick = () => {
      if (state.selections.gownType === "master" && !state.selections.collar) {
        state.selections.collar = "黄色";
      }
      advanceSoon();
    };
  }

  function bindStepper(input, min, max, step, onChange) {
    const setValue = (value) => {
      const safeValue = Math.min(max, Math.max(min, value));
      input.value = String(safeValue);
      onChange(safeValue);
    };
    elements.custom.querySelector("[data-stepper='minus']").addEventListener("click", () => {
      setValue(Number(input.value) - step);
    });
    elements.custom.querySelector("[data-stepper='plus']").addEventListener("click", () => {
      setValue(Number(input.value) + step);
    });
    input.addEventListener("input", () => setValue(Number(input.value) || min));
  }

  function showResult() {
    elements.flow.hidden = true;
    elements.result.hidden = false;
    elements.copyStatus.textContent = "";

    if (state.selections.type === "commercial") {
      state.resultMode = "commercial";
      renderCommercialResult();
    } else {
      state.resultMode = "personal";
      renderPersonalResult();
    }
    elements.result.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function renderPersonalResult() {
    const quote = calculatePersonalQuote({
      scene: state.selections.scene,
      people: state.selections.people,
      duration: state.selections.duration,
      graduation: state.selections.type === "graduation",
      gownType: state.selections.gownType,
      gownCount: state.selections.gownCount,
    });
    const sceneLabel = state.selections.scene === "indoor" ? "室内" : "室外";
    const adjustedTime = quote.duration !== quote.billableHours
      ? `<p class="billing-note">实际 ${formatHours(quote.duration)} 小时，按 ${formatHours(quote.billableHours)} 小时计费</p>`
      : "";
    const gownLabels = { none: "不需要", master: "硕士服", doctor: "博士服" };
    const gownRow = state.selections.type === "graduation"
      ? `<div class="summary-row"><span>毕业服</span><strong>${gownLabels[state.selections.gownType || "none"]}${quote.gownCount ? ` × ${quote.gownCount}套` : ""}</strong></div>`
      : "";
    const feeDetail = quote.gownFee
      ? `<div class="summary-row"><span>毕业服清洗费</span><strong>${quote.gownFee} RMB</strong></div>`
      : "";

    elements.resultContent.innerHTML = `
      <p class="result-eyebrow">你的拍摄方案</p>
      <div class="result-title-row">
        <div>
          <h3>${state.selections.typeLabel}</h3>
          <p>${sceneLabel} · ${quote.people}人 · ${formatHours(quote.duration)}小时</p>
        </div>
        <span class="result-badge">双机位免费</span>
      </div>
      ${adjustedTime}
      <div class="price-block">
        <span>预计总价</span>
        <strong><small>¥</small>${quote.total}</strong>
        <p>以上为参考价格，最终以实际拍摄需求沟通为准。</p>
      </div>
      <div class="price-summary">
        <div class="summary-row"><span>拍摄费</span><strong>${quote.shootingFee} RMB</strong></div>
        ${gownRow}
        ${feeDetail}
      </div>
      <ul class="result-includes">
        <li>Canon R8 × Fujifilm X100V 双机位拍摄</li>
        <li>底片全送 + 部分空镜 / 简短视频花絮</li>
        <li>1 张精修 + 8 张基础调色 / 瑕疵调整</li>
        <li>姿势、动作与情绪全程引导</li>
      </ul>
      <div class="deposit-callout">确认档期后支付 <strong>${PRICING.deposit} RMB 定金</strong>即可锁定预约。</div>
    `;
    elements.consultation.value = createPersonalConsultation(state.selections, quote);
  }

  function renderCommercialResult() {
    elements.resultContent.innerHTML = `
      <p class="result-eyebrow">你的拍摄方案</p>
      <div class="result-title-row">
        <div>
          <h3>${state.selections.commercialTypeLabel}</h3>
          <p>商业拍摄 · 按项目需求评估</p>
        </div>
        <span class="result-badge dark">定制报价</span>
      </div>
      <div class="commercial-message">
        <strong>商业拍摄 · 定制报价</strong>
        <p>请提供拍摄日期、地点、预计时长、拍摄内容及交付需求，我们会根据项目提供报价。</p>
      </div>
      <ul class="result-includes">
        <li>根据流程、现场条件与交付数量制定方案</li>
        <li>可沟通展会、活动、产品与品牌内容</li>
        <li>不会套用个人约拍的小时价格</li>
      </ul>
    `;
    elements.consultation.value = createCommercialConsultation(state.selections);
  }

  function goBack() {
    if (state.stepIndex > 0) {
      state.stepIndex -= 1;
      renderStep();
    }
  }

  function editResult() {
    elements.result.hidden = true;
    elements.flow.hidden = false;
    state.steps = buildSteps();
    state.stepIndex = Math.max(0, state.steps.length - 1);
    renderStep();
  }

  function resetQuiz() {
    state.selections = {};
    state.steps = ["type"];
    state.stepIndex = 0;
    state.resultMode = null;
    elements.result.hidden = true;
    elements.flow.hidden = true;
    elements.welcome.hidden = false;
    elements.copyStatus.textContent = "";
    elements.calculator.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function copyConsultation() {
    const text = elements.consultation.value;
    let copied = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch (error) {
        copied = false;
      }
    }

    if (!copied) {
      elements.consultation.focus();
      elements.consultation.select();
      elements.consultation.setSelectionRange(0, text.length);
      try {
        copied = document.execCommand("copy");
      } catch (error) {
        copied = false;
      }
    }

    elements.copyStatus.textContent = copied
      ? "已复制，可以直接粘贴到微信发送。"
      : "未能自动复制，咨询文字已选中，请长按后选择“复制”。";
  }

  document.querySelectorAll("[data-action='start']").forEach((button) => {
    button.addEventListener("click", startQuiz);
  });
  elements.back.addEventListener("click", goBack);
  elements.copy.addEventListener("click", copyConsultation);
  elements.edit.addEventListener("click", editResult);
  elements.reset.addEventListener("click", resetQuiz);
})();
