import React from "react";
import { TextInput } from "./TextInput";
import { SelectInput } from "./SelectInput";
import { Textarea } from "./Textarea";
import { SearchableSelect } from "./SearchableSelect";

/** Elements FormField knows how to associate with a generated `id` — the
 *  handful of "REAL controlled" inputs it's actually used with. Anything
 *  else (e.g. a custom combobox, or a control with its own internal label)
 *  renders untouched, same as before this fix. Checked by reference (not by
 *  name) so it survives production minification. */
const LABELABLE_TYPES: unknown[] = [TextInput, SelectInput, Textarea, SearchableSelect];

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
  // When the caller passes an explicit `id`, trust they've placed it on the
  // real control themselves (e.g. it's nested inside other markup FormField
  // can't safely clone into) and still wire htmlFor to it.
  const explicitId = id !== undefined;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
        <label
          htmlFor={labelable || explicitId ? fieldId : undefined}
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
