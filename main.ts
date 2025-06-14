// SPDX-FileCopyrightText: 2025 Plotance contributors <https://plotance.github.io/>
//
// SPDX-License-Identifier: MIT

import { dirname, join, relative } from "@std/path";
import { ensureDir, expandGlob } from "@std/fs";

import type { Node, Transformer } from "unist";
import type { Element } from "hast";
import { h } from "hastscript";
import { rehype } from "rehype";
import rehypeFormat from "rehype-format";
import rehypeStringify from "rehype-stringify";
import { fromHtml } from "hast-util-from-html";
import { CONTINUE, SKIP, visit } from "unist-util-visit";
import { selectAll } from "hast-util-select";
import { toString as hastToString } from "hast-util-to-string";
import type { VFile } from "vfile";
import { read } from "to-vfile";
import YAML from "yaml";
import { stringifyEntities } from "stringify-entities";

/**
 * The directory name of the current module.
 */
const __dirname = new URL(".", import.meta.url).pathname;

/**
 * The directory containing source files.
 */
const SOURCE_DIRECTORY = "src";

/**
 * The directory where processed files will be written.
 */
const DESTINATION_DIRECTORY = "site";

/**
 * The directory containing template files.
 */
const TEMPLATE_DIRECTORY = "template";

/**
 * Glob patterns for static assets that should be copied directly to the
 * destination directory.
 */
const STATIC_ASSET_PATTERNS = [
  "examples/**/*",
  "**/*.css",
  "**/*.svg",
  "**/*.png",
  "**/*.ico",
];

/**
 * Glob patterns for source HTML files to be processed.
 */
const SOURCE_PATTERNS = ["**/*.html"];

/**
 * Finds all source files matching the given glob patterns within the
 * SOURCE_DIRECTORY.
 *
 * @param patterns An array of glob patterns to match.
 * @returns A Promise that resolves to a Set of relative file paths.
 */
async function globSources(patterns: string[]): Promise<Set<string>> {
  const results = await Promise.all(
    patterns.map(async (pattern) => {
      const basePath = join(__dirname, SOURCE_DIRECTORY);
      const files = await Array.fromAsync(
        expandGlob(pattern, { root: basePath, includeDirs: false }),
      );

      return files.map((file) => relative(basePath, file.path));
    }),
  );

  return new Set(results.flat());
}

/**
 * Copies a single static asset from the source path to the destination path.
 *
 * Ensures the destination directory exists before copying.
 *
 * @param sourcePath The absolute path to the source file.
 * @param destinationPath The absolute path to the destination file.
 * @returns A Promise that resolves when the file has been copied.
 */
async function copyStaticAsset(
  sourcePath: string,
  destinationPath: string,
): Promise<void> {
  try {
    await ensureDir(dirname(destinationPath));
    await Deno.copyFile(sourcePath, destinationPath);
  } catch (error) {
    console.error(`Error copying ${sourcePath}:`, error);
    throw error;
  }
}

/**
 * Configuration for including elements from a template.
 */
type IncludeConfig = {
  /**
   * A CSS selector to choose specific elements from the template.
   * If omitted, the entire template content (or its root's children if it is a
   * fragment) is used.
   */
  selector?: string;

  /**
   * The path to the template file, relative to the TEMPLATE_DIRECTORY.
   * Defaults to 'main.html' if omitted.
   */
  template?: string;
};

/**
 * A rehype transformer plugin to include elements from template files.
 * It looks for `<script type="application/yaml">` elements with a `!inclusion`
 * YAML tag
 * and replaces them with content from specified templates.
 *
 * @returns A rehype transformer function.
 */
function includeElementsFromTemplate(): Transformer {
  return async (tree: Node, _file: VFile): Promise<Node> => {
    const queue: { config: IncludeConfig; index: number; parent: Element }[] =
      [];

    visit(
      tree,
      { type: "element", tagName: "script" },
      (node: Element, index: number, parent: Element) => {
        if (node.properties.type !== "application/yaml") {
          return CONTINUE;
        }

        const config = YAML.parseDocument(node.children[0].value, {
          stringKeys: true,
        });

        if (config.errors.length > 0) {
          return CONTINUE;
        }

        if (config.contents?.tag !== "!inclusion") {
          return CONTINUE;
        }

        queue.push({ config: config.toJSON(), index, parent });

        return CONTINUE;
      },
    );

    /**
     * Loads a template file (HTML or TSX) and returns its HAST tree.
     *
     * @param templatePath The path to the template file.
     * @returns A Promise that resolves to the HAST tree of the template.
     * @throws If the template type is unknown.
     */
    async function loadTemplate(templatePath: string): Promise<Node> {
      if (templatePath.endsWith(".html") || templatePath.endsWith(".htm")) {
        const templateFile = await read(templatePath);

        return fromHtml(templateFile);
      } else if (templatePath.endsWith(".tsx")) {
        return (await import(templatePath)).default;
      } else {
        throw new Error("Unknown template type");
      }
    }

    /**
     * Selects nodes from a HAST tree based on a CSS selector.
     *
     * If no selector is provided, it returns the children if the node is a
     * root node (fragment), or a singleton array containing the node itself
     * otherwise.
     *
     * @param selector A CSS selector string, or undefined.
     * @param templateTree The HAST tree to select from.
     * @returns An array of selected HAST nodes.
     */
    function selectNode(
      selector: string | undefined,
      templateTree: Node,
    ): Node[] {
      if (typeof selector === "string") {
        return selectAll(selector, templateTree);
      } else if (templateTree.type === "root") {
        return templateTree.children;
      } else {
        return [templateTree];
      }
    }

    for (const { config, index, parent } of queue.reverse()) {
      const templatePath = join(
        __dirname,
        TEMPLATE_DIRECTORY,
        config.template || "main.html",
      );
      const templateTree = await loadTemplate(templatePath);
      const nodes = selectNode(config.selector, templateTree);

      parent.children.splice(index, 1, ...nodes);
    }

    return tree;
  };
}

/**
 * A rehype transformer plugin to convert custom `<x-blockcode>` and `<x-l>`
 * elements into standard `<pre><code>` structures for code blocks.
 *
 * Each `<x-l>` element is converted into a line of code.  Its surrounding
 * whitespaces are ignored.
 *
 * @returns A rehype transformer function.
 */
function expandBlockCode(): Transformer {
  return (tree: Node, _file: VFile): Node => {
    visit(
      tree,
      { type: "element", tagName: "x-blockcode" },
      (node: Element) => {
        const lines = node.children
          .filter((child: Element) => child.tagName === "x-l")
          .flatMap((child: Element) => [
            ...child.children,
            { type: "text", value: "\n" },
          ]);

        node.tagName = "pre";
        node.children = [
          {
            type: "element",
            tagName: "code",
            properties: {},
            children: lines,
          },
        ];

        if (lines.length > 0) {
          lines.pop();
        }

        return SKIP;
      },
    );

    return tree;
  };
}

/**
 * A rehype transformer plugin to generate and insert a table of contents.
 *
 * It looks for a `<script type="application/yaml">` element with a
 * `!table_of_contents` YAML tag and replaces it with a nested list of links to
 * headings (h2-h6) in the document.
 *
 * @returns A rehype transformer function.
 */
function addTableOfContents(): Transformer {
  return (tree: Node, _file: VFile): Node => {
    let placeholder: { index: number; parent: Element } | undefined;

    visit(
      tree,
      { type: "element", tagName: "script" },
      (node: Element, index: number, parent: Element) => {
        if (node.properties.type !== "application/yaml") {
          return CONTINUE;
        }

        const config = YAML.parseDocument(node.children[0].value, {
          stringKeys: true,
        });

        if (config.errors.length > 0) {
          return CONTINUE;
        }

        if (config.contents?.tag !== "!table_of_contents") {
          return CONTINUE;
        }

        placeholder = { index, parent };

        return CONTINUE;
      },
    );

    if (!placeholder) {
      return tree;
    }

    const headings = selectAll("h2, h3, h4, h5, h6", tree)
      .filter((heading) => heading.properties.id)
      .map((heading) => ({
        level: Number(heading.tagName.substring(1)) - 2,
        id: String(heading.properties.id),
        label: hastToString(heading),
      }));

    type HeadingTreeNode = {
      level: number;
      id: string;
      label: string;
      children: HeadingTreeNode[];
    };

    const headingTree: HeadingTreeNode = {
      level: -1,
      id: "",
      label: "",
      children: [],
    };
    const stack = [headingTree];

    for (const heading of headings) {
      while (stack[stack.length - 1].level >= heading.level) {
        stack.pop();
      }

      const node: HeadingTreeNode = {
        ...heading,
        children: [],
      };

      stack[stack.length - 1].children.push(node);
      stack.push(node);
    }

    /**
     * Recursively converts a list of heading tree nodes into an HTML `<ul>`
     * HAST element.
     *
     * @param nodes An array of HeadingTreeNode objects.
     * @returns A HAST `<ul>` element representing the table of contents for
     *   the given nodes.
     */
    function toList(nodes: HeadingTreeNode[]): Element {
      return h(
        "ul",
        nodes.map((node) =>
          h(
            "li",
            h(
              "a",
              {
                href: `#${node.id}`,
              },
              node.label,
            ),
            toList(node.children),
          ),
        ),
      );
    }

    placeholder.parent.children[placeholder.index] = h(
      "nav",
      toList(headingTree.children),
    );

    return tree;
  };
}

/**
 * A rehype transformer plugin to convert the element with class `logo` into an
 * `<h1>` element if the document has no `<h1>` element.
 *
 * @returns A rehype transformer function.
 */
function makeLogoH1(): Transformer {
  return (tree: Node, _file: VFile): Node => {
    let logoElement: Element | undefined;
    let h1Count = 0;

    visit(
      tree,
      { type: "element" },
      (node: Element, _index: number, _parent: Element) => {
        if (node.tagName === "h1") {
          h1Count++;
        } else if (node.properties.className?.includes("logo")) {
          logoElement = node;
        }

        return CONTINUE;
      },
    );

    if (logoElement && h1Count === 0) {
      logoElement.tagName = "h1";
    }

    return tree;
  };
}

/**
 * A rehype transformer plugin to add Open Graph metadata tags to the HTML
 * `<head>`.
 *
 * It extracts the title from the first `<title>` element and a description
 * from the first `<meta name="description">` element if any.
 *
 * @returns A rehype transformer function.
 */
function addOpenGraphMetadata(): Transformer {
  return (tree: Node, _file: VFile): Node => {
    let headElement: Element | undefined;
    let title: string | undefined;
    let description: string | undefined;

    visit(
      tree,
      { type: "element" },
      (node: Element, _index: number, _parent: Element) => {
        if (node.tagName === "title") {
          title = hastToString(node);
        } else if (
          node.tagName === "meta" &&
          node.properties.name === "description"
        ) {
          description = String(node.properties.content);
        } else if (node.tagName === "head") {
          headElement = node;
        }

        return CONTINUE;
      },
    );

    if (headElement) {
      if (title) {
        headElement?.children.push(
          h("meta", {
            property: "og:title",
            content: title,
          }),
        );
      }

      if (description) {
        headElement?.children.push(
          h("meta", {
            property: "og:description",
            content: description,
          }),
        );
      }
    }

    return tree;
  };
}

/**
 * A rehype transformer plugin to HTML-encode text nodes and replace it with
 * raw nodes.
 *
 * The default encoder of rehype encodes only minimum characters (& and <).
 * This plugin encodes all special HTML characters.
 *
 * @returns A rehype transformer function.
 */
function encodeTextNodes(): Transformer {
  return (tree: Node, _file: VFile): Node => {
    visit(
      tree,
      { type: "text" },
      (node: Element, _index: number, parent: Element) => {
        if (
          parent.type === "element" &&
          (parent.tagName === "script" || parent.tagName === "style")
        ) {
          return CONTINUE;
        }

        node.value = stringifyEntities(node.value, {
          escapeOnly: true,
          useNamedReferences: true,
        });
        node.type = "raw";

        return CONTINUE;
      },
    );

    return tree;
  };
}

/**
 * Processes a single HTML source file: reads it, applies a series of rehype
 * transformations, formats it, and writes the result to the destination path.
 *
 * @param sourcePath The absolute path to the source HTML file.
 * @param destinationPath The absolute path for the processed HTML file.
 * @returns A Promise that resolves when the file has been processed and
 *   written.
 */
async function processHtmlFile(
  sourcePath: string,
  destinationPath: string,
): Promise<void> {
  try {
    const file = await read(sourcePath);
    const result = await rehype()
      .use(includeElementsFromTemplate)
      .use(expandBlockCode)
      .use(addTableOfContents)
      .use(makeLogoH1)
      .use(addOpenGraphMetadata)
      .use(rehypeFormat)
      .use(encodeTextNodes)
      .use(rehypeStringify, {
        characterReferences: {
          useNamedReferences: true,
        },
        closeSelfClosing: true,
        upperDoctype: true,
        allowDangerousHtml: true,
      })
      .process(file);

    await ensureDir(dirname(destinationPath));
    await Deno.writeTextFile(destinationPath, String(result));
  } catch (error) {
    console.error(`Error processing ${sourcePath}:`, error);
    throw error;
  }
}

/**
 * The main function to build the documentation site.
 *
 * Copies static assets from the source directory to the destination directory,
 * and processes HTML files in the source directory using a series of rehype
 * transformations.
 */
async function main() {
  try {
    const [staticAssets, allSources] = await Promise.all([
      globSources(STATIC_ASSET_PATTERNS),
      globSources(SOURCE_PATTERNS),
    ]);

    const sources = new Set<string>();

    for (const source of allSources) {
      if (!staticAssets.has(source)) {
        sources.add(source);
      }
    }

    await Promise.all([
      ...Array.from(staticAssets).map((path) =>
        copyStaticAsset(
          join(__dirname, SOURCE_DIRECTORY, path),
          join(__dirname, DESTINATION_DIRECTORY, path),
        ),
      ),

      ...Array.from(sources).map((path) =>
        processHtmlFile(
          join(__dirname, SOURCE_DIRECTORY, path),
          join(__dirname, DESTINATION_DIRECTORY, path),
        ),
      ),
    ]);

    console.log("Build completed successfully!");
  } catch (error) {
    console.error("Build failed:", error);
    Deno.exit(1);
  }
}

main();
