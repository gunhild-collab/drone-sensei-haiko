import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { kommuner } from "@/data/kommuner";

interface KommuneComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function KommuneCombobox({ value, onValueChange }: KommuneComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value || "Velg kommune..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Søk etter kommune..." />
          <CommandList>
            <CommandEmpty>Ingen kommune funnet.</CommandEmpty>
            <CommandGroup>
              {kommuner.map((k) => (
                <CommandItem
                  key={k}
                  value={k}
                  onSelect={() => {
                    onValueChange(k);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === k ? "opacity-100" : "opacity-0")} />
                  {k}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
