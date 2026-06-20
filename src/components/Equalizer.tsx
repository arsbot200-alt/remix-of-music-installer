export function Equalizer({ active }: { active: boolean }) {
  return (
    <div className="flex h-4 items-end gap-[2px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`eq-bar w-[3px] rounded-sm bg-primary ${active ? "" : "opacity-40 [animation-play-state:paused]"}`}
          style={{ height: "100%" }}
        />
      ))}
    </div>
  );
}
