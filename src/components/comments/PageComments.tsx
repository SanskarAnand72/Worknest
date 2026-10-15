'use client';

import React, { useState } from 'react';
import { Page, PageComment } from '@/types';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { MessageSquare, Send, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { generateId, formatRelativeTime } from '@/lib/utils';

interface PageCommentsProps {
  page: Page;
}

export const PageComments: React.FC<PageCommentsProps> = ({ page }) => {
  const { updatePage, currentUser } = useWorkspaceStore();
  const [isOpen, setIsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');

  const comments: PageComment[] = page.comments || [];

  const handleAddComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim()) return;

    const newComment: PageComment = {
      id: generateId(),
      authorName: currentUser?.name || 'Alex Rivera',
      avatarUrl: currentUser?.avatarUrl,
      content: commentText.trim(),
      createdAt: Date.now(),
    };

    const updatedComments = [...comments, newComment];
    await updatePage(page.id, { comments: updatedComments });
    setCommentText('');
  };

  const handleDeleteComment = async (commentId: string) => {
    const updatedComments = comments.filter((c) => c.id !== commentId);
    await updatePage(page.id, { comments: updatedComments });
  };

  return (
    <div className="mb-4 text-xs">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        <span>{comments.length === 0 ? 'Add comment' : `${comments.length} comments`}</span>
        {isOpen ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
      </button>

      {/* Collapsible Comments Section */}
      {isOpen && (
        <div className="mt-2 p-3 bg-muted/20 border border-border rounded-xl space-y-3 animate-in fade-in-50 duration-150 max-w-xl">
          {comments.length === 0 ? (
            <div className="text-muted-foreground py-1 text-[11px]">No comments yet. Start a discussion!</div>
          ) : (
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-2.5 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={comment.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&q=80'}
                    alt="Avatar"
                    className="w-5 h-5 rounded-full object-cover mt-0.5"
                  />
                  <div className="flex-1 min-w-0 bg-card border border-border/70 rounded-lg p-2 shadow-xs">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-foreground text-[11px]">{comment.authorName}</span>
                      <span className="text-[10px] text-muted-foreground">{formatRelativeTime(comment.createdAt)}</span>
                    </div>
                    <div className="text-foreground leading-relaxed break-words">{comment.content}</div>
                  </div>
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 rounded text-muted-foreground transition-opacity"
                    title="Delete comment"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* New comment input form */}
          <form onSubmit={handleAddComment} className="flex items-center gap-1.5 pt-1">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 px-3 py-1.5 rounded-lg bg-background border border-border text-foreground outline-none focus:ring-1 focus:ring-accent text-xs"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="p-1.5 rounded-lg bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
              title="Post comment"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
