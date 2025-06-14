// SPDX-FileCopyrightText: 2025 Plotance contributors <https://plotance.github.io/>
//
// SPDX-License-Identifier: MIT

import type { Element } from "hast";

// This file generates rows for table styling options.

const prefixes = [
  "table",
  "first_row",
  "first_column",
  "last_row",
  "last_column",
  "band1_row",
  "band1_column",
  "band2_row",
  "band2_column",
  "southeast_cell",
  "southwest_cell",
  "northeast_cell",
  "northwest_cell",
];

const prefixToName: Record<string, string> = {
  table: "table",
  first_row: "first row (header)",
  first_column: "first column",
  last_row: "last row",
  last_column: "last column",
  band1_row: "odd rows (counting from 1)",
  band1_column: "odd columns (counting from 1)",
  band2_row: "even rows (counting from 1)",
  band2_column: "even columns (counting from 1)",
  southeast_cell: "southeast cell",
  southwest_cell: "southwest cell",
  northeast_cell: "northeast cell",
  northwest_cell: "northwest cell",
};

const borderPositions = [
  "left",
  "right",
  "top",
  "bottom",
  "inside_horizontal",
  "inside_vertical",
];

const borderPositionToName: Record<string, string> = {
  left: "left border",
  right: "right border",
  top: "top border",
  bottom: "bottom border",
  inside_horizontal: "horizontal interior border",
  inside_vertical: "vertical interior border",
};

function generateBorderOptions(prefix: string): Element[] {
  const name = prefixToName[prefix];

  return borderPositions.flatMap((borderPosition) => {
    if (
      borderPosition == "inside_horizontal" &&
      (prefix.endsWith("row") || prefix.endsWith("cell"))
    ) {
      return [];
    }
    if (
      borderPosition == "inside_vertical" &&
      (prefix.endsWith("column") || prefix.endsWith("cell"))
    ) {
      return [];
    }

    const isVertical = ["left", "right", "inside_vertical"].includes(
      borderPosition,
    );
    const isPlural =
      ["inside_horizontal", "inside_vertical"].includes(borderPosition) ||
      ["band1_row", "band1_column", "band2_row", "band2_column"].includes(
        prefix,
      );
    const borderName =
      borderPositionToName[borderPosition] + (isPlural ? "s" : "");

    return (
      <>
        <tr>
          <th>
            <code>
              {prefix}_{borderPosition}_border_width
            </code>
          </th>
          <td>
            <code>length</code>
          </td>
          <td>
            <code>1pt</code>
          </td>
          <td>
            <p>
              Sets the width of the {borderName} for the {name}.
            </p>
          </td>
        </tr>
        <tr>
          <th>
            <code>
              {prefix}_{borderPosition}_border_color
            </code>
          </th>
          <td>
            <code>color</code>
          </td>
          <td></td>
          <td>
            <p>
              Defines the color of the {borderName} for the {name}.
            </p>
          </td>
        </tr>
        <tr>
          <th>
            <code>
              {prefix}_{borderPosition}_border_style
            </code>
          </th>
          <td>
            <code>string</code>
          </td>
          <td></td>
          <td>
            <p>
              Specifies the style of the {borderName} for the {name}. Valid
              values:
            </p>
            <ul>
              <li>
                <code>single</code> - Single line border
              </li>
              <li>
                <code>double</code> - Double line border
              </li>
              <li>
                <code>thick_thin</code> - Thick line on the{" "}
                {isVertical ? "right" : "top"}, thin on the{" "}
                {isVertical ? "left" : "bottom"}
              </li>
              <li>
                <code>thin_thick</code> - Thin line on the{" "}
                {isVertical ? "right" : "top"}, thick on the{" "}
                {isVertical ? "left" : "bottom"}
              </li>
              <li>
                <code>triple</code> - Three parallel lines border
              </li>
            </ul>
            <p>
              Note: Border styles are not supported in PowerPoint for the web.
            </p>
          </td>
        </tr>
      </>
    ).children;
  });
}

const rows = prefixes
  .map((prefix) => {
    const cellPrefix = prefix.endsWith("cell") ? "" : "_cell";
    const name = prefixToName[prefix];

    return (
      <>
        <tr>
          <th>
            <code>{prefix}_background_color</code>
          </th>
          <td>
            <code>color</code>
          </td>
          <td>{prefix === "first_row" ? "accent1" : ""}</td>
          <td>
            <p>Sets the background color for cells in the {name}.</p>
          </td>
        </tr>
        {generateBorderOptions(prefix)}
        <tr>
          <th>
            <code>{prefix}_font_weight</code>
          </th>
          <td>
            <code>string</code>
          </td>
          <td>{prefix === "first_row" ? "bold" : ""}</td>
          <td>
            <p>
              Specifies the font weight for text in the {name}. Valid values:
            </p>
            <ul>
              <li>
                <code>normal</code> - Regular weight
              </li>
              <li>
                <code>bold</code> - Bold weight
              </li>
            </ul>
          </td>
        </tr>
        <tr>
          <th>
            <code>{prefix}_font_color</code>
          </th>
          <td>
            <code>color</code>
          </td>
          <td>{prefix === "first_row" ? "light1" : ""}</td>
          <td>
            <p>Defines the text color for content in the {name}.</p>
          </td>
        </tr>
        <tr>
          <th>
            <code>{prefix + cellPrefix}_left_margin</code>
          </th>
          <td>
            <code>length</code>
          </td>
          <td>1/4 of the font size</td>
          <td>
            <p>Sets the left margin for cell content in the {name}.</p>
          </td>
        </tr>
        <tr>
          <th>
            <code>{prefix + cellPrefix}_right_margin</code>
          </th>
          <td>
            <code>length</code>
          </td>
          <td>1/4 of the font size</td>
          <td>
            <p>Sets the right margin for cell content in the {name}.</p>
          </td>
        </tr>
        <tr>
          <th>
            <code>{prefix + cellPrefix}_top_margin</code>
          </th>
          <td>
            <code>length</code>
          </td>
          <td>1/4 of the font size</td>
          <td>
            <p>Sets the top margin for cell content in the {name}.</p>
          </td>
        </tr>
        <tr>
          <th>
            <code>{prefix + cellPrefix}_bottom_margin</code>
          </th>
          <td>
            <code>length</code>
          </td>
          <td>1/4 of the font size</td>
          <td>
            <p>Sets the bottom margin for cell content in the {name}.</p>
          </td>
        </tr>
        <tr>
          <th>
            <code>{prefix + cellPrefix}_horizontal_align</code>
          </th>
          <td>
            <code>string</code>
          </td>
          <td>
            <code>left</code>
          </td>
          <td>
            <p>
              Controls the horizontal alignment of content in the {name}. Valid
              values:
            </p>
            <ul>
              <li>
                <code>left</code> - Aligns text to the left
              </li>
              <li>
                <code>center</code> - Centers text horizontally
              </li>
              <li>
                <code>right</code> - Aligns text to the right
              </li>
              <li>
                <code>justified</code> - Justifies text with last line
                left-aligned
              </li>
              <li>
                <code>distributed</code> - Distributes text evenly including the
                last line
              </li>
            </ul>
            <p>
              Note: <code>justified</code> does not adjust spacing of the last
              line, while <code>distributed</code> adjusts spacing of all lines
              including the last one.
            </p>
          </td>
        </tr>
        <tr>
          <th>
            <code>{prefix + cellPrefix}_vertical_align</code>
          </th>
          <td>
            <code>string</code>
          </td>
          <td>
            <code>top</code>
          </td>
          <td>
            <p>
              Controls the vertical alignment of content in the {name}. Valid
              values:
            </p>
            <ul>
              <li>
                <code>top</code> - Aligns content to the top of the cell
              </li>
              <li>
                <code>center</code> - Centers content vertically
              </li>
              <li>
                <code>bottom</code> - Aligns content to the bottom of the cell
              </li>
            </ul>
          </td>
        </tr>
      </>
    );
  })
  .flatMap((fragment) => fragment.children);

export default <>{rows}</>;
