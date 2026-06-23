"use client";

import React, { useId } from "react";
import { cn } from "@/lib/cn";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const autoId = useId();
  const fieldId = htmlFor ?? autoId;
  const labelId = `${fieldId}-label`;
  const descId = error || hint ? `${fieldId}-desc` : undefined;

  // The label is a caption (not a <label htmlFor>), associated with the
  // control via aria-labelledby. This keeps clicks/hover on the label — or
  // the empty space beside it — from ever focusing or opening the control.
  const control = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    const props = child.props as {
      id?: string;
      "aria-labelledby"?: string;
    };
    return React.cloneElement(
      child as React.ReactElement<Record<string, unknown>>,
      {
        id: props.id ?? fieldId,
        "aria-labelledby": cn(labelId, props["aria-labelledby"]),
        ...(descId ? { "aria-describedby": descId } : {}),
        ...(error ? { "aria-invalid": true } : {}),
      },
    );
  });

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span
        id={labelId}
        className={cn(
          "flex w-fit items-center gap-1 px-3 font-display text-[14px] font-semibold leading-5 tracking-[-0.084px]",
          error ? "text-field-error" : "text-field-label",
        )}
      >
        {label}
        {required && (
          <span aria-hidden className="text-field-error">
            *
          </span>
        )}
      </span>
      {control}
      {error ? (
        <p id={descId} className="px-3 text-[12px] leading-4 text-field-error">
          {error}
        </p>
      ) : hint ? (
        <p id={descId} className="px-3 text-[12px] leading-4 text-field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* --------------------------- Shared control style --------------------------- */
// Figma input: white fill, 2px secondary-tinted border, 12px radius, Inter
// Medium. `md` is the brand spec (large form fields); `sm` is a compact
// variant for toolbar filters that keeps the same brand language.
export type ControlSize = "md" | "sm";

const BASE =
  "focus-ring w-full border-2 border-field-border bg-surface font-medium text-ink placeholder:text-field-placeholder transition-colors hover:border-secondary aria-[invalid=true]:border-field-error disabled:cursor-not-allowed disabled:opacity-60";

const SIZES: Record<ControlSize, string> = {
  md: "rounded-[12px] px-4 py-3 text-[15px] leading-6",
  sm: "rounded-[10px] px-3 py-2 text-sm leading-5",
};

export function controlClasses(size: ControlSize = "md", className?: string) {
  return cn(BASE, SIZES[size], className);
}

export function Input({
  size = "md",
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  size?: ControlSize;
}) {
  return <input className={controlClasses(size, className)} {...props} />;
}

export function Textarea({
  size = "md",
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  size?: ControlSize;
}) {
  return (
    <textarea
      className={controlClasses(size, cn("h-auto leading-relaxed", className))}
      {...props}
    />
  );
}
