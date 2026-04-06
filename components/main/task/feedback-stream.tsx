// components/main/task/feedback-stream.tsx
import moment from "moment";

interface FeedbackStreamProps {
  comments: any[];
  newComment: string;
  setNewComment: (val: string) => void;
  postComment: () => void;
}

export const FeedbackStream = ({ comments, newComment, setNewComment, postComment }: FeedbackStreamProps) => {
  return (
    <section className="bg-card border border-border rounded-[2.5rem] overflow-hidden flex flex-col h-[500px]">
      <div className="p-6 border-b border-border bg-muted/30">
        <h3 className="text-[10px] font-black uppercase tracking-widest">Live Feedback Stream</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {comments?.map((c: any) => (
          <div key={c.id} className="flex flex-col gap-1 max-w-[80%]">
            <span className="text-[8px] font-black uppercase text-blue-600">
              {c.author?.name || "Member"}
            </span>
            <div className="bg-muted p-3 rounded-2xl rounded-tl-none text-xs font-medium">
              {c.text}
            </div>
            <span className="text-[7px] font-bold text-muted-foreground">
              {moment(c.createdAt).fromNow()}
            </span>
          </div>
        ))}
      </div>
      <div className="p-4 bg-muted/50 border-t border-border flex gap-2">
        <input
          type="text"
          placeholder="Update node status..."
          className="flex-1 bg-background border-none rounded-xl px-4 py-2 text-xs font-bold outline-none"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && postComment()}
        />
        <button 
          onClick={postComment} 
          className="bg-blue-600 text-white px-4 rounded-xl text-[10px] font-black uppercase"
        >
          Send
        </button>
      </div>
    </section>
  );
};