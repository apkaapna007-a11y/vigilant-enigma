"use client";

import { useState, createContext, useContext } from "react";

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextValue>({
  activeTab: "",
  setActiveTab: () => {},
});

function Tabs({
  defaultTab,
  children,
}: {
  defaultTab: string;
  children: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div>{children}</div>
    </TabsContext.Provider>
  );
}

function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  const isCustom = Boolean(className && className.includes("bg-transparent"));
  return (
    <div
      className={
        isCustom
          ? `flex ${className || ""}`
          : `flex gap-1 bg-muted rounded-lg p-1 ${className || ""}`
      }
    >
      {children}
    </div>
  );
}

function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { activeTab, setActiveTab } = useContext(TabsContext);
  const isActive = activeTab === value;
  const isUnderline = Boolean(className && className.includes("border-b-2"));

  if (isUnderline) {
    return (
      <button
        onClick={() => setActiveTab(value)}
        className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
          isActive
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
        } ${className || ""}`}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      onClick={() => setActiveTab(value)}
      className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        isActive
          ? "bg-background shadow-sm text-foreground"
          : "text-muted-foreground hover:text-foreground"
      } ${className || ""}`}
    >
      {children}
    </button>
  );
}

function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { activeTab } = useContext(TabsContext);
  if (activeTab !== value) return null;
  return <div className={`animate-fade-in ${className || ""}`}>{children}</div>;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
