// Small vanilla-JS searchable dropdown widgets used by the Course Syllabus
// admin form and the user-side Syllabus Download surfaces.
//
// Two factories exported on `window`:
//   createSearchableSelect({ containerId, hiddenInputId, items, placeholder, onChange })
//     - Single-select. Text box on top; typing filters a dropdown; click sets the
//       value. Writes selected value to the hidden input.
//   createChipMultiSelect({ containerId, hiddenInputId, items, placeholder, onChange })
//     - Multi-select. Same search box + dropdown; each pick adds a chip below;
//       chips have an × to remove. Writes JSON array of values to the hidden input.
//
// Each widget instance returns { getValues, setValues, refresh, clear, setDisabled }.

(function () {
  const MAX_DROPDOWN_ITEMS = 50;

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }

  function styleDropdown(el) {
    el.style.position = "absolute";
    el.style.top = "100%";
    el.style.left = "0";
    el.style.right = "0";
    el.style.zIndex = "1050";
    el.style.background = "#fff";
    el.style.border = "1px solid #ced4da";
    el.style.borderTop = "none";
    el.style.borderRadius = "0 0 0.375rem 0.375rem";
    el.style.maxHeight = "220px";
    el.style.overflowY = "auto";
    el.style.display = "none";
  }

  function makeDropdownItem(label, onPick) {
    const item = document.createElement("div");
    item.textContent = label;
    item.style.padding = "6px 10px";
    item.style.cursor = "pointer";
    item.style.borderBottom = "1px solid #f1f1f1";
    item.style.fontSize = "0.9rem";
    item.addEventListener("mouseover", () => (item.style.background = "#f1f3f5"));
    item.addEventListener("mouseout", () => (item.style.background = "transparent"));
    item.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onPick();
    });
    return item;
  }

  function renderDropdown(dropdown, filtered, onPick, emptyText) {
    dropdown.innerHTML = "";
    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.textContent = emptyText || "No matches";
      empty.style.padding = "6px 10px";
      empty.style.color = "#6c757d";
      empty.style.fontSize = "0.9rem";
      dropdown.appendChild(empty);
      dropdown.style.display = "block";
      return;
    }
    filtered.slice(0, MAX_DROPDOWN_ITEMS).forEach((it) => {
      dropdown.appendChild(makeDropdownItem(it.label, () => onPick(it)));
    });
    if (filtered.length > MAX_DROPDOWN_ITEMS) {
      const more = document.createElement("div");
      more.textContent = `…and ${filtered.length - MAX_DROPDOWN_ITEMS} more. Refine your search.`;
      more.style.padding = "6px 10px";
      more.style.color = "#6c757d";
      more.style.fontSize = "0.85rem";
      more.style.fontStyle = "italic";
      dropdown.appendChild(more);
    }
    dropdown.style.display = "block";
  }

  // ---------- Single-select ----------
  window.createSearchableSelect = function ({
    containerId, hiddenInputId, items, placeholder, onChange,
  }) {
    const container = document.getElementById(containerId);
    const hidden = document.getElementById(hiddenInputId);
    if (!container || !hidden) return null;

    container.innerHTML = "";
    container.style.position = "relative";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "form-control";
    input.autocomplete = "off";
    input.placeholder = placeholder || "Type to search…";
    container.appendChild(input);

    const dropdown = document.createElement("div");
    styleDropdown(dropdown);
    container.appendChild(dropdown);

    let dataset = Array.isArray(items) ? items.slice() : [];
    let selected = null;

    function fireChange() {
      hidden.value = selected ? selected.value : "";
      if (typeof onChange === "function") onChange(selected ? selected.value : "", selected);
      hidden.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function filter(q) {
      const query = q.trim().toLowerCase();
      if (!query) return dataset.slice(0, MAX_DROPDOWN_ITEMS);
      return dataset.filter((it) => it.label.toLowerCase().includes(query));
    }

    function pick(item) {
      selected = item;
      input.value = item.label;
      dropdown.style.display = "none";
      fireChange();
    }

    input.addEventListener("focus", () => {
      renderDropdown(dropdown, filter(input.value), pick);
    });
    input.addEventListener("input", () => {
      // If user is typing after having selected, clear the selection.
      if (selected && input.value !== selected.label) {
        selected = null;
        hidden.value = "";
      }
      renderDropdown(dropdown, filter(input.value), pick);
    });
    document.addEventListener("click", (e) => {
      if (!container.contains(e.target)) dropdown.style.display = "none";
    });

    return {
      getValue: () => (selected ? selected.value : ""),
      setValue: (v) => {
        const found = dataset.find((it) => String(it.value) === String(v));
        if (found) {
          selected = found;
          input.value = found.label;
        } else {
          selected = null;
          input.value = "";
        }
        hidden.value = selected ? selected.value : "";
      },
      clear: () => {
        selected = null;
        input.value = "";
        hidden.value = "";
        dropdown.style.display = "none";
      },
      refresh: (newItems) => {
        dataset = Array.isArray(newItems) ? newItems.slice() : [];
      },
      setDisabled: (disabled) => {
        input.disabled = disabled;
        if (disabled) dropdown.style.display = "none";
      },
    };
  };

  // ---------- Chip multi-select ----------
  window.createChipMultiSelect = function ({
    containerId, hiddenInputId, items, placeholder, onChange,
  }) {
    const container = document.getElementById(containerId);
    const hidden = document.getElementById(hiddenInputId);
    if (!container || !hidden) return null;

    container.innerHTML = "";

    const searchWrap = document.createElement("div");
    searchWrap.style.position = "relative";
    container.appendChild(searchWrap);

    const input = document.createElement("input");
    input.type = "text";
    input.className = "form-control";
    input.autocomplete = "off";
    input.placeholder = placeholder || "Type to search and add…";
    searchWrap.appendChild(input);

    const dropdown = document.createElement("div");
    styleDropdown(dropdown);
    searchWrap.appendChild(dropdown);

    const chipBox = document.createElement("div");
    chipBox.style.marginTop = "6px";
    chipBox.style.minHeight = "1.5rem";
    chipBox.style.display = "flex";
    chipBox.style.flexWrap = "wrap";
    chipBox.style.gap = "4px";
    container.appendChild(chipBox);

    let dataset = Array.isArray(items) ? items.slice() : [];
    const selected = new Map(); // value -> item

    function fireChange() {
      hidden.value = JSON.stringify([...selected.keys()]);
      if (typeof onChange === "function") onChange([...selected.keys()], [...selected.values()]);
      hidden.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function renderChips() {
      chipBox.innerHTML = "";
      if (selected.size === 0) {
        const hint = document.createElement("span");
        hint.textContent = "(none selected)";
        hint.style.color = "#6c757d";
        hint.style.fontSize = "0.85rem";
        chipBox.appendChild(hint);
        return;
      }
      [...selected.values()].forEach((it) => {
        const chip = document.createElement("span");
        chip.className = "badge bg-secondary d-inline-flex align-items-center";
        chip.style.fontWeight = "normal";
        chip.style.padding = "0.35rem 0.55rem";
        chip.innerHTML = `<span>${escapeHtml(it.label)}</span>`;
        const close = document.createElement("button");
        close.type = "button";
        close.className = "btn-close btn-close-white ms-2";
        close.style.fontSize = "0.55rem";
        close.setAttribute("aria-label", "Remove");
        close.addEventListener("click", (e) => {
          e.preventDefault();
          selected.delete(it.value);
          renderChips();
          fireChange();
        });
        chip.appendChild(close);
        chipBox.appendChild(chip);
      });
    }

    function filter(q) {
      const query = q.trim().toLowerCase();
      const notSelected = dataset.filter((it) => !selected.has(it.value));
      if (!query) return notSelected;
      return notSelected.filter((it) => it.label.toLowerCase().includes(query));
    }

    function pick(item) {
      selected.set(item.value, item);
      input.value = "";
      renderDropdown(dropdown, filter(""), pick, "No more matches");
      renderChips();
      fireChange();
      input.focus();
    }

    input.addEventListener("focus", () => {
      renderDropdown(dropdown, filter(input.value), pick, "No matches");
    });
    input.addEventListener("input", () => {
      renderDropdown(dropdown, filter(input.value), pick, "No matches");
    });
    document.addEventListener("click", (e) => {
      if (!container.contains(e.target)) dropdown.style.display = "none";
    });

    renderChips();

    return {
      getValues: () => [...selected.keys()],
      setValues: (arr) => {
        selected.clear();
        (Array.isArray(arr) ? arr : []).forEach((v) => {
          const found = dataset.find((it) => String(it.value) === String(v));
          if (found) selected.set(found.value, found);
        });
        renderChips();
        fireChange();
      },
      clear: () => {
        selected.clear();
        input.value = "";
        dropdown.style.display = "none";
        renderChips();
        fireChange();
      },
      refresh: (newItems) => {
        dataset = Array.isArray(newItems) ? newItems.slice() : [];
        // Drop any selected values no longer in the dataset.
        [...selected.keys()].forEach((k) => {
          if (!dataset.find((it) => String(it.value) === String(k))) selected.delete(k);
        });
        renderChips();
        fireChange();
      },
      setDisabled: (disabled) => {
        input.disabled = disabled;
        if (disabled) dropdown.style.display = "none";
      },
    };
  };
})();
