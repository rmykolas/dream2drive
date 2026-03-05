# Ourselves Theme Development

Internal conventions for building and editing the Ourselves theme. These rules extend the general Shopify Liquid and CSS standards for this codebase.

## Liquid conventions

### `{% liquid %}` tag usage

- Inside a `{% liquid %}` block, **each `render` statement must be on a single line**.
- Do **not** split a `render` call across multiple lines for its arguments when it appears inside `{% liquid %}`.
- If you need multi-line argument formatting for readability, use standard `{% %}` tags instead of `{% liquid %}`.

**Example — correct:**

```liquid
{% liquid
  case block.type
    when 'media_with_text'
      render 'component-media-with-text', id: block.id, section: section, image: block.settings.image
  endcase
%}
```

**Example — incorrect (do not do this):**

```liquid
{% liquid
  case block.type
    when 'media_with_text'
      render 'component-media-with-text',
        id: block.id,
        section: section
  endcase
%}
```

### `render` argument hygiene

- When calling `render` for snippets:
  - **Only pass parameters that you actually need**.
  - **Do not pass empty values** such as `''`, `blank`, or obviously-default booleans just to “fill out” the argument list.
  - Rely on the snippet’s internal defaults when a value would otherwise be empty.
- This keeps snippet APIs clean and avoids noise that makes it harder to see which values matter.

**Example — correct:**

```liquid
{%- render 'component-video',
  section: section,
  id: id,
  url_video_hosted: video,
  video_autoplay: true,
  video_mute: true,
  video_loop: true,
  display_controls: false
-%}
```

**Example — incorrect (do not do this):**

```liquid
{%- render 'component-video',
  section: section,
  id: id,
  url_video: '',
  url_video_hosted: video,
  type: '',
  video_id: '',
  image_video: '',
  alignment_horizontal: '',
  alignment_horizontal_mobile: ''
-%}
```

Apply the same rule to other shared snippets like `component-image` and `component-button`: only pass non-empty, meaningful parameters.

