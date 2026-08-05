export interface EditableConventionDraft {
  name: string;
  description: string;
  body: string;
  enabled: boolean;
  category: string | null;
}
