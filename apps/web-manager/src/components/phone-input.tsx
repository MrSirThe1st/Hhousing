"use client";

import {
  formatDrcNationalDisplay,
  extractDrcNationalNumber,
  toDrcE164,
  isCompleteDrcNational,
  nationalFromStoredPhone
} from "../lib/phone-input";

type PhoneInputProps = {
  id?: string;
  name?: string;
  value: string;
  onChange: (e164Value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  hint?: string;
  autoComplete?: string;
};

/**
 * DRC-first phone input: fixed +243 prefix + 9 national digits.
 * `value` / `onChange` use E.164-style `+243XXXXXXXXX`.
 */
export default function PhoneInput({
  id,
  name,
  value,
  onChange,
  required = false,
  disabled = false,
  className = "",
  inputClassName = "",
  hint = "9 chiffres après +243 (ex. 990 000 000)",
  autoComplete = "tel-national"
}: PhoneInputProps): React.ReactElement {
  const national = nationalFromStoredPhone(value);
  const display = formatDrcNationalDisplay(national);
  const complete = isCompleteDrcNational(national);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const nextNational = extractDrcNationalNumber(event.target.value);
    onChange(nextNational.length > 0 ? toDrcE164(nextNational) : "");
  }

  return (
    <div className={className}>
      <div
        className={`flex overflow-hidden rounded-lg border bg-white transition focus-within:border-[#0063fe] focus-within:ring-2 focus-within:ring-[#0063fe]/15 ${
          complete || national.length === 0
            ? "border-gray-300"
            : "border-amber-300"
        }`}
      >
        <span className="inline-flex shrink-0 items-center border-r border-gray-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
          +243
        </span>
        <input
          id={id}
          name={name}
          type="tel"
          inputMode="numeric"
          autoComplete={autoComplete}
          value={display}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          placeholder="990 000 000"
          aria-label="Numéro de téléphone national"
          className={`min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm text-[#010a19] outline-none placeholder:text-slate-400 ${inputClassName}`}
        />
        {complete ? (
          <span className="inline-flex items-center pr-3 text-emerald-600" aria-hidden="true">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}
