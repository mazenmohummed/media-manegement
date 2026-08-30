// components/vendors/vendor-performance-review.tsx
'use client';

import { useState } from 'react';
import { Star, Loader2, CheckCircle, Clock, X } from 'lucide-react';

interface VendorPerformanceReviewProps {
  vendorId: string;
  vendorName: string;
  purchaseOrderId: string;
  purchaseOrderNo?: string;
  projectId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function VendorPerformanceReview({
  vendorId,
  vendorName,
  purchaseOrderId,
  purchaseOrderNo,
  projectId,
  onSuccess,
  onCancel,
}: VendorPerformanceReviewProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [onTimeDelivery, setOnTimeDelivery] = useState<boolean>(true);
  const [comment, setComment] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/vendor-performance-reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vendorId,
          purchaseOrderId,
          rating,
          onTimeDelivery,
          comment: comment.trim() || undefined,
          projectId: projectId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting the review');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background border border-border rounded-3xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
          Rate Vendor Performance
        </h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-1 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-foreground">{vendorName}</p>
            {purchaseOrderNo && (
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                PO: {purchaseOrderNo}
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rating Stars */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Rating
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 focus:outline-none transition-transform hover:scale-110"
                  aria-label={`Rate ${star} stars`}
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoverRating || rating)
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-zinc-600 fill-zinc-600'
                    } transition-colors`}
                  />
                </button>
              ))}
              <span className="ml-2 text-xs font-bold text-muted-foreground self-center">
                {rating > 0 ? `${rating}/5` : 'Select rating'}
              </span>
            </div>
          </div>

          {/* On-Time Delivery Toggle */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Delivery Status
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setOnTimeDelivery(true)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 ${
                  onTimeDelivery
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : 'bg-background border border-border text-muted-foreground hover:bg-muted/20'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                On-Time
              </button>
              <button
                type="button"
                onClick={() => setOnTimeDelivery(false)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 ${
                  !onTimeDelivery
                    ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                    : 'bg-background border border-border text-muted-foreground hover:bg-muted/20'
                }`}
              >
                <Clock className="w-4 h-4" />
                Delayed
              </button>
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Comment (Optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add notes about the vendor's performance..."
              className="w-full bg-background border border-border rounded-2xl p-3 text-xs font-bold text-foreground focus:outline-none focus:border-blue-600 transition-colors resize-none"
              rows={3}
              maxLength={500}
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {comment.length}/500
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <p className="text-xs font-bold text-red-500">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isLoading || rating === 0}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-xs font-black uppercase tracking-wider rounded-2xl hover:bg-blue-700 transition shadow-[0_0_20px_rgba(37,99,235,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Review'
              )}
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 border border-border text-foreground text-xs font-bold uppercase tracking-wider rounded-2xl hover:bg-muted transition"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}