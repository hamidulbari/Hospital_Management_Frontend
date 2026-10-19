import { useId } from "react";
import { describedBy, FieldShell } from "./field-shell";
import { ListboxSelect, type SelectOption } from "./listbox-select";

export type { SelectOption as Option } from "./listbox-select";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: readonly SelectOption[];
  placeholder?: string;
  /** Adds a first entry that clears the choice (for optional fields). */
  allowEmpty?: boolean;
  emptyLabel?: string;
  error?: string;
  hint?: string;
  id?: string;
  /** The search box appears when there are more options than this. Default 10. */
  searchThreshold?: number;
};

export function SelectField({
  label,
  value,
  onChange,
  onBlur,
  options,
  placeholder = "Choose…",
  allowEmpty = false,
  emptyLabel = "None",
  error,
  hint,
  id,
  searchThreshold,
}: Props) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const all: readonly SelectOption[] = allowEmpty ? [{ value: "", label: emptyLabel }, ...options] : options;

  return (
    <FieldShell id={fieldId} label={label} error={error} hint={hint}>
      <ListboxSelect
        id={fieldId}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        options={all}
        placeholder={placeholder}
        invalid={Boolean(error)}
        describedBy={describedBy(fieldId, { error, hint })}
        searchThreshold={searchThreshold}
      />
    </FieldShell>
  );
}