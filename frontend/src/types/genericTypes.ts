export interface DropdownTypeBackendFormat {
  display_name: string;
  value: string;
}

export interface DropdownType {
  displayName: string;
  value: string;
}

export function transformDropdownBackendToFrontend(
  item: DropdownTypeBackendFormat,
): DropdownType {
  return {
    displayName: item.display_name,
    value: item.value,
  };
}
