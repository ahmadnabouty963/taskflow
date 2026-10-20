export function getSafeAuthDestination(location) {
  const destination = location.state?.from;
  return typeof destination === "string" &&
    destination.startsWith("/") &&
    !destination.startsWith("//")
    ? destination
    : "/app";
}
