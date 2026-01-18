import { ErrorBoundary } from "./ErrorBoundary";
import { OdourMap } from "./OdourMap";

export default function OdourMapPage() {
  return (
    <ErrorBoundary>
      <OdourMap />
    </ErrorBoundary>
  );
}
