import { useCallback, useEffect, useRef, type ChangeEventHandler, type InputHTMLAttributes } from "react";
import { CalendarDays } from "lucide-react";
import { isValidRelativeDate, looksLikeRelativeDate } from "../utils/relativeDate";

export { isValidRelativeDate } from "../utils/relativeDate";

type IsoDateInputProps = InputHTMLAttributes<HTMLInputElement> & {
  pickerType?: "date" | "datetime-local";
  allowRelative?: boolean;
};

export function isValidPartialIsoDate(value: string): boolean {
  if (value === "") return true;
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  if (year < 1 || year > 9999) return false;
  if (!match[2]) return true;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return false;
  if (!match[3]) return true;
  const day = Number(match[3]);
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  return day >= 1 && day <= daysInMonth;
}

export function IsoDateInput({
  pickerType = "date",
  allowRelative = false,
  className = "",
  value,
  onChange,
  disabled,
  type: _type,
  inputMode: _inputMode,
  placeholder: _placeholder,
  ...props
}: IsoDateInputProps) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLInputElement>(null);
  const absolutePlaceholder = pickerType === "date" ? "yyyy-MM-dd" : "yyyy-MM-ddTHH:mm:ss";
  const allowTime = pickerType === "datetime-local";
  const placeholder = allowRelative
    ? `${absolutePlaceholder} or ${allowTime ? "-1h30min" : "-1y3m"}`
    : absolutePlaceholder;
  const presentLabel = pickerType === "date" ? "today" : "now";
  const absoluteMessage = allowTime
    ? "YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss, optionally followed by Z or an offset such as +02:00"
    : "YYYY, YYYY-MM, or YYYY-MM-DD";
  const dateMessage = allowRelative
    ? `Use ${absoluteMessage}, or an offset such as -7d, -1y3m, or ${allowTime ? "-1h30min" : "+2w"}; combine y, m, w, d${allowTime ? ", h, min, and s" : ""} from largest to smallest. Use 0d for ${presentLabel}.`
    : `Use ${absoluteMessage}.`;
  const isValidValue = useCallback(
    (candidate: string) => {
      if (looksLikeRelativeDate(candidate)) return allowRelative && isValidRelativeDate(candidate, allowTime);
      return pickerType !== "date" || isValidPartialIsoDate(candidate);
    },
    [allowRelative, allowTime, pickerType],
  );

  useEffect(() => {
    if (textRef.current)
      textRef.current.setCustomValidity(typeof value !== "string" || isValidValue(value) ? "" : dateMessage);
  }, [dateMessage, isValidValue, value]);

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    event.currentTarget.setCustomValidity(isValidValue(event.currentTarget.value) ? "" : dateMessage);
    onChange?.(event);
  };

  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker) return;
    const current = typeof value === "string" ? value : "";
    // datetime-local rejects offsets and fractions, so prime it with the wall-clock prefix of an ISO value.
    picker.value =
      pickerType === "datetime-local"
        ? (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?/.exec(current)?.[0] ?? current)
        : current;
    if (typeof picker.showPicker === "function") picker.showPicker();
    else picker.click();
  };

  return (
    <span className="relative block w-full">
      <input
        ref={textRef}
        {...props}
        type="text"
        inputMode={allowRelative ? "text" : "numeric"}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={`${className} w-full pr-10`.trim()}
        title={allowRelative || pickerType === "date" ? dateMessage : props.title}
      />
      <button
        type="button"
        aria-label="Choose date"
        title="Choose date"
        disabled={disabled}
        onClick={openPicker}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        <CalendarDays className="h-4 w-4" />
      </button>
      <input
        ref={pickerRef}
        type={pickerType}
        step={pickerType === "datetime-local" ? 1 : undefined}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute h-px w-px opacity-0"
        onChange={onChange}
      />
    </span>
  );
}
