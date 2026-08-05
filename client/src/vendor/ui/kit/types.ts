import { type IconName } from "../icons";

export type TabDef = string | { key: string; label: string; icon?: IconName; count?: number };

export interface DropdownItemDef {
  /** Stable identity for the React key, e.g. a domain id. Falls back to the
   *  item's position in the list when omitted — fine for static menus, but
   *  callers rendering one item per dynamic record (agents, repos, …)
   *  should pass this. */
  id?: string;
  label?: string;
  icon?: IconName;
  hint?: string;
  muted?: boolean;
  divider?: boolean;
  onClick?: () => void;
  /** Optional trailing remove (trash) action shown on the right of the row. */
  onRemove?: () => void;
  /** Accessible label/tooltip for the trailing remove action. */
  removeLabel?: string;
}
