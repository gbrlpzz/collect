// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import { Icon, type IconName } from "../icons/Icon";

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon: IconName;
  badge?: number | string;
}

export interface MobileTabBarProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onSelect: (id: T) => void;
  className?: string;
}

export function MobileTabBar<T extends string = string>({
  tabs,
  activeTab,
  onSelect,
  className = "",
}: MobileTabBarProps<T>) {
  return (
    <nav className={`mobile-tabbar ${className}`.trim()} aria-label="Main Navigation">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            type="button"
            key={tab.id}
            className={isActive ? "mobile-tab-active" : ""}
            aria-selected={isActive}
            role="tab"
            onClick={() => onSelect(tab.id)}
          >
            <Icon name={tab.icon} size={20} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
