export default function Logo({ onClick, compact = false, brand = "PackPure" }) {
  const isPackPure = String(brand).toLowerCase().startsWith("packpure");
  return (
    <button
      className={compact ? "pp-logo pp-logo-compact" : "pp-logo"}
      onClick={onClick}
      type="button"
      aria-label="PackPure home"
    >
      <span className="pp-logo-mark">
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 8a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v1h3l2 4h-5v6a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6h-5l2-4h3V8Z" />
          <path d="M12 13v7M6.5 13v7M17.5 13v7" />
          <path d="M12 3v3" />
        </svg>
      </span>

      <span className="pp-logo-text">
        {isPackPure ? (
          <>
            Pack<span>Pure</span>
          </>
        ) : (
          brand
        )}
      </span>
    </button>
  );
}
