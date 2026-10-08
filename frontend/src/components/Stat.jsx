export default function Stat({ icon, title, value, color = '' }) {
  return (
    <div className="stat">
      <div className={`stat-icon ${color}`}>{icon}</div>
      <div>
        <div className="stat-title">{title}</div>
        <div className="stat-value">{value}</div>
      </div>
    </div>
  );
}
