import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  label: string;
}

export function Tabs({ items, defaultValue, value, onValueChange, label }: TabsProps) {
  const id = useId();
  const firstEnabled = items.find((item) => !item.disabled)?.id ?? '';
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? firstEnabled);
  const selectedValue = value ?? uncontrolledValue;
  const activeTab =
    items.find((item) => item.id === selectedValue && !item.disabled) ??
    items.find((item) => !item.disabled);

  const selectTab = (nextValue: string) => {
    if (value === undefined) setUncontrolledValue(nextValue);
    onValueChange?.(nextValue);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    const enabledTabs = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !item.disabled);
    if (enabledTabs.length === 0) return;

    const enabledIndex = enabledTabs.findIndex(({ index }) => index === currentIndex);
    let nextEnabledIndex: number | undefined;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextEnabledIndex = (enabledIndex + 1) % enabledTabs.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextEnabledIndex = (enabledIndex - 1 + enabledTabs.length) % enabledTabs.length;
    } else if (event.key === 'Home') {
      nextEnabledIndex = 0;
    } else if (event.key === 'End') {
      nextEnabledIndex = enabledTabs.length - 1;
    }

    if (nextEnabledIndex !== undefined) {
      event.preventDefault();
      const next = enabledTabs[nextEnabledIndex];
      if (next) {
        selectTab(next.item.id);
        document.getElementById(`${id}-tab-${next.index}`)?.focus();
      }
    }
  };

  return (
    <div className="ui-tabs">
      <div className="ui-tabs__list" role="tablist" aria-label={label}>
        {items.map((item, index) => {
          const isSelected = item.id === activeTab?.id;
          return (
            <button
              key={item.id}
              id={`${id}-tab-${index}`}
              className="ui-tabs__tab"
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={`${id}-panel-${index}`}
              tabIndex={isSelected ? 0 : -1}
              disabled={item.disabled}
              onClick={() => selectTab(item.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {activeTab && (
        <div
          className="ui-tabs__panel"
          id={`${id}-panel-${items.indexOf(activeTab)}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${items.indexOf(activeTab)}`}
          tabIndex={0}
        >
          {activeTab.content}
        </div>
      )}
    </div>
  );
}
