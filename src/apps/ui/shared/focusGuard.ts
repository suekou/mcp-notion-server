export function protectEditingFocus() {
  const editingEventTypes = [
    "keydown",
    "keyup",
    "keypress",
    "beforeinput",
    "input",
    "compositionstart",
    "compositionupdate",
    "compositionend",
  ];

  const stopEditableEvent = (event: Event) => {
    if (isEditable(event.target)) event.stopPropagation();
  };

  for (const type of editingEventTypes) {
    document.addEventListener(type, stopEditableEvent, true);
  }

  const restoreEditableFocus = (event: Event) => {
    const node = editableNode(event.target);
    if (node) window.setTimeout(() => node.focus(), 0);
  };

  document.addEventListener("pointerdown", restoreEditableFocus, true);

  return () => {
    for (const type of editingEventTypes) {
      document.removeEventListener(type, stopEditableEvent, true);
    }
    document.removeEventListener("pointerdown", restoreEditableFocus, true);
  };
}

function isEditable(target: EventTarget | null): boolean {
  return !!editableNode(target);
}

function editableNode(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest("input, textarea, select, [contenteditable='true']");
}
