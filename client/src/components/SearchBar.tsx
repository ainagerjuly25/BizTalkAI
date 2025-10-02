import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
}

export default function SearchBar({ value, onChange, onSearch }: SearchBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSearch();
    }
  };

  return (
    <div className="flex gap-2 px-4 pb-3">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search…"
        aria-label="Search companies"
        data-testid="input-search"
        className="flex-1 h-11 px-3 bg-muted/50 border border-input rounded-xl text-base outline-none transition-colors focus:border-primary focus:bg-background"
      />
      <Button
        onClick={onSearch}
        size="default"
        className="h-11 px-4 rounded-xl font-semibold"
        data-testid="button-search"
      >
        <Search className="w-4 h-4 mr-2" />
        Search
      </Button>
    </div>
  );
}
