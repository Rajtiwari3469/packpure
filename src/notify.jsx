import { Toaster, toast } from "sonner";
import { useTheme } from "./useTheme.js";

/**
 * Global notification service.
 *
 * One consistent popup/toast system for the public site and the admin
 * dashboard, built on top of the existing Sonner installation.
 */

export const NOTIF_ICONS = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
  security: "🔐",
  scan: "📷",
  compliance: "⚖",
  account: "👤",
  admin: "🛠️",
  message: "💬",
  support: "🎧",
  update: "🔄",
  maintenance: "🔧",
  system: "🖥️",
};

const SEVERITY_DURATION = {
  low: 2800,
  medium: 4500,
  high: 8000,
  critical: Infinity,
};

const TYPE_SEVERITY = {
  success: "low",
  error: "high",
  warning: "medium",
  info: "low",
  security: "high",
  scan: "low",
  compliance: "medium",
  account: "medium",
  admin: "low",
  message: "medium",
  support: "medium",
  update: "medium",
  maintenance: "medium",
  system: "high",
};

const COLORED = ["success", "error", "warning"];

function buildContent(type, title, message, action) {
  const icon = NOTIF_ICONS[type];
  if (COLORED.includes(type)) {
    return (
      <span className="pp-toast-node pp-toast-colored">
        {title ? <span className="pp-toast-title">{title}</span> : null}
        {message ? <span className="pp-toast-msg">{message}</span> : null}
      </span>
    );
  }
  return (
    <span className="pp-toast-node">
      {icon ? (
        <span className={`pp-toast-ico pp-toast-ico-${type}`} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="pp-toast-text">
        {title ? <span className="pp-toast-title">{title}</span> : null}
        {message ? <span className="pp-toast-msg">{message}</span> : null}
      </span>
    </span>
  );
}

/**
 * Show a temporary popup/toast globally.
 *
 * @param {object} opts
 * @param {string} opts.type       notification type (see NOTIF_ICONS)
 * @param {string} [opts.title]    short bold title
 * @param {string} [opts.message]  detail line
 * @param {string} [opts.severity] low | medium | high | critical
 * @param {number} [opts.duration] overrides the severity default
 * @param {object} [opts.action]   { label, onClick } action button
 * @param {string} [opts.id]       stable id (replaces/dedupes same toast)
 */
export function showNotification({
  type = "info",
  title = "",
  message = "",
  severity,
  duration,
  action,
  id,
}) {
  const effDuration =
    duration ?? SEVERITY_DURATION[severity || TYPE_SEVERITY[type] || "medium"] ?? 4500;

  const node = buildContent(type, title, message);

  const commonOpts = {
    id,
    duration: effDuration,
    className: `pp-global-toast pp-global-toast-${type}`,
  };
  if (action && action.label) {
    commonOpts.action = {
      label: action.label,
      onClick: () => action.onClick && action.onClick(),
    };
  }

  if (type === "success") return toast.success(node, { ...commonOpts, richColors: true });
  if (type === "error") return toast.error(node, { ...commonOpts, richColors: true });
  if (type === "warning") return toast.warning(node, { ...commonOpts, richColors: true });
  return toast(node, commonOpts);
}

/** Convenience helpers — use these across the app. */
export const showSuccess = (title, message, opts) =>
  showNotification({ type: "success", title, message, ...opts });
export const showError = (title, message, opts) =>
  showNotification({ type: "error", title, message, ...opts });
export const showWarning = (title, message, opts) =>
  showNotification({ type: "warning", title, message, ...opts });
export const showInfo = (title, message, opts) =>
  showNotification({ type: "info", title, message, ...opts });
export const showSecurity = (title, message, opts) =>
  showNotification({ type: "security", title, message, ...opts });
export const showScan = (title, message, opts) =>
  showNotification({ type: "scan", title, message, ...opts });
export const showCompliance = (title, message, opts) =>
  showNotification({ type: "compliance", title, message, ...opts });
export const showAccount = (title, message, opts) =>
  showNotification({ type: "account", title, message, ...opts });
export const showAdmin = (title, message, opts) =>
  showNotification({ type: "admin", title, message, ...opts });
export const showMessage = (title, message, opts) =>
  showNotification({ type: "message", title, message, ...opts });
export const showSupport = (title, message, opts) =>
  showNotification({ type: "support", title, message, ...opts });
export const showUpdate = (title, message, opts) =>
  showNotification({ type: "update", title, message, ...opts });

/** Hide a toast by id (e.g. replace a "Scan started" popup). */
export const dismissNotification = (id) => toast.dismiss(id);

/**
 * Themed global toaster. Rendered once at the app root so every page
 * (public + admin) shares the same popup styling and live region.
 */
export function GlobalNotifier() {
  const [theme] = useTheme();
  return (
    <Toaster
      theme={theme === "dark" ? "dark" : "light"}
      position="top-right"
      richColors
      closeButton
      gap={10}
      offset="72px"
      toastOptions={{
        duration: 4500,
        classNames: {
          toast: "pp-global-toast",
          title: "pp-global-toast-title",
          description: "pp-global-toast-desc",
          actionButton: "pp-global-toast-action",
          closeButton: "pp-global-toast-close",
        },
        style: { maxWidth: "min(92vw, 380px)" },
      }}
    />
  );
}