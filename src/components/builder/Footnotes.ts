import { mergeAttributes, Node } from "@tiptap/react";

/**
 * The footnotes at the bottom of a page, as the PDF importer finds them: a block of
 * paragraphs shown smaller and set apart from the text above.
 */
export const Footnotes = Node.create({
  name: "footnotes",
  group: "block",
  content: "paragraph+",
  defining: true,

  parseHTML() {
    return [{ tag: "aside[data-footnotes]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["aside", mergeAttributes(HTMLAttributes, { "data-footnotes": "", class: "footnotes" }), 0];
  },
});
