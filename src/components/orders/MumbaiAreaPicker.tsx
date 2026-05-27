import { useState } from 'react';
import { Check, ChevronsUpDown, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  MUMBAI_AREAS,
  MUMBAI_REGIONS,
  MumbaiArea,
} from '@/data/mumbaiAreas';

interface MumbaiAreaPickerProps {
  value: string | null;
  onChange: (area: MumbaiArea | null) => void;
  placeholder?: string;
  label?: string;
}

export function MumbaiAreaPicker({
  value,
  onChange,
  placeholder = 'Select your area in Mumbai',
  label,
}: MumbaiAreaPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {label}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-background font-normal"
          >
            {value ? (
              <span className="truncate">{value}</span>
            ) : (
              <span className="text-muted-foreground truncate">{placeholder}</span>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover z-50"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Search Mumbai areas..." />
            <CommandList className="max-h-72">
              <CommandEmpty>No area found.</CommandEmpty>
              {MUMBAI_REGIONS.map((region) => {
                const areasInRegion = MUMBAI_AREAS.filter((a) => a.region === region);
                return (
                  <CommandGroup key={region} heading={region}>
                    {areasInRegion.map((area) => (
                      <CommandItem
                        key={area.name}
                        value={`${area.name} ${region}`}
                        onSelect={() => {
                          onChange(area);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            value === area.name ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {area.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
