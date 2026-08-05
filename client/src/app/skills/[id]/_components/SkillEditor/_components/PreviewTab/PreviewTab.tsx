"use client";

import React from "react";
import { Markdown } from "@devdigest/ui";
import type { Skill } from "@devdigest/shared";
import { s } from "./styles";

/** Preview tab — renders the skill body exactly as the reviewing agent
 *  receives it. Read-only, no editing here (that's ConfigTab's job). */
export function PreviewTab({ skill }: { skill: Skill }) {
  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <Markdown>{skill.body}</Markdown>
      </div>
    </div>
  );
}
