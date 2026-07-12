import { Construction } from 'lucide-react';

// Shared visual body for a placeholder screen — the real content for Transcript & GPA and Course
// Selection comes in later build stages; this pass only needs the flow/navigation order confirmed.
export default function ComingSoonNotice({ icon: Icon, title, description }) {
  return (
    <div className="coming-soon">
      <div className="coming-soon-icon-badge">
        <Icon size={28} />
      </div>
      <h2 className="coming-soon-title">{title}</h2>
      <p className="coming-soon-desc">{description}</p>
      <div className="coming-soon-tag">
        <Construction size={13} /> Coming soon
      </div>
    </div>
  );
}
