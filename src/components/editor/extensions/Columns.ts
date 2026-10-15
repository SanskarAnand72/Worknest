import { Node, mergeAttributes } from '@tiptap/core';

export const Column = Node.create({
  name: 'column',
  content: 'block+',
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'column',
        class: 'flex-1 min-w-[180px] p-2 rounded-lg border border-dashed border-border/60 hover:border-border transition-colors',
      }),
      0,
    ];
  },
});

export const Columns = Node.create({
  name: 'columns',
  group: 'block',
  content: 'column column+',
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="columns"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'columns',
        class: 'grid grid-cols-1 md:grid-cols-2 gap-4 my-4 w-full',
      }),
      0,
    ];
  },
});
