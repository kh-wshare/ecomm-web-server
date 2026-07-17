import { Input, Label, ListBox, Select } from "@heroui/react";
import { Children, isValidElement, type ReactNode } from "react";

export function SearchInput({
  label = "Search",
  onChange,
  placeholder = "Search",
  value,
}: {
  label?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <Input
      aria-label={label}
      fullWidth
      placeholder={placeholder}
      type="search"
      value={value}
      variant="secondary"
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function FilterDropdown({
  children,
  label,
  onChange,
  value,
}: {
  children: ReactNode;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const options = Children.toArray(children)
    .filter(isValidElement<{ children?: ReactNode; value?: string }>)
    .map((option) => ({
      label: option.props.children,
      value: option.props.value ?? "",
    }));

  return (
    <Select
      aria-label={label}
      fullWidth
      value={value}
      variant="secondary"
      onChange={(nextValue) => onChange(String(nextValue ?? ""))}
    >
      <Label className="sr-only">{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((option) => (
            <ListBox.Item
              id={option.value}
              key={option.value}
              textValue={String(option.label)}
            >
              {option.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
