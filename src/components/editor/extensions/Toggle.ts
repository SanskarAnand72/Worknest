import { Node, mergeAttributes } from '@tiptap/core';

export const ToggleSummary = Node.create({
  name: 'toggleSummary',
  content: 'inline*',
  defining: true,
  parseHTML() {
    return [{ tag: 'summary' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'summary',
      mergeAttributes(HTMLAttributes, {
        class: 'font-medium cursor-pointer py-1 select-none hover:text-accent transition-colors',
      }),
      0,
    ];
  },
});

export const ToggleContent = Node.create({
  name: 'toggleContent',
  content: 'block+',
  defining: true,
  parseHTML() {
    return [{ tag: 'div[data-type="toggle-content"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'toggle-content',
        class: 'pl-5 pt-1.5 border-l-2 border-border/70 my-1 space-y-1',
      }),
      0,
    ];
  },
});

export const Toggle = Node.create({
  name: 'toggle',
  group: 'block',
  content: 'toggleSummary toggleContent',
  defining: true,

  parseHTML() {
    return [{ tag: 'details' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'details',
      mergeAttributes(HTMLAttributes, {
        class: 'my-2 rounded-lg p-2 bg-muted/20 border border-border/40 transition-all open:bg-muted/30',
        open: true,
      }),
      0,
    ];
  },
});
