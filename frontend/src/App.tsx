import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { APIProvider } from "@vis.gl/react-google-maps";
import { config } from "./config";
import { MapContainer } from "./components/MapContainer";
import { FilterSidebar } from "./components/FilterSidebar";
import { useFilters } from "./hooks/useFilters";

const queryClient = new QueryClient();
const { googleMapsApiKey } = config;

export default function App() {
  const { filters, options, updateFilter, clearFilters } = useFilters();

  return (
    <QueryClientProvider client={queryClient}>
      <APIProvider apiKey={googleMapsApiKey}>
        <div className="w-screen h-screen relative">
          <MapContainer filters={filters} />
          <FilterSidebar
            filters={filters}
            options={options}
            onUpdate={updateFilter}
            onClear={clearFilters}
          />
        </div>
      </APIProvider>
    </QueryClientProvider>
  );
}
