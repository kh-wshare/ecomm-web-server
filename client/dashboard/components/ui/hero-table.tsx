import { Table as HeroTable } from "@heroui/react";
import type { TableHTMLAttributes } from "react";

export function Table({
  children,
  className,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <HeroTable variant="secondary">
      <HeroTable.ScrollContainer>
        <table {...props} className={className}>
          {children}
        </table>
      </HeroTable.ScrollContainer>
    </HeroTable>
  );
}
