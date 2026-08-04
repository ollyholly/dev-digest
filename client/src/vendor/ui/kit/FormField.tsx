import React from "react";
import { TextInput } from "./TextInput";
import { SelectInput } from "./SelectInput";
import { Textarea } from "./Textarea";

/** Elements FormField knows how to associate with a generated `id` — the
 *  handful of "REAL controlled" inputs it's actually used with. Anything
 *  else (e.g. a custom combobox, or a control with its own internal label)
 *  renders untouched, same as before this fix. Checked by reference (not by
 *  name) so it survives production minification. */
const LABELABLE_TYPES: unknown[] = [TextInput, SelectInput, Textarea];

function isLabelableChild(
  child: React.ReactNode,
): child is React.ReactElement<{ id?: string }> {
  return React.isValidElement(child) && LABELABLE_TYPES.includes(child.type);
}

export function FormField({
  label,
  hint,
  required,
  children,
  right,
  id,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  required?: boolean;
  children?: React.ReactNode;
  right?: React.ReactNode;
  /** Explicit id for the underlying control; auto-generated when omitted. */
  id?: string;
}) {
  const generatedId = React.useId();
  const fieldId = id ?? generatedId;
  const labelable = isLabelableChild(children);
  // Associate the visual label with its control via htmlFor/id instead of
  // relying on a bare, unassociated <label> — screen readers otherwise have
  // no way to announce this label when the control receives focus.
  const content = labelable
    ? React.cloneElement(children, { id: children.props.id ?? fieldId })
    : children;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
        <label
          htmlFor={labelable ? fieldId : undefined}
          style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}
        >
          {label}
          {required && <span style={{ color: "var(--crit)", marginLeft: 4 }}>*</span>}
        </label>
        {right && <div style={{ marginLeft: "auto" }}>{right}</div>}
      </div>
      {content}
      {hint && (
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.45 }}>{hint}</div>
      )}
    </div>
  );
}
