(function () {
  "use strict";

  var STORAGE_KEY = "stock-watchlist.v1";
  var CODE_PATTERN = /^[A-Z0-9][A-Z0-9.-]{0,19}$/;
  var MAX_NAME_LENGTH = 40;

  var form = document.getElementById("add-form");
  var codeInput = document.getElementById("stock-code");
  var nameInput = document.getElementById("stock-name");
  var message = document.getElementById("form-message");
  var list = document.getElementById("watchlist");
  var emptyState = document.getElementById("empty-state");
  var count = document.getElementById("count");
  var storageWarning = document.getElementById("storage-warning");

  var stocks = [];
  var storageAvailable = true;

  function normalizeCode(value) {
    return String(value).trim().toUpperCase();
  }

  function normalizeName(value) {
    return String(value).trim().replace(/\s+/g, " ").slice(0, MAX_NAME_LENGTH);
  }

  function setStorageAvailable(available) {
    storageAvailable = available;
    storageWarning.hidden = available;
  }

  function loadStocks() {
    var raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      setStorageAvailable(false);
      return [];
    }

    if (!raw) {
      return [];
    }

    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      showMessage("本地保存的数据已损坏，已从空列表开始。", "error");
      return [];
    }

    if (!Array.isArray(parsed)) {
      showMessage("本地保存的数据格式无法识别，已从空列表开始。", "error");
      return [];
    }

    var seen = new Set();
    var loaded = [];

    parsed.forEach(function (item) {
      if (!item || typeof item !== "object") {
        return;
      }
      var code = typeof item.code === "string" ? normalizeCode(item.code) : "";
      var name = typeof item.name === "string" ? normalizeName(item.name) : "";
      if (!CODE_PATTERN.test(code) || seen.has(code)) {
        return;
      }
      seen.add(code);
      loaded.push({
        code: code,
        name: name,
        addedAt: Number.isFinite(item.addedAt) ? item.addedAt : 0,
      });
    });

    return loaded;
  }

  function saveStocks() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stocks));
      setStorageAvailable(true);
    } catch (error) {
      setStorageAvailable(false);
    }
  }

  function showMessage(text, state) {
    message.textContent = text;
    message.dataset.state = state || "";
  }

  function createRow(stock) {
    var item = document.createElement("li");
    item.className = "watchlist__item";

    var main = document.createElement("div");
    main.className = "watchlist__main";

    var code = document.createElement("span");
    code.className = "watchlist__code";
    code.textContent = stock.code;
    main.appendChild(code);

    if (stock.name) {
      var name = document.createElement("span");
      name.className = "watchlist__name";
      name.textContent = stock.name;
      main.appendChild(name);
    }

    var remove = document.createElement("button");
    remove.type = "button";
    remove.className = "watchlist__delete";
    remove.dataset.code = stock.code;
    remove.setAttribute("aria-label", "删除 " + stock.code);
    remove.textContent = "删除";

    item.appendChild(main);
    item.appendChild(remove);
    return item;
  }

  function render() {
    var rows = stocks.map(createRow);
    list.replaceChildren.apply(list, rows);
    count.textContent = "共 " + stocks.length + " 只";
    emptyState.hidden = stocks.length > 0;
  }

  function addStock(event) {
    event.preventDefault();

    var code = normalizeCode(codeInput.value);
    var name = normalizeName(nameInput.value);

    if (!code) {
      showMessage("请输入股票代码。", "error");
      codeInput.focus();
      return;
    }

    if (!CODE_PATTERN.test(code)) {
      showMessage("股票代码需为 1 到 20 位字母、数字、点或短横线。", "error");
      codeInput.focus();
      return;
    }

    var duplicate = stocks.some(function (stock) {
      return stock.code === code;
    });

    if (duplicate) {
      showMessage(code + " 已在观察列表中。", "error");
      codeInput.focus();
      return;
    }

    stocks.unshift({ code: code, name: name, addedAt: Date.now() });
    saveStocks();
    render();
    form.reset();
    codeInput.focus();
    showMessage("已添加 " + code + (name ? "（" + name + "）。" : "。"), "success");
  }

  function deleteStock(button) {
    var code = button.dataset.code;
    var index = stocks.findIndex(function (stock) {
      return stock.code === code;
    });

    if (index === -1) {
      return;
    }

    stocks.splice(index, 1);
    saveStocks();
    render();

    var buttons = list.querySelectorAll(".watchlist__delete");
    var nextButton = buttons[Math.min(index, buttons.length - 1)];
    if (nextButton) {
      nextButton.focus();
    } else {
      codeInput.focus();
    }

    showMessage("已删除 " + code + "。", "info");
  }

  form.addEventListener("submit", addStock);

  list.addEventListener("click", function (event) {
    var button = event.target.closest(".watchlist__delete");
    if (button) {
      deleteStock(button);
    }
  });

  window.addEventListener("storage", function (event) {
    if (event.key !== STORAGE_KEY) {
      return;
    }
    stocks = loadStocks();
    render();
  });

  stocks = loadStocks();
  render();

  if (!storageAvailable) {
    storageWarning.hidden = false;
  }
})();
