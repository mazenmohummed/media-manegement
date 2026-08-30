// components/projects/CommentsTab.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { MessageSquare, Loader2, Trash2, AtSign, X } from "lucide-react";
import { useSession } from "next-auth/react";

interface Comment {
  id: string;
  text: string;
  createdAt: string;
  author: { id: string; name: string; role: string } | null;
  mentions?: { id: string; name: string }[];
}

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
}

interface CommentsTabProps {
  projectId: string;
}

export function CommentsTab({ projectId }: CommentsTabProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionResults, setMentionResults] = useState<User[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionContainerRef = useRef<HTMLDivElement>(null);

  const load = () =>
    fetch(`/api/projects/${projectId}/comments`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments ?? []))
      .catch(() => setComments([]));

  useEffect(() => {
    load();
  }, [projectId]);

  // Extract mentioned user IDs from comment text
  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const matches = [...text.matchAll(mentionRegex)];
    return matches.map((match) => match[2]);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);

    const cursorPosition = e.target.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const searchText = textBeforeCursor.substring(lastAtIndex + 1);
      if (!searchText.includes(" ") && searchText.length > 0) {
        setMentionSearch(searchText);
        searchUsers(searchText);
        setShowMentions(true);

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
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    const textBeforeMention = text.substring(0, lastAtIndex);
    const textAfterCursor = text.substring(cursorPosition);

    const mentionText = `@[${user.name}](${user.id}) `;
    const newText = textBeforeMention + mentionText + textAfterCursor;

    setText(newText);
    setShowMentions(false);
    setMentionResults([]);
    setMentionSearch("");

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
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev < mentionResults.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Enter" && selectedMentionIndex >= 0) {
        e.preventDefault();
        insertMention(mentionResults[selectedMentionIndex]);
      } else if (e.key === "Escape") {
        setShowMentions(false);
        setMentionResults([]);
      }
    }
  };

  const handlePost = async () => {
    if (!text.trim()) return;
    setPosting(true);
    try {
      const mentionedUserIds = extractMentions(text);

      const res = await fetch(`/api/projects/${projectId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          mentionedUserIds,
        }),
      });
      if (res.ok) {
        setText("");
        load();
      }
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setComments((prev) => prev?.filter((c) => c.id !== id) ?? null);
    await fetch(`/api/comments/${id}`, { method: "DELETE" });
  };

  // Click outside to close mentions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        mentionContainerRef.current &&
        !mentionContainerRef.current.contains(e.target as Node)
      ) {
        setShowMentions(false);
        setMentionResults([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
              // Navigate to user profile
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

  if (comments === null) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-zinc-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      <div className="flex gap-2 relative">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Write a comment... Use @ to mention someone"
            rows={2}
            className="w-full bg-zinc-950/60 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500 min-h-[60px] resize-y"
          />
          <div className="absolute bottom-2 right-3 text-[10px] text-zinc-500">
            <AtSign className="w-3 h-3 inline mr-1" />
            @ to mention
          </div>
        </div>
        <button
          onClick={handlePost}
          disabled={posting || !text.trim()}
          className="text-xs font-medium bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 rounded-md h-[60px]"
        >
          {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
        </button>
      </div>

      {/* Mention Suggestions Dropdown */}
      {showMentions && mentionResults.length > 0 && (
        <div
          ref={mentionContainerRef}
          className="absolute z-50 w-64 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
          style={{
            top: mentionPosition.top,
            left: mentionPosition.left,
            maxHeight: "200px",
            overflowY: "auto",
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
                selectedMentionIndex === index ? "bg-zinc-800/50" : ""
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

      {comments.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No comments yet.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {comments.map((c) => (
            <div
              key={c.id}
              className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-3 text-xs hover:bg-zinc-900/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-zinc-200">
                    {c.author?.name ?? "Unknown"}
                  </span>
                  {c.mentions && c.mentions.length > 0 && (
                    <span className="text-[9px] text-purple-400/60 flex items-center gap-1">
                      <AtSign className="w-3 h-3" />
                      {c.mentions.length} mentioned
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-[10px]">
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                  {session?.user?.id === c.author?.id && (
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-zinc-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-zinc-300 whitespace-pre-wrap break-words">
                {renderCommentText(c)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}