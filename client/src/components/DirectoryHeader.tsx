import { useEffect, useState } from "react";

export default function DirectoryHeader() {
  const [isFriend, setIsFriend] = useState(true);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setOpacity(0);
      setTimeout(() => {
        setIsFriend(prev => !prev);
        setOpacity(1);
      }, 180);
    }, 2200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
        H
      </div>
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl font-bold tracking-tight">Hainager</h1>
        <p className="text-[13px] text-muted-foreground whitespace-nowrap">
          Enterprise{" "}
          <span
            style={{ opacity, transition: "opacity 0.25s ease" }}
            className="inline-block"
          >
            {isFriend ? "Friend" : "Front"}
          </span>{" "}
          Manager
        </p>
      </div>
    </div>
  );
}
