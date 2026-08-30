export function initialsFromName(fullName) {
  if (!fullName) return "?";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

export default function Avatar({ name, size = "md", className = "" }) {
  const initials = initialsFromName(name);
  return (
    <span
      className={`pp-avatar pp-avatar-${size} ${className}`.trim()}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
