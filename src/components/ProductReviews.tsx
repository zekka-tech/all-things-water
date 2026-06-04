import { Star, StarHalf } from "lucide-react";
import { getProductReviews } from "@/data/products";

function StarRating({ rating }: { rating: number }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) {
      stars.push(
        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />,
      );
    } else if (rating >= i - 0.5) {
      stars.push(
        <StarHalf key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />,
      );
    } else {
      stars.push(
        <Star key={i} className="h-4 w-4 text-ink-300 dark:text-ink-600" />,
      );
    }
  }
  return <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>{stars}</div>;
}

export function ProductReviews({ productId }: { productId: string }) {
  const reviews = getProductReviews(productId);

  if (reviews.length === 0) {
    return (
      <section className="mt-16 border-t border-ink-200 pt-12 dark:border-ink-800">
        <h2 className="section-title">Customer Reviews</h2>
        <p className="mt-4 text-sm text-ink-500 dark:text-ink-400">
          No reviews yet. Be the first to review this product.
        </p>
      </section>
    );
  }

  const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <section className="mt-16 border-t border-ink-200 pt-12 dark:border-ink-800">
      <h2 className="section-title">Customer Reviews</h2>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-display text-2xl font-bold text-ink-900 dark:text-white">
            {average.toFixed(1)}
          </span>
          <StarRating rating={average} />
        </div>
        <span className="text-sm text-ink-500 dark:text-ink-400">
          ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
        </span>
      </div>

      <div className="mt-6 space-y-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="card bg-white p-5 dark:bg-ink-900"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-ink-900 dark:text-white">
                {review.author}
              </span>
              <StarRating rating={review.rating} />
              <span className="text-xs text-ink-400 dark:text-ink-500">
                {review.date}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
              {review.comment}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
