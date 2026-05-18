#!/usr/bin/env python3
"""Convert `import { X, Y } from 'antd'` to per-component `antd/es/<name>` imports.

Skips type-only imports (`import type { X } from 'antd'`) — those compile away.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else "src")


# Map PascalCase or lowercase name → kebab-case submodule path.
def to_kebab(name: str) -> str:
    # `message`, `theme`, `notification` stay lowercase as-is.
    if name.islower():
        return name
    out = []
    for i, ch in enumerate(name):
        if ch.isupper() and i > 0:
            out.append("-")
        out.append(ch.lower())
    return "".join(out)


# Special names that don't follow the kebab rule (none currently).
OVERRIDES: dict[str, str] = {
    # e.g. "QRCode": "qr-code" — but kebab algorithm gives "q-r-code", so override.
    "QRCode": "qr-code",
}


def submodule_for(name: str) -> str:
    return OVERRIDES.get(name, to_kebab(name))


# Match: import { a, b as c, d } from 'antd';
IMPORT_RE = re.compile(
    r"""^(?P<indent>[ \t]*)import\s+\{\s*(?P<names>[^}]+?)\s*\}\s+from\s+['"]antd['"];?\s*$""",
    re.MULTILINE,
)


def parse_specifiers(names: str) -> list[tuple[str, str]]:
    """Return list of (importedName, localName) pairs."""
    out: list[tuple[str, str]] = []
    for raw in names.split(","):
        s = raw.strip()
        if not s:
            continue
        if " as " in s:
            imported, local = (p.strip() for p in s.split(" as ", 1))
        else:
            imported = local = s
        out.append((imported, local))
    return out


def convert_block(match: re.Match[str]) -> str:
    indent = match.group("indent")
    raw_names = match.group("names")
    specs = parse_specifiers(raw_names)
    if not specs:
        return match.group(0)
    lines: list[str] = []
    for imported, local in specs:
        sub = submodule_for(imported)
        if imported == local:
            lines.append(f"{indent}import {imported} from 'antd/es/{sub}';")
        else:
            lines.append(f"{indent}import {local} from 'antd/es/{sub}';")
    return "\n".join(lines)


def convert_file(path: Path) -> bool:
    original = path.read_text()
    # Skip files that only have `import type ... from 'antd'` — those have no runtime cost.
    new = IMPORT_RE.sub(convert_block, original)
    if new == original:
        return False
    path.write_text(new)
    return True


changed = 0
total = 0
for p in ROOT.rglob("*"):
    if p.suffix not in {".ts", ".tsx"}:
        continue
    total += 1
    if convert_file(p):
        changed += 1
        print(f"converted: {p}")
print(f"---\nScanned {total} files, converted {changed}.")
