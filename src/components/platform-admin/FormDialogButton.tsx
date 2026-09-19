"use client";

import { useRef, useState } from "react";

export interface DialogField {
  name: string;
  label: string;
  type?: "text" | "textarea" | "email" | "select";
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[]; // used when type === "select"
}

interface FormDialogButtonProps {
  triggerLabel: string;
  triggerClassName?: string;
  title: string;
  description?: string;
  action: (formData: FormData) => void | Promise<void>;
  hiddenFields?: Record<string, string>;
  fields?: DialogField[];
  confirmLabel?: string;
  variant?: "default" | "danger";
}

/**
 * Renders a trigger button + native <dialog>. On submit, calls the given
 * server action directly (Next.js form actions) — this component never
 * decides authorization, it only makes sure a human explicitly confirmed
 * before the request is sent.
 */
export default function FormDialogButton({
  triggerLabel,
  triggerClassName,
  title,
  description,
  action,
  hiddenFields = {},
  fields = [],
  confirmLabel = "Confirm",
  variant = "default",
}: FormDialogButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);

  const open = () => dialogRef.current?.showModal();
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={
          triggerClassName ??
          "text-xs font-medium text-eduke-gold hover:underline"
        }
      >
        {triggerLabel}
      </button>

      <dialog
        ref={dialogRef}
        className="rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-0 w-full max-w-md backdrop:bg-black/60"
      >
        <form
          action={async (formData) => {
            setPending(true);
            try {
              await action(formData);
              close();
            } finally {
              setPending(false);
            }
          }}
          className="p-5 space-y-4"
        >
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
            {description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
            )}
          </div>

          {Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}

          {fields.map((field) => (
            <div key={field.name}>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                {field.label}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  name={field.name}
                  defaultValue={field.defaultValue}
                  required={field.required}
                  placeholder={field.placeholder}
                  rows={3}
                  className="w-full rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-eduke-gold"
                />
              ) : field.type === "select" ? (
                <select
                  name={field.name}
                  defaultValue={field.defaultValue ?? ""}
                  required={field.required}
                  className="w-full rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-eduke-gold"
                >
                  <option value="" disabled>
                    {field.placeholder ?? "Select…"}
                  </option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type ?? "text"}
                  name={field.name}
                  defaultValue={field.defaultValue}
                  required={field.required}
                  placeholder={field.placeholder}
                  className="w-full rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-eduke-gold"
                />
              )}
            </div>
          ))}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={close}
              disabled={pending}
              className="rounded-lg px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className={
                variant === "danger"
                  ? "rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-gray-900 dark:text-white hover:opacity-90 disabled:opacity-50"
                  : "rounded-lg bg-eduke-gold px-4 py-2 text-xs font-semibold text-gray-900 hover:opacity-90 disabled:opacity-50"
              }
            >
              {pending ? "Working…" : confirmLabel}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}