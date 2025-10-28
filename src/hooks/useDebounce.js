import { useState, useEffect } from "react";

export default function useDebounce(value, delay = 500) {
    const [debounceValue, setDebounceValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() =>{
            setDebounceValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debounceValue;
}