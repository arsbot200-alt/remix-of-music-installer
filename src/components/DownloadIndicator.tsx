import { Download, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import type { DownloadStatus } from "@/lib/downloadManager";

type Props = {
  status: DownloadStatus;
  progress?: number;
  size?: "sm" | "md";
  className?: string;
};

export function DownloadIndicator({ status, progress = 0, size = "sm", className = "" }: Props) {
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const ringSize = size === "sm" ? 18 : 22;
  const strokeWidth = 2.5;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  if (status === "completed") {
    return (
      <span className={`text-primary ${className}`} title="Downloaded">
        <CheckCircle2 className={iconSize} />
      </span>
    );
  }

  if (status === "downloading") {
    return (
      <span className={`relative inline-flex items-center justify-center ${className}`} title={`Downloading ${progress}%`}>
        <svg
          width={ringSize}
          height={ringSize}
          viewBox={`0 0 ${ringSize} ${ringSize}`}
          className="rotate-[-90deg]"
        >
          {/* Background circle */}
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-surface-2 opacity-40"
          />
          {/* Progress circle */}
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="text-primary transition-[stroke-dashoffset] duration-300"
          />
        </svg>
        <Download className="absolute h-2.5 w-2.5 text-primary" />
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className={`text-destructive ${className}`} title="Download failed">
        <AlertCircle className={iconSize} />
      </span>
    );
  }

  // idle — no indicator
  return null;
}

/** Button variant for triggering download */
export function DownloadButton({
  status,
  progress = 0,
  onClick,
  className = "",
}: {
  status: DownloadStatus;
  progress?: number;
  onClick: () => void;
  className?: string;
}) {
  const ringSize = 24;
  const strokeWidth = 2.5;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  if (status === "completed") {
    return (
      <button
        onClick={onClick}
        className={`flex items-center gap-1.5 text-primary hover:text-foreground ${className}`}
        title="Downloaded — tap to remove"
      >
        <CheckCircle2 className="h-4 w-4" /> Downloaded
      </button>
    );
  }

  if (status === "downloading") {
    return (
      <button
        onClick={onClick}
        className={`relative inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground ${className}`}
        title="Downloading — tap to cancel"
      >
        <span className="relative inline-flex items-center justify-center">
          <svg
            width={ringSize}
            height={ringSize}
            viewBox={`0 0 ${ringSize} ${ringSize}`}
            className="rotate-[-90deg]"
          >
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-surface-2 opacity-40"
            />
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="text-primary transition-[stroke-dashoffset] duration-300"
            />
          </svg>
          <Loader2 className="absolute h-3 w-3 animate-spin text-primary" />
        </span>
        {progress}%
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 hover:text-foreground ${className}`}
    >
      <Download className="h-4 w-4" /> Download
    </button>
  );
}
