"use client";

import { useState, useRef, useEffect, useId, useCallback } from "react";
import { MapPin, Search, X, Loader2, Home, Landmark, ChevronRight } from "lucide-react";

export interface AutocompleteItem {
  id: string;
  type: "address" | "colony" | "section";
  title: string;
  subtitle: string;
  address: string;
  colony?: string | undefined;
  municipality: string;
  postcode?: string | undefined;
  lat?: number | undefined;
  lng?: number | undefined;
  sectionNum?: number | undefined;
  sectionId?: string | undefined;
}

export function AddressAutocomplete({
  value = "",
  onChange,
  onSelect,
  municipality = "Tonalá",
  label = "Dirección / Calle y Número *",
  placeholder = "Escribe calle, número, colonia o sección (ej. Av. Tonaltecas, Loma Dorada...)",
  required = false,
  disabled = false,
  className = ""
}: {
  value?: string;
  onChange?: (val: string) => void;
  onSelect?: (item: AutocompleteItem) => void;
  municipality?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const inputId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Debounced API search
  const performSearch = useCallback(
    async (query: string) => {
      const q = query.trim();
      if (q.length < 2) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/map/autocomplete?q=${encodeURIComponent(q)}&municipality=${encodeURIComponent(municipality)}`
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.results || []);
          setIsOpen((data.results || []).length > 0);
          setHighlightedIndex(-1);
        }
      } catch (err) {
        console.error("Autocomplete fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [municipality]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue && inputValue.trim().length >= 2 && document.activeElement === inputRef.current) {
        void performSearch(inputValue);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [inputValue, performSearch]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange?.(val);
    if (!isOpen && val.trim().length >= 2) {
      setIsOpen(true);
    }
  };

  const handleSelectItem = (item: AutocompleteItem) => {
    setInputValue(item.address || item.title);
    onChange?.(item.address || item.title);
    onSelect?.(item);
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === "ArrowDown" && suggestions.length > 0) {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleSelectItem(suggestions[highlightedIndex]!);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setInputValue("");
    onChange?.("");
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }} className={className}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            display: "block",
            fontSize: "10px",
            fontWeight: "800",
            color: "#475569",
            textTransform: "uppercase",
            marginBottom: "3px"
          }}
        >
          {label}
        </label>
      )}

      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", left: "10px", color: "#94a3b8", display: "flex", alignItems: "center" }}>
          {isLoading ? (
            <Loader2 size={15} className="animate-spin text-blue-600" />
          ) : (
            <Search size={15} />
          )}
        </div>

        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
            else if (inputValue.trim().length >= 2) void performSearch(inputValue);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete="off"
          style={{
            width: "100%",
            padding: "8px 32px 8px 32px",
            background: "#f8fafc",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: "600",
            color: "#0f172a",
            outline: "none",
            transition: "border-color 0.15s, box-shadow 0.15s"
          }}
        />

        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: "absolute",
              right: "8px",
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Borrar texto"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Floating Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 1000,
            background: "white",
            border: "1px solid #cbd5e1",
            borderRadius: "12px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            maxHeight: "260px",
            overflowY: "auto",
            overscrollBehavior: "contain",
            padding: "4px"
          }}
        >
          <div
            style={{
              padding: "4px 8px 6px",
              fontSize: "9px",
              fontWeight: "800",
              color: "#64748b",
              textTransform: "uppercase",
              borderBottom: "1px solid #f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <span>Ubicaciones Reales ({municipality})</span>
            <span style={{ fontSize: "9px", color: "#2563eb", fontWeight: "700" }}>✓ Datos INE & Calles</span>
          </div>

          {suggestions.map((item, index) => {
            const isHighlighted = highlightedIndex === index;
            const isSection = item.type === "section";
            const isColony = item.type === "colony";

            return (
              <div
                key={item.id || index}
                onClick={() => handleSelectItem(item)}
                onMouseEnter={() => setHighlightedIndex(index)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  backgroundColor: isHighlighted ? "#eff6ff" : "transparent",
                  transition: "background-color 0.1s"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      backgroundColor: isSection ? "#e0e7ff" : isColony ? "#fef3c7" : "#dcfce7",
                      color: isSection ? "#4338ca" : isColony ? "#b45309" : "#15803d"
                    }}
                  >
                    {isSection ? <Landmark size={14} /> : isColony ? <Home size={14} /> : <MapPin size={14} />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        color: isHighlighted ? "#1d4ed8" : "#0f172a",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#64748b",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}
                    >
                      {item.subtitle}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: "800",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      textTransform: "uppercase",
                      backgroundColor: isSection ? "#e0e7ff" : isColony ? "#fef3c7" : "#f1f5f9",
                      color: isSection ? "#4338ca" : isColony ? "#b45309" : "#475569"
                    }}
                  >
                    {isSection ? "Sección" : isColony ? "Colonia" : "Calle"}
                  </span>
                  <ChevronRight size={14} style={{ color: "#94a3b8" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
