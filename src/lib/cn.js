/** Join truthy class names — small, dependency-free. */
export default function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}