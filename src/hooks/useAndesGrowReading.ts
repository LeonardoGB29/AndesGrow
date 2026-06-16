import { useEffect, useState } from "react";
import { getSensores, type AndesGrowReading } from "../lib/andesgrow-api";

export function useAndesGrowReading() {
  const [data, setData] = useState<AndesGrowReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const reading = await getSensores();
      setData(reading);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    const interval = window.setInterval(() => {
      load();
    }, 3000);

    return () => window.clearInterval(interval);
  }, []);

  return {
    data,
    loading,
    error,
    refresh: load,
  };
}
