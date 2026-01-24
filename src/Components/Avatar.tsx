import { getInitial } from "../utils/avatar";

export default function Avatar({ name, src, alt, className = "", size }) {
  const style = size ? { width: size, height: size } : undefined;
  const label = alt || name || "Avatar";

  if (src) {
    return (
      <img
        className={`avatar ${className}`.trim()}
        style={style}
        src={src}
        alt={label}
      />
    );
  }

  return (
    <div
      className={`avatar avatar-fallback ${className}`.trim()}
      style={style}
      role="img"
      aria-label={label}
    >
      <span>{getInitial(name)}</span>
    </div>
  );
}
