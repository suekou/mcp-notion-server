import {
  Children,
  cloneElement,
  isValidElement,
  type ReactNode,
  useId,
} from "react";

export function Status({
  message,
  error,
}: {
  message?: string;
  error?: string;
}) {
  return (
    <div className={`status ${error ? "status-error" : ""}`}>
      {error || message || ""}
    </div>
  );
}

export function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="panel first:mt-0 first:border-t-0 first:pt-0">
      <h2 className="section-label">{title}</h2>
      {children}
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const fallbackId = useId();
  const childId =
    Children.count(children) === 1 &&
    isValidElement<{ id?: string }>(children) &&
    children.props.id
      ? children.props.id
      : fallbackId;
  const control =
    Children.count(children) === 1 &&
    isValidElement<{ id?: string }>(children) &&
    !children.props.id
      ? cloneElement(children, { id: childId })
      : children;

  return (
    <label className="field" htmlFor={childId}>
      <span>{label}</span>
      {control}
    </label>
  );
}

export function Button({
  children,
  primary,
  disabled,
  onClick,
}: {
  children: ReactNode;
  primary?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={`button ${primary ? "button-primary" : ""}`}
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function Pill({ children }: { children: ReactNode }) {
  return <span className="pill">{children}</span>;
}

export function Tabs<T extends string>({
  value,
  tabs,
  onChange,
}: {
  value: T;
  tabs: Array<{ value: T; label: string; disabled?: boolean }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="tabs">
      {tabs.map((tab) => (
        <button
          className={`tab ${tab.value === value ? "tab-active" : ""}`}
          disabled={tab.disabled}
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-6 text-notion-muted">{children}</p>;
}

export function useRunner(
  setStatus: (value: string) => void,
  setError: (value: string) => void,
) {
  return async function run<T>(message: string, fn: () => Promise<T>) {
    setStatus(message);
    setError("");
    try {
      const value = await fn();
      setStatus("");
      return value;
    } catch (error) {
      setStatus("");
      setError(error instanceof Error ? error.message : String(error));
      return undefined as T;
    }
  };
}
