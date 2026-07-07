import { Compass } from 'lucide-react';

export default function PlaceholderCard({ trackLabel }) {
  return (
    <div className="placeholder-card">
      <Compass size={28} color="#6E7F87" style={{ marginBottom: 14 }} />
      <div className="card-title">More paths coming soon</div>
      <p className="card-desc">
        We're still building out rich career, major, and program data for{' '}
        <strong>{trackLabel}</strong>. Right now MyPath has full journeys for Business and STEM —
        try one of those interest tags to see the whole experience end to end.
      </p>
    </div>
  );
}
