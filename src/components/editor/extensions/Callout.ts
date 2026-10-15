import { Node, mergeAttributes } from '@tiptap/core';

export interface CalloutOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attributes?: { icon?: string; color?: string }) => ReturnType;
      toggleCallout: (attributes?: { icon?: string; color?: string }) => ReturnType;
    };
  }
}

export const Callout = Node.create<CalloutOptions>({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      icon: {
        default: '💡',
        parseHTML: (element) => element.getAttribute('data-icon') || '💡',
        renderHTML: (attributes) => ({
          'data-icon': attributes.icon,
        }),
      },
      color: {
        default: 'default',
        parseHTML: (element) => element.getAttribute('data-color') || 'default',
        renderHTML: (attributes) => ({
          'data-color': attributes.color,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout"]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const icon = node.attrs.icon || '💡';
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'callout',
        class:
          'flex items-start gap-3 p-4 my-3 rounded-lg border border-border bg-muted/50 text-foreground transition-colors',
      }),
      ['span', { class: 'text-xl select-none flex-shrink-0 cursor-pointer pt-0.5' }, icon],
      ['div', { class: 'flex-1 min-w-0' }, 0],
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attributes) =>
        ({ commands }) => {
          return commands.wrapIn(this.name, attributes);
        },
      toggleCallout:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleWrap(this.name, attributes);
        },
    };
  },
});
