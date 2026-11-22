"use client";

import { useState } from "react";
import { Controller } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";

import {
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const FormField = ({
  control,
  name,
  label,
  placeholder,
  type = "text",
  variant = "rubber", // "rubber" | "scope" | "default"
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = type === "password";
  const effectiveType = isPasswordField && showPassword ? "text" : type;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const hasError = !!fieldState.error;

        return (
          <FormItem className="space-y-1.5">
            <FormLabel className="label">{label}</FormLabel>
            <FormControl>
              <div className="relative w-full">
                <Input
                  variant={variant}
                  className={cn(
                    "input",
                    isPasswordField && "pr-11",
                    hasError && "animate-error-shake border-red-500/80 ring-2 ring-red-500/20"
                  )}
                  type={effectiveType}
                  placeholder={placeholder}
                  {...field}
                />
                {isPasswordField && (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-all active:scale-90 p-1 cursor-pointer z-10"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-primary animate-icon-pop" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};

export default FormField;
