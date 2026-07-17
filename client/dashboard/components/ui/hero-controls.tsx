"use client";

import {
  Button as HeroButton,
  Input,
  ListBox,
  Select as HeroSelect,
  TextArea,
} from "@heroui/react";
import {
  Children,
  isValidElement,
  useMemo,
  type ChangeEvent,
  type ComponentProps,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";

const EMPTY_VALUE = "__heroui_empty_value__";

export { Input, TextArea, ListBox };

type ButtonProps = ComponentProps<typeof HeroButton> & {
  value?: string;
  disabled?: boolean;
};

export function Button({ disabled, ...props }: ButtonProps) {
  return <HeroButton {...props} isDisabled={disabled} />;
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  placeholder?: string;
};

export function Select({
  children,
  defaultValue,
  disabled,
  label,
  isLoading = false,
  loadingText = "Loading...",
  onChange,
  placeholder,
  required,
  value,
  ...props
}: SelectProps) {
  const options = useMemo(() => {
    return Children.toArray(children)
      .filter(
        isValidElement<{
          children?: ReactNode;
          disabled?: boolean;
          value?: string | number;
        }>,
      )
      .map((option) => {
        const optionValue = String(option.props.value ?? "");

        return {
          disabled: option.props.disabled,
          key: optionValue === "" ? EMPTY_VALUE : optionValue,
          label: option.props.children,
          value: optionValue,
        };
      });
  }, [children]);

  const selectedValue =
    value === undefined ? undefined : toHeroValue(String(value));

  const initialValue =
    defaultValue === undefined ? undefined : toHeroValue(String(defaultValue));

  return (
    <label className="flex w-full flex-col gap-1">
      {label ? (
        <span className="text-sm font-medium text-foreground">{label}</span>
      ) : null}

      <HeroSelect
        aria-label={
          props["aria-label"] ??
          (typeof label === "string" ? label : undefined)
        }
        className={props.className}
        defaultValue={initialValue}
        isDisabled={disabled || isLoading}
        isRequired={required}
        name={props.name}
        value={selectedValue}
        variant="secondary"
        placeholder={placeholder}
        onChange={(nextValue) => {
          const next = fromHeroValue(String(nextValue ?? ""));
          const target = { name: props.name ?? "", value: next };

          onChange?.({
            currentTarget: target,
            target,
          } as unknown as ChangeEvent<HTMLSelectElement>);
        }}
      >
        <HeroSelect.Trigger>
          <HeroSelect.Value />
          <HeroSelect.Indicator />
        </HeroSelect.Trigger>

        <HeroSelect.Popover>
          <ListBox
            disabledKeys={options
              .filter((option) => option.disabled)
              .map((option) => option.key)}
          >
            {isLoading ? (
              <ListBox.Item id="loading" key="loading" textValue={loadingText}>
                {loadingText}
              </ListBox.Item>
            ) : (
              options.map((option, index) => (
                <ListBox.Item
                  id={option.key}
                  key={`${option.key}-${index}`}
                  textValue={toTextValue(option.label)}
                >
                  {option.label}
                </ListBox.Item>
              ))
            )}
          </ListBox>
        </HeroSelect.Popover>
      </HeroSelect>
    </label>
  );
}

function fromHeroValue(value: string) {
  return value === EMPTY_VALUE ? "" : value;
}

function toHeroValue(value: string) {
  return value === "" ? EMPTY_VALUE : value;
}

function toTextValue(value: ReactNode) {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "Option";
}