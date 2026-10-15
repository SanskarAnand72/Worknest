'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import ImageExtension from '@tiptap/extension-image';
import { lowlight } from '@/lib/lowlight';
import { Callout } from '@/components/editor/extensions/Callout';
import { Toggle, ToggleSummary, ToggleContent } from '@/components/editor/extensions/Toggle';
import { Columns, Column } from '@/components/editor/extensions/Columns';
import { Page } from '@/types';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { PageComments } from '@/components/comments/PageComments';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  LayoutGrid,
  CheckSquare,
  Code,
  Quote,
  Minus,
  Type,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  Smile,
  Image as ImageIcon,
  Sparkles,
  Link as LinkIcon,
  HelpCircle,
  FolderOpen,
  ChevronRight,
  Maximize2,
  Lock,
  Unlock,
  FileDown,
  Upload,
  Calculator,
  GripVertical,
  Plus,
  Trash2,
  Copy,
} from 'lucide-react';

interface BlockEditorProps {
  page: Page;
}

interface CommandItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  action: (editor: any) => void;
}

export const BlockEditor: React.FC<BlockEditorProps> = ({ page }) => {
  const { updatePage, updatePageContent, createPage } = useWorkspaceStore();
  const [title, setTitle] = useState(page.title);
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [slashMenuPos, setSlashMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [hoveredBlockDom, setHoveredBlockDom] = useState<HTMLElement | null>(null);
  const [gutterPos, setGutterPos] = useState<{ top: number } | null>(null);
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const [linkInputOpen, setLinkInputOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const slashMenuRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Sync internal title with page prop when switched
  useEffect(() => {
    setTitle(page.title);
  }, [page.id, page.title]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Highlight.configure({ multicolor: true }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-accent underline cursor-pointer hover:opacity-80',
        },
      }),
      ImageExtension.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-xl max-w-full my-4 border border-border shadow-sm',
        },
      }),
      Callout,
      Toggle,
      ToggleSummary,
      ToggleContent,
      Columns,
      Column,
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return 'Heading...';
          }
          return "Type '/' for commands, or write freely...";
        },
      }),
    ],
    content: page.content || {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    },
    immediatelyRender: false,
    editable: !isLocked,
    editorProps: {
      handleKeyDown: (view, event) => {
        if (slashMenuOpen) {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
            return true;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + Math.max(1, filteredCommands.length)) % Math.max(1, filteredCommands.length));
            return true;
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            if (filteredCommands[selectedIndex]) {
              executeCommand(filteredCommands[selectedIndex]);
            }
            return true;
          }
          if (event.key === 'Escape') {
            setSlashMenuOpen(false);
            return true;
          }
        }

        if (event.key === '/' && !slashMenuOpen) {
          const { $from } = view.state.selection;
          const isAtStart = $from.parentOffset === 0;
          if (isAtStart || $from.parent.textContent === '') {
            setTimeout(() => {
              if (editorContainerRef.current) {
                const coords = view.coordsAtPos($from.pos);
                const containerRect = editorContainerRef.current.getBoundingClientRect();
                setSlashMenuPos({
                  top: Math.max(0, coords.bottom - containerRect.top + 6),
                  left: Math.max(0, Math.min(coords.left - containerRect.left, containerRect.width - 320)),
                });
              }
            }, 20);
            setSlashMenuOpen(true);
            setSlashQuery('');
            setSelectedIndex(0);
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      updatePageContent(page.id, json);

      if (slashMenuOpen) {
        const { $from } = editor.state.selection;
        const text = $from.parent.textContent;
        if (text.startsWith('/')) {
          setSlashQuery(text.slice(1).toLowerCase());
          setSelectedIndex(0);
        } else {
          setSlashMenuOpen(false);
        }
      }
    },
  });

  useEffect(() => {
    if (editor) {
      editor.setEditable(!isLocked);
    }
  }, [isLocked, editor]);

  // Re-sync editor content when switching active page
  useEffect(() => {
    if (editor && page.content) {
      const currentJson = editor.getJSON();
      if (JSON.stringify(currentJson) !== JSON.stringify(page.content)) {
        editor.commands.setContent(page.content);
      }
    }
  }, [page.id, editor]);

  const commands: CommandItem[] = [
    {
      title: 'Text',
      description: 'Just start writing with plain body text.',
      icon: <Type className="w-4 h-4 text-zinc-500" />,
      action: (ed) => ed.chain().focus().setParagraph().run(),
    },
    {
      title: 'Heading 1',
      description: 'Large section heading.',
      icon: <Heading1 className="w-4 h-4 text-zinc-500" />,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      title: 'Heading 2',
      description: 'Medium subsection heading.',
      icon: <Heading2 className="w-4 h-4 text-zinc-500" />,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      title: 'Heading 3',
      description: 'Small topic heading.',
      icon: <Heading3 className="w-4 h-4 text-zinc-500" />,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      title: 'To-do List',
      description: 'Track checklist tasks with interactive boxes.',
      icon: <CheckSquare className="w-4 h-4 text-emerald-500" />,
      action: (ed) => ed.chain().focus().toggleTaskList().run(),
    },
    {
      title: 'Bulleted List',
      description: 'Create a simple bulleted list.',
      icon: <List className="w-4 h-4 text-zinc-500" />,
      action: (ed) => ed.chain().focus().toggleBulletList().run(),
    },
    {
      title: 'Numbered List',
      description: 'Create an ordered sequence.',
      icon: <ListOrdered className="w-4 h-4 text-zinc-500" />,
      action: (ed) => ed.chain().focus().toggleOrderedList().run(),
    },
    {
      title: 'Callout',
      description: 'Highlight insights or notices with an icon.',
      icon: <Sparkles className="w-4 h-4 text-amber-500" />,
      action: (ed) => ed.chain().focus().toggleCallout().run(),
    },
    {
      title: 'Toggle List',
      description: 'Hide or show nested content inside a disclosure.',
      icon: <ChevronRight className="w-4 h-4 text-blue-500" />,
      action: (ed) => {
        ed.chain()
          .focus()
          .insertContent({
            type: 'toggle',
            content: [
              {
                type: 'toggleSummary',
                content: [{ type: 'text', text: 'Toggle item (click to expand)' }],
              },
              {
                type: 'toggleContent',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Hidden details revealed inside.' }],
                  },
                ],
              },
            ],
          })
          .run();
      },
    },
    {
      title: 'Code Block',
      description: 'Code snippet with syntax highlighting.',
      icon: <Code className="w-4 h-4 text-indigo-500" />,
      action: (ed) => ed.chain().focus().toggleCodeBlock().run(),
    },
    {
      title: 'Quote',
      description: 'Capture a stylized quote or blockquote.',
      icon: <Quote className="w-4 h-4 text-rose-500" />,
      action: (ed) => ed.chain().focus().toggleBlockquote().run(),
    },
    {
      title: 'Image',
      description: 'Embed an image from URL or preset.',
      icon: <ImageIcon className="w-4 h-4 text-teal-500" />,
      action: () => setImageModalOpen(true),
    },
    {
      title: 'Divider',
      description: 'Visually divide blocks with a line.',
      icon: <Minus className="w-4 h-4 text-zinc-400" />,
      action: (ed) => ed.chain().focus().setHorizontalRule().run(),
    },
    {
      title: '2 Columns',
      description: 'Split block into two side-by-side columns.',
      icon: <LayoutGrid className="w-4 h-4 text-emerald-500" />,
      action: (ed) => {
        ed.chain()
          .focus()
          .insertContent({
            type: 'columns',
            content: [
              {
                type: 'column',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Left column notes...' }] }],
              },
              {
                type: 'column',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Right column notes...' }] }],
              },
            ],
          })
          .run();
      },
    },
    {
      title: 'Table of Contents',
      description: 'Outline summary of page headings.',
      icon: <List className="w-4 h-4 text-purple-500" />,
      action: (ed) => {
        const headings: { text: string; level: number }[] = [];
        ed.state.doc.descendants((node: any) => {
          if (node.type.name === 'heading') {
            headings.push({ text: node.textContent, level: node.attrs.level });
          }
        });

        const items =
          headings.length > 0
            ? headings.map((h) => ({
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: `${'    '.repeat(Math.max(0, h.level - 1))}• ${h.text}`,
                  },
                ],
              }))
            : [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: '• No headings found yet. Add Heading 1–3 to populate outline.' }],
                },
              ];

        ed.chain()
          .focus()
          .insertContent({
            type: 'callout',
            attrs: { icon: '📑' },
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Table of Contents' }],
              },
              ...items,
            ],
          })
          .run();
      },
    },
    {
      title: 'Web Bookmark',
      description: 'Save a website link with clean card.',
      icon: <LinkIcon className="w-4 h-4 text-cyan-500" />,
      action: (ed) => {
        const url = prompt('Enter website URL:');
        if (!url) return;
        const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
        let hostname = cleanUrl;
        try {
          hostname = new URL(cleanUrl).hostname;
        } catch (e) {}

        ed.chain()
          .focus()
          .insertContent({
            type: 'callout',
            attrs: { icon: '🔗' },
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    marks: [
                      { type: 'bold' },
                      { type: 'link', attrs: { href: cleanUrl } },
                    ],
                    text: hostname,
                  },
                ],
              },
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    marks: [{ type: 'link', attrs: { href: cleanUrl } }],
                    text: cleanUrl,
                  },
                ],
              },
            ],
          })
          .run();
      },
    },
    {
      title: 'Math Equation',
      description: 'Display formatted mathematical expressions with LaTeX syntax.',
      icon: <Calculator className="w-4 h-4 text-emerald-500" />,
      action: (ed) => {
        const formula = prompt('Enter mathematical formula (e.g. f(x) = a x^2 + b x + c):', 'f(x) = a x^2 + b x + c');
        if (!formula) return;
        ed.chain()
          .focus()
          .insertContent({
            type: 'callout',
            attrs: { icon: '∑' },
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    marks: [{ type: 'code' }],
                    text: formula,
                  },
                ],
              },
            ],
          })
          .run();
      },
    },
    {
      title: 'Sub-page',
      description: 'Embed a new sub-page inside this document.',
      icon: <FolderOpen className="w-4 h-4 text-blue-500" />,
      action: async (ed) => {
        const newChild = await createPage({ parentId: page.id, title: 'Untitled Sub-page', icon: '📄' });
        ed.chain()
          .focus()
          .insertContent({
            type: 'paragraph',
            content: [
              {
                type: 'text',
                marks: [{ type: 'bold' }],
                text: `📄 ${newChild.title}`,
              },
            ],
          })
          .run();
      },
    },
  ];

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(slashQuery) ||
      cmd.description.toLowerCase().includes(slashQuery)
  );

  const executeCommand = (cmd: CommandItem) => {
    if (!editor) return;
    const { $from } = editor.state.selection;
    const lineText = $from.parent.textContent;
    if (lineText.startsWith('/')) {
      const from = $from.start();
      const to = $from.pos;
      editor.chain().focus().deleteRange({ from, to }).run();
    }
    cmd.action(editor);
    setSlashMenuOpen(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!editorContainerRef.current || isLocked) return;
    const editorEl = editorContainerRef.current;
    const target = (e.target as HTMLElement).closest('.tiptap > *') as HTMLElement | null;
    if (target && editorEl.contains(target)) {
      setHoveredBlockDom(target);
      const targetRect = target.getBoundingClientRect();
      const containerRect = editorEl.getBoundingClientRect();
      setGutterPos({ top: targetRect.top - containerRect.top });
    }
  };

  const handleAddBlockBelow = () => {
    if (!editor) return;
    try {
      if (hoveredBlockDom) {
        const pos = editor.view.posAtDOM(hoveredBlockDom, 0);
        const $pos = editor.state.doc.resolve(pos);
        const endOfBlock = $pos.after(1);
        editor.chain().focus().insertContentAt(endOfBlock, { type: 'paragraph' }).run();
      } else {
        editor.chain().focus().insertContent({ type: 'paragraph' }).run();
      }
      setTimeout(() => {
        const { from } = editor.state.selection;
        const coords = editor.view.coordsAtPos(from);
        if (editorContainerRef.current) {
          const containerRect = editorContainerRef.current.getBoundingClientRect();
          setSlashMenuPos({
            top: coords.bottom - containerRect.top + 6,
            left: Math.max(0, coords.left - containerRect.left),
          });
        }
        setSlashMenuOpen(true);
        setSlashQuery('');
        setSelectedIndex(0);
      }, 30);
    } catch (e) {
      editor.chain().focus().insertContent({ type: 'paragraph' }).run();
      setSlashMenuOpen(true);
    }
  };

  const handleDeleteCurrentBlock = () => {
    if (!editor || !hoveredBlockDom) return;
    try {
      const pos = editor.view.posAtDOM(hoveredBlockDom, 0);
      const $pos = editor.state.doc.resolve(pos);
      const from = $pos.before(1);
      const to = $pos.after(1);
      editor.chain().focus().deleteRange({ from, to }).run();
    } catch (e) {}
    setBlockMenuOpen(false);
  };

  const handleDuplicateCurrentBlock = () => {
    if (!editor || !hoveredBlockDom) return;
    try {
      const pos = editor.view.posAtDOM(hoveredBlockDom, 0);
      const $pos = editor.state.doc.resolve(pos);
      const node = $pos.node(1);
      const to = $pos.after(1);
      if (node) {
        editor.chain().focus().insertContentAt(to, node.toJSON()).run();
      }
    } catch (e) {}
    setBlockMenuOpen(false);
  };

  const handleTurnInto = (type: string, attrs?: any) => {
    if (!editor || !hoveredBlockDom) return;
    try {
      const pos = editor.view.posAtDOM(hoveredBlockDom, 0);
      editor.chain().focus().setTextSelection(pos).run();
      if (type === 'paragraph') editor.chain().focus().setParagraph().run();
      else if (type === 'heading') editor.chain().focus().toggleHeading(attrs).run();
      else if (type === 'taskList') editor.chain().focus().toggleTaskList().run();
      else if (type === 'bulletList') editor.chain().focus().toggleBulletList().run();
      else if (type === 'orderedList') editor.chain().focus().toggleOrderedList().run();
      else if (type === 'callout') editor.chain().focus().toggleCallout().run();
      else if (type === 'quote') editor.chain().focus().toggleBlockquote().run();
      else if (type === 'codeBlock') editor.chain().focus().toggleCodeBlock().run();
    } catch (e) {}
    setBlockMenuOpen(false);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    updatePage(page.id, { title: val || 'Untitled' });
  };

  const handleIconSelect = (emoji: string) => {
    updatePage(page.id, { icon: emoji });
  };

  const handleAddCover = () => {
    const defaultCovers = [
      'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1600&q=80',
    ];
    const randomCover = defaultCovers[Math.floor(Math.random() * defaultCovers.length)];
    updatePage(page.id, { coverImage: randomCover });
  };

  const handleRemoveCover = () => {
    updatePage(page.id, { coverImage: null });
  };

  const handleSetLink = () => {
    if (!editor) return;
    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    }
    setLinkInputOpen(false);
    setLinkUrl('');
  };

  const handleInsertImage = () => {
    if (!editor || !imageUrl) return;
    editor.chain().focus().setImage({ src: imageUrl }).run();
    setImageModalOpen(false);
    setImageUrl('');
  };

  // Export page as Markdown
  const handleExportMarkdown = () => {
    const markdown = `# ${page.title}\n\n${editor?.getText() || ''}`;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${page.title || 'untitled'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto px-8 md:px-16 pt-4 pb-32">
      {/* Top Page Utility Bar */}
      <div className="flex items-center justify-end mb-3 text-xs text-muted-foreground opacity-80 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLocked(!isLocked)}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={isLocked ? 'Page is locked (Read-only)' : 'Lock page'}
          >
            {isLocked ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Unlock className="w-3.5 h-3.5" />}
            <span>{isLocked ? 'Locked' : 'Unlocked'}</span>
          </button>
          <button
            onClick={handleExportMarkdown}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Export to Markdown (.md)"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export MD</span>
          </button>
        </div>
      </div>

      {/* Cover Image */}
      {page.coverImage && (
        <div className="relative group w-full h-48 md:h-64 rounded-xl overflow-hidden mb-8 border border-border shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={page.coverImage} alt="Cover" className="w-full h-full object-cover" />
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 bg-black/60 backdrop-blur-md rounded-md p-1">
            <button
              onClick={handleAddCover}
              className="text-xs text-white hover:bg-white/20 px-2 py-1 rounded transition-colors"
            >
              Change Cover
            </button>
            <button
              onClick={handleRemoveCover}
              className="text-xs text-white hover:bg-red-500/80 px-2 py-1 rounded transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Hover action bar above page title */}
      <div className="flex items-center gap-2 mb-2 opacity-60 hover:opacity-100 transition-opacity text-xs text-muted-foreground">
        {!page.icon && (
          <button
            onClick={() => handleIconSelect('📄')}
            className="flex items-center gap-1 hover:text-foreground hover:bg-muted px-2 py-0.5 rounded transition-colors"
          >
            <Smile className="w-3.5 h-3.5" />
            <span>Add icon</span>
          </button>
        )}
        {!page.coverImage && (
          <button
            onClick={handleAddCover}
            className="flex items-center gap-1 hover:text-foreground hover:bg-muted px-2 py-0.5 rounded transition-colors"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Add cover</span>
          </button>
        )}
      </div>

      {/* Page Icon */}
      {page.icon && (
        <div className="mb-4">
          <div className="group relative inline-block">
            <span className="text-5xl cursor-pointer hover:opacity-80 transition-opacity">{page.icon}</span>
            <div className="hidden group-hover:flex absolute left-0 -top-8 bg-card border border-border shadow-md rounded-lg p-1 gap-1 z-20">
              {['📄', '📝', '🚀', '🎯', '💡', '🔥', '📚', '🛠️', '✨', '⚡', '📊'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleIconSelect(emoji)}
                  className="hover:bg-muted p-1 rounded text-base"
                >
                  {emoji}
                </button>
              ))}
              <button
                onClick={() => updatePage(page.id, { icon: null })}
                className="text-[10px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950 px-1 rounded"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Title */}
      <input
        type="text"
        value={title}
        disabled={isLocked}
        onChange={handleTitleChange}
        onFocus={(e) => {
          if (e.target.value === 'Untitled') {
            e.target.select();
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            editor?.commands.focus('start');
          }
        }}
        placeholder="Untitled"
        className="w-full text-4xl md:text-5xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/30 mb-4 text-foreground tracking-tight"
      />

      {/* Page Discussion & Comments */}
      <PageComments page={page} />

      {/* Floating Bubble Formatting Toolbar (Only on text selection) */}
      {editor && !isLocked && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 120, zIndex: 40 }}
          shouldShow={({ editor, view, state, from, to }) => {
            return from !== to && !editor.isActive('image');
          }}
          className="flex items-center gap-0.5 bg-card/95 backdrop-blur-md border border-border shadow-xl rounded-lg p-1 text-xs z-40 animate-in fade-in-50 zoom-in-95 duration-150"
        >
          {/* Turn into buttons */}
          <div className="flex items-center border-r border-border/60 pr-1 mr-1 gap-0.5">
            <button
              onClick={() => editor.chain().focus().setParagraph().run()}
              className={`px-1.5 py-1 rounded text-xs hover:bg-muted ${editor.isActive('paragraph') ? 'font-semibold text-accent' : 'text-muted-foreground'}`}
              title="Text"
            >
              Text
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`p-1 rounded hover:bg-muted ${editor.isActive('heading', { level: 1 }) ? 'bg-muted text-accent font-bold' : 'text-muted-foreground'}`}
              title="Heading 1"
            >
              <Heading1 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-1 rounded hover:bg-muted ${editor.isActive('heading', { level: 2 }) ? 'bg-muted text-accent font-bold' : 'text-muted-foreground'}`}
              title="Heading 2"
            >
              <Heading2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`p-1 rounded hover:bg-muted ${editor.isActive('heading', { level: 3 }) ? 'bg-muted text-accent font-bold' : 'text-muted-foreground'}`}
              title="Heading 3"
            >
              <Heading3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              className={`p-1 rounded hover:bg-muted ${editor.isActive('taskList') ? 'bg-muted text-accent' : 'text-muted-foreground'}`}
              title="To-do list"
            >
              <CheckSquare className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-1 rounded hover:bg-muted ${editor.isActive('bulletList') ? 'bg-muted text-accent' : 'text-muted-foreground'}`}
              title="Bullet list"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Formatting buttons */}
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-muted ${editor.isActive('bold') ? 'bg-muted text-accent font-bold' : 'text-muted-foreground'}`}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-muted ${editor.isActive('italic') ? 'bg-muted text-accent italic' : 'text-muted-foreground'}`}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded hover:bg-muted ${editor.isActive('underline') ? 'bg-muted text-accent underline' : 'text-muted-foreground'}`}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded hover:bg-muted ${editor.isActive('strike') ? 'bg-muted text-accent line-through' : 'text-muted-foreground'}`}
            title="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-1.5 rounded hover:bg-muted font-mono ${editor.isActive('code') ? 'bg-muted text-accent' : 'text-muted-foreground'}`}
            title="Inline Code (Ctrl+E)"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={`p-1.5 rounded hover:bg-muted ${editor.isActive('highlight') ? 'bg-yellow-200 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100' : 'text-muted-foreground'}`}
            title="Highlight"
          >
            <Highlighter className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setLinkUrl(editor.getAttributes('link').href || '');
              setLinkInputOpen(!linkInputOpen);
            }}
            className={`p-1.5 rounded hover:bg-muted ${editor.isActive('link') ? 'bg-muted text-accent' : 'text-muted-foreground'}`}
            title="Link (Ctrl+K)"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </button>

          {linkInputOpen && (
            <div className="flex items-center gap-1 pl-2 pr-1 py-0.5 bg-background border border-border rounded-md shadow-sm ml-1">
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="text-xs bg-transparent outline-none w-36 text-foreground"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSetLink();
                  if (e.key === 'Escape') setLinkInputOpen(false);
                }}
              />
              <button
                onClick={handleSetLink}
                className="text-[10px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded font-medium"
              >
                Save
              </button>
            </div>
          )}
        </BubbleMenu>
      )}

      {/* TipTap Editor Content with Notion Block Gutter */}
      <div
        ref={editorContainerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          if (!blockMenuOpen) {
            setGutterPos(null);
          }
        }}
        className="relative min-h-[350px] pl-2"
      >
        {/* Left Notion Block Hover Gutter Handle */}
        {gutterPos && !isLocked && (
          <div
            style={{ top: `${gutterPos.top}px`, transform: 'translateY(1px)' }}
            className="absolute -left-12 flex items-center gap-0.5 z-20 group/gutter transition-opacity"
          >
            <button
              onClick={handleAddBlockBelow}
              className="p-1 rounded hover:bg-muted text-muted-foreground/60 hover:text-foreground transition-colors"
              title="Click to add block below"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setBlockMenuOpen(!blockMenuOpen)}
              className="p-1 rounded hover:bg-muted text-muted-foreground/60 hover:text-foreground cursor-grab transition-colors"
              title="Click for block menu, drag to move"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>

            {/* Block Context / Turn Into Menu */}
            {blockMenuOpen && (
              <div
                className="absolute left-10 top-0 w-52 bg-card border border-border rounded-xl shadow-xl z-50 p-1 text-xs animate-in fade-in-50 zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Turn into
                </div>
                <button
                  onClick={() => handleTurnInto('paragraph')}
                  className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded text-left"
                >
                  <Type className="w-3.5 h-3.5 text-zinc-500" />
                  Text
                </button>
                <button
                  onClick={() => handleTurnInto('heading', { level: 1 })}
                  className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded text-left"
                >
                  <Heading1 className="w-3.5 h-3.5 text-zinc-500" />
                  Heading 1
                </button>
                <button
                  onClick={() => handleTurnInto('heading', { level: 2 })}
                  className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded text-left"
                >
                  <Heading2 className="w-3.5 h-3.5 text-zinc-500" />
                  Heading 2
                </button>
                <button
                  onClick={() => handleTurnInto('heading', { level: 3 })}
                  className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded text-left"
                >
                  <Heading3 className="w-3.5 h-3.5 text-zinc-500" />
                  Heading 3
                </button>
                <button
                  onClick={() => handleTurnInto('taskList')}
                  className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded text-left"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                  To-do list
                </button>
                <button
                  onClick={() => handleTurnInto('bulletList')}
                  className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded text-left"
                >
                  <List className="w-3.5 h-3.5 text-zinc-500" />
                  Bulleted list
                </button>
                <button
                  onClick={() => handleTurnInto('callout')}
                  className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded text-left"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Callout
                </button>
                <button
                  onClick={() => handleTurnInto('quote')}
                  className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded text-left"
                >
                  <Quote className="w-3.5 h-3.5 text-rose-500" />
                  Quote
                </button>
                <button
                  onClick={() => handleTurnInto('codeBlock')}
                  className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded text-left"
                >
                  <Code className="w-3.5 h-3.5 text-indigo-500" />
                  Code block
                </button>

                <div className="h-px bg-border my-1" />

                <button
                  onClick={handleDuplicateCurrentBlock}
                  className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded text-left"
                >
                  <Copy className="w-3.5 h-3.5 text-zinc-500" />
                  Duplicate
                </button>
                <button
                  onClick={handleDeleteCurrentBlock}
                  className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-red-50 dark:hover:bg-red-950 text-red-500 rounded text-left"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}

        <EditorContent editor={editor} />

        {/* Floating Slash Command Menu (Positioned directly below cursor) */}
        {slashMenuOpen && filteredCommands.length > 0 && (
          <div
            ref={slashMenuRef}
            style={{
              top: `${slashMenuPos.top}px`,
              left: `${slashMenuPos.left}px`,
            }}
            className="absolute w-72 max-h-80 overflow-y-auto bg-card border border-border rounded-xl shadow-2xl z-40 p-1.5 animate-in fade-in-50 zoom-in-95 duration-100"
          >
            <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Basic & Advanced Blocks
            </div>
            {filteredCommands.map((cmd, idx) => (
              <button
                key={cmd.title}
                onClick={() => executeCommand(cmd)}
                className={`w-full flex items-start gap-3 p-2 rounded-lg text-left transition-colors ${
                  idx === selectedIndex ? 'bg-muted text-foreground' : 'hover:bg-muted/60 text-foreground'
                }`}
              >
                <div className="p-1 rounded bg-background border border-border mt-0.5">{cmd.icon}</div>
                <div>
                  <div className="text-sm font-medium">{cmd.title}</div>
                  <div className="text-xs text-muted-foreground leading-tight">{cmd.description}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Image Insertion Modal */}
      {imageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-2xl max-w-md w-full">
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-accent" />
              Embed Image
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Enter an image URL or choose a preset photo to embed into your document.
            </p>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.png"
              className="w-full text-xs p-2 rounded-lg bg-muted border border-border mb-3 outline-none focus:ring-1 focus:ring-accent"
            />
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {[
                'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80',
              ].map((preset, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={preset}
                  alt="Preset"
                  onClick={() => setImageUrl(preset)}
                  className="w-16 h-12 object-cover rounded-md border border-border cursor-pointer hover:opacity-80 transition-opacity"
                />
              ))}
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setImageModalOpen(false)}
                className="px-3 py-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleInsertImage}
                disabled={!imageUrl}
                className="px-3.5 py-1.5 rounded-lg bg-accent text-accent-foreground font-medium disabled:opacity-50"
              >
                Insert Image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
