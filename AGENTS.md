<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

Always call me ➡️Link⬅️ when ever you are responding to my request.

## Color Schema

Throughout the entire UI design process, the following color schemas must be strictly adhered to in terms of color selection：

bg: #2D2A2E
bg_dimmed_1: #221F22
bg_dimmed_2: #19181A
fg: #FCFCFA
yellow: #FFD866
green: #A9DC76
red: #FF6188
blue: #78DCE8
orange: #FC9867
purple: #AB9DF2
gray_dimmed_1: #C1C0C0
gray_dimmed_2: #939293
gray_dimmed_3: #727072
gray_dimmed_4: #5B595C
gray_dimmed_5: #403E41

The semantic of the colors:

accent: yellow
info: blue
success: green
warning: yellow
danger: red
brand: purple


## Code Style

- MUST follow rules of prettier and custom rules in .prettierrc.cjs.
- One file MUST be <= 800 lines.
- Every function MUST be <= 50 lines.
- `{}` Code blocks must be nested no more than 3 levels, if not it should .
