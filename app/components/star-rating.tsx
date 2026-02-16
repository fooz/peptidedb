type StarRatingProps = {
  rating: number | null;
  label?: string;
  idPrefix: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function StarRating({ rating, label = "Rating", idPrefix }: StarRatingProps) {
  if (rating === null) {
    return <span className="rating-empty">No rating</span>;
  }

  const normalized = clamp(rating, 0, 5);
  const rounded = Math.round(normalized * 10) / 10;
  const stars = [0, 1, 2, 3, 4].map((index) => clamp(normalized - index, 0, 1));

  return (
    <span className="rating-display" aria-label={`${label}: ${rounded.toFixed(1)} out of 5`}>
      <span className="rating-stars" aria-hidden="true">
        {stars.map((fill, index) => {
          const gradientId = `${idPrefix}-star-${index}`;
          const offset = `${Math.round(fill * 100)}%`;
          return (
            <svg key={gradientId} viewBox="0 0 24 24" className="rating-star">
              <defs>
                <linearGradient id={gradientId}>
                  <stop offset={offset} stopColor="currentColor" />
                  <stop offset={offset} stopColor="transparent" />
                </linearGradient>
              </defs>
              <path
                className="rating-star-base"
                d="M12 2.3l2.9 5.88 6.49.94-4.69 4.57 1.11 6.46L12 17.12 6.19 20.15l1.11-6.46L2.61 9.12l6.49-.94L12 2.3z"
              />
              <path
                className="rating-star-fill"
                style={{ fill: `url(#${gradientId})` }}
                d="M12 2.3l2.9 5.88 6.49.94-4.69 4.57 1.11 6.46L12 17.12 6.19 20.15l1.11-6.46L2.61 9.12l6.49-.94L12 2.3z"
              />
            </svg>
          );
        })}
      </span>
      <span className="rating-value">{rounded.toFixed(1)}</span>
    </span>
  );
}
