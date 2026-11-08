"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "./button";

export function ConfirmDialog({
  open,
  title = "Are you sure?",
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  busy = false,
  onConfirm,
  onClose,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-stone-200 bg-white p-0 text-stone-900 shadow-2xl backdrop:bg-stone-950/40"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose?.();
      }}
      ref={dialogRef}
    >
      <div className="p-6 sm:p-7">
        <h2 className="text-lg font-bold" id={titleId}>
          {title}
        </h2>
        <p
          className="mt-2 text-sm leading-6 text-stone-600"
          id={descriptionId}
        >
          {description}
        </p>
        <div className="mt-7 flex flex-col-reverse justify-end gap-2 sm:flex-row">
          <Button
            disabled={busy}
            onClick={onClose}
            variant="secondary"
          >
            {cancelLabel}
          </Button>
          <Button
            loading={busy}
            onClick={onConfirm}
            variant="danger"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
