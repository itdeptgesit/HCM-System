import * as React from 'react';
import { format, isValid, parse } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Calendar as CalendarIcon } from '@/components/ui/icons';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type DateInputProps = Omit<React.ComponentProps<'input'>, 'type' | 'value' | 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
};

function readDate(value: string, pattern: string) {
  const date = parse(value, pattern, new Date());
  return isValid(date) && format(date, pattern) === value ? date : undefined;
}

export function DateInput({ value, onChange, className, disabled, ...props }: DateInputProps) {
  const selected = readDate(value, 'yyyy-MM-dd');
  const [text, setText] = React.useState(() => selected ? format(selected, 'dd/MM/yyyy') : '');
  const [open, setOpen] = React.useState(false);
  const lastValue = React.useRef(value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (value === lastValue.current) return;
    lastValue.current = value;
    const date = readDate(value, 'yyyy-MM-dd');
    setText(date ? format(date, 'dd/MM/yyyy') : '');
    inputRef.current?.setCustomValidity('');
  }, [value]);

  const update = (nextText: string, date?: Date) => {
    setText(nextText);
    inputRef.current?.setCustomValidity(nextText && !date ? 'Masukkan tanggal yang valid dengan format DD/MM/YYYY.' : '');
    const nextValue = date ? format(date, 'yyyy-MM-dd') : '';
    lastValue.current = nextValue;
    onChange(nextValue);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative">
        <input
          {...props}
          ref={inputRef}
          data-date-input
          type="text"
          inputMode="numeric"
          placeholder="DD/MM/YYYY"
          maxLength={10}
          disabled={disabled}
          className={cn(className, 'pr-12')}
          value={text}
          onChange={event => {
            const raw = event.target.value;
            const nextText = /^\d{8}$/.test(raw) ? `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}` : raw;
            update(nextText, readDate(nextText, 'dd/MM/yyyy'));
          }}
        />
        <PopoverTrigger
          type="button"
          disabled={disabled}
          aria-label={`Pilih tanggal${props['aria-label'] ? `: ${props['aria-label']}` : ''}`}
          className="absolute right-1 bottom-0 flex h-11 w-11 items-center justify-center rounded-xl text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
        >
          <CalendarIcon size={16} />
        </PopoverTrigger>
      </div>
      <PopoverContent align="end" className="w-auto p-0">
        <Calendar
          autoFocus
          mode="single"
          locale={localeId}
          selected={selected}
          defaultMonth={selected}
          captionLayout="dropdown"
          startMonth={new Date(1900, 0)}
          endMonth={new Date(new Date().getFullYear() + 100, 11)}
          onSelect={date => {
            update(date ? format(date, 'dd/MM/yyyy') : '', date);
            setOpen(false);
            inputRef.current?.focus();
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
