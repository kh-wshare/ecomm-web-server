"use client";

import {
  Children,
  isValidElement,
  useMemo,
  type ChangeEvent,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";

import {
  Button as HeroButton,
  Input,
  ListBox,
  Select as HeroSelect,
  TextArea,
} from "@repo/ui";

const EMPTY_VALUE = "__heroui_empty_value__";

export { Input, ListBox, TextArea };

type ButtonProps = ComponentProps<typeof HeroButton> & {
  disabled?: boolean;
};

export function Button({ disabled, onClick, onPress, ...props }: ButtonProps) {
  return (
    <HeroButton
      {...props}
      isDisabled={disabled ?? props.isDisabled}
      onPress={onPress ?? (() => onClick?.({} as MouseEvent<HTMLButtonElement>))}
    />
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  isLoading?: boolean;
  label?: ReactNode;
  loadingText?: string;
  placeholder?: string;
};

export function Select({
  children,
  defaultValue,
  disabled,
  isLoading = false,
  label,
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
          value?: number | string;
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
        <span className="text-sm font-medium text-slate-950 dark:text-zinc-50">
          {label}
        </span>
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
        placeholder={placeholder}
        value={selectedValue}
        variant="secondary"
        onChange={(nextValue) => {
          const next = fromHeroValue(String(nextValue ?? ""));
          const target = { name: props.name ?? "", value: next };

          onChange?.({
            currentTarget: target,
            target,
          } as unknown as ChangeEvent<HTMLSelectElement>);
        }}
      >
        <HeroSelect.Trigger className="bg-surface-secondary text-muted">
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
  return typeof value === "number" || typeof value === "string"
    ? String(value)
    : "Option";
}
