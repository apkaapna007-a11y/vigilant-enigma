"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (value: number) => void;
  label: string;
  suffix?: string;
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ className, value, min, max, step = 1, onValueChange, label, suffix = "", ...props }, ref) => {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
      <div ref={ref} className={cn("w-full space-y-2", className)} {...props}>
        <div className="flex justify-between text-sm">
          <span className="font-medium">{label}</span>
          <span className="text-muted-foreground">
            {value.toFixed(step < 1 ? 1 : 0)}{suffix}
          </span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onValueChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
        />
      </div>
    );
  }
);
Slider.displayName = "Slider";

export { Slider };
