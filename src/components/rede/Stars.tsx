import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stars({ value, size = 13 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = value >= i;
        const half = !filled && value >= i - 0.5;
        return (
          <Star
            key={i}
            size={size}
            className={cn(filled || half ? "text-gold" : "text-line")}
            fill={filled ? "#C8A664" : half ? "url(#half)" : "none"}
          />
        );
      })}
    </span>
  );
}
