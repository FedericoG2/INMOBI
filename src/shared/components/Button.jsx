import './Button.css';

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
  size = 'medium',
  ...props
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant} btn-${size}`}
      {...props}
    >
      {children}
    </button>
  );
}
