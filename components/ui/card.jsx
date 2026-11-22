export function Card({ className = "", ...props }) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card text-card-foreground shadow-sm backdrop-blur-md transition-all ${className}`}
      {...props}
    />
  );
}

export function CardHeader({ className = "", ...props }) {
  return (
    <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props} />
  );
}

export function CardTitle({ className = "", ...props }) {
  return (
    <h2 className={`text-2xl font-bold leading-none tracking-tight text-slate-900 dark:text-white ${className}`} {...props} />
  );
}

export function CardDescription({ className = "", ...props }) {
  return (
    <p className={`text-sm text-slate-600 dark:text-slate-300 ${className}`} {...props} />
  );
}

export function CardContent({ className = "", ...props }) {
  return <div className={`p-6 pt-0 ${className}`} {...props} />;
}

export function CardFooter({ className = "", ...props }) {
  return (
    <div className={`flex items-center p-6 pt-0 ${className}`} {...props} />
  );
}
