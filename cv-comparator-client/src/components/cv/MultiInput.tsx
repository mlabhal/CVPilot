import React, { useState, KeyboardEvent, ClipboardEvent } from 'react';

interface MultiInputProps {
  id: string;
  label: string;
  value?: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  required?: boolean;
  style?: React.CSSProperties;
}

const MultiInput: React.FC<MultiInputProps> = ({
  id,
  label,
  value = [], // Valeur par défaut
  onChange,
  placeholder,
  required,
  style
}) => {
  const [inputValue, setInputValue] = useState('');
  const items = Array.isArray(value) ? value : []; // Assure que items est toujours un tableau

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addItem();
    } else if (e.key === 'Backspace' && inputValue === '' && items.length > 0) {
      const newValue = items.slice(0, -1);
      onChange(newValue);
    }
  };

  const addItem = (valueToAdd: string = inputValue) => {
    const newItems = valueToAdd
      .split(',')
      .map(item => item.trim())
      .filter(item => item !== '' && !items.includes(item));

    if (newItems.length > 0) {
      onChange([...items, ...newItems]);
      setInputValue('');
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    addItem(pastedText);
  };

  const removeItem = (indexToRemove: number) => {
    const newValue = items.filter((_, index) => index !== indexToRemove);
    onChange(newValue);
  };

  return (
    <div style={style}>
      <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor={id}>
        {label} {required && '*'}
      </label>
      <div className="relative">
        <div className="flex flex-wrap gap-2 p-2 border rounded-lg bg-white min-h-[3rem] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
          {items.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="inline-flex items-center px-2.5 py-1.5 rounded-full text-sm bg-blue-100 text-blue-800"
            >
              {item}
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="ml-1.5 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            id={id}
            className="flex-1 min-w-[200px] outline-none border-none focus:ring-0 p-1"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onBlur={() => {
              if (inputValue.trim()) {
                addItem();
              }
            }}
            placeholder={items.length === 0 ? placeholder : ''}
          />
        </div>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Appuyez sur Entrée ou virgule pour ajouter un élément
      </p>
    </div>
  );
};

export default MultiInput;