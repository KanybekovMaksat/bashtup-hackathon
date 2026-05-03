import { ListBox, Select } from '@heroui/react';

export type SelectOption = {
  value: string;
  label: string;
};

type SelectFieldProps = {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  isDisabled?: boolean;
};

export function SelectField({
  className,
  isDisabled = false,
  label,
  onChange,
  options,
  placeholder = 'Выберите',
  value,
}: SelectFieldProps) {
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? placeholder;

  return (
    <label className={`dashboard-field ${className ?? ''}`}>
      <span>{label}</span>
      <Select
        aria-label={label}
        fullWidth
        isDisabled={isDisabled}
        onSelectionChange={(key) => onChange(key === null ? '' : String(key))}
        selectedKey={value || null}
      >
        <Select.Trigger>
          <Select.Value>{selectedLabel}</Select.Value>
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {options.map((option) => (
              <ListBox.Item
                id={option.value}
                key={option.value}
                textValue={option.label}
              >
                {option.label}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </label>
  );
}
