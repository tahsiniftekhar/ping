import { cn } from "@/lib/utils";
import { avatarHue, initials } from "@/lib/avatar";

const SIZES = {
  "2xs": "size-5 text-[8px]",
  xs: "size-6 text-[9px]",
  sm: "size-8 text-[11px]",
  md: "size-10 text-xs",
  lg: "size-14 text-base",
} as const;

export type AvatarSize = keyof typeof SIZES;

/** Initials avatar with a stable per-identity color (the API has no profile images). */
export function Avatar({
  name,
  seed,
  size = "md",
  className,
}: {
  name: string;
  /** Stable id used for the color, so renames don't change it. Defaults to name. */
  seed?: string;
  size?: AvatarSize;
  className?: string;
}) {
  const hue = avatarHue(seed ?? name);
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex shrink-0 select-none items-center justify-center rounded-full font-semibold tracking-tight text-white",
        SIZES[size],
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(135deg, oklch(0.72 0.13 ${hue}), oklch(0.56 0.15 ${hue + 28}))`,
      }}
    >
      {initials(name)}
    </span>
  );
}

/** Two overlapping member avatars for group conversations. */
export function GroupAvatar({
  members,
  seed,
  size = "md",
  className,
}: {
  members: { _id: string; name: string }[];
  seed: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const [first, second] = members;
  const outer = size === "md" ? "size-10" : "size-8";
  // Small enough that both members' initials stay visible.
  const inner: AvatarSize = size === "md" ? "xs" : "2xs";

  if (!first || !second) {
    return <Avatar name={first?.name ?? "Group"} seed={first?._id ?? seed} size={size} className={className} />;
  }

  return (
    <span aria-hidden className={cn("relative shrink-0", outer, className)}>
      <Avatar name={first.name} seed={first._id} size={inner} className="absolute top-0.5 left-0" />
      <Avatar
        name={second.name}
        seed={second._id}
        size={inner}
        className="absolute right-0 bottom-0.5 ring-2 ring-card"
      />
    </span>
  );
}
