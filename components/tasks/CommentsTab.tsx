// components/tasks/CommentsTab.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, AtSign, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
}

interface Comment {
  id: string;
  text: string;
  author: User | null;
  createdAt: string;
  mentions?: { id: string; name: string }[];
}

interface CommentsTabProps {
  taskId: string;
  comments: Comment[];
  onUpdate: () => void;
  currentUserId?: string;
}

export function CommentsTab({ taskId, comments, onUpdate, currentUserId }: CommentsTabProps) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionResults, setMentionResults] = useState<User[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionContainerRef = useRef<HTMLDivElement>(null);

  // Extract mentioned user IDs from comment text
  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const matches = [...text.matchAll(mentionRegex)];
    return matches.map(match => match[2]);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);

    // Check for @mention
    const cursorPosition = e.target.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const searchText = textBeforeCursor.substring(lastAtIndex + 1);
      // Check if there's a space after the @ (meaning it's a complete word)
      if (!searchText.includes(' ') && searchText.length > 0) {
        setMentionSearch(searchText);
        searchUsers(searchText);
        setShowMentions(true);
        
        // Position the mention dropdown
        if (textareaRef.current) {
          const rect = textareaRef.current.getBoundingClientRect();
          setMentionPosition({
            top: rect.top - 80,
            left: rect.left + 20,
          });
        }
        return;
      }
    }
    
    setShowMentions(false);
    setMentionResults([]);
  };

  const searchUsers = async (query: string) => {
    try {
      const res = await fetch(`/api/users?q=${encodeURIComponent(query)}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setMentionResults(data.users || []);
      }
    } catch (err) {
      console.error("Failed to search users:", err);
    }
  };

  const insertMention = (user: User) => {
    const cursorPosition = textareaRef.current?.selectionStart || text.length;
    const textBeforeCursor = text.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const textBeforeMention = text.substring(0, lastAtIndex);
    const textAfterCursor = text.substring(cursorPosition);
    
    const mentionText = `@[${user.name}](${user.id}) `;
    const newText = textBeforeMention + mentionText + textAfterCursor;
    
    setText(newText);
    setShowMentions(false);
    setMentionResults([]);
    setMentionSearch("");
    
    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = textBeforeMention.length + mentionText.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && mentionResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => 
          prev < mentionResults.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === 'Enter' && selectedMentionIndex >= 0) {
        e.preventDefault();
        insertMention(mentionResults[selectedMentionIndex]);
      } else if (e.key === 'Escape') {
        setShowMentions(false);
        setMentionResults([]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    setSubmitting(true);
    try {
      // Extract mentioned user IDs from the text
      const mentionedUserIds = extractMentions(text);
      
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: text.trim(),
          mentionedUserIds 
        }),
      });
      
      if (res.ok) {
        setText("");
        onUpdate();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to post comment");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Click outside to close mentions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mentionContainerRef.current && !mentionContainerRef.current.contains(e.target as Node)) {
        setShowMentions(false);
        setMentionResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Render comment with mention highlighting
  const renderCommentText = (comment: Comment) => {
    const parts = comment.text.split(/(@\[[^\]]+\]\([^)]+\))/g);
    return parts.map((part, index) => {
      const match = part.match(/@\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        return (
          <span
            key={index}
            className="text-purple-400 hover:text-purple-300 cursor-pointer font-medium"
            onClick={() => {
              // Optionally navigate to user profile
              const userId = match[2];
              console.log(`Navigate to user ${userId}`);
            }}
          >
            @{match[1]}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="space-y-4 relative">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Write a comment... Use @ to mention someone"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[80px] resize-y"
            rows={3}
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <span className="text-[10px] text-zinc-500">
              <AtSign className="w-3 h-3 inline mr-1" />
              @ to mention
            </span>
          </div>
        </div>

        {/* Mention Suggestions Dropdown */}
        {showMentions && mentionResults.length > 0 && (
          <div
            ref={mentionContainerRef}
            className="absolute z-50 w-64 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
            style={{
              top: mentionPosition.top,
              left: mentionPosition.left,
              maxHeight: '200px',
              overflowY: 'auto',
            }}
          >
            <div className="p-2 border-b border-zinc-800">
              <span className="text-[10px] text-zinc-500 font-medium">Mention someone</span>
            </div>
            {mentionResults.map((user, index) => (
              <button
                key={user.id}
                onClick={() => insertMention(user)}
                className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-800/50 transition-colors text-left ${
                  selectedMentionIndex === index ? 'bg-zinc-800/50' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-400">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200">{user.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                </div>
                <span className="text-[9px] text-zinc-600 font-medium uppercase">
                  {user.role}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-2">
          <Button
            type="submit"
            disabled={submitting || !text.trim()}
            size="sm"
            className="bg-purple-600 hover:bg-purple-500 text-white"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="ml-2">Comment</span>
          </Button>
        </div>
      </form>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {comments.length === 0 ? (
          <p className="text-sm text-zinc-600 text-center py-8">No comments yet.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex gap-3 p-2 rounded-lg hover:bg-zinc-800/30 transition-colors group">
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0">
                {c.author?.name?.charAt(0).toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-zinc-300">
                    {c.author?.name ?? "Unknown"}
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                  {c.mentions && c.mentions.length > 0 && (
                    <span className="text-[9px] text-purple-400/60 flex items-center gap-1">
                      <AtSign className="w-3 h-3" />
                      {c.mentions.length} mentioned
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-400 mt-0.5 whitespace-pre-wrap break-words">
                  {renderCommentText(c)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}