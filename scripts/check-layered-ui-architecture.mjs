import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const failures = [];

const sharedContractConsumers = new Map([
  [
    "src/components/ui/dialog.tsx",
    [
      "LAYER_OVERLAY_CLASS_NAME",
      "LAYER_CLOSE_BUTTON_CLASS_NAME",
      "LAYER_TITLE_CLASS_NAME",
      "LAYER_DESCRIPTION_CLASS_NAME",
      "hasLayerA11yChild",
    ],
  ],
  [
    "src/components/ui/drawer.tsx",
    [
      "LAYER_OVERLAY_CLASS_NAME",
      "LAYER_CLOSE_BUTTON_CLASS_NAME",
      "LAYER_TITLE_CLASS_NAME",
      "LAYER_DESCRIPTION_CLASS_NAME",
      "hasLayerA11yChild",
    ],
  ],
  [
    "src/components/ui/sheet-content.tsx",
    [
      "LAYER_OVERLAY_CLASS_NAME",
      "LAYER_CLOSE_BUTTON_CLASS_NAME",
      "hasLayerA11yChild",
    ],
  ],
  [
    "src/components/ui/sheet-sections.tsx",
    ["LAYER_TITLE_CLASS_NAME", "LAYER_DESCRIPTION_CLASS_NAME"],
  ],
]);

for (const [path, requiredTokens] of sharedContractConsumers) {
  const source = await readFile(resolve(root, path), "utf8");
  for (const token of requiredTokens) {
    if (!source.includes(token)) {
      failures.push(`${path}: layered UI contract must use ${token}`);
    }
  }
}

for (const path of [
  "src/components/ui/drawer.tsx",
  "src/components/ui/sheet-sections.tsx",
]) {
  const source = await readFile(resolve(root, path), "utf8");
  if (/containsCancelLabel|isCancelButtonChild|visibleChildren/.test(source)) {
    failures.push(
      `${path}: shared footers must render caller-provided actions without label-based filtering`,
    );
  }
}

if (failures.length > 0) {
  console.error("\nLayered UI architecture check failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Layered UI architecture check passed.");
}
