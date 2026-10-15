'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
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
  const { updatePage, updatePageContent } = useWorkspaceStore();
  const [title, setTitle] = useState(page.title);
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [linkInputOpen, setLinkInputOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const slashMenuRef = useRef<HTMLDivElement>(null);

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
        if (event.key === '/' && !slashMenuOpen) {
          const { $from } = view.state.selection;
          const isAtStart = $from.parentOffset === 0;
          if (isAtStart || $from.parent.textContent === '') {
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
  ];

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(slashQuery) ||
      cmd.description.toLowerCase().includes(slashQuery)
  );

  const executeCommand = (cmd: CommandItem) => {
    if (!editor) return;
    const { $from } = editor.state.selection;
    const from = $from.start();
    const to = $from.pos;
    editor.chain().focus().deleteRange({ from, to }).run();
    cmd.action(editor);
    setSlashMenuOpen(false);
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
      <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground opacity-80 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2">
          {!page.icon && (
            <button
              onClick={() => handleIconSelect('📝')}
              className="flex items-center gap-1 hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
            >
              <Smile className="w-3.5 h-3.5" />
              Add icon
            </button>
          )}
          {!page.coverImage && (
            <button
              onClick={handleAddCover}
              className="flex items-center gap-1 hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Add cover
            </button>
          )}
        </div>

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
        placeholder="Untitled"
        className="w-full text-4xl md:text-5xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/30 mb-4 text-foreground tracking-tight"
      />

      {/* Page Discussion & Comments */}
      <PageComments page={page} />

      {/* Bubble Formatting Toolbar */}
      {editor && !isLocked && (
        <div className="sticky top-2 z-10 mb-4 flex flex-wrap items-center gap-1 bg-card/95 backdrop-blur-md border border-border shadow-sm rounded-lg p-1 w-fit">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-muted transition-colors ${editor.isActive('bold') ? 'bg-muted text-accent' : 'text-muted-foreground'}`}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-muted transition-colors ${editor.isActive('italic') ? 'bg-muted text-accent' : 'text-muted-foreground'}`}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded hover:bg-muted transition-colors ${editor.isActive('underline') ? 'bg-muted text-accent' : 'text-muted-foreground'}`}
            title="Underline"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded hover:bg-muted transition-colors ${editor.isActive('strike') ? 'bg-muted text-accent' : 'text-muted-foreground'}`}
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={`p-1.5 rounded hover:bg-muted transition-colors ${editor.isActive('highlight') ? 'bg-muted text-accent' : 'text-muted-foreground'}`}
            title="Highlight"
          >
            <Highlighter className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-1.5 rounded hover:bg-muted transition-colors ${editor.isActive('code') ? 'bg-muted text-accent' : 'text-muted-foreground'}`}
            title="Inline Code"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setLinkUrl(editor.getAttributes('link').href || '');
              setLinkInputOpen(!linkInputOpen);
            }}
            className={`p-1.5 rounded hover:bg-muted transition-colors ${editor.isActive('link') ? 'bg-muted text-accent' : 'text-muted-foreground'}`}
            title="Hyperlink"
          >
            <LinkIcon className="w-4 h-4" />
          </button>

          {/* Link URL inline input */}
          {linkInputOpen && (
            <div className="flex items-center gap-1 pl-2 pr-1 py-0.5 bg-background border border-border rounded-md">
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="text-xs bg-transparent outline-none w-36 text-foreground"
              />
              <button
                onClick={handleSetLink}
                className="text-[10px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded font-medium"
              >
                Save
              </button>
            </div>
          )}
        </div>
      )}

      {/* TipTap Editor Content */}
      <div className="relative min-h-[350px]">
        <EditorContent editor={editor} />

        {/* Floating Slash Command Menu */}
        {slashMenuOpen && filteredCommands.length > 0 && (
          <div
            ref={slashMenuRef}
            className="absolute left-0 mt-2 w-72 max-h-80 overflow-y-auto bg-card border border-border rounded-xl shadow-xl z-30 p-1.5 animate-in fade-in-50 zoom-in-95 duration-100"
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
