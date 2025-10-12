# Stripe Dot Dev Design System Specification
# Purpose: Guide LLM agents to generate consistent frontend UI based on Stripe's neo-brutalist developer aesthetic.

design_system:
  name: recallOS
  style_family: neo_brutalist
  theme_intent: "Developer-first brutalist web aesthetic combining modern typography, wireframe grids, and retro console UI."

core_principles:
  - monochrome_minimalism
  - typographic_dominance
  - grid_precision
  - developer_console_interaction
  - visible_structure_and_edges
  - intentional_retro_ui_elements
  - zero_softness_no_shadows

layout:
  container:
    width: "90%"
    max_width: 1440px
    margin: auto
    padding: "2rem"
    grid_type: "12-column modular grid"
    spacing_unit: 8px
  sections:
    - hero_section:
        alignment: "center-left"
        typography_scale: "display + subheading + paragraph"
        vertical_spacing: "6rem"
        grid_overlay: true
        accent_elements: "+"
    - content_section:
        display: "split-grid"
        ratio: "1fr 1fr"
        divider_line: "1px solid rgba(0,0,0,0.1)"
    - footer_section:
        layout: "horizontal"
        border_top: "1px solid rgba(0,0,0,0.1)"
        font_size: 12px
        color: "#666"

typography:
  primary_font: "Suisse Intl, Inter, or similar sans-serif"
  pixel_font: "IBM Plex Mono or VT323 for retro UI elements"
  scale:
    display: "clamp(3rem, 8vw, 6rem)"
    heading: "2rem"
    subheading: "1.25rem"
    body: "1rem"
    label: "0.875rem"
  characteristics:
    - no_text_shadows
    - crisp_edges
    - uppercase_for_ui_labels
    - large_weight_contrast (e.g., bold display with light body)

colors:
  palette:
    background: "#fafafa"
    accent_background: "linear-gradient(180deg, #fafafa 0%, #f6f6f9 100%)"
    primary_text: "#000000"
    secondary_text: "#666666"
    accent: "#b8b8ff"
    border: "rgba(0,0,0,0.1)"
  usage:
    - hero: "white background, black text"
    - panels: "faint gradient with 1px border"
    - buttons: "outlined, minimal, no fill"

borders:
  style: "1px solid rgba(0,0,0,0.1)"
  radius: "2px (almost square)"
  grid_lines: true
  dividers: visible

buttons:
  variants:
    - outlined:
        background: "transparent"
        border: "1px solid #000"
        text_color: "#000"
        hover_state: "background: #000; text: #fff"
    - console_key:
        shape: "pill"
        background: "#f0f0f0"
        font: "monospace"
        padding: "2px 6px"
        text_case: "uppercase"
        border: "1px solid rgba(0,0,0,0.2)"

icons:
  style: "outlined, pixel-inspired, no fills"
  grid_size: 24
  alignment: "center-aligned"

interactive_elements:
  keybinds:
    format: "[C] CONSOLE", "[G] GITHUB", "[M] MEETUPS"
    behavior: "hover_highlight"
    font: "monospace"
  links:
    underline_style: "solid"
    hover_behavior: "color inversion"
  animations:
    type: "fade-in, slide minimal"
    easing: "cubic-bezier(0.4, 0, 0.2, 1)"
    duration: 200ms

cards:
  layout:
    padding: "1.5rem"
    border: "1px solid rgba(0,0,0,0.1)"
    background: "#fff"
    header_font: "monospace"
    grid_background: "dotted"
  hover_state:
    transform: "translateY(-4px)"
    shadow: "none"
    border_color: "#000"

illustrations:
  type: "vectorized parametric art (e.g., generative wireframe patterns)"
  palette: "muted monochrome"
  style_reference: "technical_diagrams / figma frames with [FIG. 1], [FIG. 2] notation"

ui_language:
  tone: "precise, technical, unemotional"
  label_format: "UPPERCASE_BRACKETED"
  examples:
    - "[B] BLOG"
    - "[Y] YOUTUBE"
    - "[C] CONSOLE"

llm_guidance:
  - always generate layouts with visible container lines and spacing discipline
  - avoid gradients except for faint background depth
  - typography and spacing must dominate visuals, not color or imagery
  - every major section should look like a structured document, not a marketing site
  - include ASCII-style separators, brackets, and technical notations for developer UI feel

example_usage:
  hero_block:
    heading: "Welcome to Project.Dev"
    subtext: "Learn how to build verifiable applications with our SDKs."
    accent_symbol: "+"
  console_button:
    text: "[C] LAUNCH CONSOLE"
    variant: "console_key"
