"use client";

import { useState, useRef, useEffect, useId } from "react";
// @ts-ignore
import { ChevronDown, Check, X, Sparkles, Edit3 } from "lucide-react";

export type ComboboxOption = {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
};

export function PredictiveCombobox({
  options = [],
  value,
  defaultValue = "",
  onChange,
  name,
  label,
  placeholder = "Escribe para buscar o seleccionar...",
  allowCustom = true,
  required = false,
  disabled = false,
  icon,
  className = "",
  helperText,
  customOtherLabel = "Especificar manualmente a qué se dedica / detalle",
  customOtherPlaceholder = "Escribe aquí la ocupación o detalle específico..."
}: {
  options: ComboboxOption[];
  value?: string | undefined;
  defaultValue?: string | undefined;
  onChange?: ((value: string, selectedOption?: ComboboxOption) => void) | undefined;
  name?: string | undefined;
  label?: string | undefined;
  placeholder?: string | undefined;
  allowCustom?: boolean | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  icon?: React.ReactNode | undefined;
  className?: string | undefined;
  helperText?: string | undefined;
  customOtherLabel?: string | undefined;
  customOtherPlaceholder?: string | undefined;
}) {
  const inputId = useId();
  const otherInputId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const otherInputRef = useRef<HTMLInputElement>(null);

  // Safe value handling
  const safeValue = (value !== undefined ? value : defaultValue) || "";
  const safeOptions = Array.isArray(options) ? options : [];

  // Find initial matching label
  const initialOption = safeOptions.find((o) => o && (o.value === safeValue || o.label === safeValue));
  const [searchTerm, setSearchTerm] = useState<string>(initialOption ? initialOption.label : safeValue);
  const [selectedValue, setSelectedValue] = useState<string>(safeValue);
  const [customDetail, setCustomDetail] = useState<string>("");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  // Detect if current selection is "Otro", "Otra", "Otras", "Otros"
  const valLower = (selectedValue || "").toLowerCase().trim();
  const searchLower = (searchTerm || "").toLowerCase().trim();
  const isOther = Boolean(
    valLower === "otro" ||
    valLower === "otra" ||
    valLower === "otras" ||
    valLower === "otros" ||
    valLower.startsWith("otro ") ||
    valLower.startsWith("otra ") ||
    searchLower === "otro" ||
    searchLower === "otra"
  );

  const exactMatch = safeOptions.find(
    (o) => o && (
      (o.label && o.label.toLowerCase().trim() === searchLower) ||
      (o.value && o.value.toLowerCase().trim() === searchLower)
    )
  );

  // Effective value for form submission: if 'Otro' and customDetail is filled, submit customDetail
  const effectiveValue = isOther && customDetail.trim() 
    ? customDetail.trim() 
    : (selectedValue 
        ? selectedValue 
        : (exactMatch 
            ? exactMatch.value 
            : (allowCustom ? (searchTerm || "") : "")
          )
      );

  // Sync external value changes
  useEffect(() => {
    const matched = safeOptions.find((o) => o && (o.value === value || o.label === value));
    setSelectedValue(value || "");
    setSearchTerm(matched ? matched.label : (value || ""));
  }, [value, options]);

  // Filter options dynamically based on search term
  const filteredOptions = safeOptions.filter((opt) => {
    if (!opt) return false;
    if (!searchTerm || !searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    const labelMatch = opt.label ? opt.label.toLowerCase().includes(term) : false;
    const valueMatch = opt.value ? opt.value.toLowerCase().includes(term) : false;
    const sublabelMatch = opt.sublabel ? opt.sublabel.toLowerCase().includes(term) : false;
    const badgeMatch = opt.badge ? opt.badge.toLowerCase().includes(term) : false;
    return labelMatch || valueMatch || sublabelMatch || badgeMatch;
  });

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // If allowCustom and user typed something without selecting, keep the typed text
        if (allowCustom && searchTerm.trim()) {
          setSelectedValue(searchTerm.trim());
          onChange?.(searchTerm.trim());
        } else if (!allowCustom) {
          if (exactMatch) {
            setSelectedValue(exactMatch.value);
            setSearchTerm(exactMatch.label);
            onChange?.(exactMatch.value, exactMatch);
          } else if (selectedValue) {
            const current = safeOptions.find((o) => o.value === selectedValue);
            if (current) setSearchTerm(current.label);
          }
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [allowCustom, searchTerm, exactMatch, selectedValue, safeOptions, onChange]);

  const handleSelect = (option: ComboboxOption) => {
    setSelectedValue(option.value);
    setSearchTerm(option.label);
    setIsOpen(false);
    
    // If selecting 'Otro', focus the custom writing field
    if (
      option.value.toLowerCase().trim() === "otro" ||
      option.value.toLowerCase().trim() === "otra" ||
      option.value.toLowerCase().trim() === "otras" ||
      option.value.toLowerCase().trim() === "otros"
    ) {
      setTimeout(() => {
        otherInputRef.current?.focus();
      }, 100);
    }

    onChange?.(option.value, option);
    inputRef.current?.blur();
  };

  const handleCustomSelect = () => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;
    setSelectedValue(trimmed);
    setIsOpen(false);
    onChange?.(trimmed);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && filteredOptions.length > 0 && filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex]);
      } else if (allowCustom && searchTerm.trim()) {
        handleCustomSelect();
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "Tab") {
      if (isOpen && filteredOptions.length > 0 && filteredOptions[0]) {
        handleSelect(filteredOptions[0]);
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className} space-y-2`}>
      {name && <input type="hidden" name={name} value={effectiveValue} />}

      {label && (
        <label htmlFor={inputId} className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            {icon} {label} {required && <span className="text-rose-500">*</span>}
          </span>
          {selectedValue && (
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
              <Check size={12} /> Preseleccionado
            </span>
          )}
        </label>
      )}

      <div className="relative flex items-center">
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          value={searchTerm}
          disabled={disabled}
          placeholder={placeholder}
          required={required && !effectiveValue}
          onFocus={() => {
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onChange={(e) => {
            const val = e.target.value;
            setSearchTerm(val);
            setIsOpen(true);
            setHighlightedIndex(0);
            if (allowCustom) {
              setSelectedValue(val);
              onChange?.(val);
            }
          }}
          onKeyDown={handleKeyDown}
          className={`w-full pr-16 pl-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm ${
            disabled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : ""
          }`}
          autoComplete="off"
        />

        <div className="absolute right-2.5 flex items-center gap-1">
          {searchTerm && !disabled && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSelectedValue("");
                setCustomDetail("");
                onChange?.("");
                inputRef.current?.focus();
              }}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
              title="Borrar"
            >
              <X size={14} />
            </button>
          )}

          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              if (!disabled) {
                setIsOpen(!isOpen);
                inputRef.current?.focus();
              }
            }}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md transition-transform"
          >
            <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? "rotate-180 text-blue-600" : ""}`} />
          </button>
        </div>
      </div>

      {helperText && <p className="text-[11px] text-gray-500">{helperText}</p>}

      {/* DEDICATED MANUAL WRITING FIELD WHEN "OTRO" / "OTRA" IS SELECTED */}
      {isOther && (
        <div className="p-3.5 bg-gradient-to-r from-purple-50/90 to-indigo-50/90 border border-purple-200 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm space-y-1.5">
          <label htmlFor={otherInputId} className="block text-[11px] font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
            <Edit3 size={13} className="text-purple-600" />
            {customOtherLabel} <span className="text-purple-600 font-semibold">(Escritura manual)</span>
          </label>
          <div className="relative">
            <input
              id={otherInputId}
              ref={otherInputRef}
              type="text"
              required={required}
              value={customDetail}
              onChange={(e) => {
                const val = e.target.value;
                setCustomDetail(val);
                onChange?.(val);
              }}
              placeholder={customOtherPlaceholder}
              className="w-full pl-3.5 pr-10 py-2 bg-white border border-purple-200 rounded-xl text-sm font-semibold text-purple-950 placeholder:text-purple-400 placeholder:font-normal focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all shadow-inner"
            />
            {customDetail && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600 font-bold text-xs">
                ✓ Guardado
              </span>
            )}
          </div>
          <p className="text-[10px] text-purple-700 font-medium">
            Se registrará exactamente lo que escribas aquí en la base de datos del ciudadano.
          </p>
        </div>
      )}

      {/* Floating Auto-predictive Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white/95 backdrop-blur-md border border-gray-200/80 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          {filteredOptions.length > 0 ? (
            <div className="py-1">
              <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
                <span>Coincidencias ({filteredOptions.length})</span>
                <span className="text-gray-400 font-normal">Usa ↑↓ o Enter</span>
              </div>
              {filteredOptions.map((option, index) => {
                const isSelected = selectedValue === option.value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full text-left px-3.5 py-2.5 text-xs transition-colors flex items-center justify-between border-b border-gray-50/60 ${
                      isHighlighted
                        ? "bg-blue-50/90 text-blue-900 font-semibold"
                        : isSelected
                        ? "bg-emerald-50/80 text-emerald-900 font-semibold"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex flex-col pr-2">
                      <span className="text-sm font-medium text-gray-900 leading-tight flex items-center gap-1.5">
                        {option.label}
                        {(option.value.toLowerCase().includes("otro") || option.value.toLowerCase().includes("otra")) && (
                          <span className="text-[10px] font-normal text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-md border border-purple-200">
                            + Permite escribir manual
                          </span>
                        )}
                      </span>
                      {option.sublabel && (
                        <span className="text-[11px] text-gray-500 mt-0.5">{option.sublabel}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {option.badge && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100/80 text-blue-700">
                          {option.badge}
                        </span>
                      )}
                      {isSelected && <Check size={16} className="text-emerald-600" />}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-gray-500">
              No hay opciones predefinidas coincidentes.
            </div>
          )}

          {/* Custom option prompt if allowCustom and search term not an exact match */}
          {allowCustom && searchTerm.trim() && !exactMatch && (
            <div className="p-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-100">
              <button
                type="button"
                onClick={handleCustomSelect}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-100/80 rounded-lg transition-colors flex items-center gap-2"
              >
                <Sparkles size={14} className="text-blue-600 shrink-0" />
                <span>
                  Usar opción personalizada: <strong>"{searchTerm.trim()}"</strong>
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
